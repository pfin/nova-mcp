import { z } from 'zod';
export declare const axiomMcpLogsSchema: z.ZodObject<{
    action: z.ZodEnum<["list", "read", "tail", "search", "clear"]>;
    logFile: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    query: z.ZodOptional<z.ZodString>;
    format: z.ZodDefault<z.ZodEnum<["json", "text", "summary"]>>;
}, "strip", z.ZodTypeAny, {
    limit?: number;
    action?: "search" | "list" | "read" | "tail" | "clear";
    logFile?: string;
    query?: string;
    format?: "text" | "json" | "summary";
}, {
    limit?: number;
    action?: "search" | "list" | "read" | "tail" | "clear";
    logFile?: string;
    query?: string;
    format?: "text" | "json" | "summary";
}>;
export type AxiomMcpLogsInput = z.infer<typeof axiomMcpLogsSchema>;
export declare const axiomMcpLogsTool: {
    name: string;
    description: string;
    inputSchema: import("../utils/mcp-schema.js").McpJsonSchema;
};
export declare function handleAxiomMcpLogs(args: AxiomMcpLogsInput): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=axiom-mcp-logs.d.ts.map