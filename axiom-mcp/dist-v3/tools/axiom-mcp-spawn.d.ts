import { z } from 'zod';
import { StatusManager } from '../managers/status-manager.js';
import { ConversationDB } from '../database/conversation-db.js';
export declare const AXIOM_VERSION = "0.5.0-verbose";
export declare const axiomMcpSpawnSchema: z.ZodObject<{
    parentPrompt: z.ZodString;
    spawnPattern: z.ZodEnum<["decompose", "parallel", "sequential", "recursive"]>;
    spawnCount: z.ZodDefault<z.ZodNumber>;
    maxDepth: z.ZodDefault<z.ZodNumber>;
    autoExecute: z.ZodDefault<z.ZodBoolean>;
    verboseMasterMode: z.ZodDefault<z.ZodBoolean>;
    streamingOptions: z.ZodOptional<z.ZodObject<{
        outputMode: z.ZodDefault<z.ZodEnum<["console", "websocket", "both"]>>;
        colorize: z.ZodDefault<z.ZodBoolean>;
        bufferSize: z.ZodDefault<z.ZodNumber>;
        flushInterval: z.ZodDefault<z.ZodNumber>;
        includeTimestamps: z.ZodDefault<z.ZodBoolean>;
        prefixLength: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        outputMode?: "console" | "websocket" | "both";
        colorize?: boolean;
        bufferSize?: number;
        flushInterval?: number;
        includeTimestamps?: boolean;
        prefixLength?: number;
    }, {
        outputMode?: "console" | "websocket" | "both";
        colorize?: boolean;
        bufferSize?: number;
        flushInterval?: number;
        includeTimestamps?: boolean;
        prefixLength?: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    parentPrompt?: string;
    spawnPattern?: "decompose" | "parallel" | "sequential" | "recursive";
    spawnCount?: number;
    maxDepth?: number;
    autoExecute?: boolean;
    verboseMasterMode?: boolean;
    streamingOptions?: {
        outputMode?: "console" | "websocket" | "both";
        colorize?: boolean;
        bufferSize?: number;
        flushInterval?: number;
        includeTimestamps?: boolean;
        prefixLength?: number;
    };
}, {
    parentPrompt?: string;
    spawnPattern?: "decompose" | "parallel" | "sequential" | "recursive";
    spawnCount?: number;
    maxDepth?: number;
    autoExecute?: boolean;
    verboseMasterMode?: boolean;
    streamingOptions?: {
        outputMode?: "console" | "websocket" | "both";
        colorize?: boolean;
        bufferSize?: number;
        flushInterval?: number;
        includeTimestamps?: boolean;
        prefixLength?: number;
    };
}>;
export type AxiomMcpSpawnInput = z.infer<typeof axiomMcpSpawnSchema>;
export declare const axiomMcpSpawnTool: {
    name: string;
    description: string;
    inputSchema: import("../utils/mcp-schema.js").McpJsonSchema;
};
export declare function handleAxiomMcpSpawn(input: AxiomMcpSpawnInput, statusManager: StatusManager, conversationDB?: ConversationDB): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=axiom-mcp-spawn.d.ts.map