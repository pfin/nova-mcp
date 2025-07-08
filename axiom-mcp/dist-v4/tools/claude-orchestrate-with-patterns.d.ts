/**
 * Enhanced Claude Orchestrator with Pattern-Based Intervention
 *
 * This integrates the pattern scanner and intervention controller
 * with Claude instance management for real-time intervention.
 */
import { z } from 'zod';
export declare const axiomClaudeOrchestrateEnhancedSchema: z.ZodObject<{
    action: z.ZodEnum<["spawn", "prompt", "steer", "get_output", "status", "cleanup", "add_pattern", "get_interventions"]>;
    instanceId: z.ZodString;
    prompt: z.ZodOptional<z.ZodString>;
    lines: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    pattern: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        pattern: z.ZodString;
        action: z.ZodString;
        priority: z.ZodNumber;
        cooldown: z.ZodOptional<z.ZodNumber>;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        action: string;
        pattern: string;
        description: string;
        priority: number;
        cooldown?: number | undefined;
    }, {
        id: string;
        action: string;
        pattern: string;
        description: string;
        priority: number;
        cooldown?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    action: "status" | "prompt" | "spawn" | "steer" | "get_output" | "cleanup" | "add_pattern" | "get_interventions";
    instanceId: string;
    lines: number;
    pattern?: {
        id: string;
        action: string;
        pattern: string;
        description: string;
        priority: number;
        cooldown?: number | undefined;
    } | undefined;
    prompt?: string | undefined;
}, {
    action: "status" | "prompt" | "spawn" | "steer" | "get_output" | "cleanup" | "add_pattern" | "get_interventions";
    instanceId: string;
    pattern?: {
        id: string;
        action: string;
        pattern: string;
        description: string;
        priority: number;
        cooldown?: number | undefined;
    } | undefined;
    prompt?: string | undefined;
    lines?: number | undefined;
}>;
type ClaudeAction = z.infer<typeof axiomClaudeOrchestrateEnhancedSchema>;
export declare function axiomClaudeOrchestrateEnhanced(args: ClaudeAction): Promise<string>;
export {};
//# sourceMappingURL=claude-orchestrate-with-patterns.d.ts.map