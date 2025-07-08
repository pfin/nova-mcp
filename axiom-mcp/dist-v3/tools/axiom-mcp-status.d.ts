import { z } from 'zod';
import { StatusManager } from '../managers/status-manager.js';
import { ConversationDB } from '../database/conversation-db.js';
import { EventBus } from '../core/event-bus.js';
export declare const axiomMcpStatusSchema: z.ZodObject<{
    view: z.ZodDefault<z.ZodEnum<["overview", "tasks", "system", "database", "events"]>>;
    taskId: z.ZodOptional<z.ZodString>;
    format: z.ZodDefault<z.ZodEnum<["summary", "detailed", "json"]>>;
}, "strip", z.ZodTypeAny, {
    taskId?: string;
    format?: "json" | "summary" | "detailed";
    view?: "system" | "events" | "overview" | "tasks" | "database";
}, {
    taskId?: string;
    format?: "json" | "summary" | "detailed";
    view?: "system" | "events" | "overview" | "tasks" | "database";
}>;
export type AxiomMcpStatusInput = z.infer<typeof axiomMcpStatusSchema>;
export declare const axiomMcpStatusTool: {
    name: string;
    description: string;
    inputSchema: import("../utils/mcp-schema.js").McpJsonSchema;
};
export declare function handleAxiomMcpStatus(args: AxiomMcpStatusInput, statusManager?: StatusManager, conversationDB?: ConversationDB, eventBus?: EventBus): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=axiom-mcp-status.d.ts.map