/**
 * Prompt Configuration System
 *
 * Allows users to customize all prompts used by Axiom MCP v3
 * Supports environment variables, JSON files, and runtime modification
 */
export interface PromptConfig {
    systemPrompts: {
        research: string;
        implementation: string;
        analysis: string;
        verification: string;
        decomposition: string;
    };
    taskPrompts: {
        implementation: {
            prefix: string;
            requirements: string;
            constraints: string;
            verification: string;
        };
        research: {
            prefix: string;
            depth: string;
            format: string;
        };
        mcts: {
            decomposition: string;
            evaluation: string;
            selection: string;
        };
    };
    metaCognitive: {
        beforeTemplate: string;
        afterTemplate: string;
        howTemplate: string;
        enableByDefault: boolean;
    };
    interventions: {
        codeViolation: string;
        testFailure: string;
        verificationFailure: string;
        customTemplate: string;
    };
    toolPrompts: {
        [toolName: string]: {
            description?: string;
            systemPrompt?: string;
            userPromptTemplate?: string;
        };
    };
}
export declare class PromptConfigManager {
    private config;
    private configPath;
    private envPrefix;
    constructor(configPath?: string);
    /**
     * Load configuration from multiple sources in priority order:
     * 1. Environment variables (highest priority)
     * 2. User config file
     * 3. Default configuration (lowest priority)
     */
    private loadConfig;
    /**
     * Deep merge two objects, with source overriding target
     */
    private deepMerge;
    /**
     * Load environment variable overrides
     * Format: AXIOM_PROMPT_SYSTEM_RESEARCH, AXIOM_PROMPT_TASK_IMPLEMENTATION_PREFIX, etc.
     */
    private loadEnvOverrides;
    /**
     * Get a specific prompt by path (e.g., "systemPrompts.research")
     */
    getPrompt(path: string): string;
    /**
     * Get system prompt for a specific task type
     */
    getSystemPrompt(taskType: string): string;
    /**
     * Get complete prompt with optional meta-cognitive wrapping
     */
    getCompletePrompt(taskType: string, userPrompt: string, options?: {
        includeMetaCognitive?: boolean;
        toolName?: string;
    }): string;
    /**
     * Wrap prompt with meta-cognitive principles
     */
    private wrapWithMetaCognitive;
    /**
     * Get intervention prompt for a specific violation
     */
    getInterventionPrompt(type: 'codeViolation' | 'testFailure' | 'verificationFailure' | 'custom', params: Record<string, string>): string;
    /**
     * Update configuration and save to file
     */
    updateConfig(updates: Partial<PromptConfig>): void;
    /**
     * Save current configuration to file
     */
    saveConfig(): void;
    /**
     * Export configuration for inspection
     */
    exportConfig(): PromptConfig;
    /**
     * Reset to default configuration
     */
    resetToDefaults(): void;
}
export declare const promptConfig: PromptConfigManager;
//# sourceMappingURL=prompt-config.d.ts.map