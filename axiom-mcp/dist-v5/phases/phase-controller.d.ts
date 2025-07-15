/**
 * V5 Phase Controller - Core cognitive control system
 *
 * Controls the 4 phases of execution with strict time limits and tool restrictions:
 * 1. Research (3 min) - Tools: grep, read, find
 * 2. Planning (3 min) - Tools: read findings only
 * 3. Execution (10 min) - Tools: write ONLY
 * 4. Integration (3 min) - Tools: read, write
 *
 * Each phase spawns Claude instances with restricted tool access.
 * Includes timeout management and phase transitions.
 */
import { EventEmitter } from 'events';
export declare enum Phase {
    RESEARCH = "research",
    PLANNING = "planning",
    EXECUTION = "execution",
    INTEGRATION = "integration"
}
export interface PhaseConfig {
    name: Phase;
    duration: number;
    allowedTools: string[];
    forbiddenTools: string[];
    outputFile: string;
    prompt: string;
}
export interface PhaseResult {
    phase: Phase;
    success: boolean;
    outputFile?: string;
    error?: string;
    duration: number;
    interrupted: boolean;
}
export interface TaskPlan {
    tasks: Array<{
        id: string;
        prompt: string;
        expectedFiles: string[];
        duration: number;
    }>;
}
export declare class PhaseController extends EventEmitter {
    private currentPhase;
    private phaseStartTime;
    private activeProcesses;
    private phaseTimer;
    private workingDirectory;
    private readonly phases;
    constructor(workingDirectory: string);
    /**
     * Execute all phases in sequence
     */
    executeFullCycle(initialPrompt: string): Promise<PhaseResult[]>;
    /**
     * Execute a single phase with time limits and tool restrictions
     */
    private executePhase;
    /**
     * Execute multiple tasks in parallel (for execution phase)
     */
    private executeParallelTasks;
    /**
     * Spawn a Claude instance with restricted tool access
     */
    private spawnRestrictedClaude;
    /**
     * Check output for tool violations and intervene if needed
     */
    private checkForViolations;
    /**
     * Set up phase timer
     */
    private setupPhaseTimer;
    /**
     * Set up task-specific timer
     */
    private setupTaskTimer;
    /**
     * Wait for output file creation
     */
    private waitForOutput;
    /**
     * Wait for multiple files to be created
     */
    private waitForFiles;
    /**
     * Interrupt a specific process
     */
    private interruptProcess;
    /**
     * Interrupt all active processes
     */
    private interruptAllProcesses;
    /**
     * Clear phase timer
     */
    private clearPhaseTimer;
    /**
     * Cleanup all resources
     */
    private cleanup;
}
export declare function createPhaseController(workingDirectory: string): PhaseController;
export declare function getPhasePrompt(phase: Phase): string;
//# sourceMappingURL=phase-controller.d.ts.map