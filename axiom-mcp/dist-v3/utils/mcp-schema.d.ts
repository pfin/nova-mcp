import { z } from 'zod';
export interface McpJsonSchema {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
    additionalProperties: false;
    title?: string;
    description?: string;
}
export declare function createMcpCompliantSchema(zodSchema: z.ZodObject<any>, title?: string): McpJsonSchema;
//# sourceMappingURL=mcp-schema.d.ts.map