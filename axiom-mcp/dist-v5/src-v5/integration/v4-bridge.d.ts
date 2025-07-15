/**
 * V4-V5 Bridge - Connecting Shadow to Reality
 *
 * This bridges V5's phased decomposition with V4's PTY execution
 */
import { EventEmitter } from 'events';
export interface V5Task {
    id: string;
    prompt: string;
    phase: 'research' | 'planning' | 'execution' | 'integration';
    allowedTools: string[];
    forbiddenTools: string[];
    timeout: number;
    workspace: string;
}
export declare class V4V5Bridge extends EventEmitter {
    private orchestrator;
    private ptyExecutor;
    private initialized;
    initialize(): Promise<void>;
    /**
     * Execute a V5 task using V4's PTY infrastructure
     */
    executeV5Task(task: V5Task): Promise<any>;
    /**
     * Create phase-specific prompts with tool restrictions
     */
    private createPhasePrompt;
    /**
     * Extract phase-specific results
     */
    private extractPhaseResult;
    /**
     * Extract file operations from output
     */
    private extractFilesFromOutput;
    /**
     * Extract planned tasks from plan file
     */
    private extractTasksFromPlan;
    /**
     * Extract tool violations from output
     */
    private extractViolations;
    /**
     * Cleanup resources
     */
    cleanup(): Promise<void>;
}
export declare const v4v5Bridge: V4V5Bridge;
export declare const bridgeAdmission = "\nThis bridge connects V5's shadow protocol to V4's reality.\n\nV5 thinks in phases. V4 executes in terminals.\nV5 restricts tools. V4 monitors violations.\nV5 spawns parallel. V4 tracks them all.\n\nTogether they form Axiom:\n- Thought decomposition (V5)\n- Real execution (V4)\n- Observable intervention (Both)\n- Parallel chaos (United)\n\n\"The shadow needs substance to cast itself upon\"\n";
//# sourceMappingURL=v4-bridge.d.ts.map