/**
 * Minimal EventBus interface for v4 hooks
 */

export interface EventBus {
  logEvent(event: {
    taskId: string;
    workerId: string;
    event: string;
    payload: any;
  }): void;
}