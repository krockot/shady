import {
  Blueprint,
  BufferBindingNodeDescriptor,
  BufferNodeDescriptor,
  ComputeNodeDescriptor,
  ConnectionNodeDescriptor,
  RenderNodeDescriptor,
  SamplerBindingNodeDescriptor,
  SamplerNodeDescriptor,
  TextureBindingNodeDescriptor,
  TextureNodeDescriptor,
} from './Blueprint';
import { Gpu } from './Gpu';
import { BUILTIN_UNIFORMS_WGSL } from './BuiltinUniforms';

export type ShaderCompilationMessageType = 'info' | 'warning' | 'error';

export interface ShaderCompilationMessage {
  message: string;
  type: ShaderCompilationMessageType;
  lineNum: number;
  linePos: number;
  offset: number;
  length: number;
}

export interface ShaderCompilationInfo {
  messages: ShaderCompilationMessage[];
}

export interface CompileResult {
  executable?: Executable;
  shaderInfo: Record<string, ShaderCompilationInfo>;
  messages: string[];
}

interface CompiledComputePass {
  type: 'compute';
  descriptor: ComputeNodeDescriptor;
  bindGroups: GPUBindGroup[];
  pipeline: GPUComputePipeline;
}

interface CompiledRenderPass {
  type: 'render';
  descriptor: RenderNodeDescriptor;
  bundle: GPURenderBundle;
}

type CompiledPass = CompiledComputePass | CompiledRenderPass;

export class Executable {
  private gpu_: Gpu;
  private blueprint_: Blueprint;
  private shaders_: Record<string, GPUShaderModule>;
  private shaderInfo_: Record<string, ShaderCompilationInfo>;
  private builtinUniforms_: null | GPUBuffer;
  private buffers_: Record<string, GPUBuffer>;
  private textures_: Record<string, GPUTexture>;
  private samplers_: Record<string, GPUSampler>;
  private passes_: CompiledPass[];

  private outputDepthStencilTexture_: null | GPUTexture;
  private outputDepthStencilTextureSize_: GPUExtent3DDict;

  constructor(
    gpu: Gpu,
    blueprint: Blueprint,
    shaders: Record<string, GPUShaderModule>,
    shaderInfo: Record<string, ShaderCompilationInfo>
  ) {
    this.gpu_ = gpu;
    this.blueprint_ = blueprint;
    this.shaders_ = shaders;
    this.shaderInfo_ = shaderInfo;
    this.builtinUniforms_ = null;
    this.buffers_ = {};
    this.textures_ = {};
    this.samplers_ = {};
    this.passes_ = [];
    this.outputDepthStencilTexture_ = null;
    this.outputDepthStencilTextureSize_ = { width: 0, height: 0 };
  }

  get gpu() {
    return this.gpu_;
  }

  static async compile(
    gpu: Gpu,
    blueprint: Blueprint,
    outputFormat: GPUTextureFormat
  ): Promise<CompileResult> {
    if (!gpu.isAcquired) {
      return { shaderInfo: {}, messages: ['GPU has been lost'] };
    }

    const usedShaders: Record<string, boolean> = {};
    for (const node of Object.values(blueprint.nodes)) {
      if (node.type === 'render') {
        if (node.vertexShader !== '') {
          usedShaders[node.vertexShader] = true;
        }
        if (node.fragmentShader !== '') {
          usedShaders[node.fragmentShader] = true;
        }
      } else if (node.type === 'compute' && node.shader !== '') {
        usedShaders[node.shader] = true;
      }
    }

    const device = gpu.device!;
    const modules: Record<string, GPUShaderModule> = {};
    for (const [id, s] of Object.entries(blueprint.shaders)) {
      modules[id] = device.createShaderModule({
        code: BUILTIN_UNIFORMS_WGSL + s.code,
      });
    }

    let fail: boolean = false;
    const shaderInfo: Record<string, ShaderCompilationInfo> = {};
    for (const [id, m] of Object.entries(modules)) {
      const info = await m.compilationInfo();
      shaderInfo[id] = {
        messages: info.messages.map(m => ({
          message: m.message,
          type: m.type,
          lineNum: m.lineNum,
          linePos: m.linePos,
          offset: m.offset,
          length: m.length,
        })),
      };

      for (const message of info.messages) {
        if (message.type === 'error' && usedShaders[id]) {
          fail = true;
        }
      }
      if (
        info.messages.some(message => message.type === 'error') &&
        usedShaders[id]
      ) {
        fail = true;
      }
    }
    if (fail) {
      return {
        shaderInfo,
        messages: ['One or more shaders failed to compile'],
      };
    }

    const executable = new Executable(gpu, blueprint, modules, shaderInfo);
    let messages: string[] = [];
    try {
      messages = await executable.compile_(outputFormat);
    } catch (e: any) {
      console.log('Compilation failed: ', e.message);
      return { shaderInfo: {}, messages: [...messages, e.message] };
    }
    return { executable, shaderInfo, messages };
  }

  async compile_(outputFormat: GPUTextureFormat): Promise<string[]> {
    if (!this.gpu_.isAcquired) {
      return ['GPU has been lost'];
    }

    const messages: string[] = [];
    const device = this.gpu_.device!;

    interface PipelineBindGroup {
      layout: GPUBindGroupLayoutEntry[];
      bindings: Map<number, string>;
    }

    const bufferBindingsByPass: Record<string, BufferBindingNodeDescriptor[]> =
      {};
    const textureBindingsByPass: Record<
      string,
      TextureBindingNodeDescriptor[]
    > = {};
    const samplerBindingsByPass: Record<
      string,
      SamplerBindingNodeDescriptor[]
    > = {};
    Object.entries(this.blueprint_.nodes).forEach(([id, node]) => {
      if (node.type !== 'connection' || node.connectionType !== 'binding') {
        return;
      }
      switch (node.bindingType) {
        case 'buffer':
          if (!bufferBindingsByPass[node.target]) {
            bufferBindingsByPass[node.target] = [];
          }
          bufferBindingsByPass[node.target].push(node);
          break;

        case 'texture':
          if (!textureBindingsByPass[node.target]) {
            textureBindingsByPass[node.target] = [];
          }
          textureBindingsByPass[node.target].push(node);
          break;

        case 'sampler':
          if (!samplerBindingsByPass[node.target]) {
            samplerBindingsByPass[node.target] = [];
          }
          samplerBindingsByPass[node.target].push(node);
          break;
      }
    });

    const pipelineBindGroups: Record<string, PipelineBindGroup[]> = {};
    const bufferUsageFlags: Record<string, GPUBufferUsageFlags> = {};
    const collectResourceUsage = (
      pipelineId: string,
      visibility: GPUShaderStageFlags
    ) => {
      for (const node of bufferBindingsByPass[pipelineId] ?? []) {
        const descriptor = node as BufferBindingNodeDescriptor;
        let usageFlags = 0;
        const entry: GPUBindGroupLayoutEntry = {
          binding: descriptor.binding,
          visibility,
        };
        const groups = pipelineBindGroups[pipelineId] ?? [];
        pipelineBindGroups[pipelineId] = groups;

        const group = descriptor.group;
        const bindGroup = groups[group] ?? { layout: [], bindings: new Map() };
        groups[group] = bindGroup;
        bindGroup.layout.push(entry);
        bindGroup.bindings.set(descriptor.binding, node.source);

        switch (descriptor.storageType) {
          case 'storage-read':
            usageFlags = GPUBufferUsage.STORAGE;
            entry.buffer = { type: 'read-only-storage' };
            break;

          case 'storage':
            usageFlags = GPUBufferUsage.STORAGE;
            entry.buffer = { type: 'storage' };
            break;

          case 'uniform':
            usageFlags = GPUBufferUsage.UNIFORM;
            entry.buffer = { type: 'uniform' };
            break;
        }

        if (usageFlags !== 0) {
          bufferUsageFlags[node.source] =
            (bufferUsageFlags[node.source] ?? 0) | usageFlags;
        }
      }

      for (const node of textureBindingsByPass[pipelineId] ?? []) {
        const descriptor = node as TextureBindingNodeDescriptor;
        const entry: GPUBindGroupLayoutEntry = {
          binding: descriptor.binding,
          visibility,
        };
        const groups = pipelineBindGroups[pipelineId] ?? [];
        pipelineBindGroups[pipelineId] = groups;

        const group = descriptor.group;
        const bindGroup = groups[group] ?? { layout: [], bindings: new Map() };
        groups[group] = bindGroup;
        bindGroup.layout.push(entry);
        bindGroup.bindings.set(descriptor.binding, node.source);
        entry.texture = {};
      }

      for (const node of samplerBindingsByPass[pipelineId] ?? []) {
        const descriptor = node as SamplerBindingNodeDescriptor;
        const entry: GPUBindGroupLayoutEntry = {
          binding: descriptor.binding,
          visibility,
        };
        const groups = pipelineBindGroups[pipelineId] ?? [];
        pipelineBindGroups[pipelineId] = groups;

        const group = descriptor.group;
        const bindGroup = groups[group] ?? { layout: [], bindings: new Map() };
        groups[group] = bindGroup;
        bindGroup.layout.push(entry);
        bindGroup.bindings.set(descriptor.binding, node.source);
        entry.sampler = {};
      }
    };

    const buffers: Record<string, BufferNodeDescriptor> = {};
    const textures: Record<string, TextureNodeDescriptor> = {};
    const samplers: Record<string, SamplerNodeDescriptor> = {};
    const renders: Record<string, RenderNodeDescriptor> = {};
    const computes: Record<string, ComputeNodeDescriptor> = {};
    const connections: Record<string, ConnectionNodeDescriptor> = {};
    for (const [id, node] of Object.entries(this.blueprint_.nodes)) {
      switch (node.type) {
        case 'buffer':
          buffers[id] = node;
          break;

        case 'texture':
          textures[id] = node;
          break;

        case 'sampler':
          samplers[id] = node;
          break;

        case 'render':
          renders[id] = node;
          collectResourceUsage(
            id,
            GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT
          );
          break;

        case 'compute':
          computes[id] = node;
          collectResourceUsage(id, GPUShaderStage.COMPUTE);
          break;

        case 'connection':
          connections[id] = node;
          break;
      }
    }

    this.builtinUniforms_ = device.createBuffer({
      size: 24,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    for (const [id, node] of Object.entries(buffers)) {
      const flags = bufferUsageFlags[id];
      if (!flags) {
        continue;
      }

      const mappedAtCreation = node.init !== 'zero';
      const buffer = device.createBuffer({
        size: node.size,
        usage: bufferUsageFlags[id],
        mappedAtCreation,
      });
      if (mappedAtCreation) {
        const data = buffer.getMappedRange(0, node.size);
        if (node.init === 'random-floats') {
          const uints = new Uint32Array(node.size / 4);
          crypto.getRandomValues(uints);

          const floats = new Float32Array(data);
          uints.forEach((x, i) => (floats[i] = x / 2 ** 31 - 1));
        } else if (node.init === 'random-uints') {
          const uints = new Uint32Array(data);
          crypto.getRandomValues(uints);
        }
        buffer.unmap();
      }
      this.buffers_[id] = buffer;
    }

    for (const [id, node] of Object.entries(textures)) {
      if (!node.imageData) {
        continue;
      }
      const image = await createImageBitmap(node.imageData);
      const size = { width: image.width, height: image.height };
      const texture = device.createTexture({
        size,
        format: 'rgba8unorm',
        usage:
          GPUTextureUsage.SAMPLED |
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.RENDER_ATTACHMENT,
      });
      device.queue.copyExternalImageToTexture(
        { source: image },
        { texture },
        size
      );
      this.textures_[id] = texture;
    }

    for (const [id] of Object.entries(samplers)) {
      this.samplers_[id] = device.createSampler();
    }

    const getBindingResource = (id: string): GPUBindingResource => {
      if (id === 'builtin-uniforms') {
        return { buffer: this.builtinUniforms_! };
      }

      const node = this.blueprint_.nodes[id];
      if (!node) {
        throw new Error(`unknown node ${id}`);
      }

      switch (node.type) {
        case 'buffer':
          const buffer = this.buffers_[id];
          if (!buffer) {
            throw new Error(`unknown buffer ${id}`);
          }
          return { buffer };

        case 'texture':
          const texture = this.textures_[id];
          if (!texture) {
            throw new Error(`unknown texture ${id}`);
          }
          return texture.createView();

        case 'sampler':
          const sampler = this.samplers_[id];
          if (!sampler) {
            throw new Error(`unknown sampler ${id}`);
          }
          return sampler;

        default:
          throw new Error(`unsupported binding resource type '${node.type}'`);
      }
    };

    const compileBindings = (id: string) => {
      const groups = pipelineBindGroups[id] ?? [];

      if (!groups[0]) {
        groups[0] = { layout: [], bindings: new Map() };
      }
      const visibility =
        this.blueprint_.nodes[id]?.type === 'render'
          ? GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT
          : GPUShaderStage.COMPUTE;
      groups[0].layout.unshift({
        binding: 0,
        visibility,
        buffer: { type: 'uniform' },
      });
      groups[0].bindings.set(0, 'builtin-uniforms');

      const bindGroupLayouts = groups.map((group, i) => {
        return device.createBindGroupLayout({ entries: group.layout ?? [] });
      });
      const layout = device.createPipelineLayout({ bindGroupLayouts });
      const bindGroups = groups.map((group, i) => {
        return device.createBindGroup({
          layout: bindGroupLayouts[i],
          entries: Array.from(group.bindings.entries()).map(
            ([binding, id]) => ({ binding, resource: getBindingResource(id) })
          ),
        });
      });
      return { layout, bindGroups };
    };

    const allPasses: Map<string, CompiledPass> = new Map();
    for (const [id, node] of Object.entries(renders)) {
      const vertexShader = this.shaders_[node.vertexShader];
      const fragmentShader = this.shaders_[node.fragmentShader];
      if (!vertexShader || !fragmentShader) {
        continue;
      }

      const { layout, bindGroups } = compileBindings(id);
      const topology = node.topology ?? 'triangle-list';
      const stripIndexFormat =
        topology === 'line-strip' || topology === 'triangle-strip'
          ? 'uint32'
          : undefined;
      const pipeline = device.createRenderPipeline({
        layout,
        vertex: {
          module: this.shaders_[node.vertexShader],
          entryPoint: node.vertexEntryPoint,
        },
        primitive: {
          topology,
          stripIndexFormat,
          cullMode: 'none',
        },
        fragment: {
          targets: [{ format: outputFormat }],
          module: this.shaders_[node.fragmentShader],
          entryPoint: node.fragmentEntryPoint,
        },
        depthStencil: {
          format: 'depth24plus-stencil8',
          depthWriteEnabled: true,
          depthCompare: node.depthTest ?? 'always',
        },
      });
      const encoder = device.createRenderBundleEncoder({
        colorFormats: [outputFormat],
        depthStencilFormat: 'depth24plus-stencil8',
      });
      encoder.setPipeline(pipeline);
      bindGroups.forEach((group, i) => {
        if (group) {
          encoder.setBindGroup(i, group);
        }
      });
      encoder.draw(node.numVertices, node.numInstances);
      allPasses.set(id, {
        type: 'render',
        descriptor: node,
        bundle: encoder.finish(),
      });
    }

    for (const [id, node] of Object.entries(computes)) {
      const shader = this.shaders_[node.shader];
      if (!shader) {
        continue;
      }

      const { layout, bindGroups } = compileBindings(id);
      const pipeline = device.createComputePipeline({
        layout,
        compute: {
          module: this.shaders_[node.shader],
          entryPoint: node.entryPoint,
        },
      });
      allPasses.set(id, {
        type: 'compute',
        descriptor: node,
        bindGroups,
        pipeline,
      });
    }

    // Build an ordered list of passes based on the queueing dependency graph.
    const targets: Map<string, string> = new Map();
    const startNodes: Set<string> = new Set(allPasses.keys());
    for (const node of Object.values(connections)) {
      if (node.connectionType !== 'queue') {
        continue;
      }
      targets.set(node.source, node.target);
      startNodes.delete(node.target);
    }
    if (startNodes.size === 0) {
      throw new Error('No usable passes compiled');
    }

    let thisPhase = Array.from(startNodes);
    while (this.passes_.length < allPasses.size) {
      this.passes_.push(...thisPhase.map(id => allPasses.get(id)!));
      const nextPhase = [];
      for (const passId of thisPhase) {
        const target = targets.get(passId);
        if (target) {
          nextPhase.push(target);
        }
      }
      thisPhase = nextPhase;
    }

    return messages;
  }

  updateUniforms(uniforms: Record<string, any>) {
    if (!this.gpu_.isAcquired || !this.builtinUniforms_) {
      return;
    }

    const device = this.gpu_.device!;
    const data = new ArrayBuffer(24);
    const floats = new Float32Array(data);
    const uints = new Uint32Array(data);
    floats[0] = (uniforms['time'] as number) ?? 0;
    floats[1] = (uniforms['timeDelta'] as number) ?? 0;
    uints[2] = (uniforms['frame'] as number) ?? 0;
    uints[4] = uniforms['resolution']?.width ?? 1;
    uints[5] = uniforms['resolution']?.height ?? 1;
    device.queue.writeBuffer(this.builtinUniforms_, 0, data, 0, 24);
  }

  execute(texture: GPUTexture, { width, height }: GPUExtent3DDict) {
    if (!this.gpu_.isAcquired) {
      return;
    }

    const device = this.gpu_.device!;
    const encoder = device.createCommandEncoder();

    // TODO: configurable depth/stencil state
    if (
      this.outputDepthStencilTexture_ === null ||
      this.outputDepthStencilTextureSize_.width !== width ||
      this.outputDepthStencilTextureSize_.height !== height
    ) {
      if (this.outputDepthStencilTexture_ !== null) {
        this.outputDepthStencilTexture_.destroy();
        this.outputDepthStencilTexture_ = null;
      }

      this.outputDepthStencilTexture_ = device.createTexture({
        size: { width, height },
        format: 'depth24plus-stencil8',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
      this.outputDepthStencilTextureSize_ = { width, height };
    }

    for (const pass of this.passes_) {
      if (pass.type === 'compute') {
        const computePass = encoder.beginComputePass();
        const dispatchSize = pass.descriptor.dispatchSize;
        computePass.setPipeline(pass.pipeline);
        pass.bindGroups.forEach((group, i) => {
          if (group) {
            computePass.setBindGroup(i, group);
          }
        });
        computePass.dispatch(dispatchSize.x, dispatchSize.y, dispatchSize.z);
        computePass.endPass();
      } else {
        const loadValue = pass.descriptor.clear
          ? pass.descriptor.clearColor ?? { r: 0, g: 0, b: 0, a: 1 }
          : ('load' as const);
        const renderPass = encoder.beginRenderPass({
          colorAttachments: [
            {
              view: texture.createView(),
              loadValue,
              storeOp: 'store' as const,
            },
          ],
          depthStencilAttachment: {
            view: this.outputDepthStencilTexture_.createView(),
            depthLoadValue: pass.descriptor.clear ? 1 : 'load',
            depthStoreOp: 'store',
            stencilLoadValue: 1,
            stencilStoreOp: 'store',
          },
        });
        renderPass.executeBundles([pass.bundle]);
        renderPass.endPass();
      }
    }

    const commands = encoder.finish();
    device.queue.submit([commands]);
  }
}
