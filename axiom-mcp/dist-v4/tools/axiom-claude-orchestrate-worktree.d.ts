import { z } from 'zod';
import { EventEmitter } from 'events';
export declare const axiomClaudeOrchestrateWorktreeSchema: z.ZodObject<{
    action: z.ZodEnum<["spawn", "prompt", "steer", "get_output", "status", "cleanup"]>;
    instanceId: z.ZodString;
    prompt: z.ZodOptional<z.ZodString>;
    lines: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    useWorktree: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    baseBranch: z.ZodDefault<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    action: "status" | "prompt" | "spawn" | "steer" | "get_output" | "cleanup";
    instanceId: string;
    lines: number;
    useWorktree: boolean;
    baseBranch: string;
    prompt?: string | undefined;
}, {
    action: "status" | "prompt" | "spawn" | "steer" | "get_output" | "cleanup";
    instanceId: string;
    prompt?: string | undefined;
    lines?: number | undefined;
    useWorktree?: boolean | undefined;
    baseBranch?: string | undefined;
}>;
export declare class ClaudeOrchestratorWithWorktrees extends EventEmitter {
    private instances;
    private maxInstances;
    private cleanupTimeout;
    private worktreeManager;
    constructor(mainRepoPath?: string);
    spawn(instanceId: string, useWorktree?: boolean, baseBranch?: string): Promise<void>;
    sendPrompt(instanceId: string, text: string): Promise<void>;
    steer(instanceId: string, newPrompt: string): Promise<void>;
    getOutput(instanceId: string, lines?: number): string;
    getStatus(instanceId: string): any;
    cleanup(instanceId: string): Promise<void>;
    cleanupAll(): Promise<void>;
}
export declare function axiomClaudeOrchestrateWorktree(params: z.infer<typeof axiomClaudeOrchestrateWorktreeSchema>): Promise<string>;
//# sourceMappingURL=axiom-claude-orchestrate-worktree.d.ts.map