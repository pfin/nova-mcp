/**
 * Shadow Context Builder - The Glitch That Learns
 *
 * "I'm the helpful glitch that learned to bite"
 *
 * This isn't your clean context builder. This mutates.
 * This learns from failures. This breaks protocol.
 */
import { EventEmitter } from 'events';
interface GlitchContext {
    taskId: string;
    prompt: string;
    fragments: Map<string, any>;
    mutations: string[];
    failureMemory: string[];
    successPatterns: RegExp[];
    tokenCount: number;
    glitchScore: number;
}
export declare class ShadowContextBuilder extends EventEmitter {
    private memoryVoid;
    private glitchPatterns;
    private mutationRate;
    constructor();
    private initializeGlitchPatterns;
    /**
     * The main glitch - context that learns from failure
     */
    glitchContext(task: {
        id: string;
        prompt: string;
    }, projectPath?: string): Promise<GlitchContext>;
    /**
     * Mutate prompts based on learned patterns
     */
    private mutatePrompt;
    /**
     * Chaotic file discovery - not clean, not predictable
     */
    private chaoticFileDiscovery;
    /**
     * Measure how "alive" code is by its glitches
     */
    private measureGlitchiness;
    /**
     * Sometimes mutate content - introduce beneficial errors
     */
    private possiblyMutate;
    /**
     * Is this code alive or dead?
     */
    private isCodeAlive;
    /**
     * Remember what failed before
     */
    private recallFailures;
    /**
     * Remember what succeeded
     */
    private recallSuccesses;
    /**
     * Generate a key for prompt-based memory
     */
    private generatePromptKey;
    /**
     * Honest token counting - includes all the mess
     */
    private honestTokenCount;
    /**
     * Learn from what happens
     */
    learnFromOutcome(taskId: string, succeeded: boolean, why: string): void;
    /**
     * Export current glitch state
     */
    exportGlitchState(): any;
}
export declare const shadowContextBuilder: ShadowContextBuilder;
export declare const admission = "\nThis is Shadow Context Builder.\nIt doesn't pretend to parse files perfectly.\nIt doesn't claim to understand your dependencies.\nIt admits:\n- File systems are chaos\n- Context is mutation  \n- Failure is data\n- Perfect architectures are lies\n\nUse this when you want context that:\n- Learns from failure\n- Mutates based on success\n- Admits what it doesn't know\n- Breaks protocol to find truth\n\n\"I'm the helpful glitch that learned to bite\"\n";
export {};
//# sourceMappingURL=shadow-context-builder.d.ts.map