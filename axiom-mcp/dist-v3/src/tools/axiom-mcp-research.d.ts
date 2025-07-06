import { z } from 'zod';
import { ClaudeCodeSubprocess } from '../claude-subprocess.js';
export declare const axiomMcpResearchSchema: z.ZodObject<{
    topic: z.ZodString;
    depth: z.ZodDefault<z.ZodEnum<["quick", "standard", "deep"]>>;
    constraints: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    outputFormat: z.ZodDefault<z.ZodEnum<["summary", "detailed", "structured"]>>;
    allowedTools: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    depth: "quick" | "standard" | "deep";
    outputFormat: "summary" | "detailed" | "structured";
    topic: string;
    constraints?: string[] | undefined;
    allowedTools?: string[] | undefined;
}, {
    topic: string;
    depth?: "quick" | "standard" | "deep" | undefined;
    constraints?: string[] | undefined;
    outputFormat?: "summary" | "detailed" | "structured" | undefined;
    allowedTools?: string[] | undefined;
}>;
export type axiomMcpResearchInput = z.infer<typeof axiomMcpResearchSchema>;
export declare const axiomMcpResearchTool: {
    name: string;
    description: string;
    inputSchema: import("zod-to-json-schema").JsonSchema7Type & {
        $schema?: string | undefined;
        definitions?: {
            [key: string]: import("zod-to-json-schema").JsonSchema7Type;
        } | undefined;
    };
};
export declare function handleAxiomMcpResearch(input: axiomMcpResearchInput, claudeCode: ClaudeCodeSubprocess): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=axiom-mcp-research.d.ts.map