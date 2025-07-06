import { z } from 'zod';
import { ClaudeCodeSubprocess } from '../claude-subprocess.js';
export declare const axiomMcpParallelSchema: z.ZodObject<{
    mainGoal: z.ZodString;
    branches: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        focus: z.ZodString;
        tools: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        tools?: string[];
        focus?: string;
    }, {
        id?: string;
        tools?: string[];
        focus?: string;
    }>, "many">;
    synthesize: z.ZodDefault<z.ZodBoolean>;
    timeLimit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    mainGoal?: string;
    synthesize?: boolean;
    branches?: {
        id?: string;
        tools?: string[];
        focus?: string;
    }[];
    timeLimit?: number;
}, {
    mainGoal?: string;
    synthesize?: boolean;
    branches?: {
        id?: string;
        tools?: string[];
        focus?: string;
    }[];
    timeLimit?: number;
}>;
export type axiomMcpParallelInput = z.infer<typeof axiomMcpParallelSchema>;
export declare const axiomMcpParallelTool: {
    name: string;
    description: string;
    inputSchema: import("zod-to-json-schema").JsonSchema7Type & {
        $schema?: string | undefined;
        definitions?: {
            [key: string]: import("zod-to-json-schema").JsonSchema7Type;
        };
    };
};
export declare function handleAxiomMcpParallel(input: axiomMcpParallelInput, claudeCode: ClaudeCodeSubprocess): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=axiom-mcp-parallel.d.ts.map