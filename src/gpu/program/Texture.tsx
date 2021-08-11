import { TextureNodeDescriptor } from '../Blueprint';
import {
  CompiledResource,
  CompiledResourceCache,
} from './CompiledResourceCache';
import { ProgramMap } from './ProgramMap';

export class Texture implements CompiledResource {
  private readonly imageData_: Blob;
  private readonly bitmap_: ImageBitmap;
  private readonly texture_: GPUTexture;

  constructor(imageData: Blob, bitmap: ImageBitmap, texture: GPUTexture) {
    this.imageData_ = imageData;
    this.bitmap_ = bitmap;
    this.texture_ = texture;
  }

  get imageData() {
    return this.imageData_;
  }

  get bitmap() {
    return this.bitmap_;
  }

  get texture() {
    return this.texture_;
  }

  dispose() {
    this.texture_.destroy();
  }
}

export class TextureCompiler {
  private readonly device_: GPUDevice;

  constructor(device: GPUDevice) {
    this.device_ = device;
  }

  needsRecompile(
    newDescriptor: TextureNodeDescriptor,
    texture: Texture,
    programMap: ProgramMap
  ) {
    return newDescriptor.imageData !== texture.imageData;
  }

  async compile(descriptor: TextureNodeDescriptor, programMap: ProgramMap) {
    if (!descriptor.imageData) {
      return null;
    }

    const bitmap = await createImageBitmap(descriptor.imageData);
    const size = { width: bitmap.width, height: bitmap.height };
    const texture = this.device_.createTexture({
      size,
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.device_.queue.copyExternalImageToTexture(
      { source: bitmap },
      { texture },
      size
    );
    return new Texture(descriptor.imageData, bitmap, texture);
  }
}

export type CompiledTextureCache = CompiledResourceCache<
  TextureNodeDescriptor,
  Texture
>;

export function createCompiledTextureCache(
  device: GPUDevice
): CompiledTextureCache {
  return new CompiledResourceCache<TextureNodeDescriptor, Texture>(
    new TextureCompiler(device)
  );
}
