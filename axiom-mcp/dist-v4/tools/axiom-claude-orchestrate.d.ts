import { z } from 'zod';
export declare const axiomClaudeOrchestrateSchema: z.ZodObject<{
    action: z.ZodEnum<["spawn", "prompt", "steer", "get_output", "status", "cleanup"]>;
    instanceId: z.ZodString;
    prompt: z.ZodOptional<z.ZodString>;
    lines: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    action: "status" | "prompt" | "spawn" | "steer" | "get_output" | "cleanup";
    instanceId: string;
    lines: number;
    prompt?: string | undefined;
}, {
    action: "status" | "prompt" | "spawn" | "steer" | "get_output" | "cleanup";
    instanceId: string;
    prompt?: string | undefined;
    lines?: number | undefined;
}>;
export type AxiomClaudeOrchestrateParams = z.infer<typeof axiomClaudeOrchestrateSchema>;
export declare function axiomClaudeOrchestrate(params: AxiomClaudeOrchestrateParams): Promise<any>;
//# sourceMappingURL=axiom-claude-orchestrate.d.ts.map