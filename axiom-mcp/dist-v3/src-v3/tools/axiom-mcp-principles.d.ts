import { z } from 'zod';
import { ConversationDB } from '../database/conversation-db.js';
export declare const axiomMcpPrinciplesSchema: z.ZodObject<{
    action: z.ZodEnum<["list", "check", "enforce", "add", "remove", "verify"]>;
    category: z.ZodOptional<z.ZodEnum<["coding", "thinking", "execution", "all"]>>;
    principleId: z.ZodOptional<z.ZodString>;
    code: z.ZodOptional<z.ZodString>;
    conversationId: z.ZodOptional<z.ZodString>;
    principle: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        category: z.ZodEnum<["coding", "thinking", "execution"]>;
        description: z.ZodString;
        verificationRule: z.ZodString;
        examples: z.ZodOptional<z.ZodObject<{
            good: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            bad: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            good?: string[];
            bad?: string[];
        }, {
            good?: string[];
            bad?: string[];
        }>>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        name?: string;
        description?: string;
        category?: "coding" | "thinking" | "execution";
        verificationRule?: string;
        examples?: {
            good?: string[];
            bad?: string[];
        };
    }, {
        id?: string;
        name?: string;
        description?: string;
        category?: "coding" | "thinking" | "execution";
        verificationRule?: string;
        examples?: {
            good?: string[];
            bad?: string[];
        };
    }>>;
}, "strip", z.ZodTypeAny, {
    code?: string;
    conversationId?: string;
    action?: "list" | "check" | "enforce" | "add" | "remove" | "verify";
    category?: "all" | "coding" | "thinking" | "execution";
    principleId?: string;
    principle?: {
        id?: string;
        name?: string;
        description?: string;
        category?: "coding" | "thinking" | "execution";
        verificationRule?: string;
        examples?: {
            good?: string[];
            bad?: string[];
        };
    };
}, {
    code?: string;
    conversationId?: string;
    action?: "list" | "check" | "enforce" | "add" | "remove" | "verify";
    category?: "all" | "coding" | "thinking" | "execution";
    principleId?: string;
    principle?: {
        id?: string;
        name?: string;
        description?: string;
        category?: "coding" | "thinking" | "execution";
        verificationRule?: string;
        examples?: {
            good?: string[];
            bad?: string[];
        };
    };
}>;
export type AxiomMcpPrinciplesInput = z.infer<typeof axiomMcpPrinciplesSchema>;
export declare const axiomMcpPrinciplesTool: {
    name: string;
    description: string;
    inputSchema: import("zod-to-json-schema").JsonSchema7Type & {
        $schema?: string | undefined;
        definitions?: {
            [key: string]: import("zod-to-json-schema").JsonSchema7Type;
        };
    };
};
export declare function handleAxiomMcpPrinciples(input: AxiomMcpPrinciplesInput, conversationDB?: ConversationDB): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=axiom-mcp-principles.d.ts.map