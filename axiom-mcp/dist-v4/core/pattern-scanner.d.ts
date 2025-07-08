/**
 * Pattern Scanner - Real-time regex scanning system for intervention
 *
 * This is the heart of Axiom's intervention system. It scans output
 * in real-time and emits events when patterns are detected.
 */
import { EventEmitter } from 'events';
export interface PatternRule {
    id: string;
    pattern: RegExp;
    action: string;
    priority: number;
    cooldown?: number;
    frequency?: number;
    description: string;
}
export interface PatternMatch {
    ruleId: string;
    match: RegExpMatchArray;
    action: string;
    priority: number;
    timestamp: number;
    context: string;
}
export declare class PatternScanner extends EventEmitter {
    private patterns;
    private cooldowns;
    private buffer;
    private scanInterval;
    private lastScanPosition;
    constructor();
    private initializeDefaultPatterns;
    addPattern(rule: PatternRule): void;
    removePattern(id: string): void;
    scan(text: string): PatternMatch[];
    private getContext;
    startPeriodicScan(interval?: number): void;
    stopPeriodicScan(): void;
    reset(): void;
    getStats(): {
        patternsLoaded: number;
        bufferSize: number;
        scanPosition: number;
        activeCooldowns: number;
    };
}
export declare const ACTIONS: {
    INTERRUPT_STOP_PLANNING: {
        interrupt: boolean;
        message: string;
        severity: string;
    };
    INTERRUPT_STOP_RESEARCH: {
        interrupt: boolean;
        message: string;
        severity: string;
    };
    INTERRUPT_IMPLEMENT_TODO: {
        interrupt: boolean;
        message: string;
        severity: string;
    };
    INTERRUPT_PICK_ONE: {
        interrupt: boolean;
        message: string;
        severity: string;
    };
    INTERRUPT_STOP_ASKING: {
        interrupt: boolean;
        message: string;
        severity: string;
    };
    TRACK_FILE_CREATED: {
        interrupt: boolean;
        track: boolean;
        severity: string;
    };
    TRACK_CODE_BLOCK: {
        interrupt: boolean;
        track: boolean;
        severity: string;
    };
    HANDLE_ERROR: {
        interrupt: boolean;
        analyze: boolean;
        severity: string;
    };
    CHECK_LANGUAGE_REQUIREMENT: {
        interrupt: boolean;
        analyze: boolean;
        severity: string;
    };
    VERIFY_COMPLETION: {
        interrupt: boolean;
        verify: boolean;
        severity: string;
    };
};
//# sourceMappingURL=pattern-scanner.d.ts.map