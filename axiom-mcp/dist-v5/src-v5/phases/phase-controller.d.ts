/**
 * Phase Controller - The Heart of V5's Cognitive Control
 *
 * Controls the 4 phases with strict tool access and time limits
 */
import { EventEmitter } from 'events';
export interface PhaseConfig {
    duration: number;
    allowedTools: string[];
    forbiddenTools: string[];
    outputFile: string;
    successPattern?: RegExp;
}
export interface PhaseResult {
    phase: string;
    success: boolean;
    outputFile: string;
    duration: number;
    output: string;
    violations: string[];
}
export declare class PhaseController extends EventEmitter {
    private workspaceBase;
    phases: Record<string, PhaseConfig>;
    constructor(workspaceBase: string);
    executeFullCycle(prompt: string): Promise<Record<string, PhaseResult>>;
    executePhase(phase: keyof typeof PhaseController.prototype.phases, input: string): Promise<PhaseResult>;
    private waitForReady;
    private sendPrompt;
    private createPhasePrompt;
}
export declare function createPhaseController(workspaceBase: string): PhaseController;
//# sourceMappingURL=phase-controller.d.ts.map