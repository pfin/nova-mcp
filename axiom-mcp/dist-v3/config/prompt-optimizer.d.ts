/**
 * Prompt Optimizer with Iteration Support
 *
 * Allows for A/B testing, suggestions, and iterative improvements
 * Tracks performance metrics for each prompt variant
 */
import { PromptConfigManager } from './prompt-config.js';
export interface VerificationProof {
    hasImplementation: boolean;
    hasTests: boolean;
    testsPass: boolean;
    filesCreated: Array<{
        path: string;
        size: number;
    }>;
    filesModified: Array<{
        path: string;
        diff: string;
    }>;
    exitCode: number;
    deceptivePatterns?: string[];
}
export interface PromptVariant {
    id: string;
    path: string;
    content: string;
    metadata: {
        author?: string;
        description?: string;
        tags?: string[];
        createdAt: Date;
        hypothesis?: string;
    };
}
export interface PromptPerformance {
    variantId: string;
    metrics: {
        successRate: number;
        avgReward: number;
        avgDuration: number;
        verificationScores: {
            hasImplementation: number;
            testsPass: number;
            noDeceptivePatterns: number;
        };
    };
    sampleSize: number;
    lastUpdated: Date;
}
export interface PromptSuggestion {
    id: string;
    targetPath: string;
    currentPrompt: string;
    suggestedPrompt: string;
    rationale: string;
    expectedImprovement: {
        metric: string;
        currentValue: number;
        expectedValue: number;
    };
    status: 'pending' | 'testing' | 'accepted' | 'rejected';
    testResults?: PromptPerformance;
}
export declare class PromptOptimizer {
    private configManager;
    private variants;
    private performance;
    private suggestions;
    private dataPath;
    constructor(configManager: PromptConfigManager, dataPath?: string);
    /**
     * Load saved optimization data
     */
    private loadData;
    /**
     * Save optimization data
     */
    private saveData;
    /**
     * Create a new prompt variant for A/B testing
     */
    createVariant(params: {
        path: string;
        content: string;
        author?: string;
        description?: string;
        hypothesis?: string;
        tags?: string[];
    }): PromptVariant;
    /**
     * Submit a prompt improvement suggestion
     */
    submitSuggestion(params: {
        targetPath: string;
        suggestedPrompt: string;
        rationale: string;
        expectedMetric: string;
        expectedImprovement: number;
    }): PromptSuggestion;
    /**
     * Test a suggestion by creating a variant and running experiments
     */
    testSuggestion(suggestionId: string, numTrials?: number): Promise<void>;
    /**
     * Record performance metrics for a prompt variant
     */
    recordPerformance(variantId: string, proof: VerificationProof, reward: number, duration: number): void;
    /**
     * Get the best performing variant for a prompt path
     */
    getBestPerformingVariant(path: string): PromptPerformance | null;
    /**
     * Generate suggestions based on performance data
     */
    generateSuggestions(): PromptSuggestion[];
    /**
     * Generate specific improvement suggestion based on performance data
     */
    private generateImprovementSuggestion;
    /**
     * Export optimization report
     */
    generateReport(): string;
}
export declare function createPromptOptimizer(configManager: PromptConfigManager): PromptOptimizer;
//# sourceMappingURL=prompt-optimizer.d.ts.map