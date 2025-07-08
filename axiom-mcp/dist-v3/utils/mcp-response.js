/**
 * MCP Response utilities to ensure protocol compliance
 */
/**
 * Wrap tool output in MCP-compliant response format
 */
export function createMcpResponse(text, structuredContent, isError = false) {
    return {
        result: {
            content: [{
                    type: 'text',
                    text
                }],
            ...(structuredContent && { structuredContent }),
            ...(isError && { isError })
        }
    };
}
/**
 * Create an error response in MCP format
 */
export function createMcpErrorResponse(errorMessage, errorDetails) {
    return {
        result: {
            content: [{
                    type: 'text',
                    text: `Error: ${errorMessage}`
                }],
            structuredContent: errorDetails,
            isError: true
        }
    };
}
/**
 * Convert legacy response format to MCP format
 */
export function wrapLegacyResponse(response) {
    // If already MCP compliant
    if (response?.result?.content) {
        return response;
    }
    // If legacy format with content array
    if (response?.content && Array.isArray(response.content)) {
        return {
            result: {
                content: response.content,
                ...(response.structuredContent && { structuredContent: response.structuredContent }),
                ...(response.isError && { isError: response.isError })
            }
        };
    }
    // If just a string
    if (typeof response === 'string') {
        return createMcpResponse(response);
    }
    // Fallback
    return createMcpResponse(JSON.stringify(response));
}
//# sourceMappingURL=mcp-response.js.map