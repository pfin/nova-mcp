import { z } from 'zod';
import { ClaudeCodeSubprocess } from '../claude-subprocess.js';
import { StatusManager } from '../status-manager.js';
export declare const axiomMcpSpawnSchema: z.ZodObject<{
    parentPrompt: z.ZodString;
    spawnPattern: z.ZodEnum<["decompose", "parallel", "sequential", "recursive"]>;
    spawnCount: z.ZodDefault<z.ZodNumber>;
    maxDepth: z.ZodDefault<z.ZodNumber>;
    autoExecute: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    parentPrompt: string;
    spawnPattern: "decompose" | "parallel" | "sequential" | "recursive";
    spawnCount: number;
    maxDepth: number;
    autoExecute: boolean;
}, {
    parentPrompt: string;
    spawnPattern: "decompose" | "parallel" | "sequential" | "recursive";
    spawnCount?: number | undefined;
    maxDepth?: number | undefined;
    autoExecute?: boolean | undefined;
}>;
export type axiomMcpSpawnInput = z.infer<typeof axiomMcpSpawnSchema>;
export declare const axiomMcpSpawnTool: {
    name: string;
    description: string;
    inputSchema: import("zod-to-json-schema").JsonSchema7Type & {
        $schema?: string | undefined;
        definitions?: {
            [key: string]: import("zod-to-json-schema").JsonSchema7Type;
        } | undefined;
    };
};
export declare function handleAxiomMcpSpawn(input: axiomMcpSpawnInput, claudeCode: ClaudeCodeSubprocess, statusManager: StatusManager): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=axiom-mcp-spawn.d.ts.map