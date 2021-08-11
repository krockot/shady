import { CompiledBufferCache, createCompiledBufferCache } from './Buffer';
import { ProgramMap } from './ProgramMap';
import { CompiledSamplerCache, createCompiledSamplerCache } from './Sampler';
import { CompiledShaderCache, createCompiledShaderCache } from './Shader';
import { CompiledTextureCache, createCompiledTextureCache } from './Texture';

export interface CompiledResourceBundle {
  programMap: null | ProgramMap;
  shaders: CompiledShaderCache;
  buffers: CompiledBufferCache;
  textures: CompiledTextureCache;
  samplers: CompiledSamplerCache;
}

export function createCompiledResourceBundle(device: GPUDevice) {
  return {
    programMap: null,
    shaders: createCompiledShaderCache(device),
    buffers: createCompiledBufferCache(device),
    textures: createCompiledTextureCache(device),
    samplers: createCompiledSamplerCache(device),
  };
}
