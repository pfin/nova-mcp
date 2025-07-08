# Fix Plan for Orthogonal Decomposer

## Overview
The orthogonal decomposer has critical issues that must be fixed before production use. This plan addresses each issue systematically.

## Priority 1: Critical Safety Issues (Week 1)

### Fix 1: Implement Proper Cleanup
**Problem**: Temp directories and processes leak resources
**Solution**:
```typescript
class OrthogonalDecomposer {
  private cleanupTasks: Map<string, () => Promise<void>> = new Map();
  
  async cleanup(taskId: string) {
    const cleanupFn = this.cleanupTasks.get(taskId);
    if (cleanupFn) {
      await cleanupFn();
      this.cleanupTasks.delete(taskId);
    }
  }
  
  async cleanupAll() {
    for (const [id, cleanup] of this.cleanupTasks) {
      await cleanup().catch(e => logDebug('CLEANUP', `Error: ${e}`));
    }
    this.cleanupTasks.clear();
  }
  
  private registerCleanup(taskId: string, workspace: string, claude?: pty.IPty) {
    this.cleanupTasks.set(taskId, async () => {
      // Kill process
      if (claude) {
        claude.kill();
      }
      
      // Remove temp directory
      await fs.rm(workspace, { recursive: true, force: true });
      
      // Remove from executions
      this.executions.delete(taskId);
    });
  }
}

// Add process exit handler
process.on('exit', () => decomposer?.cleanupAll());
process.on('SIGINT', () => decomposer?.cleanupAll());
```

### Fix 2: Correct Claude Control Sequences
**Problem**: Wrong submission sequence, incorrect ready detection
**Solution**:
```typescript
// From our working Claude orchestrator
const CLAUDE_CONTROLS = {
  SUBMIT: '\x0d',      // Ctrl+Enter (verified working)
  INTERRUPT: '\x1b',   // ESC
  BACKSPACE: '\x7f'
};

private async waitForReady(execution: TaskExecution): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Claude ready timeout'));
    }, 30000);
    
    const checkReady = () => {
      const output = execution.output.join('');
      // Claude shows a '>' prompt when ready
      if (output.endsWith('> ') || output.endsWith('>\n')) {
        clearTimeout(timeout);
        resolve();
      }
    };
    
    // Check periodically
    const interval = setInterval(checkReady, 100);
    
    // Cleanup on resolve/reject
    execution.claude?.onExit(() => {
      clearInterval(interval);
      clearTimeout(timeout);
      reject(new Error('Claude exited before ready'));
    });
  });
}

private async sendPrompt(claude: pty.IPty, prompt: string): Promise<void> {
  // Human-like typing (50-150ms per char)
  for (const char of prompt) {
    claude.write(char);
    await new Promise(r => setTimeout(r, 50 + Math.random() * 100));
  }
  
  // Pause before submit
  await new Promise(r => setTimeout(r, 300));
  
  // Submit with Ctrl+Enter
  claude.write(CLAUDE_CONTROLS.SUBMIT);
}
```

### Fix 3: Remove Private Property Access
**Problem**: Accessing private properties with bracket notation
**Solution**:
```typescript
class OrthogonalDecomposer {
  // Add public methods for legitimate access
  getExecutions(): Map<string, TaskExecution> {
    return new Map(this.executions); // Return copy
  }
  
  getExecution(taskId: string): TaskExecution | undefined {
    return this.executions.get(taskId);
  }
  
  // For merge action
  async mergeLatest(): Promise<Map<string, string>> {
    return this.merge(this.executions);
  }
}

// In axiomOrthogonalDecompose
case 'merge':
  const merged = await decomposer.mergeLatest(); // Use public method
  // ...
```

## Priority 2: Reliability Issues (Week 2)

### Fix 4: Add Error Recovery
**Problem**: No recovery from Claude failures
**Solution**:
```typescript
private async executeSingleTask(taskId: string, retries = 3): Promise<void> {
  const execution = this.executions.get(taskId);
  if (!execution) return;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await this.attemptExecution(execution);
      
      if (execution.status === 'complete') {
        return; // Success
      }
    } catch (error) {
      logDebug('DECOMPOSER', `Task ${taskId} attempt ${attempt} failed: ${error}`);
      
      // Cleanup before retry
      await this.cleanup(taskId);
      
      if (attempt === retries) {
        execution.status = 'failed';
        throw error;
      }
      
      // Exponential backoff
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
}

private async attemptExecution(execution: TaskExecution): Promise<void> {
  // Current execution logic with proper error handling
  let claude: pty.IPty | undefined;
  
  try {
    // ... execution logic ...
  } finally {
    // Always cleanup
    if (claude) {
      claude.kill();
    }
  }
}
```

### Fix 5: Robust Completion Detection
**Problem**: Fragile string matching for completion
**Solution**:
```typescript
private detectCompletion(execution: TaskExecution): boolean {
  const output = execution.output.join('');
  
  // Multiple detection strategies
  const indicators = [
    // File creation confirmation
    () => execution.task.outputs.some(f => 
      output.includes(`Created ${f}`) || 
      output.includes(`Wrote ${f}`)
    ),
    
    // Code block completion
    () => {
      const codeBlocks = output.match(/```/g);
      return codeBlocks && codeBlocks.length >= 2;
    },
    
    // Explicit completion
    () => output.includes('Task completed') || 
         output.includes('Implementation complete'),
    
    // Time-based (if running > 4 minutes, check for files)
    () => {
      const elapsed = Date.now() - execution.startTime;
      return elapsed > 4 * 60 * 1000 && execution.files.size > 0;
    }
  ];
  
  return indicators.some(check => check());
}
```

## Priority 3: Feature Improvements (Week 3)

### Fix 6: Real Task Decomposition
**Problem**: Hardcoded patterns instead of intelligent analysis
**Solution**:
```typescript
private async intelligentDecompose(prompt: string): Promise<OrthogonalTask[]> {
  // Use a separate Claude instance for analysis
  const analyzer = new ClaudeAnalyzer();
  
  const decompositionPrompt = `
Analyze this task and decompose it into 5-minute orthogonal chunks:
"${prompt}"

Requirements:
1. Each chunk must create different files (no conflicts)
2. Each chunk must be completable in 5 minutes
3. Chunks should be truly orthogonal (can run in any order)
4. Include a final integration task if needed

Output format:
- id: unique identifier
- prompt: specific implementation instruction
- outputs: [expected files]
- duration: 5
`;

  const analysis = await analyzer.analyze(decompositionPrompt);
  return this.parseDecomposition(analysis);
}
```

### Fix 7: Add Comprehensive Tests
**Problem**: No test coverage
**Solution**:
```typescript
// tests/orthogonal-decomposer.test.ts
describe('OrthogonalDecomposer', () => {
  let decomposer: OrthogonalDecomposer;
  
  beforeEach(() => {
    decomposer = new OrthogonalDecomposer();
  });
  
  afterEach(async () => {
    await decomposer.cleanupAll();
  });
  
  test('cleans up temp directories', async () => {
    const tmpDirsBefore = await fs.readdir(os.tmpdir());
    
    await decomposer.execute([{
      id: 'test',
      prompt: 'test task',
      duration: 5,
      outputs: ['test.js']
    }]);
    
    await decomposer.cleanupAll();
    
    const tmpDirsAfter = await fs.readdir(os.tmpdir());
    expect(tmpDirsAfter.length).toBeLessThanOrEqual(tmpDirsBefore.length);
  });
  
  test('handles Claude failure gracefully', async () => {
    // Mock Claude spawn to fail
    jest.spyOn(pty, 'spawn').mockImplementation(() => {
      throw new Error('Claude not found');
    });
    
    const result = await decomposer.execute([...]);
    expect(result.get('test')?.status).toBe('failed');
  });
});
```

## Implementation Schedule

### Week 1: Critical Fixes
- [ ] Monday: Implement cleanup system
- [ ] Tuesday: Fix Claude control sequences
- [ ] Wednesday: Remove private access patterns
- [ ] Thursday: Test critical fixes
- [ ] Friday: Deploy v1 with safety fixes

### Week 2: Reliability
- [ ] Monday-Tuesday: Error recovery system
- [ ] Wednesday: Robust completion detection
- [ ] Thursday: Integration testing
- [ ] Friday: Deploy v2 with reliability

### Week 3: Features
- [ ] Monday-Tuesday: Intelligent decomposition
- [ ] Wednesday-Thursday: Comprehensive tests
- [ ] Friday: Final deployment

## Success Criteria

1. **No Resource Leaks**
   - Zero temp directories left after execution
   - All processes cleaned up properly

2. **Reliable Claude Control**
   - 100% success rate on ready detection
   - Proper submission with Ctrl+Enter

3. **Robust Architecture**
   - No private property access
   - Proper error handling throughout

4. **Production Ready**
   - Comprehensive test coverage
   - Handles all edge cases gracefully

## Migration Path

1. Keep current implementation as `v1-unsafe`
2. Implement fixes in new `v2` branch
3. Run both in parallel for validation
4. Migrate once v2 proves stable
5. Deprecate v1 after 30 days