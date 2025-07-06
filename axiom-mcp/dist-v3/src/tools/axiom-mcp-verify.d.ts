import { z } from 'zod';
export declare const axiomMcpVerifySchema: z.ZodObject<{
    action: z.ZodEnum<["status", "report", "enforce"]>;
    taskId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    taskId?: string;
    action?: "status" | "enforce" | "report";
}, {
    taskId?: string;
    action?: "status" | "enforce" | "report";
}>;
export type AxiomMcpVerifyInput = z.infer<typeof axiomMcpVerifySchema>;
export declare const axiomMcpVerifyTool: {
    name: string;
    description: string;
    inputSchema: import("zod-to-json-schema").JsonSchema7Type & {
        $schema?: string | undefined;
        definitions?: {
            [key: string]: import("zod-to-json-schema").JsonSchema7Type;
        };
    };
};
export declare function handleAxiomMcpVerify(input: AxiomMcpVerifyInput): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=axiom-mcp-verify.d.ts.map