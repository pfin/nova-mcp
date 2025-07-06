import { z } from 'zod';
export declare const axiomMcpDocsSchema: z.ZodObject<{
    section: z.ZodEnum<["overview", "mcts-explanation", "usage-guide", "implementation-verification", "monitoring-report", "deceptive-patterns", "best-practices", "troubleshooting", "truth-about-axiom"]>;
}, "strip", z.ZodTypeAny, {
    section?: "overview" | "mcts-explanation" | "usage-guide" | "implementation-verification" | "monitoring-report" | "deceptive-patterns" | "best-practices" | "troubleshooting" | "truth-about-axiom";
}, {
    section?: "overview" | "mcts-explanation" | "usage-guide" | "implementation-verification" | "monitoring-report" | "deceptive-patterns" | "best-practices" | "troubleshooting" | "truth-about-axiom";
}>;
export type AxiomMcpDocsInput = z.infer<typeof axiomMcpDocsSchema>;
export declare const axiomMcpDocsTool: {
    name: string;
    description: string;
    inputSchema: import("zod-to-json-schema").JsonSchema7Type & {
        $schema?: string | undefined;
        definitions?: {
            [key: string]: import("zod-to-json-schema").JsonSchema7Type;
        };
    };
};
export declare function handleAxiomMcpDocs(input: AxiomMcpDocsInput): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=axiom-mcp-docs.d.ts.map