import { deepCopy, deepEquals } from '../base/Util';
import { Blueprint } from './Blueprint';
import { CompileResult, Executable } from './Executable';
import { Gpu } from './Gpu';

interface Resolution {
  width: number;
  height: number;
}

const getContextFromCanvas = (
  canvas: HTMLCanvasElement
): null | GPUCanvasContext => {
  const context = canvas.getContext('webgpu');
  if (context === null) {
    return null;
  }

  // @ts-ignore
  return context as GPUCanvasContext;
};

export class FrameProducer {
  private gpu_: Gpu;
  private preferredTargetTextureFormat_: GPUTextureFormat;

  private lastUsedContext_?: GPUCanvasContext;
  private lastUsedResolution_?: Resolution;

  private startTime_?: number;
  private lastFrameTime_?: number;
  private frame_: number;

  private blueprint_: null | Blueprint;
  private lastCompiledDescriptor_: null | Blueprint;
  private mostRecentPendingCompile_: null | Promise<CompileResult>;
  private executable_: null | Executable;

  onShadersCompiled?: (info: Record<string, GPUCompilationInfo>) => void;

  constructor() {
    this.gpu_ = new Gpu();
    this.gpu_.onAcquired = this.onGpuAcquired_;

    this.frame_ = 0;

    this.blueprint_ = null;
    this.lastCompiledDescriptor_ = null;
    this.mostRecentPendingCompile_ = null;
    this.executable_ = null;

    this.preferredTargetTextureFormat_ = 'bgra8unorm';
  }

  reconfigure() {
    this.lastCompiledDescriptor_ = null;
    this.executable_ = null;
    this.tryCompile_();
  }

  setBlueprint(blueprint: Blueprint) {
    if (this.blueprint_ && deepEquals(this.blueprint_, blueprint)) {
      return;
    }

    this.blueprint_ = deepCopy(blueprint);
    this.executable_ = null;
    this.tryCompile_();
  }

  stop() {
    this.blueprint_ = null;
    this.executable_ = null;
  }

  render(canvas: HTMLCanvasElement, resolution: Resolution) {
    if (!this.gpu_ || !this.gpu_.isAcquired) {
      return null;
    }

    const context = getContextFromCanvas(canvas);
    if (context === null) {
      this.stop();
      throw new Error('no webgpu context');
    }

    const device = this.gpu_.device!;
    const outputFormat: GPUTextureFormat =
      // @ts-ignore
      context.getPreferredFormat(this.gpu_.adapter!);

    if (
      !this.lastUsedContext_ ||
      !this.lastUsedResolution_ ||
      this.lastUsedContext_ !== context ||
      this.lastUsedResolution_.width !== resolution.width ||
      this.lastUsedResolution_.height !== resolution.height
    ) {
      // @ts-ignore
      context.configure({
        device,
        format: outputFormat,
        size: { ...resolution },
      });
      this.lastUsedResolution_ = { ...resolution };
    }

    if (this.preferredTargetTextureFormat_ !== outputFormat) {
      this.preferredTargetTextureFormat_ = outputFormat;
      this.executable_ = null;
    }

    if (!this.executable_) {
      this.tryCompile_();
      return;
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
    this.executable_.updateUniforms({
      time: (now - this.startTime_) / 1000,
      timeDelta: delta / 1000,
      frame: this.frame_++,
      resolution,
    });

    // @ts-ignore
    const target = context.getCurrentTexture() as GPUTexture;
    this.executable_.execute(target);
  }

  onGpuAcquired_ = () => {
    this.executable_ = null;
    this.tryCompile_();
  };

  tryCompile_ = async () => {
    if (!this.gpu_.isAcquired || !this.blueprint_) {
      return;
    }

    if (
      this.lastCompiledDescriptor_ &&
      deepEquals(this.lastCompiledDescriptor_, this.blueprint_)
    ) {
      return;
    }

    const descriptor = this.blueprint_;
    const thisCompile = Executable.compile(
      this.gpu_,
      descriptor,
      this.preferredTargetTextureFormat_
    );
    this.mostRecentPendingCompile_ = thisCompile;
    const result = await thisCompile;
    if (thisCompile !== this.mostRecentPendingCompile_) {
      return;
    }

    this.lastCompiledDescriptor_ = descriptor;
    this.mostRecentPendingCompile_ = null;
    if (this.onShadersCompiled) {
      this.onShadersCompiled(result.shaderInfo);
    }
    this.executable_ = result.executable ?? null;
  };
}
