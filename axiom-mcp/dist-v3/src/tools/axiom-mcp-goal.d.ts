import { z } from 'zod';
import { ClaudeCodeSubprocess } from '../claude-subprocess.js';
export declare const axiomMcpGoalSchema: z.ZodObject<{
    goal: z.ZodString;
    context: z.ZodOptional<z.ZodString>;
    depth: z.ZodDefault<z.ZodEnum<["quick", "standard", "deep"]>>;
}, "strip", z.ZodTypeAny, {
    depth?: "quick" | "standard" | "deep";
    goal?: string;
    context?: string;
}, {
    depth?: "quick" | "standard" | "deep";
    goal?: string;
    context?: string;
}>;
export type axiomMcpGoalInput = z.infer<typeof axiomMcpGoalSchema>;
export declare const axiomMcpGoalTool: {
    name: string;
    description: string;
    inputSchema: import("zod-to-json-schema").JsonSchema7Type & {
        $schema?: string | undefined;
        definitions?: {
            [key: string]: import("zod-to-json-schema").JsonSchema7Type;
        };
    };
};
export declare function handleAxiomMcpGoal(input: axiomMcpGoalInput, claudeCode: ClaudeCodeSubprocess): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=axiom-mcp-goal.d.ts.map