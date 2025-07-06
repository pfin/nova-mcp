/**
 * Task Types and Success Criteria
 *
 * Defines different types of tasks with their associated:
 * - System prompts
 * - Required success criteria
 * - Tool recommendations
 * - Validation rules
 */
export interface TaskTypeDefinition {
    id: string;
    name: string;
    description: string;
    systemPrompt: string;
    requiredCriteria: string[];
    recommendedTools: string[];
    validationRules: ValidationRule[];
    retryPrompt?: string;
}
export interface ValidationRule {
    id: string;
    description: string;
    check: (output: string) => boolean;
    failureMessage: string;
}
export declare const TASK_TYPES: Record<string, TaskTypeDefinition>;
/**
 * Get task type based on prompt analysis
 */
export declare function detectTaskType(prompt: string): TaskTypeDefinition | null;
/**
 * Get system prompt for a task type
 */
export declare function getSystemPrompt(taskType: TaskTypeDefinition | null): string;
/**
 * Validate task output against type criteria
 */
export declare function validateTaskOutput(output: string, taskType: TaskTypeDefinition | null): {
    valid: boolean;
    issues: string[];
    suggestions: string[];
};
//# sourceMappingURL=task-types.d.ts.map