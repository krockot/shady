import { ComputeNode, RenderNode } from '../blueprint';

export type PassType = 'render' | 'compute';

export type LinkedPass = LinkedRenderPass | LinkedComputePass;

export interface LinkedRenderPass {
  type: 'render';
  node: RenderNode;
  bundle: GPURenderBundle;
}

export interface LinkedComputePass {
  type: 'compute';
  node: ComputeNode;
  bindGroups: GPUBindGroup[];
  pipeline: GPUComputePipeline;
}

export class Executable {
  private readonly device_: GPUDevice;
  private readonly passes_: LinkedPass[];
  private outputDepthStencilTexture_: null | GPUTexture;
  private outputDepthStencilTextureSize_: GPUExtent3DDict;

  constructor(device: GPUDevice, passes: LinkedPass[]) {
    this.device_ = device;
    this.passes_ = passes;
    this.outputDepthStencilTexture_ = null;
    this.outputDepthStencilTextureSize_ = { width: 0, height: 0 };
  }

  run(texture: GPUTexture, { width, height }: GPUExtent3DDict) {
    const device = this.device_;

    // TODO: configurable depth/stencil state
    if (
      this.outputDepthStencilTexture_ === null ||
      this.outputDepthStencilTextureSize_.width !== width ||
      this.outputDepthStencilTextureSize_.height !== height
    ) {
      if (this.outputDepthStencilTexture_ !== null) {
        this.outputDepthStencilTexture_.destroy();
        this.outputDepthStencilTexture_ = null;
      }

      this.outputDepthStencilTexture_ = device.createTexture({
        size: { width, height },
        format: 'depth24plus-stencil8',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
      this.outputDepthStencilTextureSize_ = { width, height };
    }

    device.queue.submit([this.encodeCommands_(texture)]);
  }

  encodeCommands_(texture: GPUTexture) {
    const encoder = this.device_.createCommandEncoder();
    for (const pass of this.passes_) {
      switch (pass.type) {
        case 'render':
          this.encodeRenderCommands_(pass, encoder, texture);
          break;

        case 'compute':
          this.encodeComputeCommands_(pass, encoder);
          break;
      }
    }
    return encoder.finish();
  }

  encodeRenderCommands_(
    pass: LinkedRenderPass,
    encoder: GPUCommandEncoder,
    texture: GPUTexture
  ) {
    const loadValue = pass.node.clear
      ? pass.node.clearColor ?? { r: 0, g: 0, b: 0, a: 1 }
      : ('load' as const);
    const depthStencilTexture = this.outputDepthStencilTexture_!;
    const renderPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: texture.createView(),
          loadValue,
          storeOp: 'store' as const,
        },
      ],
      depthStencilAttachment: {
        view: depthStencilTexture.createView(),
        depthLoadValue: pass.node.clear ? 1 : 'load',
        depthStoreOp: 'store',
        stencilLoadValue: 1,
        stencilStoreOp: 'store',
      },
    });
    renderPass.executeBundles([pass.bundle]);
    renderPass.endPass();
  }

  encodeComputeCommands_(pass: LinkedComputePass, encoder: GPUCommandEncoder) {
    const computePass = encoder.beginComputePass();
    const dispatchSize = pass.node.dispatchSize;
    computePass.setPipeline(pass.pipeline);
    pass.bindGroups.forEach((group, i) => {
      computePass.setBindGroup(i, group);
    });
    computePass.dispatch(
      Math.max(0, dispatchSize.x),
      Math.max(0, dispatchSize.y),
      Math.max(0, dispatchSize.z)
    );
    computePass.endPass();
  }
}
