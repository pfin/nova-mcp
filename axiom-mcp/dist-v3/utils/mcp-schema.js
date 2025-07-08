import { zodToJsonSchema } from 'zod-to-json-schema';
export function createMcpCompliantSchema(zodSchema, title) {
    // Get base schema from zod
    const baseSchema = zodToJsonSchema(zodSchema);
    // Remove $schema field if present
    if ('$schema' in baseSchema) {
        delete baseSchema.$schema;
    }
    // Ensure it's an object schema
    if (baseSchema.type !== 'object') {
        throw new Error('MCP tools must have object input schemas');
    }
    // Extract required fields properly
    const required = [];
    const properties = {};
    // Process each property
    for (const [key, value] of Object.entries(baseSchema.properties || {})) {
        // Process nested objects to add additionalProperties: false
        properties[key] = processNestedSchemas(value);
        // Check if field is required
        const zodShape = zodSchema.shape[key];
        if (zodShape && !zodShape.isOptional()) {
            required.push(key);
        }
    }
    // Return MCP-compliant schema
    return {
        type: 'object',
        properties,
        required,
        additionalProperties: false, // Critical for MCP compliance
        ...(title && { title }),
        ...(baseSchema.description && { description: baseSchema.description })
    };
}
// Helper to process nested schemas
function processNestedSchemas(schema) {
    if (!schema || typeof schema !== 'object') {
        return schema;
    }
    // Create a clean copy
    const processed = { ...schema };
    // Remove $schema if present
    if ('$schema' in processed) {
        delete processed.$schema;
    }
    // If it's an object schema, ensure additionalProperties: false
    if (processed.type === 'object' && processed.properties) {
        processed.additionalProperties = false;
        // Recursively process nested properties
        for (const [key, value] of Object.entries(processed.properties)) {
            if (value && typeof value === 'object') {
                processed.properties[key] = processNestedSchemas(value);
            }
        }
    }
    return processed;
}
//# sourceMappingURL=mcp-schema.js.map