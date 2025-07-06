import { z } from 'zod';
import { ClaudeCodeSubprocess } from '../claude-subprocess.js';
import { StatusManager } from '../status-manager.js';
export declare const axiomMcpSpawnMctsSchema: z.ZodObject<{
    parentPrompt: z.ZodString;
    mctsConfig: z.ZodOptional<z.ZodObject<{
        explorationConstant: z.ZodDefault<z.ZodNumber>;
        maxIterations: z.ZodDefault<z.ZodNumber>;
        maxDepth: z.ZodDefault<z.ZodNumber>;
        simulationMode: z.ZodDefault<z.ZodEnum<["fast", "full", "mixed"]>>;
        minQualityThreshold: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        maxDepth?: number;
        explorationConstant?: number;
        maxIterations?: number;
        simulationMode?: "fast" | "full" | "mixed";
        minQualityThreshold?: number;
    }, {
        maxDepth?: number;
        explorationConstant?: number;
        maxIterations?: number;
        simulationMode?: "fast" | "full" | "mixed";
        minQualityThreshold?: number;
    }>>;
    autoExecute: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    parentPrompt?: string;
    autoExecute?: boolean;
    mctsConfig?: {
        maxDepth?: number;
        explorationConstant?: number;
        maxIterations?: number;
        simulationMode?: "fast" | "full" | "mixed";
        minQualityThreshold?: number;
    };
}, {
    parentPrompt?: string;
    autoExecute?: boolean;
    mctsConfig?: {
        maxDepth?: number;
        explorationConstant?: number;
        maxIterations?: number;
        simulationMode?: "fast" | "full" | "mixed";
        minQualityThreshold?: number;
    };
}>;
export type axiomMcpSpawnMctsInput = z.infer<typeof axiomMcpSpawnMctsSchema>;
export declare const axiomMcpSpawnMctsTool: {
    name: string;
    description: string;
    inputSchema: import("zod-to-json-schema").JsonSchema7Type & {
        $schema?: string | undefined;
        definitions?: {
            [key: string]: import("zod-to-json-schema").JsonSchema7Type;
        };
    };
};
export declare function handleAxiomMcpSpawnMcts(input: axiomMcpSpawnMctsInput, claudeCode: ClaudeCodeSubprocess, statusManager: StatusManager): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=axiom-mcp-spawn-mcts.d.ts.map