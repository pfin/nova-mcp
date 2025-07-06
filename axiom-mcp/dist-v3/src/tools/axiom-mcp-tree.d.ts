import { z } from 'zod';
import { StatusManager } from '../status-manager.js';
import { ContextManager } from '../context-manager.js';
export declare const axiomMcpTreeSchema: z.ZodObject<{
    action: z.ZodEnum<["visualize", "analyze", "export", "navigate"]>;
    taskId: z.ZodOptional<z.ZodString>;
    format: z.ZodDefault<z.ZodEnum<["text", "mermaid", "json", "markdown"]>>;
    depth: z.ZodOptional<z.ZodNumber>;
    includeContent: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    format: "text" | "mermaid" | "json" | "markdown";
    action: "visualize" | "analyze" | "export" | "navigate";
    includeContent: boolean;
    taskId?: string | undefined;
    depth?: number | undefined;
}, {
    action: "visualize" | "analyze" | "export" | "navigate";
    taskId?: string | undefined;
    format?: "text" | "mermaid" | "json" | "markdown" | undefined;
    depth?: number | undefined;
    includeContent?: boolean | undefined;
}>;
export type axiomMcpTreeInput = z.infer<typeof axiomMcpTreeSchema>;
export declare const axiomMcpTreeTool: {
    name: string;
    description: string;
    inputSchema: import("zod-to-json-schema").JsonSchema7Type & {
        $schema?: string | undefined;
        definitions?: {
            [key: string]: import("zod-to-json-schema").JsonSchema7Type;
        } | undefined;
    };
};
export declare function handleAxiomMcpTree(input: axiomMcpTreeInput, statusManager: StatusManager, contextManager: ContextManager): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=axiom-mcp-tree.d.ts.map