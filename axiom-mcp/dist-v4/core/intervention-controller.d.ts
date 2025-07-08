/**
 * Intervention Controller - Orchestrates responses to pattern detection
 *
 * This controller receives pattern match events and decides what actions
 * to take, including interrupting Claude instances or tracking progress.
 */
import { EventEmitter } from 'events';
import { PatternScanner, PatternMatch } from './pattern-scanner.js';
export interface InterventionEvent {
    taskId: string;
    instanceId?: string;
    match: PatternMatch;
    action: string;
    timestamp: number;
    handled: boolean;
}
export interface InterventionStats {
    totalInterventions: number;
    interventionsByAction: Map<string, number>;
    successfulInterventions: number;
    failedInterventions: number;
    averageResponseTime: number;
}
export declare class InterventionController extends EventEmitter {
    private scanner;
    private activeInterventions;
    private stats;
    private responseTimings;
    constructor();
    private setupEventHandlers;
    processOutput(taskId: string, output: string, instanceId?: string): PatternMatch[];
    private handlePatternMatch;
    private handleSpecificAction;
    markHandled(taskId: string, action: string, success?: boolean): void;
    getTaskHistory(taskId: string): InterventionEvent[];
    getStats(): InterventionStats;
    clearTask(taskId: string): void;
    reset(): void;
    addPattern(pattern: Parameters<PatternScanner['addPattern']>[0]): void;
    startScanning(interval?: number): void;
    stopScanning(): void;
    getSummaryReport(): {
        totalInterventions: number;
        successRate: string;
        averageResponseTime: string;
        topActions: [string, number][];
        activeTasks: number;
        scannerStats: {
            patternsLoaded: number;
            bufferSize: number;
            scanPosition: number;
            activeCooldowns: number;
        };
    };
}
export declare function createInterventionController(): InterventionController;
//# sourceMappingURL=intervention-controller.d.ts.map