/**
 * Axiom Context Builder Tool - MCP interface for context management
 */
import { z } from 'zod';
export declare const contextBuilderSchema: z.ZodObject<{
    action: z.ZodEnum<["generate", "prepare", "optimize", "analyze"]>;
    projectPath: z.ZodOptional<z.ZodString>;
    tasks: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        prompt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        prompt: string;
    }, {
        id: string;
        prompt: string;
    }>, "many">>;
    taskId: z.ZodOptional<z.ZodString>;
    llm: z.ZodOptional<z.ZodEnum<["gpt-4", "gpt-3.5", "claude"]>>;
    config: z.ZodOptional<z.ZodObject<{
        maxTokens: z.ZodOptional<z.ZodNumber>;
        format: z.ZodOptional<z.ZodEnum<["minimal", "detailed", "compressed"]>>;
        includeTests: z.ZodOptional<z.ZodBoolean>;
        includeDocs: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        maxTokens?: number | undefined;
        format?: "minimal" | "detailed" | "compressed" | undefined;
        includeTests?: boolean | undefined;
        includeDocs?: boolean | undefined;
    }, {
        maxTokens?: number | undefined;
        format?: "minimal" | "detailed" | "compressed" | undefined;
        includeTests?: boolean | undefined;
        includeDocs?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    action: "analyze" | "generate" | "prepare" | "optimize";
    taskId?: string | undefined;
    tasks?: {
        id: string;
        prompt: string;
    }[] | undefined;
    config?: {
        maxTokens?: number | undefined;
        format?: "minimal" | "detailed" | "compressed" | undefined;
        includeTests?: boolean | undefined;
        includeDocs?: boolean | undefined;
    } | undefined;
    projectPath?: string | undefined;
    llm?: "claude" | "gpt-4" | "gpt-3.5" | undefined;
}, {
    action: "analyze" | "generate" | "prepare" | "optimize";
    taskId?: string | undefined;
    tasks?: {
        id: string;
        prompt: string;
    }[] | undefined;
    config?: {
        maxTokens?: number | undefined;
        format?: "minimal" | "detailed" | "compressed" | undefined;
        includeTests?: boolean | undefined;
        includeDocs?: boolean | undefined;
    } | undefined;
    projectPath?: string | undefined;
    llm?: "claude" | "gpt-4" | "gpt-3.5" | undefined;
}>;
export declare function axiomContextBuilder(params: z.infer<typeof contextBuilderSchema>): Promise<string>;
export declare const contextBuilderTool: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            action: {
                type: string;
                enum: string[];
                description: string;
            };
            projectPath: {
                type: string;
                description: string;
            };
            tasks: {
                type: string;
                items: {
                    type: string;
                    properties: {
                        id: {
                            type: string;
                        };
                        prompt: {
                            type: string;
                        };
                    };
                    required: string[];
                };
                description: string;
            };
            taskId: {
                type: string;
                description: string;
            };
            llm: {
                type: string;
                enum: string[];
                description: string;
            };
            config: {
                type: string;
                properties: {
                    maxTokens: {
                        type: string;
                    };
                    format: {
                        type: string;
                        enum: string[];
                    };
                    includeTests: {
                        type: string;
                    };
                    includeDocs: {
                        type: string;
                    };
                };
                description: string;
            };
        };
        required: string[];
    };
};
//# sourceMappingURL=axiom-context-builder.d.ts.map