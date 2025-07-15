/**
 * Thought Monitor - Real-time pattern detection for Claude's output stream
 *
 * Monitors character-by-character PTY output to detect:
 * - Planning behavior in execution phase
 * - Research loops
 * - TODO violations
 * - Success patterns
 * - Stall patterns
 */
import { EventEmitter } from 'events';
export interface ThoughtPattern {
    type: 'planning' | 'research-loop' | 'todo-violation' | 'success' | 'stall';
    pattern: string | RegExp;
    description: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    action?: 'log' | 'warn' | 'interrupt' | 'redirect';
}
export interface DetectedThought {
    pattern: ThoughtPattern;
    matched: string;
    timestamp: number;
    context: string;
    streamPosition: number;
}
export interface ThoughtMonitorConfig {
    bufferSize?: number;
    stallTimeout?: number;
    contextWindow?: number;
    debugMode?: boolean;
}
export declare class ThoughtMonitor extends EventEmitter {
    private config;
    private buffer;
    private readonly patterns;
    private lastActivityTime;
    private stallTimer?;
    private streamPosition;
    private recentMatches;
    private fileAccessLog;
    constructor(config?: ThoughtMonitorConfig);
    private initializePatterns;
    addPattern(pattern: ThoughtPattern): void;
    removePattern(type: string, pattern: string | RegExp): void;
    /**
     * Process a character from the PTY stream
     */
    processChar(char: string): void;
    /**
     * Process a chunk of text (for batch processing)
     */
    processChunk(chunk: string): void;
    private checkPatterns;
    private checkFileAccessPatterns;
    private getContext;
    private handleDetection;
    private startStallDetection;
    /**
     * Get current statistics
     */
    getStats(): {
        streamPosition: number;
        bufferSize: number;
        detectionCounts: Record<string, number>;
        lastActivityTime: number;
    };
    /**
     * Reset the monitor state
     */
    reset(): void;
    /**
     * Clean up resources
     */
    destroy(): void;
}
export declare function createThoughtMonitor(config?: ThoughtMonitorConfig): ThoughtMonitor;
//# sourceMappingURL=thought-monitor.d.ts.map