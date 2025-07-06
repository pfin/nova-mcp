import { z } from 'zod';
import { ClaudeCodeSubprocess } from '../claude-subprocess.js';
import { ContextManager } from '../context-manager.js';
export declare const axiomMcpSynthesisSchema: z.ZodObject<{
    contextId: z.ZodString;
    includeChildren: z.ZodDefault<z.ZodBoolean>;
    depth: z.ZodDefault<z.ZodEnum<["summary", "detailed", "comprehensive"]>>;
}, "strip", z.ZodTypeAny, {
    depth: "summary" | "detailed" | "comprehensive";
    contextId: string;
    includeChildren: boolean;
}, {
    contextId: string;
    depth?: "summary" | "detailed" | "comprehensive" | undefined;
    includeChildren?: boolean | undefined;
}>;
export type axiomMcpSynthesisInput = z.infer<typeof axiomMcpSynthesisSchema>;
export declare const axiomMcpSynthesisTool: {
    name: string;
    description: string;
    inputSchema: import("zod-to-json-schema").JsonSchema7Type & {
        $schema?: string | undefined;
        definitions?: {
            [key: string]: import("zod-to-json-schema").JsonSchema7Type;
        } | undefined;
    };
};
export declare function initializeSynthesisContextManager(cm: ContextManager): void;
export declare function handleAxiomMcpSynthesis(input: axiomMcpSynthesisInput, claudeCode: ClaudeCodeSubprocess): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=axiom-mcp-synthesis.d.ts.map