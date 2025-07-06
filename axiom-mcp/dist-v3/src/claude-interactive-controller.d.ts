/**
 * Claude Interactive Controller
 *
 * Instead of using claude -p with a single prompt, this controller:
 * 1. Launches Claude in interactive mode
 * 2. Monitors output in real-time
 * 3. Sends follow-up prompts based on observed behavior
 * 4. Forces implementation through continuous interaction
 */
import { EventEmitter } from 'events';
export interface InteractiveSession extends EventEmitter {
    send(prompt: string): void;
    close(): void;
    id: string;
    startTime: Date;
}
export interface OutputEvent {
    type: 'output' | 'error' | 'status';
    content: string;
    timestamp: Date;
}
export interface VerificationEvent {
    filesCreated: number;
    testsRun: number;
    testsPassed: boolean;
    hasImplementation: boolean;
}
export declare class ClaudeInteractiveController extends EventEmitter {
    private sessions;
    private verifiers;
    private outputBuffers;
    private lastPrompts;
    private readonly COMPLETION_PATTERNS;
    private readonly NO_IMPLEMENTATION_PATTERNS;
    /**
     * Create an interactive Claude session with continuous monitoring
     */
    createSession(taskId: string): InteractiveSession;
    /**
     * Check if Claude's response seems complete
     */
    private isResponseComplete;
    /**
     * Analyze Claude's output and send appropriate follow-up
     */
    private analyzeAndRespond;
    /**
     * Run an implementation task with interactive control
     */
    runImplementationTask(task: string, options?: {
        maxInteractions?: number;
        timeout?: number;
        onOutput?: (event: OutputEvent) => void;
        onVerification?: (event: VerificationEvent) => void;
    }): Promise<{
        success: boolean;
        interactions: number;
        finalVerification: VerificationEvent;
        sessionId: string;
    }>;
}
export declare const interactiveController: ClaudeInteractiveController;
//# sourceMappingURL=claude-interactive-controller.d.ts.map