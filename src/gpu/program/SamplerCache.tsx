import { SamplerNode } from '../Blueprint';
import { Resource, ResourceCache } from './ResourceCache';
import { ProgramMap } from './ProgramMap';

class SamplerResource implements Resource {
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

  getCurrentDescriptors(programMap: ProgramMap): Iterable<SamplerNode> {
    return programMap.samplers.values();
  }

  needsRecompile(
    newDescriptor: SamplerNode,
    sampler: SamplerResource,
    programMap: ProgramMap
  ) {
    return false;
  }

  async compile(descriptor: SamplerNode, programMap: ProgramMap) {
    return new SamplerResource(this.device_.createSampler());
  }
}

export type SamplerCache = ResourceCache<SamplerNode, SamplerResource>;

export function createSamplerCache(device: GPUDevice): SamplerCache {
  return new ResourceCache<SamplerNode, SamplerResource>(
    new SamplerCompiler(device)
  );
}
