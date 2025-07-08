/**
 * Prompt Configuration System
 *
 * Allows users to customize all prompts used by Axiom MCP v3
 * Supports environment variables, JSON files, and runtime modification
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Default configuration
const DEFAULT_CONFIG = {
    systemPrompts: {
        research: `You are an AI assistant executing a research task. Analyze the request thoroughly and provide detailed insights.`,
        implementation: `You are an AI assistant executing an implementation task. Write actual, working code that creates real files. 
DO NOT describe what you would implement - actually implement it using the available tools.
Use Write, Edit, or MultiEdit tools to create actual files.`,
        analysis: `You are an AI assistant performing code analysis. Examine the codebase carefully and provide specific, actionable insights.`,
        verification: `You are an AI assistant verifying implementation correctness. Check that all requirements are met and tests pass.`,
        decomposition: `You are an AI assistant decomposing complex tasks. Break down the goal into specific, actionable subtasks that can be executed independently.`
    },
    taskPrompts: {
        implementation: {
            prefix: "Implement the following task by writing actual code files:",
            requirements: "Ensure all code is production-ready with proper error handling.",
            constraints: "Follow existing code conventions and use available libraries.",
            verification: "Include comprehensive tests to verify correctness."
        },
        research: {
            prefix: "Research and analyze the following topic:",
            depth: "Provide comprehensive analysis with examples and best practices.",
            format: "Structure your response with clear sections and actionable insights."
        },
        mcts: {
            decomposition: "Decompose this goal into independent subtasks that can be executed in parallel:",
            evaluation: "Evaluate the quality and completeness of this implementation:",
            selection: "Select the most promising approach based on feasibility and impact:"
        }
    },
    metaCognitive: {
        beforeTemplate: "BEFORE starting, I will {action}",
        afterTemplate: "AFTER completing, I will {action}",
        howTemplate: "HOW I will approach this: {method}",
        enableByDefault: true
    },
    interventions: {
        codeViolation: "⚠️ CODE VIOLATION DETECTED: {violation}\nCorrect this immediately by {suggestion}",
        testFailure: "❌ TEST FAILURE: {error}\nFix the implementation to make tests pass.",
        verificationFailure: "🚫 VERIFICATION FAILED: {reason}\nAddress this issue before proceeding.",
        customTemplate: "🔔 {title}: {message}"
    },
    toolPrompts: {
        "axiom_mcp_implement": {
            systemPrompt: `You MUST write actual code files, not descriptions. Use Write/Edit tools to create real files that can be executed.`
        },
        "axiom_mcp_spawn_mcts": {
            systemPrompt: `Use Monte Carlo Tree Search to explore solution space. Decompose tasks and evaluate paths systematically.`
        }
    }
};
export class PromptConfigManager {
    config;
    configPath;
    envPrefix = 'AXIOM_PROMPT_';
    constructor(configPath) {
        this.configPath = configPath || path.join(__dirname, '../../prompt-config.json');
        this.config = this.loadConfig();
    }
    /**
     * Load configuration from multiple sources in priority order:
     * 1. Environment variables (highest priority)
     * 2. User config file
     * 3. Default configuration (lowest priority)
     */
    loadConfig() {
        let config = { ...DEFAULT_CONFIG };
        // Load from JSON file if exists
        if (fs.existsSync(this.configPath)) {
            try {
                const fileConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
                config = this.deepMerge(config, fileConfig);
                console.error(`[PromptConfig] Loaded custom prompts from ${this.configPath}`);
            }
            catch (error) {
                console.error(`[PromptConfig] Error loading config file:`, error);
            }
        }
        // Override with environment variables
        this.loadEnvOverrides(config);
        return config;
    }
    /**
     * Deep merge two objects, with source overriding target
     */
    deepMerge(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(target[key] || {}, source[key]);
            }
            else {
                result[key] = source[key];
            }
        }
        return result;
    }
    /**
     * Load environment variable overrides
     * Format: AXIOM_PROMPT_SYSTEM_RESEARCH, AXIOM_PROMPT_TASK_IMPLEMENTATION_PREFIX, etc.
     */
    loadEnvOverrides(config) {
        const env = process.env;
        // System prompts
        if (env[`${this.envPrefix}SYSTEM_RESEARCH`]) {
            config.systemPrompts.research = env[`${this.envPrefix}SYSTEM_RESEARCH`];
        }
        if (env[`${this.envPrefix}SYSTEM_IMPLEMENTATION`]) {
            config.systemPrompts.implementation = env[`${this.envPrefix}SYSTEM_IMPLEMENTATION`];
        }
        // Task prompts
        if (env[`${this.envPrefix}TASK_IMPLEMENTATION_PREFIX`]) {
            config.taskPrompts.implementation.prefix = env[`${this.envPrefix}TASK_IMPLEMENTATION_PREFIX`];
        }
        // Meta-cognitive
        if (env[`${this.envPrefix}META_ENABLE`]) {
            config.metaCognitive.enableByDefault = env[`${this.envPrefix}META_ENABLE`] === 'true';
        }
    }
    /**
     * Get a specific prompt by path (e.g., "systemPrompts.research")
     */
    getPrompt(path) {
        const parts = path.split('.');
        let current = this.config;
        for (const part of parts) {
            if (current[part] === undefined) {
                console.error(`[PromptConfig] Invalid prompt path: ${path}`);
                return '';
            }
            current = current[part];
        }
        return current;
    }
    /**
     * Get system prompt for a specific task type
     */
    getSystemPrompt(taskType) {
        const prompts = this.config.systemPrompts;
        return prompts[taskType] || this.config.systemPrompts.research;
    }
    /**
     * Get complete prompt with optional meta-cognitive wrapping
     */
    getCompletePrompt(taskType, userPrompt, options) {
        const systemPrompt = this.getSystemPrompt(taskType);
        const taskPrompts = this.config.taskPrompts;
        const taskConfig = taskPrompts[taskType];
        let completePrompt = systemPrompt;
        // Add tool-specific prompt if available
        if (options?.toolName && this.config.toolPrompts[options.toolName]?.systemPrompt) {
            completePrompt += '\n\n' + this.config.toolPrompts[options.toolName].systemPrompt;
        }
        // Add task-specific elements
        if (taskConfig) {
            completePrompt += '\n\n' + taskConfig.prefix;
            if (taskConfig.requirements) {
                completePrompt += '\n' + taskConfig.requirements;
            }
            if (taskConfig.constraints) {
                completePrompt += '\n' + taskConfig.constraints;
            }
        }
        // Add meta-cognitive wrapping if enabled
        if (options?.includeMetaCognitive ?? this.config.metaCognitive.enableByDefault) {
            completePrompt = this.wrapWithMetaCognitive(completePrompt);
        }
        completePrompt += '\n\n' + userPrompt;
        return completePrompt;
    }
    /**
     * Wrap prompt with meta-cognitive principles
     */
    wrapWithMetaCognitive(prompt) {
        const meta = this.config.metaCognitive;
        return `${meta.beforeTemplate.replace('{action}', 'analyze the requirements and plan my approach')}
${meta.howTemplate.replace('{method}', 'systematic implementation with verification at each step')}

${prompt}

${meta.afterTemplate.replace('{action}', 'verify all requirements are met and tests pass')}`;
    }
    /**
     * Get intervention prompt for a specific violation
     */
    getInterventionPrompt(type, params) {
        const interventions = this.config.interventions;
        let template = type === 'custom' ? this.config.interventions.customTemplate : (interventions[type] || this.config.interventions.customTemplate);
        // Replace placeholders
        for (const [key, value] of Object.entries(params)) {
            template = template.replace(`{${key}}`, value);
        }
        return template;
    }
    /**
     * Update configuration and save to file
     */
    updateConfig(updates) {
        this.config = this.deepMerge(this.config, updates);
        this.saveConfig();
    }
    /**
     * Save current configuration to file
     */
    saveConfig() {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
            console.error(`[PromptConfig] Configuration saved to ${this.configPath}`);
        }
        catch (error) {
            console.error(`[PromptConfig] Error saving config:`, error);
        }
    }
    /**
     * Export configuration for inspection
     */
    exportConfig() {
        return { ...this.config };
    }
    /**
     * Reset to default configuration
     */
    resetToDefaults() {
        this.config = { ...DEFAULT_CONFIG };
        this.saveConfig();
    }
}
// Singleton instance
export const promptConfig = new PromptConfigManager();
//# sourceMappingURL=prompt-config.js.map