import { z } from 'zod';
import { ClaudeCodeSubprocess } from '../claude-subprocess.js';
export declare const axiomMcpParallelSchema: z.ZodObject<{
    mainGoal: z.ZodString;
    branches: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        focus: z.ZodString;
        tools: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        focus: string;
        tools?: string[] | undefined;
    }, {
        id: string;
        focus: string;
        tools?: string[] | undefined;
    }>, "many">;
    synthesize: z.ZodDefault<z.ZodBoolean>;
    timeLimit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    mainGoal: string;
    synthesize: boolean;
    branches: {
        id: string;
        focus: string;
        tools?: string[] | undefined;
    }[];
    timeLimit: number;
}, {
    mainGoal: string;
    branches: {
        id: string;
        focus: string;
        tools?: string[] | undefined;
    }[];
    synthesize?: boolean | undefined;
    timeLimit?: number | undefined;
}>;
export type axiomMcpParallelInput = z.infer<typeof axiomMcpParallelSchema>;
export declare const axiomMcpParallelTool: {
    name: string;
    description: string;
    inputSchema: import("zod-to-json-schema").JsonSchema7Type & {
        $schema?: string | undefined;
        definitions?: {
            [key: string]: import("zod-to-json-schema").JsonSchema7Type;
        } | undefined;
    };
};
export declare function handleAxiomMcpParallel(input: axiomMcpParallelInput, claudeCode: ClaudeCodeSubprocess): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=axiom-mcp-parallel.d.ts.map