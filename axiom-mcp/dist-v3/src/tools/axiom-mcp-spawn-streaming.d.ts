import { z } from 'zod';
import { ClaudeCodeSubprocessStreaming } from '../claude-subprocess-streaming.js';
import { StatusManager } from '../status-manager.js';
export declare const axiomMcpSpawnStreamingSchema: z.ZodObject<{
    parentPrompt: z.ZodString;
    spawnPattern: z.ZodEnum<["decompose", "parallel", "sequential", "recursive"]>;
    spawnCount: z.ZodDefault<z.ZodNumber>;
    maxDepth: z.ZodDefault<z.ZodNumber>;
    autoExecute: z.ZodDefault<z.ZodBoolean>;
    streamToMaster: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    parentPrompt: string;
    spawnPattern: "decompose" | "parallel" | "sequential" | "recursive";
    spawnCount: number;
    maxDepth: number;
    autoExecute: boolean;
    streamToMaster: boolean;
}, {
    parentPrompt: string;
    spawnPattern: "decompose" | "parallel" | "sequential" | "recursive";
    spawnCount?: number | undefined;
    maxDepth?: number | undefined;
    autoExecute?: boolean | undefined;
    streamToMaster?: boolean | undefined;
}>;
export type axiomMcpSpawnStreamingInput = z.infer<typeof axiomMcpSpawnStreamingSchema>;
export declare const axiomMcpSpawnStreamingTool: {
    name: string;
    description: string;
    inputSchema: import("zod-to-json-schema").JsonSchema7Type & {
        $schema?: string | undefined;
        definitions?: {
            [key: string]: import("zod-to-json-schema").JsonSchema7Type;
        } | undefined;
    };
};
export declare function handleAxiomMcpSpawnStreaming(input: axiomMcpSpawnStreamingInput, claudeCode: ClaudeCodeSubprocessStreaming, statusManager: StatusManager, parentTaskId?: string, taskPath?: string[]): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=axiom-mcp-spawn-streaming.d.ts.map