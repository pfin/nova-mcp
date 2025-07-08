/**
 * Stream Interceptor for real-time monitoring and intervention
 * Intercepts PTY output streams and can inject commands
 */
import { Transform } from 'stream';
import { ViolationEvent } from './rule-engine.js';
export interface InterceptorOptions {
    taskId: string;
    enableIntervention: boolean;
    violationThreshold?: number;
}
export declare class StreamInterceptor extends Transform {
    private options;
    private onIntervention?;
    private buffer;
    private violations;
    private hasIntervened;
    private eventEmitter;
    constructor(options: InterceptorOptions, onIntervention?: (message: string) => void);
    _transform(chunk: Buffer, encoding: string, callback: Function): void;
    _flush(callback: Function): void;
    private handleViolation;
    private intervene;
    /**
     * Force an intervention with a custom message
     */
    forceIntervention(message: string): void;
    /**
     * Get all violations detected
     */
    getViolations(): ViolationEvent[];
    /**
     * Subscribe to interceptor events
     */
    onInterceptorEvent(event: 'line' | 'violation' | 'intervention', listener: (...args: any[]) => void): void;
    /**
     * Reset intervention state
     */
    reset(): void;
}
/**
 * Create a monitoring pipeline for a PTY stream
 */
export declare function createMonitoringPipeline(taskId: string, enableIntervention?: boolean, onIntervention?: (message: string) => void): StreamInterceptor;
//# sourceMappingURL=stream-interceptor.d.ts.map