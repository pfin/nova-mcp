import { z } from 'zod';
import * as pty from 'node-pty';
import { EventEmitter } from 'events';
export declare const orthogonalDecomposerSchema: z.ZodObject<{
    action: z.ZodEnum<["decompose", "execute", "status", "merge"]>;
    prompt: z.ZodOptional<z.ZodString>;
    taskIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    strategy: z.ZodDefault<z.ZodEnum<["orthogonal", "mcts", "hybrid"]>>;
}, "strip", z.ZodTypeAny, {
    action: "status" | "execute" | "merge" | "decompose";
    strategy: "orthogonal" | "mcts" | "hybrid";
    prompt?: string | undefined;
    taskIds?: string[] | undefined;
}, {
    action: "status" | "execute" | "merge" | "decompose";
    prompt?: string | undefined;
    taskIds?: string[] | undefined;
    strategy?: "orthogonal" | "mcts" | "hybrid" | undefined;
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
    private maxParallel;
    private taskTimeout;
    decompose(mainPrompt: string): Promise<OrthogonalTask[]>;
    private heuristicDecompose;
    execute(tasks: OrthogonalTask[]): Promise<Map<string, TaskExecution>>;
    private executeParallel;
    private executeSingleTask;
    private setupWorkspace;
    private waitForReady;
    private sendPrompt;
    private collectFiles;
    private executeReserves;
    merge(executions: Map<string, TaskExecution>): Promise<Map<string, string>>;
    private scoreExecution;
}
export declare function axiomOrthogonalDecompose(params: z.infer<typeof orthogonalDecomposerSchema>): Promise<string>;
export {};
//# sourceMappingURL=axiom-orthogonal-decomposer.d.ts.map