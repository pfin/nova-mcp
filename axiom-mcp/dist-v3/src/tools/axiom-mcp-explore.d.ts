import { z } from 'zod';
import { ClaudeCodeSubprocess } from '../claude-subprocess.js';
import { StatusManager } from '../status-manager.js';
export declare function initializeExploreStatusManager(manager: StatusManager): void;
export declare const axiomMcpExploreSchema: z.ZodObject<{
    topics: z.ZodArray<z.ZodString, "many">;
    mainGoal: z.ZodString;
    tools: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    synthesize: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    tools?: string[];
    topics?: string[];
    mainGoal?: string;
    synthesize?: boolean;
}, {
    tools?: string[];
    topics?: string[];
    mainGoal?: string;
    synthesize?: boolean;
}>;
export type axiomMcpExploreInput = z.infer<typeof axiomMcpExploreSchema>;
export declare const axiomMcpExploreTool: {
    name: string;
    description: string;
    inputSchema: import("zod-to-json-schema").JsonSchema7Type & {
        $schema?: string | undefined;
        definitions?: {
            [key: string]: import("zod-to-json-schema").JsonSchema7Type;
        };
    };
};
export declare function handleAxiomMcpExplore(input: axiomMcpExploreInput, claudeCode: ClaudeCodeSubprocess): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=axiom-mcp-explore.d.ts.map