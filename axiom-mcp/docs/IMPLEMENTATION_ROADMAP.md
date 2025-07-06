# Axiom MCP v3 Implementation Roadmap

## Overview

This roadmap transforms Axiom from a "research-only" tool into a powerful parallel execution observatory. Each phase builds on the previous, with working code at every step.

## Phase 0: Fix Current v3 (Week 1)
**Goal**: Make existing v3 actually execute code, not just plan

### Tasks
1. **Wire PTY Executor to Tools** ✅
   - Connect axiom_mcp_spawn to use PTYExecutor
   - Remove Claude SDK executor calls
   - Test with simple "create a file" task

2. **Fix Tool Registration**
   - Ensure all tools properly registered with MCP
   - Test each tool with inspector
   - Document which tools actually work

3. **Basic Execution Verification**
   - Add check: "Did any files change?"
   - Add check: "Did tests run?"
   - Fail loudly if only research happened

### Success Criteria
- `axiom_mcp_spawn` creates actual files
- No more empty outputs
- Can see execution in logs

## Phase 1: Observable Streams (Week 2)
**Goal**: See what's happening in real-time

### Tasks
1. **Stream Capture Infrastructure**
   ```typescript
   class StreamObserver {
     - Capture PTY output character by character
     - Add microsecond timestamps
     - Emit events for each line
     - Maintain sliding window buffer
   }
   ```

2. **Basic Pattern Detection**
   - Detect "TODO" and "FIXME"
   - Detect "error" and stack traces
   - Detect "test passed" and "test failed"
   - Count files created/modified

3. **Simple Dashboard**
   - WebSocket server for real-time updates
   - Basic HTML page showing streams
   - Color coding for patterns
   - Stream health indicators

### Success Criteria
- See live output from executions
- Patterns highlighted in real-time
- Can monitor 3+ streams simultaneously

## Phase 2: Rule-Based Interventions (Week 3)
**Goal**: Automatically fix common problems

### Tasks
1. **Rule Engine Core**
   ```typescript
   class RuleEngine {
     - Load rules from JSON
     - Match patterns against streams  
     - Trigger interventions
     - Track effectiveness
   }
   ```

2. **Initial Rule Set**
   - NoTODO: Replace TODO with implementation
   - ForceTest: Demand test for new functions
   - FixError: Common error corrections
   - Unstick: Break out of loops

3. **Intervention System**
   - PTY input injection (send commands)
   - File system fixes (create missing files)
   - Stream messages (guide execution)

### Success Criteria
- TODO comments get replaced automatically
- Common errors fixed without human help
- 50% reduction in failed executions

## Phase 3: Parallel Worktrees (Week 4)
**Goal**: Try multiple approaches simultaneously

### Tasks
1. **Worktree Manager**
   ```typescript
   class WorktreeOrchestrator {
     - Create git worktrees programmatically
     - Allocate resources per worktree
     - Launch PTY executors in each
     - Monitor all streams
   }
   ```

2. **Parallel Execution**
   - Same task, different approaches
   - Independent file systems
   - Shared observation layer
   - No interference between attempts

3. **Cross-Stream Patterns**
   - Detect when multiple streams hit same issue
   - Share solutions between streams
   - Identify winning approaches early

### Success Criteria
- Run 4+ parallel attempts
- Each in isolated environment
- Can see all streams in dashboard
- 3x faster to working solution

## Phase 4: MCTS-Driven Optimization (Week 5)
**Goal**: Intelligently allocate resources to promising approaches

### Tasks
1. **Stream Scoring System**
   ```typescript
   class StreamScorer {
     - Track progress metrics
     - Calculate velocity
     - Assess code quality
     - Compute total score
   }
   ```

2. **Dynamic Resource Allocation**
   - Score streams every 30 seconds
   - Boost resources to top performers
   - Reduce/stop failing streams
   - Launch new experiments

3. **Path Selection Logic**
   - UCB1 algorithm for exploration/exploitation
   - Learn from historical patterns
   - Predict success probability

### Success Criteria
- Successful streams get more resources
- Failed approaches stopped early
- 5x improvement in success rate

## Phase 5: Success Amplification (Week 6)
**Goal**: Spread successful patterns rapidly

### Tasks
1. **Pattern Extraction**
   - Identify why solution worked
   - Extract reusable code patterns
   - Create templates from success

2. **Broadcast System**
   - Share working solutions to other streams
   - Adapt to different contexts
   - Measure adoption rate

3. **Pattern Library**
   - Store successful patterns
   - Index by problem type
   - Auto-suggest for new tasks

### Success Criteria
- Successful patterns reused automatically
- Second attempt 10x faster than first
- Pattern library with 50+ entries

## Phase 6: Advanced Features (Weeks 7-8)
**Goal**: Polish and advanced capabilities

### Tasks
1. **Merge Strategies**
   - Combine best parts from multiple streams
   - Intelligent conflict resolution
   - Automated testing of merged code

2. **Learning System**
   - Rule effectiveness tracking
   - Pattern success rates
   - Continuous improvement

3. **Human-in-the-Loop**
   - Manual intervention capabilities
   - Collaborative problem solving
   - Teaching mode

### Success Criteria
- Hybrid solutions better than any single stream
- System improves over time
- Humans can guide and learn

## Implementation Principles

### 1. Incremental Value
Each phase delivers working features. No "big bang" deployment.

### 2. Test Everything
- Unit tests for components
- Integration tests for workflows
- End-to-end tests with real tasks

### 3. Observability First
- Log everything
- Metrics for all operations
- Debugging tools built-in

### 4. Fail Fast, Learn Faster
- Quick timeouts
- Clear error messages
- Learn from every failure

### 5. Human-Friendly
- Clear visualizations
- Understandable interventions
- Explanations for decisions

## Metrics for Success

### Execution Metrics
- Time to first working code: 10x improvement
- Success rate: 95%+ (from 60%)
- Parallel efficiency: 4x speedup with 5 streams

### Quality Metrics
- Test coverage: 90%+ automatically
- Bug detection: 80% caught before merge
- Code review pass rate: 95%

### Learning Metrics
- Patterns discovered: 100+ per month
- Rule effectiveness: 80%+ success rate
- Cross-project reuse: 50% of patterns

## Risk Mitigation

### Technical Risks
- **Resource exhaustion**: Hard limits per stream
- **Infinite loops**: Timeout and intervention
- **Bad interventions**: Rollback capability
- **Pattern collision**: Conflict resolution

### Process Risks
- **Over-engineering**: Start simple, iterate
- **Analysis paralysis**: Time-boxed phases
- **Feature creep**: Strict phase goals
- **User confusion**: Progressive disclosure

## Quick Wins for Immediate Value

### Week 1 Quick Wins
1. Fix empty outputs - immediate value
2. Add file change detection - verify execution
3. Simple intervention - replace TODO automatically

### Week 2 Quick Wins
1. Live streaming dashboard - see what's happening
2. Error pattern detection - catch failures early
3. Success celebrations - maintain momentum

### Week 3 Quick Wins
1. Parallel execution - 3x faster development
2. Cross-stream learning - share solutions
3. Auto-retry with fixes - resilient execution

## The Path Forward

This roadmap transforms Axiom from an ambitious idea into a practical tool that revolutionizes how we develop software. By focusing on incremental value, we can start benefiting immediately while building toward the full vision.

Remember: **The goal isn't to plan better - it's to execute better, faster, and more reliably through parallel experimentation and intelligent intervention.**