import { BufferInitializer, BufferNodeDescriptor } from '../Blueprint';
import { Resource, ResourceCache } from './ResourceCache';
import { ProgramMap } from './ProgramMap';

function fillRandomUint32Array(data: Uint32Array) {
  for (let offset = 0; offset < data.byteLength; offset += 65536) {
    const size = Math.min(65536, data.byteLength - offset);
    const view = new Uint32Array(data.buffer, offset, size / 4);
    crypto.getRandomValues(view);
  }
}

class BufferResource implements Resource {
  private readonly size_: number;
  private readonly init_: BufferInitializer;
  private readonly usage_: GPUBufferUsageFlags;
  private readonly buffer_: GPUBuffer;

  constructor(
    size: number,
    init: BufferInitializer,
    usage: GPUBufferUsageFlags,
    buffer: GPUBuffer
  ) {
    this.size_ = size;
    this.init_ = init;
    this.usage_ = usage;
    this.buffer_ = buffer;
  }

  get size() {
    return this.size_;
  }
  get init() {
    return this.init_;
  }
  get usage() {
    return this.usage_;
  }
  get buffer() {
    return this.buffer_;
  }

  dispose() {
    this.buffer_.destroy();
  }
}

class BufferCompiler {
  private readonly device_: GPUDevice;

  constructor(device: GPUDevice) {
    this.device_ = device;
  }

  getCurrentDescriptors(
    programMap: ProgramMap
  ): Iterable<BufferNodeDescriptor> {
    return programMap.buffers.values();
  }

  needsRecompile(
    newDescriptor: BufferNodeDescriptor,
    buffer: BufferResource,
    programMap: ProgramMap
  ) {
    return (
      newDescriptor.size !== buffer.size ||
      newDescriptor.init !== buffer.init ||
      programMap.bufferUsage.get(newDescriptor.id) !== buffer.usage
    );
  }

  async compile(descriptor: BufferNodeDescriptor, programMap: ProgramMap) {
    const usage = programMap.bufferUsage.get(descriptor.id);
    if (!usage) {
      // No need to do anything, this buffer isn't used by anyone.
      return null;
    }

    const mappedAtCreation = descriptor.init !== 'zero';
    const buffer = this.device_.createBuffer({
      size: descriptor.size,
      usage,
      mappedAtCreation,
    });
    if (!buffer) {
      return null;
    }

    if (mappedAtCreation) {
      const data = buffer.getMappedRange(0, descriptor.size);
      const uints = new Uint32Array(data);
      const floats = new Float32Array(data);
      fillRandomUint32Array(uints);
      if (descriptor.init === 'random-floats') {
        uints.forEach((x, i) => {
          floats[i] = x / 2 ** 31 - 1;
        });
      }
      buffer.unmap();
    }

    return new BufferResource(
      descriptor.size,
      descriptor.init ?? 'zero',
      usage,
      buffer
    );
  }
}

export type BufferCache = ResourceCache<BufferNodeDescriptor, BufferResource>;

export function createBufferCache(device: GPUDevice): BufferCache {
  return new ResourceCache<BufferNodeDescriptor, BufferResource>(
    new BufferCompiler(device)
  );
}
