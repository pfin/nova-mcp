/**
 * Thought Monitor - Real-time Pattern Detection
 *
 * Monitors character-by-character output for intervention patterns
 */
import { EventEmitter } from 'events';
export interface Pattern {
    id: string;
    pattern: RegExp;
    action: 'log' | 'warn' | 'interrupt' | 'redirect';
    message?: string;
    phase?: string;
}
export interface Detection {
    patternId: string;
    match: string;
    timestamp: number;
    action: string;
    bufferSnapshot: string;
}
export declare class ThoughtMonitor extends EventEmitter {
    private maxBufferSize;
    private buffer;
    private patterns;
    private detectionHistory;
    private lastActivity;
    private fileAccessCount;
    constructor(maxBufferSize?: number);
    private initializeDefaultPatterns;
    /**
     * Process a character of output
     */
    processChar(char: string): void;
    /**
     * Process a chunk of output
     */
    processChunk(chunk: string): void;
    /**
     * Check for pattern matches
     */
    private checkPatterns;
    /**
     * Track file access patterns
     */
    private trackFileAccess;
    /**
     * Check for stalls
     */
    checkStall(threshold?: number): boolean;
    /**
     * Add custom pattern
     */
    addPattern(pattern: Pattern): void;
    /**
     * Get detection history
     */
    getHistory(): Detection[];
    /**
     * Clear buffer and history
     */
    reset(): void;
    /**
     * Get current buffer
     */
    getBuffer(): string;
}
export declare function createThoughtMonitor(maxBufferSize?: number): ThoughtMonitor;
//# sourceMappingURL=thought-monitor.d.ts.map