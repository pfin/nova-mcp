import { z } from 'zod';
import { StatusManager } from '../status-manager.js';
export declare const axiomMcpStatusSchema: z.ZodObject<{
    action: z.ZodEnum<["system", "recent", "task", "tree", "clear", "most_recent"]>;
    taskId: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    daysToKeep: z.ZodDefault<z.ZodNumber>;
    filters: z.ZodOptional<z.ZodObject<{
        status: z.ZodOptional<z.ZodEnum<["pending", "running", "completed", "failed"]>>;
        taskType: z.ZodOptional<z.ZodString>;
        hasErrors: z.ZodOptional<z.ZodBoolean>;
        minDepth: z.ZodOptional<z.ZodNumber>;
        maxDepth: z.ZodOptional<z.ZodNumber>;
        parentTask: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        taskType?: string | undefined;
        status?: "pending" | "running" | "completed" | "failed" | undefined;
        parentTask?: string | undefined;
        hasErrors?: boolean | undefined;
        minDepth?: number | undefined;
        maxDepth?: number | undefined;
    }, {
        taskType?: string | undefined;
        status?: "pending" | "running" | "completed" | "failed" | undefined;
        parentTask?: string | undefined;
        hasErrors?: boolean | undefined;
        minDepth?: number | undefined;
        maxDepth?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    action: "system" | "task" | "recent" | "tree" | "clear" | "most_recent";
    limit: number;
    daysToKeep: number;
    taskId?: string | undefined;
    filters?: {
        taskType?: string | undefined;
        status?: "pending" | "running" | "completed" | "failed" | undefined;
        parentTask?: string | undefined;
        hasErrors?: boolean | undefined;
        minDepth?: number | undefined;
        maxDepth?: number | undefined;
    } | undefined;
}, {
    action: "system" | "task" | "recent" | "tree" | "clear" | "most_recent";
    taskId?: string | undefined;
    limit?: number | undefined;
    daysToKeep?: number | undefined;
    filters?: {
        taskType?: string | undefined;
        status?: "pending" | "running" | "completed" | "failed" | undefined;
        parentTask?: string | undefined;
        hasErrors?: boolean | undefined;
        minDepth?: number | undefined;
        maxDepth?: number | undefined;
    } | undefined;
}>;
export type axiomMcpStatusInput = z.infer<typeof axiomMcpStatusSchema>;
export declare const axiomMcpStatusTool: {
    name: string;
    description: string;
    inputSchema: import("zod-to-json-schema").JsonSchema7Type & {
        $schema?: string | undefined;
        definitions?: {
            [key: string]: import("zod-to-json-schema").JsonSchema7Type;
        } | undefined;
    };
};
export declare function handleAxiomMcpStatus(input: axiomMcpStatusInput, statusManager: StatusManager): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=axiom-mcp-status.d.ts.map