import { z } from 'zod';
import { ClaudeCodeSubprocessV3 } from '../claude-subprocess-v3.js';
export declare const axiomTestV3Tool: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        prompt: z.ZodString;
        useStreaming: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        prompt?: string;
        useStreaming?: boolean;
    }, {
        prompt?: string;
        useStreaming?: boolean;
    }>;
};
export declare function handleAxiomTestV3(args: z.infer<typeof axiomTestV3Tool.inputSchema>, claudeCode: ClaudeCodeSubprocessV3): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
//# sourceMappingURL=axiom-test-v3.d.ts.map