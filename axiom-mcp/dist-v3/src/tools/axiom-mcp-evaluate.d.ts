import { z } from 'zod';
import { StatusManager } from '../status-manager.js';
import { ContextManager } from '../context-manager.js';
import { ClaudeCodeSubprocess } from '../claude-subprocess.js';
export declare const axiomMcpEvaluateSchema: z.ZodObject<{
    taskId: z.ZodString;
    evaluationType: z.ZodEnum<["quality", "relevance", "completeness", "accuracy"]>;
    parentExpectations: z.ZodOptional<z.ZodObject<{
        requiredElements: z.ZodArray<z.ZodString, "many">;
        qualityThreshold: z.ZodDefault<z.ZodNumber>;
        rejectIfMissing: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        requiredElements?: string[];
        qualityThreshold?: number;
        rejectIfMissing?: string[];
    }, {
        requiredElements?: string[];
        qualityThreshold?: number;
        rejectIfMissing?: string[];
    }>>;
    autoRetry: z.ZodDefault<z.ZodBoolean>;
    maxRetries: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    taskId?: string;
    evaluationType?: "quality" | "relevance" | "completeness" | "accuracy";
    parentExpectations?: {
        requiredElements?: string[];
        qualityThreshold?: number;
        rejectIfMissing?: string[];
    };
    autoRetry?: boolean;
    maxRetries?: number;
}, {
    taskId?: string;
    evaluationType?: "quality" | "relevance" | "completeness" | "accuracy";
    parentExpectations?: {
        requiredElements?: string[];
        qualityThreshold?: number;
        rejectIfMissing?: string[];
    };
    autoRetry?: boolean;
    maxRetries?: number;
}>;
export type axiomMcpEvaluateInput = z.infer<typeof axiomMcpEvaluateSchema>;
export declare const axiomMcpEvaluateTool: {
    name: string;
    description: string;
    inputSchema: import("zod-to-json-schema").JsonSchema7Type & {
        $schema?: string | undefined;
        definitions?: {
            [key: string]: import("zod-to-json-schema").JsonSchema7Type;
        };
    };
};
interface EvaluationResult {
    taskId: string;
    passed: boolean;
    score: number;
    issues: string[];
    suggestions: string[];
    missingElements: string[];
    retryPrompt?: string;
}
export declare function handleAxiomMcpEvaluate(input: axiomMcpEvaluateInput, statusManager: StatusManager, contextManager: ContextManager, claudeCode: ClaudeCodeSubprocess): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
export declare function getTaskEvaluationHistory(taskId: string): EvaluationResult[];
export declare function clearEvaluationHistory(): void;
export {};
//# sourceMappingURL=axiom-mcp-evaluate.d.ts.map