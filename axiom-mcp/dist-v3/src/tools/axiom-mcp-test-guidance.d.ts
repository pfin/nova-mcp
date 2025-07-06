import { z } from 'zod';
import { ClaudeCodeSubprocess } from '../claude-subprocess.js';
export declare const axiomMcpTestGuidanceSchema: z.ZodObject<{
    prompt: z.ZodString;
    includeTaskType: z.ZodDefault<z.ZodBoolean>;
    customSystemPrompt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    prompt: string;
    includeTaskType: boolean;
    customSystemPrompt?: string | undefined;
}, {
    prompt: string;
    includeTaskType?: boolean | undefined;
    customSystemPrompt?: string | undefined;
}>;
export type axiomMcpTestGuidanceInput = z.infer<typeof axiomMcpTestGuidanceSchema>;
export declare const axiomMcpTestGuidanceTool: {
    name: string;
    description: string;
    inputSchema: import("zod-to-json-schema").JsonSchema7Type & {
        $schema?: string | undefined;
        definitions?: {
            [key: string]: import("zod-to-json-schema").JsonSchema7Type;
        } | undefined;
    };
};
export declare function handleAxiomMcpTestGuidance(input: axiomMcpTestGuidanceInput, claudeCode: ClaudeCodeSubprocess): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=axiom-mcp-test-guidance.d.ts.map