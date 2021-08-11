import { ShaderDescriptor } from '../Blueprint';
import { BUILTIN_UNIFORMS_WGSL } from '../BuiltinUniforms';
import {
  CompiledResource,
  CompiledResourceCache,
} from './CompiledResourceCache';
import { ProgramMap } from './ProgramMap';

const BUILTIN_WGSL_NUM_LINES = BUILTIN_UNIFORMS_WGSL.split(/\r\n|\r|\n/).length;

export type ShaderCompilationMessageType = 'info' | 'warning' | 'error';

export interface ShaderCompilationMessage {
  message: string;
  type: ShaderCompilationMessageType;
  lineNum: number;
  linePos: number;
  offset: number;
  length: number;
}

export interface ShaderCompilationResult {
  module: null | GPUShaderModule;
  messages: ShaderCompilationMessage[];
}

export class Shader implements CompiledResource {
  private readonly code_: string;
  private readonly module_: null | GPUShaderModule;
  private readonly messages_: ShaderCompilationMessage[];

  constructor(
    code: string,
    module: null | GPUShaderModule,
    messages: ShaderCompilationMessage[]
  ) {
    this.code_ = code;
    this.module_ = module;
    this.messages_ = messages;
  }

  get code() {
    return this.code_;
  }
  get module() {
    return this.module_;
  }
  get messages() {
    return this.messages_;
  }

  dispose() {}
}

export class ShaderCompiler {
  private readonly device_: GPUDevice;

  constructor(device: GPUDevice) {
    this.device_ = device;
  }

  needsRecompile(
    newDescriptor: ShaderDescriptor,
    shader: Shader,
    programMap: ProgramMap
  ) {
    return newDescriptor.code !== shader.code;
  }

  async compile(descriptor: ShaderDescriptor, programMap: ProgramMap) {
    const module = this.device_.createShaderModule({
      code: BUILTIN_UNIFORMS_WGSL + descriptor.code,
    });
    const info = await module.compilationInfo();
    let failed = false;
    const messages = [];
    for (const message of info.messages) {
      if (message.type === 'error') {
        failed = true;
      }
      messages.push({
        message: message.message,
        type: message.type as ShaderCompilationMessageType,
        lineNum: message.lineNum - BUILTIN_WGSL_NUM_LINES,
        linePos: message.linePos,
        offset: message.offset,
        length: message.length,
      });
    }

    return new Shader(descriptor.code, failed ? null : module, messages);
  }
}

export type CompiledShaderCache = CompiledResourceCache<
  ShaderDescriptor,
  Shader
>;

export function createCompiledShaderCache(
  device: GPUDevice
): CompiledShaderCache {
  return new CompiledResourceCache<ShaderDescriptor, Shader>(
    new ShaderCompiler(device)
  );
}
