/**
 * MCP Response utilities to ensure protocol compliance
 */
export interface McpToolResponse {
    result: {
        content: Array<{
            type: 'text' | 'image' | 'audio';
            text?: string;
            data?: string;
            mimeType?: string;
        }>;
        structuredContent?: any;
        isError?: boolean;
    };
}
/**
 * Wrap tool output in MCP-compliant response format
 */
export declare function createMcpResponse(text: string, structuredContent?: any, isError?: boolean): McpToolResponse;
/**
 * Create an error response in MCP format
 */
export declare function createMcpErrorResponse(errorMessage: string, errorDetails?: any): McpToolResponse;
/**
 * Convert legacy response format to MCP format
 */
export declare function wrapLegacyResponse(response: any): McpToolResponse;
//# sourceMappingURL=mcp-response.d.ts.map