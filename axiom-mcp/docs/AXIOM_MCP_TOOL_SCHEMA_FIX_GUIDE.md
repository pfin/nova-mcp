# Axiom MCP Tool Schema Fix Guide

## The Problem

Current tool schemas violate MCP specification in several ways:
1. Missing `additionalProperties: false`
2. No proper type constraints
3. Incorrect schema structure from `zodToJsonSchema`
4. Missing optional but recommended fields

## Step-by-Step Fix Instructions

### Step 1: Create a Schema Wrapper Function

Create a new file `src-v3/utils/mcp-schema.ts`:

```typescript
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export interface McpJsonSchema {
  type: 'object';
  properties: Record<string, any>;
  required: string[];
  additionalProperties: false;
  title?: string;
  description?: string;
}

export function createMcpCompliantSchema(
  zodSchema: z.ZodObject<any>,
  title?: string
): McpJsonSchema {
  // Get base schema from zod
  const baseSchema = zodToJsonSchema(zodSchema) as any;
  
  // Ensure it's an object schema
  if (baseSchema.type !== 'object') {
    throw new Error('MCP tools must have object input schemas');
  }
  
  // Extract required fields properly
  const required: string[] = [];
  const properties: Record<string, any> = {};
  
  // Process each property
  for (const [key, value] of Object.entries(baseSchema.properties || {})) {
    properties[key] = value;
    
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
    additionalProperties: false,  // Critical for MCP compliance
    ...(title && { title }),
    ...(baseSchema.description && { description: baseSchema.description })
  };
}
```

### Step 2: Fix axiom-mcp-spawn Tool Schema

Update `src-v3/tools/axiom-mcp-spawn.ts`:

```typescript
import { createMcpCompliantSchema } from '../utils/mcp-schema.js';

// Keep your existing schema definition
export const axiomMcpSpawnSchema = z.object({
  parentPrompt: z.string().describe('The main task that will spawn subtasks'),
  spawnPattern: z.enum(['decompose', 'parallel', 'sequential', 'recursive'])
    .describe('How to spawn subtasks'),
  spawnCount: z.number().min(1).max(10).default(3)
    .describe('Number of subtasks to spawn'),
  maxDepth: z.number().min(1).max(5).default(3)
    .describe('Maximum recursion depth'),
  autoExecute: z.boolean().default(true)
    .describe('Automatically execute spawned tasks'),
  verboseMasterMode: z.boolean().default(false)
    .describe('Stream all child output in real-time with prefixes'),
  streamingOptions: z.object({
    outputMode: z.enum(['console', 'websocket', 'both']).default('console'),
    colorize: z.boolean().default(true),
    bufferSize: z.number().default(1000),
    flushInterval: z.number().default(100),
    includeTimestamps: z.boolean().default(false),
    prefixLength: z.number().default(8)
  }).optional().describe('Advanced streaming configuration')
});

// NEW: Create MCP-compliant tool definition
export const axiomMcpSpawnTool = {
  name: 'axiom_mcp_spawn',
  title: 'Axiom MCP Spawn',  // Added title
  description: 'Execute a task that spawns multiple subtasks with recursive capabilities (v0.5.0 - Verbose Mode)',
  inputSchema: createMcpCompliantSchema(axiomMcpSpawnSchema, 'AxiomMcpSpawnInput'),
  // Optional: Add output schema
  outputSchema: {
    type: 'object',
    properties: {
      taskId: { type: 'string', description: 'Unique task identifier' },
      status: { type: 'string', enum: ['success', 'failed', 'partial'] },
      subtasks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            prompt: { type: 'string' },
            status: { type: 'string' }
          }
        }
      },
      output: { type: 'string', description: 'Combined output from all subtasks' },
      stats: {
        type: 'object',
        properties: {
          totalExecutionTime: { type: 'number' },
          filesCreated: { type: 'number' },
          interventions: { type: 'number' }
        }
      }
    },
    additionalProperties: false
  }
};
```

### Step 3: Fix axiom-mcp-observe Tool Schema

Update `src-v3/tools/axiom-mcp-observe.ts`:

```typescript
import { createMcpCompliantSchema } from '../utils/mcp-schema.js';

export const axiomMcpObserveSchema = z.object({
  mode: z.enum(['all', 'tree', 'recent', 'live']).describe('Observation mode'),
  conversationId: z.string().optional().describe('Conversation ID for tree mode'),
  limit: z.number().min(1).max(100).default(10).describe('Number of items to show'),
  filter: z.object({
    status: z.enum(['active', 'completed', 'failed']).optional(),
    taskType: z.string().optional(),
    depth: z.number().optional(),
  }).optional().describe('Optional filters'),
});

// NEW: MCP-compliant definition
export const axiomMcpObserveTool = {
  name: 'axiom_mcp_observe',
  title: 'Axiom MCP Observer',
  description: 'Observe active conversations and their progress across multiple execution branches',
  inputSchema: createMcpCompliantSchema(axiomMcpObserveSchema, 'AxiomMcpObserveInput'),
  outputSchema: {
    type: 'object',
    properties: {
      conversations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            prompt: { type: 'string' },
            status: { type: 'string' },
            depth: { type: 'number' },
            childCount: { type: 'number' }
          }
        }
      },
      summary: { type: 'string' }
    },
    additionalProperties: false
  }
};
```

### Step 4: Fix axiom-mcp-principles Tool Schema

Update `src-v3/tools/axiom-mcp-principles.ts`:

```typescript
import { createMcpCompliantSchema } from '../utils/mcp-schema.js';

export const axiomMcpPrinciplesSchema = z.object({
  action: z.enum(['list', 'check', 'apply']).describe('Action to perform'),
  code: z.string().optional().describe('Code to check (for check action)'),
  principle: z.string().optional().describe('Specific principle to apply'),
  fix: z.boolean().default(false).describe('Automatically fix violations'),
});

export const axiomMcpPrinciplesTool = {
  name: 'axiom_mcp_principles',
  title: 'Axiom MCP Principles',
  description: 'Manage and enforce universal coding principles',
  inputSchema: createMcpCompliantSchema(axiomMcpPrinciplesSchema, 'AxiomMcpPrinciplesInput')
};
```

### Step 5: Fix axiom-test-v3 Tool Schema

Update `src-v3/tools/axiom-test-v3.ts`:

```typescript
import { createMcpCompliantSchema } from '../utils/mcp-schema.js';

export const axiomTestV3Schema = z.object({
  testType: z.enum(['basic', 'pty', 'intervention']).describe('Type of test to run'),
  prompt: z.string().optional().describe('Test prompt for PTY test'),
  duration: z.number().min(1).max(60).default(5).describe('Test duration in seconds'),
});

export const axiomTestV3Tool = {
  name: 'axiom_test_v3',
  title: 'Axiom Test v3',
  description: 'Test Axiom MCP v3 functionality',
  inputSchema: createMcpCompliantSchema(axiomTestV3Schema, 'AxiomTestV3Input')
};
```

### Step 6: Build and Test

```bash
# Build the changes
npm run build:v3

# Test with MCP inspector
npx @modelcontextprotocol/inspector dist-v3/index.js
```

### Step 7: Verify Schema Compliance

When you run the MCP inspector, the tool schemas should now look like:

```json
{
  "name": "axiom_mcp_spawn",
  "title": "Axiom MCP Spawn",
  "description": "Execute a task that spawns multiple subtasks...",
  "inputSchema": {
    "type": "object",
    "title": "AxiomMcpSpawnInput",
    "properties": {
      "parentPrompt": {
        "type": "string",
        "description": "The main task that will spawn subtasks"
      },
      "spawnPattern": {
        "type": "string",
        "enum": ["decompose", "parallel", "sequential", "recursive"],
        "description": "How to spawn subtasks"
      },
      "spawnCount": {
        "type": "number",
        "minimum": 1,
        "maximum": 10,
        "default": 3,
        "description": "Number of subtasks to spawn"
      }
    },
    "required": ["parentPrompt", "spawnPattern"],
    "additionalProperties": false
  }
}
```

## Common Issues and Solutions

### Issue 1: Required Fields Not Detected

If required fields aren't being detected properly:

```typescript
// Instead of relying on zod detection, explicitly define required
export function createMcpCompliantSchema(
  zodSchema: z.ZodObject<any>,
  title?: string,
  explicitRequired?: string[]  // Add this parameter
): McpJsonSchema {
  const baseSchema = zodToJsonSchema(zodSchema) as any;
  
  return {
    type: 'object',
    properties: baseSchema.properties || {},
    required: explicitRequired || baseSchema.required || [],
    additionalProperties: false,
    title
  };
}

// Use it like:
inputSchema: createMcpCompliantSchema(
  axiomMcpSpawnSchema, 
  'AxiomMcpSpawnInput',
  ['parentPrompt', 'spawnPattern']  // Explicit required fields
)
```

### Issue 2: Nested Objects

For schemas with nested objects:

```typescript
// The streamingOptions nested object needs proper handling
function processNestedSchemas(schema: any): any {
  if (schema.type === 'object' && schema.properties) {
    // Add additionalProperties: false to nested objects
    schema.additionalProperties = false;
    
    // Recursively process nested properties
    for (const [key, value] of Object.entries(schema.properties)) {
      if (value && typeof value === 'object') {
        schema.properties[key] = processNestedSchemas(value);
      }
    }
  }
  return schema;
}

// Use in createMcpCompliantSchema:
const processedSchema = processNestedSchemas(baseSchema);
```

### Issue 3: Default Values

MCP doesn't use defaults the same way Zod does:

```typescript
// Remove defaults from required fields
export function createMcpCompliantSchema(
  zodSchema: z.ZodObject<any>,
  title?: string
): McpJsonSchema {
  const baseSchema = zodToJsonSchema(zodSchema) as any;
  const required: string[] = [];
  
  // Check which fields are truly required (no default)
  for (const [key, field] of Object.entries(zodSchema.shape)) {
    const zodField = field as any;
    if (!zodField.isOptional() && !zodField._def.defaultValue) {
      required.push(key);
    }
  }
  
  return {
    type: 'object',
    properties: baseSchema.properties || {},
    required,
    additionalProperties: false,
    title
  };
}
```

## Testing Your Fixed Schemas

### 1. Unit Test

Create `src-v3/utils/__tests__/mcp-schema.test.ts`:

```typescript
import { describe, test, expect } from '@jest/globals';
import { z } from 'zod';
import { createMcpCompliantSchema } from '../mcp-schema';

describe('MCP Schema Compliance', () => {
  test('creates compliant schema with additionalProperties false', () => {
    const zodSchema = z.object({
      name: z.string(),
      age: z.number().optional()
    });
    
    const mcpSchema = createMcpCompliantSchema(zodSchema, 'TestSchema');
    
    expect(mcpSchema).toEqual({
      type: 'object',
      title: 'TestSchema',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' }
      },
      required: ['name'],
      additionalProperties: false
    });
  });
});
```

### 2. Integration Test

```bash
# Start the server
node dist-v3/index.js

# In another terminal, test tool listing
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist-v3/index.js

# Should see properly formatted tools with additionalProperties: false
```

## Final Checklist

- [ ] All tool schemas have `additionalProperties: false`
- [ ] All tools have a `title` field
- [ ] Required fields are properly identified
- [ ] Nested objects also have `additionalProperties: false`
- [ ] Schema passes MCP inspector validation
- [ ] Tools can be called successfully with valid input
- [ ] Invalid input is rejected with proper errors

## Next Steps

After fixing schemas, you'll need to:
1. Fix tool response format (add `result` wrapper)
2. Update error handling to use MCP error codes
3. Add proper capability declarations
4. Implement progress reporting for long-running tools