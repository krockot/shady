import { SamplerNodeDescriptor } from '../Blueprint';
import {
  CompiledResource,
  CompiledResourceCache,
} from './CompiledResourceCache';
import { ProgramMap } from './ProgramMap';

export class Sampler implements CompiledResource {
  private readonly sampler_: GPUSampler;

  constructor(sampler: GPUSampler) {
    this.sampler_ = sampler;
  }

  get sampler() {
    return this.sampler_;
  }

  dispose() {}
}

export class SamplerCompiler {
  private readonly device_: GPUDevice;

  constructor(device: GPUDevice) {
    this.device_ = device;
  }

  needsRecompile(
    newDescriptor: SamplerNodeDescriptor,
    sampler: Sampler,
    programMap: ProgramMap
  ) {
    return false;
  }

  async compile(descriptor: SamplerNodeDescriptor, programMap: ProgramMap) {
    return new Sampler(this.device_.createSampler());
  }
}

export type CompiledSamplerCache = CompiledResourceCache<
  SamplerNodeDescriptor,
  Sampler
>;

export function createCompiledSamplerCache(
  device: GPUDevice
): CompiledSamplerCache {
  return new CompiledResourceCache<SamplerNodeDescriptor, Sampler>(
    new SamplerCompiler(device)
  );
}
