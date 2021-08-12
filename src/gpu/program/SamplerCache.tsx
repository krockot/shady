import { SamplerNodeDescriptor } from '../Blueprint';
import { Resource, ResourceCache } from './ResourceCache';
import { ProgramMap } from './ProgramMap';

export class Sampler implements Resource {
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

  getCurrentDescriptors(
    programMap: ProgramMap
  ): Iterable<SamplerNodeDescriptor> {
    return programMap.samplers.values();
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

export type SamplerCache = ResourceCache<SamplerNodeDescriptor, Sampler>;

export function createSamplerCache(device: GPUDevice): SamplerCache {
  return new ResourceCache<SamplerNodeDescriptor, Sampler>(
    new SamplerCompiler(device)
  );
}
