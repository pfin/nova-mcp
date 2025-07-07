/**
 * Task type detection and system prompts for Axiom MCP v3
 */
export interface TaskType {
    id: string;
    name: string;
    patterns: RegExp[];
    systemPrompt: string;
}
export declare function detectTaskType(prompt: string): TaskType | null;
export declare function getSystemPrompt(taskType: TaskType | null): string;
//# sourceMappingURL=task-types.d.ts.map