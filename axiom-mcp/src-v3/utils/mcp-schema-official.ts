import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Convert a Zod schema to MCP JSON Schema following the official SDK pattern exactly
 */
export function toMcpSchemaOfficial(zodSchema: z.ZodType<any>): Tool["inputSchema"] {
  // Match the official SDK exactly
  return zodToJsonSchema(zodSchema, {
    strictUnions: true
  }) as Tool["inputSchema"];
}