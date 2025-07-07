# Axiom MCP v3 Master Implementation Plan

## Executive Summary

This plan outlines the complete path to transform Axiom MCP v3 from its current state (7 working tools, partial MCP compliance) to a fully compliant, feature-complete development observatory with 15+ tools and hook integration.

## Current State (July 7, 2025)

### ✅ What's Working
- 7 MCP tools are callable and executing
- PTY executor prevents timeouts
- Intervention system monitors execution
- Database tracks all operations
- Verbose Master Mode schema ready

### 🚨 Critical Issues
1. **Tool Response Format**: Missing `result` wrapper (breaks MCP compliance)
2. **Error Handling**: Non-standard error responses
3. **SDK Executor**: Completely disconnected (could enable streaming)
4. **Database Scaling**: SQLite will fail at 100M+ rows
5. **Hook Integration**: No awareness of Claude Code hooks

## Phase 1: Protocol Compliance (Week 1: July 8-12)

### Day 1-2: Fix Tool Response Format

#### 1. Update ALL Tool Handlers
```typescript
// Fix in all 7 tools (axiom-mcp-spawn.ts, etc.)
// OLD (WRONG):
return {
  content: [{
    type: 'text',
    text: output
  }]
};

// NEW (CORRECT):
return {
  result: {
    content: [{
      type: 'text',
      text: output
    }]
  }
};
```

#### 2. Fix Error Responses
```typescript
// In index.ts line 159-167
return {
  result: {  // Add wrapper
    content: [{
      type: 'text',
      text: `Error: ${error.message}`
    }],
    isError: true
  }
};
```

#### 3. Import and Use MCP Response Utility
```typescript
// In each tool file
import { createMcpResponse, createMcpErrorResponse } from '../utils/mcp-response.js';

// Use consistently
return createMcpResponse(output);
// or
return createMcpErrorResponse(error.message);
```

### Day 3: Add Missing Tool Schemas
```typescript
// Add output schemas to all tools
export const axiomMcpSpawnTool = {
  name: 'axiom_mcp_spawn',
  title: 'Axiom MCP Spawn',  // Add title
  description: '...',
  inputSchema: createMcpCompliantSchema(...),
  outputSchema: {  // NEW
    type: 'object',
    properties: {
      taskId: { type: 'string' },
      status: { type: 'string', enum: ['success', 'failed', 'partial'] },
      filesCreated: { type: 'number' },
      output: { type: 'string' }
    },
    additionalProperties: false
  }
};
```

### Day 4-5: Testing & Validation
```bash
# Test each tool with MCP inspector
npx @modelcontextprotocol/inspector dist-v3/index.js

# Create automated test suite
npm run test:mcp-compliance

# Verify with Claude Desktop
# Test with error cases
```

## Phase 2: Streaming & Performance (Week 2: July 15-19)

### Day 1-2: Connect SDK Executor

#### 1. Update ClaudeCodeSubprocessV3
```typescript
// In claude-subprocess-v3.ts
import { SdkExecutor } from './executors/sdk-executor.js';

async executeWithStreaming(prompt: string, onChunk: (chunk: string) => void) {
  const executor = new SdkExecutor();
  
  for await (const message of executor.stream(prompt)) {
    onChunk(message.content);
    // Also send to PTY for intervention monitoring
    this.ptyExecutor.write(message.content);
  }
}
```

#### 2. Add Streaming to axiom_mcp_spawn
```typescript
// When verboseMasterMode is true
if (input.verboseMasterMode && input.streamingOptions) {
  const aggregator = new StreamAggregator(options);
  
  // Stream child outputs
  for (const childId of childIds) {
    aggregator.addStream(childId, childExecutor.outputStream);
  }
  
  // Return streaming response
  return createStreamingResponse(aggregator.stream);
}
```

### Day 3-5: Implement Progress Reporting
```typescript
// Add to tool handlers
async function* executeWithProgress(task: Task) {
  yield { progress: 0, message: 'Starting execution...' };
  
  // Execute steps
  for (let i = 0; i < steps.length; i++) {
    yield { progress: (i / steps.length) * 100, message: `Step ${i+1}...` };
    await executeStep(steps[i]);
  }
  
  yield { progress: 100, message: 'Complete!' };
}
```

## Phase 3: New Core Tools (Week 3: July 22-26)

### Day 1: axiom_db_query
```typescript
export const axiomDbQueryTool = {
  name: 'axiom_db_query',
  title: 'Axiom Database Query',
  description: 'Query conversation database directly',
  inputSchema: createMcpCompliantSchema(z.object({
    operation: z.enum(['query', 'export', 'stats', 'cleanup']),
    query: z.string().optional(),
    format: z.enum(['json', 'csv', 'markdown']).optional(),
    filters: z.object({
      conversationId: z.string().optional(),
      timeRange: z.string().optional(),
      status: z.string().optional()
    }).optional()
  }))
};

export async function handleAxiomDbQuery(input: any, db: ConversationDB) {
  switch (input.operation) {
    case 'query':
      const results = await db.customQuery(input.query);
      return createMcpResponse(formatResults(results, input.format));
    
    case 'export':
      const data = await db.exportConversation(input.filters);
      return createMcpResponse(data, { format: input.format });
    
    case 'stats':
      const stats = await db.getStatistics();
      return createMcpResponse(formatStats(stats));
    
    case 'cleanup':
      const cleaned = await db.cleanup(input.filters);
      return createMcpResponse(`Cleaned ${cleaned} records`);
  }
}
```

### Day 2: axiom_guided_execute
```typescript
export const axiomGuidedExecuteTool = {
  name: 'axiom_guided_execute',
  title: 'Axiom Guided Execution',
  description: 'Step-by-step execution with checkpoints',
  inputSchema: createMcpCompliantSchema(z.object({
    prompt: z.string(),
    mode: z.enum(['interactive', 'checkpoint', 'debug']),
    breakpoints: z.array(z.string()).optional()
  }))
};
```

### Day 3: axiom_verify_code
```typescript
export const axiomVerifyCodeTool = {
  name: 'axiom_verify_code',
  title: 'Axiom Code Verifier',
  description: 'Verify code against principles',
  inputSchema: createMcpCompliantSchema(z.object({
    code: z.string(),
    language: z.string().optional(),
    principles: z.array(z.string()).optional(),
    autoFix: z.boolean().default(false)
  }))
};
```

### Day 4-5: axiom_manage_prompts
```typescript
export const axiomManagePromptsTool = {
  name: 'axiom_manage_prompts',
  title: 'Axiom Prompt Manager',
  description: 'Manage system prompts at runtime',
  inputSchema: createMcpCompliantSchema(z.object({
    action: z.enum(['list', 'get', 'set', 'reset', 'export']),
    promptKey: z.string().optional(),
    promptValue: z.string().optional(),
    category: z.string().optional()
  }))
};
```

## Phase 4: Hook Integration (Week 4: July 29-Aug 2)

### Day 1-2: axiom_mcp_hooks Tool
```typescript
export const axiomMcpHooksTool = {
  name: 'axiom_mcp_hooks',
  title: 'Axiom Hook Manager',
  description: 'Manage Claude Code hooks for Axiom MCP',
  inputSchema: createMcpCompliantSchema(z.object({
    action: z.enum(['list', 'register', 'test', 'remove', 'validate']),
    hookType: z.enum(['PreToolUse', 'PostToolUse', 'Notification']).optional(),
    hookConfig: z.object({
      matcher: z.string(),
      command: z.string(),
      timeout: z.number().optional(),
      args: z.array(z.string()).optional()
    }).optional()
  }))
};
```

### Day 3-4: Hook Library
Create standard hooks in `hooks/` directory:

```bash
#!/bin/bash
# hooks/axiom-pre-spawn-validator.sh
PROMPT="$1"
SPAWN_PATTERN="$2"

# Validate dangerous patterns
if [[ "$PROMPT" =~ (rm|delete|drop).*production ]]; then
  echo '{"behavior": "deny", "message": "Production deletion blocked by hook"}'
  exit 0
fi

# Check spawn count
if [[ "$3" -gt 10 ]]; then
  echo '{"behavior": "deny", "message": "Spawn count too high (max 10)"}'
  exit 0
fi

echo '{"behavior": "allow"}'
```

### Day 5: Hook-Aware Execution
```typescript
// In index.ts, before tool execution
async function checkHooks(toolName: string, args: any): Promise<HookResult> {
  const hooks = await getHooksFor(toolName, 'PreToolUse');
  
  for (const hook of hooks) {
    const result = await executeHook(hook, args);
    if (result.behavior === 'deny') {
      // Log to database for observability
      await conversationDB.addAction('system', 'hook_blocked', {
        tool: toolName,
        reason: result.message,
        hook: hook.command
      });
      return result;
    }
  }
  
  return { behavior: 'allow' };
}
```

## Phase 5: Database Scaling (Week 5-6: Aug 5-16)

### Week 5: Implement Hybrid Storage

#### 1. Add Redis for Hot Data
```typescript
// In database/hybrid-store.ts
export class HybridConversationStore {
  private redis: Redis;
  private sqlite: ConversationDB;
  private archive: S3Client;
  
  async store(conversation: Conversation) {
    // Hot: Redis with 24h TTL
    await this.redis.setex(
      `conv:${conversation.id}`,
      86400,
      JSON.stringify(conversation)
    );
    
    // Warm: SQLite for 7 days
    await this.sqlite.createConversation(conversation);
    
    // Schedule cold archival
    await this.scheduleArchival(conversation.id, '7d');
  }
}
```

#### 2. Implement Data Tiering
```typescript
async retrieve(id: string): Promise<Conversation> {
  // Try hot tier first
  const hot = await this.redis.get(`conv:${id}`);
  if (hot) return JSON.parse(hot);
  
  // Try warm tier
  const warm = await this.sqlite.getConversation(id);
  if (warm) return warm;
  
  // Retrieve from cold storage
  return this.retrieveFromArchive(id);
}
```

### Week 6: Migration & Testing
- Migrate existing data to hybrid architecture
- Performance testing at scale
- Implement data lifecycle policies

## Phase 6: Advanced Tools (Week 7-8: Aug 19-30)

### Remaining Tools to Implement
1. **axiom_manage_rules** - Custom intervention rules
2. **axiom_orchestrate** - Advanced workflows
3. **axiom_event_stream** - Real-time event monitoring
4. **axiom_detect_task_type** - Task classification
5. **axiom_mcts_control** - MCTS optimization (future)

## Success Metrics

### Phase 1 (Protocol Compliance)
- [ ] All 7 tools return MCP-compliant responses
- [ ] Error handling follows MCP specification
- [ ] Tools pass MCP inspector validation
- [ ] Works with Claude Desktop

### Phase 2 (Streaming)
- [ ] SDK Executor connected and streaming
- [ ] Verbose Master Mode shows real-time output
- [ ] Progress reporting for long operations
- [ ] < 50ms streaming latency

### Phase 3 (Core Tools)
- [ ] 4 new core tools implemented
- [ ] All tools have output schemas
- [ ] Comprehensive test coverage
- [ ] Documentation complete

### Phase 4 (Hooks)
- [ ] Hook management tool working
- [ ] 5+ standard hooks in library
- [ ] Hook execution < 5s timeout
- [ ] Hooks visible in axiom_mcp_observe

### Phase 5 (Database)
- [ ] Hybrid storage operational
- [ ] Query time < 10ms (hot path)
- [ ] Successfully handles 1B+ rows
- [ ] Automated data tiering

### Phase 6 (Advanced)
- [ ] Total 15+ tools available
- [ ] All components exposed as needed
- [ ] Complete observability achieved
- [ ] Performance targets met

## Risk Mitigation

### Technical Risks
1. **Breaking Changes**: Maintain backward compatibility mode
2. **Performance**: Implement caching and lazy loading
3. **Complexity**: Modular architecture with clear boundaries

### Operational Risks
1. **Testing**: Automated test suite for all changes
2. **Documentation**: Update docs with each phase
3. **Rollback**: Git tags for each stable version

## Timeline Summary

- **Week 1** (July 8-12): Protocol Compliance ✅
- **Week 2** (July 15-19): Streaming & Performance
- **Week 3** (July 22-26): New Core Tools
- **Week 4** (July 29-Aug 2): Hook Integration
- **Week 5-6** (Aug 5-16): Database Scaling
- **Week 7-8** (Aug 19-30): Advanced Tools & Polish

## Conclusion

This plan transforms Axiom MCP v3 from a partially compliant execution tool into a comprehensive development observatory. By following this systematic approach, we'll achieve:

1. **Full MCP Compliance**: Works with any MCP client
2. **Complete Observability**: Every aspect exposed as tools
3. **User Control**: Hooks and customization
4. **Scale**: Handles billions of operations
5. **Performance**: Real-time streaming and monitoring

The key is incremental progress with continuous testing. Each phase builds on the previous, ensuring stability while adding powerful new capabilities.