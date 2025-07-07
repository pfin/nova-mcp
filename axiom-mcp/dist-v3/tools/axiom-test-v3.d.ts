import { z } from 'zod';
import { ClaudeCodeSubprocessV3 } from '../claude-subprocess-v3.js';
declare const axiomTestV3Schema: z.ZodObject<{
    prompt: z.ZodString;
    useStreaming: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    prompt?: string;
    useStreaming?: boolean;
}, {
    prompt?: string;
    useStreaming?: boolean;
}>;
export declare const axiomTestV3Tool: {
    name: string;
    description: string;
    inputSchema: import("zod-to-json-schema").JsonSchema7Type & {
        $schema?: string | undefined;
        definitions?: {
            [key: string]: import("zod-to-json-schema").JsonSchema7Type;
        };
    };
};
export declare function handleAxiomTestV3(args: z.infer<typeof axiomTestV3Schema>, claudeCode: ClaudeCodeSubprocessV3): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export {};
//# sourceMappingURL=axiom-test-v3.d.ts.map