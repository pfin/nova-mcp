/**
 * Parallel Execution Observatory - The heart of Axiom
 *
 * Runs multiple Claude instances in parallel, observes their output,
 * kills bad paths before toxic completion, amplifies successful paths.
 */
import { EventEmitter } from 'events';
import { IPty } from 'node-pty';
import { PatternScanner } from './pattern-scanner.js';
import { InterventionController } from './intervention-controller.js';
import { Subtask } from './task-decomposer.js';
export interface ExecutionInstance {
    id: string;
    subtask: Subtask;
    pty: IPty;
    scanner: PatternScanner;
    controller: InterventionController;
    output: string;
    startTime: number;
    state: 'spawning' | 'executing' | 'intervening' | 'complete' | 'killed';
    interventions: number;
    successScore: number;
    failurePatterns: string[];
}
export interface ObservatoryStats {
    totalInstances: number;
    activeInstances: number;
    killedInstances: number;
    successfulInstances: number;
    totalInterventions: number;
    averageTimeToKill: number;
    averageTimeToSuccess: number;
}
export declare class ParallelExecutionObservatory extends EventEmitter {
    private instances;
    private decomposer;
    private stats;
    private killTimes;
    private successTimes;
    private readonly MAX_EXECUTION_TIME;
    private readonly INTERVENTION_LIMIT;
    private readonly TOXIC_PATTERN_THRESHOLD;
    constructor();
    executeTask(prompt: string): Promise<any>;
    private executeParallel;
    private executeRace;
    private executeSequential;
    private executeSubtask;
    private setupInterventionHandlers;
    private updateScores;
    private shouldKill;
    private killInstance;
    private killAllExcept;
    private waitForReady;
    private waitForCompletion;
    private synthesizeResults;
    private typeSlowly;
    private delay;
    getStats(): ObservatoryStats;
    getActiveInstances(): ExecutionInstance[];
}
//# sourceMappingURL=parallel-execution-observatory.d.ts.map