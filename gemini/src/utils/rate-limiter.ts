export class RateLimiter {
  private lastCallTime: number = 0;
  private delayMs: number;

  constructor(delaySeconds: number) {
    this.delayMs = delaySeconds * 1000;
  }

  async wait(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;
    
    if (timeSinceLastCall < this.delayMs) {
      const waitTime = this.delayMs - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastCallTime = Date.now();
  }

  updateDelay(delaySeconds: number): void {
    this.delayMs = delaySeconds * 1000;
  }
}