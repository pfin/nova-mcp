import { z } from 'zod';
import { StatusManager } from '../status-manager.js';
import { ContextManager } from '../context-manager.js';
export declare const axiomMcpGoalsSchema: z.ZodObject<{
    action: z.ZodEnum<["define", "propagate", "evaluate", "track"]>;
    taskId: z.ZodString;
    goalDefinition: z.ZodOptional<z.ZodObject<{
        objective: z.ZodString;
        successCriteria: z.ZodArray<z.ZodString, "many">;
        constraints: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        priority: z.ZodDefault<z.ZodEnum<["critical", "high", "medium", "low"]>>;
    }, "strip", z.ZodTypeAny, {
        objective: string;
        successCriteria: string[];
        priority: "low" | "medium" | "high" | "critical";
        constraints?: string[] | undefined;
    }, {
        objective: string;
        successCriteria: string[];
        constraints?: string[] | undefined;
        priority?: "low" | "medium" | "high" | "critical" | undefined;
    }>>;
    propagationStrategy: z.ZodOptional<z.ZodEnum<["inherit", "decompose", "transform"]>>;
}, "strip", z.ZodTypeAny, {
    taskId: string;
    action: "define" | "propagate" | "evaluate" | "track";
    goalDefinition?: {
        objective: string;
        successCriteria: string[];
        priority: "low" | "medium" | "high" | "critical";
        constraints?: string[] | undefined;
    } | undefined;
    propagationStrategy?: "inherit" | "decompose" | "transform" | undefined;
}, {
    taskId: string;
    action: "define" | "propagate" | "evaluate" | "track";
    goalDefinition?: {
        objective: string;
        successCriteria: string[];
        constraints?: string[] | undefined;
        priority?: "low" | "medium" | "high" | "critical" | undefined;
    } | undefined;
    propagationStrategy?: "inherit" | "decompose" | "transform" | undefined;
}>;
export type axiomMcpGoalsInput = z.infer<typeof axiomMcpGoalsSchema>;
export declare const axiomMcpGoalsTool: {
    name: string;
    description: string;
    inputSchema: import("zod-to-json-schema").JsonSchema7Type & {
        $schema?: string | undefined;
        definitions?: {
            [key: string]: import("zod-to-json-schema").JsonSchema7Type;
        } | undefined;
    };
};
export declare function handleAxiomMcpGoals(input: axiomMcpGoalsInput, statusManager: StatusManager, contextManager: ContextManager): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=axiom-mcp-goals.d.ts.map