import { z } from 'zod';
import { EventEmitter } from 'events';
export declare const axiomClaudeOrchestrateProperSchema: z.ZodObject<{
    action: z.ZodEnum<["spawn", "prompt", "steer", "get_output", "status", "cleanup", "merge_all"]>;
    instanceId: z.ZodString;
    prompt: z.ZodOptional<z.ZodString>;
    lines: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    useWorktree: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    baseBranch: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    autoMerge: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    action: "status" | "prompt" | "spawn" | "steer" | "get_output" | "cleanup" | "merge_all";
    instanceId: string;
    lines: number;
    useWorktree: boolean;
    baseBranch: string;
    autoMerge: boolean;
    prompt?: string | undefined;
}, {
    action: "status" | "prompt" | "spawn" | "steer" | "get_output" | "cleanup" | "merge_all";
    instanceId: string;
    prompt?: string | undefined;
    lines?: number | undefined;
    useWorktree?: boolean | undefined;
    baseBranch?: string | undefined;
    autoMerge?: boolean | undefined;
}>;
export declare class ClaudeOrchestratorProper extends EventEmitter {
    private instances;
    private maxInstances;
    private worktreeManager;
    constructor(mainRepoPath?: string);
    spawn(instanceId: string, useWorktree?: boolean, baseBranch?: string): Promise<void>;
    private handleCompletion;
    mergeInstance(instanceId: string): Promise<boolean>;
    sendPrompt(instanceId: string, text: string): Promise<void>;
    cleanup(instanceId: string): Promise<void>;
    mergeAll(): Promise<{
        total: number;
        merged: number;
        failed: string[];
    }>;
    getStatus(instanceId: string): any;
    getOutput(instanceId: string, lines?: number): string;
    steer(instanceId: string, newPrompt: string): Promise<void>;
}
export declare function axiomClaudeOrchestrateProper(params: z.infer<typeof axiomClaudeOrchestrateProperSchema>): Promise<string>;
//# sourceMappingURL=axiom-claude-orchestrate-proper.d.ts.map