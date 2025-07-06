# V3 Implementation Instructions for Claude

## CRITICAL: Always Ground in Expert Documents
Before ANY implementation step:
1. Read relevant section from `GoodIdeasFromOtherModels.txt`
2. Read relevant section from `GoodIdeasFromChatGPTo3.txt`
3. Compare your approach to expert recommendations
4. Only proceed if aligned

## Implementation Protocol

### For EVERY Task:

1. **BEFORE Starting**:
   - State which expert recommendation you're implementing
   - Quote the specific guidance from the documents
   - Explain how your implementation matches the recommendation

2. **DURING Implementation**:
   - Create the file/component
   - Write tests for it
   - Run the tests
   - Fix any issues until tests pass

3. **AFTER Completion**:
   - Verify the implementation works:
     - Does the code compile? (`npm run build:v3`)
     - Do tests pass?
     - Does it match expert specifications?
   - Update progress in todo list
   - Move to next task only after verification passes

## Current Task: Master Controller

### Step 1: Review Expert Guidance
From `GoodIdeasFromOtherModels.txt`:
> "The main process will act as a Master Controller, managing a pool of worker threads. Each worker is responsible for managing the lifecycle of a single Claude subprocess inside a PTY."

Key requirements:
- Manages task queue
- Assigns tasks to available workers  
- Handles worker message routing
- Maintains port graph
- Streams to WebSocket clients

### Step 2: Create Master Controller

```typescript
// src-v3/core/master-controller.ts
import { Worker } from 'worker_threads';
import { EventEmitter } from 'events';
import { PriorityQueue } from './priority-queue';
import { Task, WorkerMessage } from './types';

export class MasterController extends EventEmitter {
  private taskQueue: PriorityQueue<Task>;
  private workers: Map<string, Worker>;
  private busyWorkers: Set<string>;
  private portGraph: Map<string, PortInfo>;
  
  async assignTask(task: Task): Promise<void> {
    // Implementation following expert pattern
  }
}
```

### Step 3: Verify Implementation
- [ ] Create test file: `src-v3/core/master-controller.test.ts`
- [ ] Test task assignment
- [ ] Test worker pool management
- [ ] Test message routing
- [ ] Run: `npm test src-v3/core/master-controller.test.ts`
- [ ] All tests must pass before proceeding

## Memory/Recursion Pattern

For complex tasks, use this pattern:

1. **Break Down Task**:
   ```
   Master Controller Implementation:
   ├── Priority Queue
   ├── Worker Pool Management  
   ├── Message Router
   └── Port Graph
   ```

2. **Recurse on Each Subtask**:
   - Implement Priority Queue first
   - Test it completely
   - Only then move to Worker Pool
   - Continue until all parts complete

3. **Integrate and Verify**:
   - Combine all components
   - Run integration tests
   - Verify against expert docs

## Verification Checklist

Before marking ANY task complete:

- [ ] Code compiles without errors
- [ ] Unit tests written and passing
- [ ] Integration tests (if applicable) passing  
- [ ] Matches expert documentation exactly
- [ ] No shortcuts or simplifications taken
- [ ] Event emissions match specification
- [ ] Error handling implemented
- [ ] TypeScript types fully specified

## Progress Tracking

After EACH step:
1. Update todo list with specific progress
2. Commit code with descriptive message
3. Document any deviations from plan
4. Note any blockers or issues

## NO SHORTCUTS

The expert documents are the source of truth. Do not:
- Simplify the architecture
- Skip verification steps
- Mark tasks complete without tests
- Implement partial solutions
- Deviate from expert patterns

Every line of code must serve the vision outlined in the expert analysis.