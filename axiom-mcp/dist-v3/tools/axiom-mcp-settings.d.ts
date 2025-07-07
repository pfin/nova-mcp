import { z } from 'zod';
export declare const axiomMcpSettingsSchema: z.ZodObject<{
    action: z.ZodEnum<["get", "set", "list", "reset"]>;
    setting: z.ZodOptional<z.ZodString>;
    value: z.ZodOptional<z.ZodAny>;
    category: z.ZodDefault<z.ZodEnum<["execution", "logging", "intervention", "verbose", "all"]>>;
}, "strip", z.ZodTypeAny, {
    value?: any;
    action?: "list" | "set" | "get" | "reset";
    category?: "intervention" | "logging" | "all" | "execution" | "verbose";
    setting?: string;
}, {
    value?: any;
    action?: "list" | "set" | "get" | "reset";
    category?: "intervention" | "logging" | "all" | "execution" | "verbose";
    setting?: string;
}>;
export type AxiomMcpSettingsInput = z.infer<typeof axiomMcpSettingsSchema>;
export declare const axiomMcpSettingsTool: {
    name: string;
    description: string;
    inputSchema: import("../utils/mcp-schema.js").McpJsonSchema;
};
declare const DEFAULT_SETTINGS: {
    execution: {
        maxConcurrentTasks: number;
        defaultTimeout: number;
        useWorkerThreads: boolean;
        executorType: string;
        workingDirectory: string;
    };
    logging: {
        level: string;
        maxLogFiles: number;
        enableWebSocket: boolean;
        webSocketPort: number;
        formatOutput: boolean;
    };
    intervention: {
        enabled: boolean;
        planningTimeout: number;
        progressCheckInterval: number;
        todoDetection: boolean;
        forceImplementation: boolean;
    };
    verbose: {
        defaultEnabled: boolean;
        colorOutput: boolean;
        showTimestamps: boolean;
        prefixLength: number;
        bufferSize: number;
        flushInterval: number;
    };
};
export declare function handleAxiomMcpSettings(args: AxiomMcpSettingsInput): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
export declare function getCurrentSettings(): Promise<typeof DEFAULT_SETTINGS>;
export {};
//# sourceMappingURL=axiom-mcp-settings.d.ts.map