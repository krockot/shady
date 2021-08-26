import { objectPromiseAll } from '../../base/util';
import { Blueprint } from '../blueprint';
import { BufferCache, createBufferCache } from './buffer_cache';
import { SamplerCache, createSamplerCache } from './sampler_cache';
import { ShaderCache, createShaderCache } from './shader_cache';
import { TextureCache, createTextureCache } from './texture_cache';
import { ProgramMap } from './program_map';

interface Caches {
  readonly shaders: ShaderCache;
  readonly buffers: BufferCache;
  readonly textures: TextureCache;
  readonly samplers: SamplerCache;
}

export class ResourceBundle {
  private device_: GPUDevice;
  private lastCompile_: null | Promise<Caches>;
  private caches_: Caches;
  private programMap_: null | ProgramMap;

  constructor(device: GPUDevice) {
    this.device_ = device;
    this.lastCompile_ = null;
    this.caches_ = {
      shaders: createShaderCache(device),
      buffers: createBufferCache(device),
      textures: createTextureCache(device),
      samplers: createSamplerCache(device),
    };
    this.programMap_ = null;
  }

  dispose() {
    this.caches_.shaders.dispose();
    this.caches_.buffers.dispose();
    this.caches_.textures.dispose();
    this.caches_.samplers.dispose();
  }

  get programMap() {
    return this.programMap_;
  }

  get shaders() {
    return this.caches_.shaders;
  }
  get buffers() {
    return this.caches_.buffers;
  }
  get textures() {
    return this.caches_.textures;
  }
  get samplers() {
    return this.caches_.samplers;
  }

  async update(blueprint: Blueprint) {
    const programMap = new ProgramMap(blueprint);
    const thisCompile = this.doCompile_(programMap);
    this.lastCompile_ = thisCompile;
    const newResources = await thisCompile;
    if (this.lastCompile_ !== thisCompile) {
      await this.lastCompile_!;
      return;
    }
    this.programMap_ = programMap;
    this.caches_.shaders.replace(newResources.shaders);
    this.caches_.buffers.replace(newResources.buffers);
    this.caches_.textures.replace(newResources.textures);
    this.caches_.samplers.replace(newResources.samplers);
  }

  async doCompile_(programMap: ProgramMap): Promise<Caches> {
    const shaders = this.caches_.shaders.compile(programMap);
    const buffers = this.caches_.buffers.compile(programMap);
    const textures = this.caches_.textures.compile(programMap);
    const samplers = this.caches_.samplers.compile(programMap);
    return await objectPromiseAll({ shaders, buffers, textures, samplers });
  }
}
