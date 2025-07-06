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
    format: "ascii" | "tree" | "progress" | "box" | "compact";
    width: number;
    showMetrics: boolean;
    colorize: boolean;
    taskId?: string | undefined;
    depth?: number | undefined;
}, {
    taskId?: string | undefined;
    format?: "ascii" | "tree" | "progress" | "box" | "compact" | undefined;
    depth?: number | undefined;
    width?: number | undefined;
    showMetrics?: boolean | undefined;
    colorize?: boolean | undefined;
}>;
export type axiomMcpVisualizeInput = z.infer<typeof axiomMcpVisualizeSchema>;
export declare const axiomMcpVisualizeTool: {
    name: string;
    description: string;
    inputSchema: import("zod-to-json-schema").JsonSchema7Type & {
        $schema?: string | undefined;
        definitions?: {
            [key: string]: import("zod-to-json-schema").JsonSchema7Type;
        } | undefined;
    };
};
export declare function handleAxiomMcpVisualize(input: axiomMcpVisualizeInput, statusManager: StatusManager): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=axiom-mcp-visualize.d.ts.map