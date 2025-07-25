import { z } from 'zod';
import * as pty from 'node-pty';
import { EventEmitter } from 'events';
export declare const orthogonalDecomposerSchema: z.ZodObject<{
    action: z.ZodEnum<["decompose", "execute", "status", "merge"]>;
    prompt: z.ZodOptional<z.ZodString>;
    taskIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    strategy: z.ZodDefault<z.ZodEnum<["orthogonal", "mcts", "hybrid"]>>;
    projectPath: z.ZodOptional<z.ZodString>;
    includeContext: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    action: "status" | "execute" | "merge" | "decompose";
    strategy: "orthogonal" | "mcts" | "hybrid";
    includeContext: boolean;
    prompt?: string | undefined;
    taskIds?: string[] | undefined;
    projectPath?: string | undefined;
}, {
    action: "status" | "execute" | "merge" | "decompose";
    prompt?: string | undefined;
    taskIds?: string[] | undefined;
    strategy?: "orthogonal" | "mcts" | "hybrid" | undefined;
    projectPath?: string | undefined;
    includeContext?: boolean | undefined;
}>;
interface OrthogonalTask {
    id: string;
    prompt: string;
    duration: number;
    outputs: string[];
    dependencies?: string[];
    trigger?: string;
}
interface TaskExecution {
    task: OrthogonalTask;
    status: 'pending' | 'running' | 'complete' | 'failed' | 'timeout';
    workspace: string;
    claude?: pty.IPty;
    startTime: number;
    output: string[];
    files: Map<string, string>;
}
export declare class OrthogonalDecomposer extends EventEmitter {
    private executions;
    private cleanupTasks;
    private taskContexts;
    private maxParallel;
    private taskTimeout;
    private isCleaningUp;
    constructor();
    decompose(mainPrompt: string): Promise<OrthogonalTask[]>;
    private heuristicDecompose;
    execute(tasks: OrthogonalTask[], projectPath?: string): Promise<Map<string, TaskExecution>>;
    /**
     * Prepare contexts for all tasks
     */
    private prepareTaskContexts;
    private executeParallel;
    private executeSingleTask;
    private setupWorkspace;
    private waitForReady;
    private sendPrompt;
    private collectFiles;
    private executeReserves;
    merge(executions: Map<string, TaskExecution>): Promise<Map<string, string>>;
    private scoreExecution;
    getExecutions(): Map<string, TaskExecution>;
    getExecution(taskId: string): TaskExecution | undefined;
    mergeLatest(): Promise<Map<string, string>>;
    private registerCleanup;
    cleanup(taskId: string): Promise<void>;
    cleanupAll(): Promise<void>;
}
export declare function cleanupDecomposer(): Promise<void>;
export declare function axiomOrthogonalDecompose(params: z.infer<typeof orthogonalDecomposerSchema>): Promise<string>;
export {};
//# sourceMappingURL=axiom-orthogonal-decomposer.d.ts.map