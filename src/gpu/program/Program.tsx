import { Blueprint, ShaderID } from '../Blueprint';
import { ResourceBundle } from './ResourceBundle';
import { Executable } from './Executable';
import { linkProgram } from './Linker';
import { ShaderCompilationMessage } from './ShaderCache';

export type ShaderCompilationResults = Map<
  ShaderID,
  ShaderCompilationMessage[]
>;

export type ShadersCompiledHandler = (
  results: ShaderCompilationResults
) => void;

export class Program {
  private readonly device_: GPUDevice;
  private readonly builtinUniforms_: GPUBuffer;
  private resources_: ResourceBundle;
  private executable_: null | Executable;
  private blueprint_: null | Blueprint;
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
    this.resources_ = new ResourceBundle(device);
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
    this.resources_.dispose();
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
    await this.resources_.update(blueprint);
    if (this.onShadersCompiled_) {
      const results = new Map();
      for (const [id, shader] of this.resources_.shaders.entries()) {
        results.set(id, shader.messages);
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
}
