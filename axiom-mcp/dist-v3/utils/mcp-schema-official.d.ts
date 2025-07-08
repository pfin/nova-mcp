import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
/**
 * Convert a Zod schema to MCP JSON Schema following the official SDK pattern exactly
 */
export declare function toMcpSchemaOfficial(zodSchema: z.ZodType<any>): Tool["inputSchema"];
//# sourceMappingURL=mcp-schema-official.d.ts.map