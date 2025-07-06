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
        taskType?: string;
        status?: "pending" | "running" | "completed" | "failed";
        parentTask?: string;
        maxDepth?: number;
        hasErrors?: boolean;
        minDepth?: number;
    }, {
        taskType?: string;
        status?: "pending" | "running" | "completed" | "failed";
        parentTask?: string;
        maxDepth?: number;
        hasErrors?: boolean;
        minDepth?: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    taskId?: string;
    limit?: number;
    action?: "system" | "tree" | "recent" | "task" | "clear" | "most_recent";
    daysToKeep?: number;
    filters?: {
        taskType?: string;
        status?: "pending" | "running" | "completed" | "failed";
        parentTask?: string;
        maxDepth?: number;
        hasErrors?: boolean;
        minDepth?: number;
    };
}, {
    taskId?: string;
    limit?: number;
    action?: "system" | "tree" | "recent" | "task" | "clear" | "most_recent";
    daysToKeep?: number;
    filters?: {
        taskType?: string;
        status?: "pending" | "running" | "completed" | "failed";
        parentTask?: string;
        maxDepth?: number;
        hasErrors?: boolean;
        minDepth?: number;
    };
}>;
export type axiomMcpStatusInput = z.infer<typeof axiomMcpStatusSchema>;
export declare const axiomMcpStatusTool: {
    name: string;
    description: string;
    inputSchema: import("zod-to-json-schema").JsonSchema7Type & {
        $schema?: string | undefined;
        definitions?: {
            [key: string]: import("zod-to-json-schema").JsonSchema7Type;
        };
    };
};
export declare function handleAxiomMcpStatus(input: axiomMcpStatusInput, statusManager: StatusManager): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=axiom-mcp-status.d.ts.map