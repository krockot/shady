import { TextureNodeDescriptor } from '../Blueprint';
import { Resource, ResourceCache } from './ResourceCache';
import { ProgramMap } from './ProgramMap';

class TextureResource implements Resource {
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

  getCurrentDescriptors(
    programMap: ProgramMap
  ): Iterable<TextureNodeDescriptor> {
    return programMap.textures.values();
  }

  needsRecompile(
    newDescriptor: TextureNodeDescriptor,
    texture: TextureResource,
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
    return new TextureResource(descriptor.imageData, bitmap, texture);
  }
}

export type TextureCache = ResourceCache<
  TextureNodeDescriptor,
  TextureResource
>;

export function createTextureCache(device: GPUDevice): TextureCache {
  return new ResourceCache<TextureNodeDescriptor, TextureResource>(
    new TextureCompiler(device)
  );
}
