import { objectPromiseAll } from '../../base/Util';
import { Blueprint } from '../Blueprint';
import { CompiledBufferCache, createCompiledBufferCache } from './Buffer';
import { CompiledSamplerCache, createCompiledSamplerCache } from './Sampler';
import { CompiledShaderCache, createCompiledShaderCache } from './Shader';
import { CompiledTextureCache, createCompiledTextureCache } from './Texture';
import { ProgramMap } from './ProgramMap';

interface Caches {
  readonly shaders: CompiledShaderCache;
  readonly buffers: CompiledBufferCache;
  readonly textures: CompiledTextureCache;
  readonly samplers: CompiledSamplerCache;
}

export class CompiledResourceBundle {
  private device_: GPUDevice;
  private lastCompile_: null | Promise<CompiledResourceBundle>;
  private caches_: Caches;

  public programMap: null | ProgramMap;

  constructor(device: GPUDevice, programMap?: ProgramMap, caches?: Caches) {
    this.device_ = device;
    this.lastCompile_ = null;
    if (!caches) {
      this.caches_ = {
        shaders: createCompiledShaderCache(device),
        buffers: createCompiledBufferCache(device),
        textures: createCompiledTextureCache(device),
        samplers: createCompiledSamplerCache(device),
      };
    } else {
      this.caches_ = caches;
    }

    this.programMap = programMap ?? null;
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

  async compile(blueprint: Blueprint): Promise<CompiledResourceBundle> {
    const thisCompile = this.doCompile_(blueprint);
    this.lastCompile_ = thisCompile;
    const newResources = await thisCompile;
    if (this.lastCompile_ !== thisCompile) {
      return this.lastCompile_!;
    }

    this.caches_.shaders.releaseKeysAndDisposeRemainder(
      newResources.shaders.keys
    );
    this.caches_.buffers.releaseKeysAndDisposeRemainder(
      newResources.buffers.keys
    );
    this.caches_.textures.releaseKeysAndDisposeRemainder(
      newResources.textures.keys
    );
    this.caches_.samplers.releaseKeysAndDisposeRemainder(
      newResources.samplers.keys
    );
    return newResources;
  }

  async doCompile_(blueprint: Blueprint): Promise<CompiledResourceBundle> {
    const programMap = new ProgramMap(blueprint);
    const shaders = this.caches_.shaders.compile(
      programMap.shaders.values(),
      programMap
    );
    const buffers = this.caches_.buffers.compile(
      programMap.buffers.values(),
      programMap
    );
    const textures = this.caches_.textures.compile(
      programMap.textures.values(),
      programMap
    );
    const samplers = this.caches_.samplers.compile(
      programMap.samplers.values(),
      programMap
    );
    return new CompiledResourceBundle(
      this.device_,
      programMap,
      await objectPromiseAll({ shaders, buffers, textures, samplers })
    );
  }
}
