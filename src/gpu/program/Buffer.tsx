import { BufferInitializer, BufferNodeDescriptor } from '../Blueprint';
import {
  CompiledResource,
  CompiledResourceCache,
} from './CompiledResourceCache';
import { ProgramMap } from './ProgramMap';

function fillRandomUint32Array(data: Uint32Array) {
  for (let offset = 0; offset < data.byteLength; offset += 65536) {
    const size = Math.min(65536, data.byteLength - offset);
    const view = new Uint32Array(data.buffer, offset, size / 4);
    crypto.getRandomValues(view);
  }
}

export class Buffer implements CompiledResource {
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

export class BufferCompiler {
  private readonly device_: GPUDevice;

  constructor(device: GPUDevice) {
    this.device_ = device;
  }

  needsRecompile(
    newDescriptor: BufferNodeDescriptor,
    buffer: Buffer,
    programMap: ProgramMap
  ) {
    return (
      newDescriptor.size !== buffer.size ||
      newDescriptor.init !== buffer.init ||
      programMap.bufferUsage.get(newDescriptor.uuid) !== buffer.usage
    );
  }

  async compile(descriptor: BufferNodeDescriptor, programMap: ProgramMap) {
    const usage = programMap.bufferUsage.get(descriptor.uuid);
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

    return new Buffer(
      descriptor.size,
      descriptor.init ?? 'zero',
      usage,
      buffer
    );
  }
}

export type CompiledBufferCache = CompiledResourceCache<
  BufferNodeDescriptor,
  Buffer
>;

export function createCompiledBufferCache(
  device: GPUDevice
): CompiledBufferCache {
  return new CompiledResourceCache<BufferNodeDescriptor, Buffer>(
    new BufferCompiler(device)
  );
}
