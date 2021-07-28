type Closure = () => void;

export class Debouncer {
  private minDelayMs: number;
  private lastInvocationMs: null | number;
  private pendingInvocation: null | ReturnType<typeof setTimeout>;

  constructor(minDelayMs: number) {
    this.minDelayMs = minDelayMs;
    this.lastInvocationMs = null;
    this.pendingInvocation = null;
  }

  invoke(f: Closure) {
    if (this.onCooldown()) {
      this.scheduleSuppressed(f);
      return;
    }

    this.invokeInternal(f);
  }

  private clearPendingInvocation() {
    if (this.pendingInvocation !== null) {
      clearTimeout(this.pendingInvocation);
    }
    this.pendingInvocation = null;
  }

  private invokeInternal(f: Closure) {
    this.clearPendingInvocation();
    this.lastInvocationMs = Date.now();
    f();
  }

  private onCooldown(): boolean {
    if (this.lastInvocationMs === null) {
      return false;
    }
    return Date.now() - this.lastInvocationMs < this.minDelayMs;
  }

  private scheduleSuppressed(f: Closure) {
    if (this.pendingInvocation !== null) {
      return;
    }
    const delay = this.lastInvocationMs! + this.minDelayMs - Date.now();
    this.pendingInvocation = setTimeout(this.invoke.bind(this, f), delay);
  }
}
