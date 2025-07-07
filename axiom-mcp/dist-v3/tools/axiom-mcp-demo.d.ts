import { z } from 'zod';
import { ConversationDB } from '../database/conversation-db.js';
export declare const axiomMcpDemoSchema: z.ZodObject<{
    scenario: z.ZodEnum<["violations", "clean", "intervention"]>;
    prompt: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    prompt?: string;
    scenario?: "intervention" | "violations" | "clean";
}, {
    prompt?: string;
    scenario?: "intervention" | "violations" | "clean";
}>;
export type AxiomMcpDemoInput = z.infer<typeof axiomMcpDemoSchema>;
export declare const axiomMcpDemoTool: {
    name: string;
    description: string;
    inputSchema: import("zod-to-json-schema").JsonSchema7Type & {
        $schema?: string | undefined;
        definitions?: {
            [key: string]: import("zod-to-json-schema").JsonSchema7Type;
        };
    };
};
export declare function handleAxiomMcpDemo(input: AxiomMcpDemoInput, conversationDB: ConversationDB): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=axiom-mcp-demo.d.ts.map