import { deepCopy, deepEquals } from '../base/Util';
import { Blueprint } from './Blueprint';
import { Gpu } from './Gpu';
import { Program, ShadersCompiledHandler } from './program/Program';

const getContextFromCanvas = (
  canvas: HTMLCanvasElement
): null | GPUCanvasContext => {
  return canvas.getContext('webgpu') as null | GPUCanvasContext;
};

export class FrameProducer {
  private gpu_: Gpu;

  private lastUsedContext_?: GPUCanvasContext;
  private lastUsedResolution_?: GPUExtent3DDict;

  private startTime_?: number;
  private lastFrameTime_?: number;
  private frame_: number;

  private blueprint_: null | Blueprint;
  private program_: null | Program;

  private onShadersCompiled_?: ShadersCompiledHandler;

  constructor() {
    this.gpu_ = new Gpu();
    this.gpu_.onAcquired = this.onGpuAcquired_;
    this.frame_ = 0;
    this.blueprint_ = null;
    this.program_ = null;
  }

  reconfigure() {}

  set onShadersCompiled(handler: ShadersCompiledHandler) {
    this.onShadersCompiled_ = handler;
    if (this.program_) {
      this.program_.onShadersCompiled = handler;
    }
  }

  setBlueprint(blueprint: Blueprint) {
    if (this.blueprint_ && deepEquals(this.blueprint_, blueprint)) {
      return;
    }

    this.blueprint_ = deepCopy(blueprint);
    if (this.program_) {
      this.program_.setBlueprint(blueprint);
    }
  }

  stop() {
    this.blueprint_ = null;
    this.program_ = null;
  }

  render(canvas: HTMLCanvasElement, resolution: GPUExtent3DDict) {
    if (!this.gpu_ || !this.gpu_.isAcquired || !this.program_) {
      return;
    }

    const context = getContextFromCanvas(canvas);
    if (context === null) {
      this.stop();
      throw new Error('no webgpu context');
    }

    const device = this.gpu_.device!;
    const outputFormat: GPUTextureFormat = context.getPreferredFormat(
      this.gpu_.adapter!
    );

    if (
      !this.lastUsedContext_ ||
      !this.lastUsedResolution_ ||
      this.lastUsedContext_ !== context ||
      this.lastUsedResolution_.width !== resolution.width ||
      this.lastUsedResolution_.height !== resolution.height
    ) {
      context.configure({
        device,
        format: outputFormat,
        size: { ...resolution },
      });
      this.lastUsedResolution_ = { ...resolution };
    }

    // This is an egregious hack to get consistent nearest-neighbor filtering on
    // a scaled-up canvas texture in Chrome. See crbug.com/1044590.
    canvas.style.filter = 'blur(0px)';

    const now = new Date().getTime();
    if (this.startTime_ === undefined) {
      this.startTime_ = now;
    }
    const delta = now - (this.lastFrameTime_ ?? now);
    this.lastFrameTime_ = now;

    this.program_.updateUniforms({
      time: (now - this.startTime_) / 1000,
      timeDelta: delta / 1000,
      frame: this.frame_++,
      resolution,
    });
    this.program_.run(context.getCurrentTexture(), resolution, outputFormat);
  }

  onGpuAcquired_ = () => {
    if (this.program_) {
      this.program_.dispose();
    }
    this.program_ = new Program(this.gpu_.device!);
    if (this.blueprint_) {
      this.program_.setBlueprint(this.blueprint_);
    }
    if (this.onShadersCompiled_) {
      this.program_.onShadersCompiled = this.onShadersCompiled_;
    }
  };
}
