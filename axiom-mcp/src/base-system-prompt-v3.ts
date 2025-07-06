/**
 * Base System Prompt v3 - Integrates with prompt configuration system
 * 
 * This version allows dynamic prompt loading from the configuration system
 * while maintaining backward compatibility
 */

import { BASE_SYSTEM_PROMPT as LEGACY_BASE_PROMPT, UNIVERSAL_VALIDATION_RULES, UniversalValidationRule, calculateMetaCognitiveScore, validateUniversalRules } from './base-system-prompt.js';

// Re-export legacy functions for compatibility
export { UNIVERSAL_VALIDATION_RULES, UniversalValidationRule, calculateMetaCognitiveScore, validateUniversalRules };

// Dynamic prompt configuration
let promptConfigManager: any = null;
let configLoaded = false;

/**
 * Lazy load the prompt configuration system
 */
async function loadPromptConfig() {
  if (configLoaded) return promptConfigManager;
  
  try {
    const configPath = process.env.AXIOM_PROMPT_CONFIG_PATH || '../prompt-config.json';
    const { PromptConfigManager } = await import('../src-v3/config/prompt-config.js');
    promptConfigManager = new PromptConfigManager(configPath);
    console.error('[SystemPrompt] Loaded v3 prompt configuration');
  } catch (e) {
    console.error('[SystemPrompt] Using legacy prompts (v3 config not available)');
    promptConfigManager = null;
  }
  
  configLoaded = true;
  return promptConfigManager;
}

/**
 * Get the complete system prompt with v3 configuration support
 */
export async function getCompleteSystemPromptV3(taskSpecificPrompt?: string, taskType?: string, options?: {
  toolName?: string;
  includeMetaCognitive?: boolean;
}): Promise<string> {
  const config = await loadPromptConfig();
  
  // If v3 config is available, use it
  if (config) {
    try {
      return config.getCompletePrompt(
        taskType || 'research',
        taskSpecificPrompt || '',
        {
          includeMetaCognitive: options?.includeMetaCognitive ?? true,
          toolName: options?.toolName
        }
      );
    } catch (e) {
      console.error('[SystemPrompt] Error using v3 config:', e);
      // Fall through to legacy
    }
  }
  
  // Legacy behavior
  return getCompleteSystemPromptLegacy(taskSpecificPrompt, taskType);
}

/**
 * Legacy synchronous version for backward compatibility
 */
export function getCompleteSystemPrompt(taskSpecificPrompt?: string, taskType?: string): string {
  // Try to use cached config if available
  if (promptConfigManager) {
    try {
      return promptConfigManager.getCompletePrompt(
        taskType || 'research',
        taskSpecificPrompt || '',
        { includeMetaCognitive: true }
      );
    } catch (e) {
      // Fall through to legacy
    }
  }
  
  return getCompleteSystemPromptLegacy(taskSpecificPrompt, taskType);
}

/**
 * Original legacy implementation
 */
function getCompleteSystemPromptLegacy(taskSpecificPrompt?: string, taskType?: string): string {
  // For implementation tasks, use ONLY the implementation prompt to avoid research framing
  if (taskType === 'implementation' && taskSpecificPrompt) {
    return taskSpecificPrompt;
  }
  
  // For research tasks, explicitly frame as research
  if (taskType === 'research') {
    const researchPrompt = LEGACY_BASE_PROMPT.replace(
      'You are an AI assistant executing a task',
      'You are an AI assistant executing a research task'
    );
    if (!taskSpecificPrompt) {
      return researchPrompt;
    }
    return `${researchPrompt}\n\nTASK-SPECIFIC REQUIREMENTS:\n${taskSpecificPrompt}`;
  }
  
  // For other tasks, use base + specific
  if (!taskSpecificPrompt) {
    return LEGACY_BASE_PROMPT;
  }
  
  return `${LEGACY_BASE_PROMPT}\n\nTASK-SPECIFIC REQUIREMENTS:\n${taskSpecificPrompt}`;
}

/**
 * Export the current base prompt (may be from config or legacy)
 */
export async function getCurrentBasePrompt(): Promise<string> {
  const config = await loadPromptConfig();
  
  if (config) {
    try {
      return config.getSystemPrompt('research');
    } catch (e) {
      // Fall through
    }
  }
  
  return LEGACY_BASE_PROMPT;
}

// For modules that expect BASE_SYSTEM_PROMPT to be a constant
export const BASE_SYSTEM_PROMPT = LEGACY_BASE_PROMPT;