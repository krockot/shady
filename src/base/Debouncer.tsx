type Closure = () => void;

export class Debouncer {
  private minDelayMs_: number;
  private lastInvocationMs_: null | number;
  private pendingInvocation_: null | ReturnType<typeof setTimeout>;

  constructor(minDelayMs: number) {
    this.minDelayMs_ = minDelayMs;
    this.lastInvocationMs_ = null;
    this.pendingInvocation_ = null;
  }

  invoke(f: Closure) {
    if (this.onCooldown()) {
      this.scheduleSuppressed(f);
      return;
    }

    this.invokeInternal(f);
  }

  private clearPendingInvocation() {
    if (this.pendingInvocation_ !== null) {
      clearTimeout(this.pendingInvocation_);
    }
    this.pendingInvocation_ = null;
  }

  private invokeInternal(f: Closure) {
    this.clearPendingInvocation();
    this.lastInvocationMs_ = Date.now();
    f();
  }

  private onCooldown(): boolean {
    if (this.lastInvocationMs_ === null) {
      return false;
    }
    return Date.now() - this.lastInvocationMs_ < this.minDelayMs_;
  }

  private scheduleSuppressed(f: Closure) {
    if (this.pendingInvocation_ !== null) {
      clearTimeout(this.pendingInvocation_);
    }
    const delay = this.lastInvocationMs_! + this.minDelayMs_ - Date.now();
    this.pendingInvocation_ = setTimeout(this.invoke.bind(this, f), delay);
  }
}
