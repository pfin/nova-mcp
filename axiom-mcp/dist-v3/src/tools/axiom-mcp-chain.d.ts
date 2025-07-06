import { z } from 'zod';
import { ClaudeCodeSubprocess } from '../claude-subprocess.js';
import { ContextManager } from '../context-manager.js';
export declare const axiomMcpChainSchema: z.ZodObject<{
    goal: z.ZodString;
    maxDepth: z.ZodDefault<z.ZodNumber>;
    strategy: z.ZodDefault<z.ZodEnum<["breadth-first", "depth-first"]>>;
    parentContext: z.ZodOptional<z.ZodString>;
    autoDecompose: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    goal: string;
    maxDepth: number;
    strategy: "breadth-first" | "depth-first";
    autoDecompose: boolean;
    parentContext?: string | undefined;
}, {
    goal: string;
    maxDepth?: number | undefined;
    strategy?: "breadth-first" | "depth-first" | undefined;
    parentContext?: string | undefined;
    autoDecompose?: boolean | undefined;
}>;
export type axiomMcpChainInput = z.infer<typeof axiomMcpChainSchema>;
export declare const axiomMcpChainTool: {
    name: string;
    description: string;
    inputSchema: import("zod-to-json-schema").JsonSchema7Type & {
        $schema?: string | undefined;
        definitions?: {
            [key: string]: import("zod-to-json-schema").JsonSchema7Type;
        } | undefined;
    };
};
export declare function initializeContextManager(cm: ContextManager): void;
export declare function handleAxiomMcpChain(input: axiomMcpChainInput, claudeCode: ClaudeCodeSubprocess): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=axiom-mcp-chain.d.ts.map