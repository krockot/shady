import { Blueprint } from './Blueprint';
import {
  CompiledResourceBundle,
  createCompiledResourceBundle,
} from './program/CompiledResourceBundle';
import { Executable } from './program/Executable';
import { linkProgram } from './program/Linker';
import { generateProgramMap } from './program/ProgramMap';
import { ShaderCompilationMessage } from './program/Shader';

export type ShaderCompilationResults = Map<string, ShaderCompilationMessage[]>;

export type ShadersCompiledHandler = (
  results: ShaderCompilationResults
) => void;

export class Program {
  private readonly device_: GPUDevice;
  private readonly builtinUniforms_: GPUBuffer;
  private resources_: CompiledResourceBundle;
  private executable_: null | Executable;
  private blueprint_: null | Blueprint;
  private lastCompile_: null | Promise<CompiledResourceBundle>;
  private outputFormat_: GPUTextureFormat;
  private onShadersCompiled_: null | ShadersCompiledHandler;

  constructor(device: GPUDevice) {
    this.device_ = device;
    this.builtinUniforms_ = device.createBuffer({
      size: 24,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.executable_ = null;
    this.blueprint_ = null;
    this.lastCompile_ = null;
    this.resources_ = createCompiledResourceBundle(device);
    this.outputFormat_ = 'bgra8unorm';
    this.onShadersCompiled_ = null;
  }

  get resources() {
    return this.resources_;
  }

  set onShadersCompiled(handler: null | ShadersCompiledHandler) {
    this.onShadersCompiled_ = handler;
  }

  dispose() {
    this.builtinUniforms_.destroy();
    this.resources_.shaders.dispose();
    this.resources_.buffers.dispose();
    this.resources_.textures.dispose();
    this.resources_.samplers.dispose();
  }

  setBlueprint(blueprint: Blueprint) {
    this.blueprint_ = blueprint;
    this.compile_();
  }

  updateUniforms(uniforms: Record<string, any>) {
    const device = this.device_;
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

  run(
    texture: GPUTexture,
    resolution: GPUExtent3DDict,
    outputFormat: GPUTextureFormat
  ) {
    if (this.outputFormat_ !== outputFormat && this.blueprint_ !== null) {
      this.executable_ = null;
      this.outputFormat_ = outputFormat;
      this.compile_();
      return;
    }

    if (this.executable_ === null) {
      return;
    }

    this.executable_.run(texture, resolution);
  }

  async compile_() {
    const blueprint = this.blueprint_!;
    const thisCompile = this.doCompile_(blueprint);
    this.lastCompile_ = thisCompile;
    const newResources = await thisCompile;
    if (this.lastCompile_ !== thisCompile) {
      return;
    }

    this.resources_.shaders.releaseKeysAndDisposeRemainder(
      newResources.shaders.keys
    );
    this.resources_.buffers.releaseKeysAndDisposeRemainder(
      newResources.buffers.keys
    );
    this.resources_.textures.releaseKeysAndDisposeRemainder(
      newResources.textures.keys
    );
    this.resources_.samplers.releaseKeysAndDisposeRemainder(
      newResources.samplers.keys
    );
    this.resources_ = newResources;
    if (this.onShadersCompiled_) {
      const results = new Map();
      for (const [uuid, shader] of this.resources_.shaders.entries) {
        results.set(uuid, shader.messages);
      }
      this.onShadersCompiled_(results);
    }
    this.executable_ = linkProgram(
      this.device_,
      this.builtinUniforms_,
      this.outputFormat_,
      this.resources_,
      blueprint
    );
  }

  async doCompile_(blueprint: Blueprint): Promise<CompiledResourceBundle> {
    const programMap = generateProgramMap(blueprint);
    const shaders = this.resources_.shaders.compile(
      programMap.shaders.values(),
      programMap
    );
    const buffers = this.resources_.buffers.compile(
      programMap.buffers.values(),
      programMap
    );
    const textures = this.resources_.textures.compile(
      programMap.textures.values(),
      programMap
    );
    const samplers = this.resources_.samplers.compile(
      programMap.samplers.values(),
      programMap
    );
    return {
      programMap,
      shaders: await shaders,
      buffers: await buffers,
      textures: await textures,
      samplers: await samplers,
    };
  }
}
