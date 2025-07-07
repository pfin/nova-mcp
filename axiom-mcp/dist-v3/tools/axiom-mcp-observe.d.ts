import { z } from 'zod';
import { ConversationDB } from '../database/conversation-db.js';
export declare const axiomMcpObserveSchema: z.ZodObject<{
    mode: z.ZodEnum<["all", "tree", "recent", "live"]>;
    conversationId: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    filter: z.ZodOptional<z.ZodObject<{
        status: z.ZodOptional<z.ZodEnum<["active", "completed", "failed"]>>;
        taskType: z.ZodOptional<z.ZodString>;
        depth: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        depth?: number;
        taskType?: string;
        status?: "completed" | "failed" | "active";
    }, {
        depth?: number;
        taskType?: string;
        status?: "completed" | "failed" | "active";
    }>>;
}, "strip", z.ZodTypeAny, {
    filter?: {
        depth?: number;
        taskType?: string;
        status?: "completed" | "failed" | "active";
    };
    mode?: "all" | "tree" | "recent" | "live";
    conversationId?: string;
    limit?: number;
}, {
    filter?: {
        depth?: number;
        taskType?: string;
        status?: "completed" | "failed" | "active";
    };
    mode?: "all" | "tree" | "recent" | "live";
    conversationId?: string;
    limit?: number;
}>;
export type AxiomMcpObserveInput = z.infer<typeof axiomMcpObserveSchema>;
export declare const axiomMcpObserveTool: {
    name: string;
    description: string;
    inputSchema: import("zod-to-json-schema").JsonSchema7Type & {
        $schema?: string | undefined;
        definitions?: {
            [key: string]: import("zod-to-json-schema").JsonSchema7Type;
        };
    };
};
export declare function handleAxiomMcpObserve(input: AxiomMcpObserveInput, db: ConversationDB): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=axiom-mcp-observe.d.ts.map