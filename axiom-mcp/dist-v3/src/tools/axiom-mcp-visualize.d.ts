import { z } from 'zod';
import { StatusManager } from '../status-manager.js';
export declare const axiomMcpVisualizeSchema: z.ZodObject<{
    taskId: z.ZodOptional<z.ZodString>;
    format: z.ZodDefault<z.ZodEnum<["tree", "box", "compact", "ascii", "progress"]>>;
    width: z.ZodDefault<z.ZodNumber>;
    depth: z.ZodOptional<z.ZodNumber>;
    showMetrics: z.ZodDefault<z.ZodBoolean>;
    colorize: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    taskId?: string;
    depth?: number;
    format?: "ascii" | "tree" | "progress" | "box" | "compact";
    colorize?: boolean;
    width?: number;
    showMetrics?: boolean;
}, {
    taskId?: string;
    depth?: number;
    format?: "ascii" | "tree" | "progress" | "box" | "compact";
    colorize?: boolean;
    width?: number;
    showMetrics?: boolean;
}>;
export type axiomMcpVisualizeInput = z.infer<typeof axiomMcpVisualizeSchema>;
export declare const axiomMcpVisualizeTool: {
    name: string;
    description: string;
    inputSchema: import("zod-to-json-schema").JsonSchema7Type & {
        $schema?: string | undefined;
        definitions?: {
            [key: string]: import("zod-to-json-schema").JsonSchema7Type;
        };
    };
};
export declare function handleAxiomMcpVisualize(input: axiomMcpVisualizeInput, statusManager: StatusManager): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=axiom-mcp-visualize.d.ts.map