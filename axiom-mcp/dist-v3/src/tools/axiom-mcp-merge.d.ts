import { z } from 'zod';
import { StatusManager } from '../status-manager.js';
import { ContextManager } from '../context-manager.js';
import { ClaudeCodeSubprocess } from '../claude-subprocess.js';
export declare const axiomMcpMergeSchema: z.ZodObject<{
    taskIds: z.ZodArray<z.ZodString, "many">;
    mergeStrategy: z.ZodDefault<z.ZodEnum<["synthesize", "compare", "deduplicate", "hierarchical"]>>;
    outputFormat: z.ZodDefault<z.ZodEnum<["unified", "comparison", "matrix"]>>;
    parentTaskId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    taskIds: string[];
    mergeStrategy: "synthesize" | "compare" | "deduplicate" | "hierarchical";
    outputFormat: "unified" | "comparison" | "matrix";
    parentTaskId?: string | undefined;
}, {
    taskIds: string[];
    parentTaskId?: string | undefined;
    mergeStrategy?: "synthesize" | "compare" | "deduplicate" | "hierarchical" | undefined;
    outputFormat?: "unified" | "comparison" | "matrix" | undefined;
}>;
export type axiomMcpMergeInput = z.infer<typeof axiomMcpMergeSchema>;
export declare const axiomMcpMergeTool: {
    name: string;
    description: string;
    inputSchema: import("zod-to-json-schema").JsonSchema7Type & {
        $schema?: string | undefined;
        definitions?: {
            [key: string]: import("zod-to-json-schema").JsonSchema7Type;
        } | undefined;
    };
};
export declare function handleAxiomMcpMerge(input: axiomMcpMergeInput, statusManager: StatusManager, contextManager: ContextManager, claudeCode: ClaudeCodeSubprocess): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=axiom-mcp-merge.d.ts.map