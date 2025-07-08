/**
 * Interrupt Handler Hook
 * Detects interrupt commands and injects new instructions
 */
import { Hook } from '../core/hook-orchestrator.js';
export declare const interruptHandlerHook: Hook;
export declare function sendInterrupt(taskId: string, interruptType: string): string;
export declare function getInterruptStats(): Record<string, any>;
export default interruptHandlerHook;
//# sourceMappingURL=interrupt-handler-hook.d.ts.map