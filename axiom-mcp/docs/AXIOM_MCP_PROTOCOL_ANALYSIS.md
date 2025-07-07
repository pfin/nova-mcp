# Axiom MCP Protocol Compliance Analysis

## Executive Summary

The current Axiom MCP v3 implementation **partially follows** the MCP specification but has several critical deviations that prevent it from being a fully compliant MCP server. This document analyzes the gaps and provides a concrete plan for achieving full protocol compliance.

## Current Implementation Analysis

### What's Working Correctly ✅

1. **JSON-RPC Foundation**
   - Uses `@modelcontextprotocol/sdk` correctly
   - Implements `StdioServerTransport` for communication
   - Follows JSON-RPC 2.0 message structure

2. **Basic Server Structure**
   ```typescript
   const server = new Server({
     name: 'axiom-mcp',
     version: '3.0.0',
   }, {
     capabilities: {
       tools: {},
       logging: {},
       resources: {},
     }
   });
   ```

3. **Request Handlers**
   - Implements `ListToolsRequestSchema`
   - Implements `CallToolRequestSchema`
   - Implements resource handlers correctly

### Critical Protocol Violations 🚨

1. **Tool Definition Format**
   
   **Current (INCORRECT):**
   ```typescript
   export const axiomMcpSpawnTool = {
     name: 'axiom_mcp_spawn',
     description: 'Execute a task...',
     inputSchema: zodToJsonSchema(axiomMcpSpawnSchema),
   };
   ```
   
   **MCP Specification Requires:**
   ```typescript
   {
     name: 'axiom_mcp_spawn',
     title: 'Axiom MCP Spawn',  // MISSING - optional but recommended
     description: 'Execute a task...',
     inputSchema: {
       type: 'object',
       properties: { ... },
       required: [...],
       additionalProperties: false  // MISSING - important for validation
     },
     outputSchema: { ... }  // MISSING - optional but helps clients
   }
   ```

2. **Tool Response Format**
   
   **Current (INCORRECT):**
   ```typescript
   return {
     content: [{
       type: 'text',
       text: output
     }]
   };
   ```
   
   **MCP Specification Requires:**
   ```typescript
   return {
     result: {  // MISSING wrapper
       content: [{
         type: 'text',
         text: output
       }],
       structuredContent: { ... },  // Optional structured data
       isError: false  // Important for error handling
     }
   };
   ```

3. **Error Handling**
   
   **Current (PARTIAL):**
   ```typescript
   throw new McpError(ErrorCode.InternalError, error.message);
   ```
   
   **Missing:**
   - Proper error codes (InvalidRequest, MethodNotFound, etc.)
   - Structured error responses
   - Tool-specific error handling

4. **Capability Declaration**
   
   **Current (INCOMPLETE):**
   ```typescript
   capabilities: {
     tools: {},      // Empty object
     logging: {},    // Empty object
     resources: {},  // Empty object
   }
   ```
   
   **Should Be:**
   ```typescript
   capabilities: {
     tools: {
       listChanged: true  // If tools can change dynamically
     },
     resources: {
       subscribe: false,  // Subscription support
       listChanged: false // If resources change
     },
     logging: {
       levels: ['debug', 'info', 'warning', 'error']
     }
   }
   ```

5. **Input Validation**
   
   **Current Issue:**
   - Uses Zod schemas but doesn't properly validate against JSON Schema
   - No enforcement of `additionalProperties: false`
   - Missing validation error messages

6. **Tool Handler Signatures**
   
   **Current (CUSTOM):**
   ```typescript
   async function handleAxiomMcpSpawn(
     input: AxiomMcpSpawnInput,
     statusManager: StatusManager,
     conversationDB: ConversationDB
   ): Promise<{ content: Array<{ type: string; text: string }> }>
   ```
   
   **MCP Pattern:**
   - Handlers should only receive validated input
   - Dependencies should be injected differently
   - Return type should match tool response schema

## Detailed Gap Analysis

### 1. Schema Conversion Issues

**Problem:** `zodToJsonSchema` produces schemas that don't fully comply with MCP requirements.

**Example Output from zodToJsonSchema:**
```json
{
  "type": "object",
  "properties": {
    "parentPrompt": { "type": "string" }
  },
  "required": ["parentPrompt"]
  // Missing: additionalProperties, title, proper descriptions
}
```

**Required MCP Format:**
```json
{
  "type": "object",
  "title": "AxiomMcpSpawnInput",
  "properties": {
    "parentPrompt": {
      "type": "string",
      "description": "The main task that will spawn subtasks"
    }
  },
  "required": ["parentPrompt"],
  "additionalProperties": false
}
```

### 2. Tool Registration Pattern

**Current:** Tools are defined as static objects and imported.

**MCP Best Practice:** Tools should be registered dynamically:
```typescript
server.registerTool('axiom_mcp_spawn', {
  title: 'Axiom MCP Spawn',
  description: 'Execute a task that spawns subtasks',
  inputSchema: { ... },
  outputSchema: { ... }
}, async (input) => {
  // Handler logic
  return {
    content: [...],
    structuredContent: { ... }
  };
});
```

### 3. Missing Protocol Features

1. **Tool Annotations**
   - Not implemented at all
   - Could provide hints about tool behavior

2. **Output Schema**
   - Not defined for any tools
   - Prevents client-side validation

3. **Pagination**
   - Tool listing doesn't support cursor-based pagination
   - Required for servers with many tools

4. **Progress Reporting**
   - No support for long-running tool progress
   - Important for user experience

## Implementation Plan

### Phase 1: Protocol Compliance (Week 1)

#### Day 1-2: Fix Tool Definitions
```typescript
// New tool definition format
export interface AxiomTool {
  name: string;
  title: string;
  description: string;
  inputSchema: JsonSchema;
  outputSchema?: JsonSchema;
  annotations?: Record<string, any>;
}

// Enhanced schema converter
function createMcpSchema(zodSchema: ZodSchema): JsonSchema {
  const base = zodToJsonSchema(zodSchema);
  return {
    ...base,
    additionalProperties: false,
    title: zodSchema.description || 'Input Schema'
  };
}
```

#### Day 3-4: Fix Response Format
```typescript
// Standard response wrapper
interface ToolResponse {
  content: Array<{
    type: 'text' | 'image' | 'audio';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  structuredContent?: any;
  isError?: boolean;
}

// Response helper
function createToolResponse(
  text: string, 
  structured?: any,
  isError = false
): { result: ToolResponse } {
  return {
    result: {
      content: [{ type: 'text', text }],
      structuredContent: structured,
      isError
    }
  };
}
```

#### Day 5: Enhanced Error Handling
```typescript
// Tool-specific error types
enum ToolErrorCode {
  InvalidInput = 'INVALID_INPUT',
  ExecutionFailed = 'EXECUTION_FAILED',
  Timeout = 'TIMEOUT',
  ResourceNotFound = 'RESOURCE_NOT_FOUND'
}

// Structured error response
function createToolError(
  code: ToolErrorCode,
  message: string,
  details?: any
): { error: McpError } {
  return {
    error: new McpError(
      ErrorCode.InvalidRequest,
      message,
      { code, details }
    )
  };
}
```

### Phase 2: Enhanced Features (Week 2)

#### Day 1-2: Tool Registration System
```typescript
class ToolRegistry {
  private tools = new Map<string, RegisteredTool>();
  
  register(tool: AxiomTool, handler: ToolHandler) {
    // Validate schema
    validateJsonSchema(tool.inputSchema);
    if (tool.outputSchema) {
      validateJsonSchema(tool.outputSchema);
    }
    
    this.tools.set(tool.name, {
      definition: tool,
      handler: this.wrapHandler(handler, tool)
    });
  }
  
  private wrapHandler(
    handler: ToolHandler, 
    tool: AxiomTool
  ): WrappedHandler {
    return async (input: any) => {
      // Validate input
      const validation = validateAgainstSchema(
        input, 
        tool.inputSchema
      );
      
      if (!validation.valid) {
        return createToolError(
          ToolErrorCode.InvalidInput,
          'Input validation failed',
          validation.errors
        );
      }
      
      try {
        const result = await handler(input);
        
        // Validate output if schema provided
        if (tool.outputSchema && result.structuredContent) {
          const outputValidation = validateAgainstSchema(
            result.structuredContent,
            tool.outputSchema
          );
          
          if (!outputValidation.valid) {
            console.warn('Output validation failed:', 
              outputValidation.errors
            );
          }
        }
        
        return { result };
      } catch (error) {
        return createToolError(
          ToolErrorCode.ExecutionFailed,
          error.message,
          { stack: error.stack }
        );
      }
    };
  }
}
```

#### Day 3-4: Progress Reporting
```typescript
interface ProgressUpdate {
  toolName: string;
  progress: number;  // 0-100
  message?: string;
  data?: any;
}

class ProgressReporter {
  constructor(private server: Server) {}
  
  async report(update: ProgressUpdate) {
    await this.server.sendNotification('tools/progress', {
      toolName: update.toolName,
      progress: update.progress,
      message: update.message,
      data: update.data
    });
  }
}
```

#### Day 5: Testing & Validation
- Create comprehensive test suite
- Validate against MCP inspector
- Test with multiple MCP clients

### Phase 3: Migration Strategy (Week 3)

#### Step 1: Parallel Implementation
1. Keep existing tools working
2. Create new compliant versions with `_v2` suffix
3. Test thoroughly with MCP inspector

#### Step 2: Client Migration
```typescript
// Compatibility layer
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  // Check for v2 tool first
  if (toolRegistry.has(`${name}_v2`)) {
    return toolRegistry.call(`${name}_v2`, args);
  }
  
  // Fall back to v1 for compatibility
  if (handlers[name]) {
    console.warn(`Using deprecated v1 tool: ${name}`);
    return handlers[name](args);
  }
  
  throw new McpError(
    ErrorCode.MethodNotFound, 
    `Unknown tool: ${name}`
  );
});
```

#### Step 3: Deprecation
1. Add deprecation notices to v1 tools
2. Log usage of deprecated tools
3. Provide migration guide
4. Set sunset date

## Validation Checklist

### Tool Definition Compliance
- [ ] All tools have proper `name` field
- [ ] All tools have `description` field
- [ ] All tools have valid JSON Schema `inputSchema`
- [ ] Input schemas include `additionalProperties: false`
- [ ] Optional fields (`title`, `outputSchema`) properly formatted

### Response Format Compliance
- [ ] All responses wrapped in `result` object
- [ ] Content array uses proper type discriminators
- [ ] Error responses use `isError: true`
- [ ] Structured content validates against output schema

### Error Handling Compliance
- [ ] Proper MCP error codes used
- [ ] Error messages are descriptive
- [ ] Stack traces excluded from production
- [ ] Validation errors include details

### Protocol Features
- [ ] Tool listing supports pagination
- [ ] Capabilities properly declared
- [ ] Progress reporting for long operations
- [ ] Proper resource URI handling

## Testing Strategy

### 1. Unit Tests
```typescript
describe('MCP Compliance', () => {
  test('tool definition format', () => {
    const tool = createAxiomTool({...});
    expect(tool).toMatchSchema(mcpToolSchema);
  });
  
  test('response format', () => {
    const response = await callTool('axiom_mcp_spawn', {...});
    expect(response).toHaveProperty('result');
    expect(response.result).toHaveProperty('content');
  });
});
```

### 2. Integration Tests
```bash
# Test with official MCP inspector
npx @modelcontextprotocol/inspector dist-v3/index.js

# Validate each tool:
# 1. List tools - check format
# 2. Call each tool with valid input
# 3. Call each tool with invalid input
# 4. Check error responses
```

### 3. Client Compatibility Tests
- Test with Claude Desktop
- Test with other MCP clients
- Verify streaming works correctly
- Check error handling

## Conclusion

The current Axiom MCP v3 implementation has the foundation of an MCP server but lacks critical protocol compliance in several areas. The most significant issues are:

1. Incorrect tool definition format
2. Missing result wrapper in responses
3. Incomplete capability declarations
4. No output schema validation
5. Custom handler signatures

By following this implementation plan, Axiom MCP can achieve full protocol compliance while maintaining backward compatibility during the transition period. The key is to implement changes incrementally, test thoroughly, and provide clear migration paths for existing users.

## Next Steps

1. **Immediate**: Fix tool response format (Phase 1, Day 3-4)
2. **This Week**: Complete Phase 1 protocol compliance
3. **Next Week**: Implement Phase 2 enhanced features
4. **Week 3**: Execute migration strategy
5. **Ongoing**: Monitor MCP specification updates

The transformation from a partially compliant server to a fully compliant one will enable Axiom MCP to work seamlessly with all MCP clients and take advantage of the full protocol capabilities.