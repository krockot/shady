const REACQUIRE_ON_LOST_DELAY_MS = 1000;

type AcquiredHandler = (() => void) | (() => Promise<void>);
type LostHandler = (() => void) | (() => Promise<void>);

export class Gpu {
  private adapter_: null | GPUAdapter;
  private device_: null | GPUDevice;
  private lost_: boolean;
  private pendingAcquisition_: null | Promise<void>;

  onAcquired: null | AcquiredHandler;
  onLost: null | LostHandler;

  constructor() {
    this.adapter_ = null;
    this.device_ = null;
    this.lost_ = false;
    this.pendingAcquisition_ = null;
    this.onAcquired = null;
    this.onLost = null;
    this.acquire();
  }

  get isAcquired() {
    return this.adapter_ !== null;
  }
  get isLost() {
    return !this.isAcquired;
  }
  get adapter() {
    return this.adapter_;
  }
  get device() {
    return this.device_;
  }

  acquire = async () => {
    if (this.pendingAcquisition_ === null) {
      this.pendingAcquisition_ = this.acquireInternal_();
    }
    return this.pendingAcquisition_;
  };

  release = () => {
    if (!this.isAcquired) {
      throw new Error('not acquired');
    }

    this.adapter_ = null;
    this.device_ = null;
  };

  async acquireInternal_() {
    if (this.isAcquired) {
      throw new Error('already acquired.');
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error('no webgpu adapter available');
    }

    try {
      const device = await adapter.requestDevice();
      if (!device) {
        throw new Error('no webgpu device available');
      }
      this.device_ = device;
    } catch (e) {
      console.log(e);
    }

    this.pendingAcquisition_ = null;
    this.adapter_ = adapter;
    this.device_!.lost.then(this.onLost_);
    if (this.onAcquired !== null) {
      await this.onAcquired();
    }
  }

  onLost_ = async () => {
    console.warn('Lost GPU. Reacquiring after short delay...');

    this.adapter_ = null;
    this.device_ = null;
    if (this.onLost != null) {
      await this.onLost();
    }
    await new Promise(resolve =>
      setTimeout(resolve, REACQUIRE_ON_LOST_DELAY_MS)
    );
  };
}
