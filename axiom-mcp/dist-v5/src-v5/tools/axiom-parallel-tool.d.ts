/**
 * Axiom v5 - Parallel Execution MCP Tool
 * Exposes parallel execution capabilities through MCP
 */
import { z } from 'zod';
declare const ParallelSpawnSchema: z.ZodObject<{
    prompt: z.ZodString;
    strategy: z.ZodDefault<z.ZodEnum<["orthogonal", "dependency"]>>;
    maxInstances: z.ZodDefault<z.ZodNumber>;
    aggressiveKilling: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    maxInstances: number;
    prompt: string;
    strategy: "orthogonal" | "dependency";
    aggressiveKilling: boolean;
}, {
    prompt: string;
    maxInstances?: number | undefined;
    strategy?: "orthogonal" | "dependency" | undefined;
    aggressiveKilling?: boolean | undefined;
}>;
declare const ParallelStatusSchema: z.ZodObject<{
    executorId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    executorId?: string | undefined;
}, {
    executorId?: string | undefined;
}>;
declare const ParallelKillSchema: z.ZodObject<{
    executorId: z.ZodString;
    instanceId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    executorId: string;
    instanceId?: string | undefined;
}, {
    executorId: string;
    instanceId?: string | undefined;
}>;
/**
 * Axiom Parallel Spawn Tool
 * Decomposes and executes tasks in parallel
 */
export declare const axiomParallelSpawnTool: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        prompt: z.ZodString;
        strategy: z.ZodDefault<z.ZodEnum<["orthogonal", "dependency"]>>;
        maxInstances: z.ZodDefault<z.ZodNumber>;
        aggressiveKilling: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        maxInstances: number;
        prompt: string;
        strategy: "orthogonal" | "dependency";
        aggressiveKilling: boolean;
    }, {
        prompt: string;
        maxInstances?: number | undefined;
        strategy?: "orthogonal" | "dependency" | undefined;
        aggressiveKilling?: boolean | undefined;
    }>;
    execute(args: z.infer<typeof ParallelSpawnSchema>): Promise<{
        executorId: string;
        status: string;
        taskCount: number;
        tasks: {
            id: string;
            prompt: string;
            priority: number;
        }[];
        message: string;
    }>;
};
/**
 * Axiom Parallel Status Tool
 * Check status of parallel executions
 */
export declare const axiomParallelStatusTool: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        executorId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        executorId?: string | undefined;
    }, {
        executorId?: string | undefined;
    }>;
    execute(args: z.infer<typeof ParallelStatusSchema>): Promise<any>;
};
/**
 * Axiom Parallel Kill Tool
 * Shutdown parallel executions
 */
export declare const axiomParallelKillTool: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        executorId: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        executorId: string;
        instanceId?: string | undefined;
    }, {
        executorId: string;
        instanceId?: string | undefined;
    }>;
    execute(args: z.infer<typeof ParallelKillSchema>): Promise<{
        executorId: string;
        instanceId: string;
        action: string;
        success: boolean;
        message?: undefined;
    } | {
        executorId: string;
        action: string;
        message: string;
        instanceId?: undefined;
        success?: undefined;
    }>;
};
/**
 * Register all parallel tools with MCP server
 */
export declare function registerParallelTools(server: any): void;
export {};
//# sourceMappingURL=axiom-parallel-tool.d.ts.map