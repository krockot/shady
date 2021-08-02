import {
  Blueprint,
  BindingNodeDescriptor,
  BufferNodeDescriptor,
  RenderNodeDescriptor,
  ComputeNodeDescriptor,
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

export class Executable {
  private gpu_: Gpu;
  private blueprint_: Blueprint;
  private shaders_: Record<string, GPUShaderModule>;
  private shaderInfo_: Record<string, ShaderCompilationInfo>;
  private builtinUniforms_: null | GPUBuffer;
  private buffers_: Record<string, GPUBuffer>;
  private renderPasses_: Record<string, CompiledRenderPass>;
  private computePasses_: Record<string, CompiledComputePass>;

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
    this.renderPasses_ = {};
    this.computePasses_ = {};
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
      shaderInfo[id] = { messages: info.messages.map(m => ({ ...m })) };

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
    let messages = await executable.compile_(outputFormat);
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

    const pipelineBindGroups: Record<string, PipelineBindGroup[]> = {};
    const bufferUsageFlags: Record<string, GPUBufferUsageFlags> = {};
    const collectResourceUsage = (
      pipelineId: string,
      visibility: GPUShaderStageFlags,
      bindings: string[]
    ) => {
      for (const id of bindings) {
        const descriptor = this.blueprint_.nodes[id] as BindingNodeDescriptor;
        if (!descriptor.resourceId || descriptor.passes.length === 0) {
          continue;
        }

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
        bindGroup.bindings.set(descriptor.binding, descriptor.resourceId);

        switch (descriptor.bindingType) {
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

          case 'sampler':
            entry.sampler = {};
            break;

          case 'texture':
            entry.texture = {};
            break;
        }

        if (usageFlags !== 0) {
          bufferUsageFlags[descriptor.resourceId] =
            (bufferUsageFlags[descriptor.resourceId] ?? 0) | usageFlags;
        }
      }
    };

    const buffers: Record<string, BufferNodeDescriptor> = {};
    const renders: Record<string, RenderNodeDescriptor> = {};
    const computes: Record<string, ComputeNodeDescriptor> = {};
    for (const [id, node] of Object.entries(this.blueprint_.nodes)) {
      switch (node.type) {
        case 'buffer':
          buffers[id] = node;
          break;

        case 'render':
          renders[id] = node;
          collectResourceUsage(
            id,
            GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            node.bindings
          );
          break;

        case 'compute':
          computes[id] = node;
          collectResourceUsage(id, GPUShaderStage.COMPUTE, node.bindings);
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
      this.renderPasses_[id] = {
        type: 'render',
        descriptor: node,
        bundle: encoder.finish(),
      };
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
      this.computePasses_[id] = {
        type: 'compute',
        descriptor: node,
        bindGroups,
        pipeline,
      };
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

    // TODO: Do something less cheesy than simply interleaving compute and
    // render passes arbitrarily.

    const passes: (CompiledComputePass | CompiledRenderPass)[] = [];
    const computePasses = Object.values(this.computePasses_);
    const renderPasses = Object.values(this.renderPasses_);
    while (computePasses.length || renderPasses.length) {
      if (computePasses.length) {
        passes.push(computePasses.shift()!);
      }
      if (renderPasses.length) {
        passes.push(renderPasses.shift()!);
      }
    }

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

    for (const pass of passes) {
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
              // @ts-ignore
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
