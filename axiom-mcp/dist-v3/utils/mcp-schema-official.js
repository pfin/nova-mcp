import { zodToJsonSchema } from 'zod-to-json-schema';
/**
 * Convert a Zod schema to MCP JSON Schema following the official SDK pattern exactly
 */
export function toMcpSchemaOfficial(zodSchema) {
    // Match the official SDK exactly
    return zodToJsonSchema(zodSchema, {
        strictUnions: true
    });
}
//# sourceMappingURL=mcp-schema-official.js.map