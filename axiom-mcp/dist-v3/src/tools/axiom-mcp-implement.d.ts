import { z } from 'zod';
import { ClaudeCodeSubprocess } from '../claude-subprocess.js';
import { StatusManager } from '../status-manager.js';
export declare const axiomMcpImplementSchema: z.ZodObject<{
    task: z.ZodString;
    contextFiles: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    verifyWith: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    acceptanceCriteria: z.ZodOptional<z.ZodObject<{
        hasWorkingCode: z.ZodDefault<z.ZodBoolean>;
        testsPass: z.ZodDefault<z.ZodBoolean>;
        noVulnerabilities: z.ZodDefault<z.ZodBoolean>;
        coverageThreshold: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        hasWorkingCode: boolean;
        testsPass: boolean;
        noVulnerabilities: boolean;
        coverageThreshold?: number | undefined;
    }, {
        hasWorkingCode?: boolean | undefined;
        testsPass?: boolean | undefined;
        noVulnerabilities?: boolean | undefined;
        coverageThreshold?: number | undefined;
    }>>;
    securityScan: z.ZodDefault<z.ZodBoolean>;
    autoFix: z.ZodDefault<z.ZodBoolean>;
    maxRetries: z.ZodDefault<z.ZodNumber>;
    useInteractive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    task: string;
    maxRetries: number;
    securityScan: boolean;
    autoFix: boolean;
    useInteractive: boolean;
    contextFiles?: string[] | undefined;
    verifyWith?: string[] | undefined;
    acceptanceCriteria?: {
        hasWorkingCode: boolean;
        testsPass: boolean;
        noVulnerabilities: boolean;
        coverageThreshold?: number | undefined;
    } | undefined;
}, {
    task: string;
    maxRetries?: number | undefined;
    contextFiles?: string[] | undefined;
    verifyWith?: string[] | undefined;
    acceptanceCriteria?: {
        hasWorkingCode?: boolean | undefined;
        testsPass?: boolean | undefined;
        noVulnerabilities?: boolean | undefined;
        coverageThreshold?: number | undefined;
    } | undefined;
    securityScan?: boolean | undefined;
    autoFix?: boolean | undefined;
    useInteractive?: boolean | undefined;
}>;
export type AxiomMcpImplementInput = z.infer<typeof axiomMcpImplementSchema>;
export declare const axiomMcpImplementTool: {
    name: string;
    description: string;
    inputSchema: import("zod-to-json-schema").JsonSchema7Type & {
        $schema?: string | undefined;
        definitions?: {
            [key: string]: import("zod-to-json-schema").JsonSchema7Type;
        } | undefined;
    };
};
export declare function handleAxiomMcpImplement(input: AxiomMcpImplementInput, claudeCode: ClaudeCodeSubprocess, statusManager: StatusManager): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
//# sourceMappingURL=axiom-mcp-implement.d.ts.map