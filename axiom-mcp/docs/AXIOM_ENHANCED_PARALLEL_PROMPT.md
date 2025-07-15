# Axiom MCP Enhanced Parallel Execution Prompt

## The Axiom Advantage

While Claude Code can parallelize agents, Axiom MCP adds:
- **Real-time observability** - Watch every character, every decision
- **Intervention capability** - Interrupt and redirect when needed
- **Pattern detection** - Identify problems before they compound
- **Enforcement mechanisms** - Ensure code gets written

## Enhanced Axiom Master Prompt with Observability & Interrupts

```xml
<Objective>
Implement Axiom MCP using parallel agent execution WITH REAL-TIME MONITORING AND INTERVENTION CAPABILITY. Each parallel agent will be observable character-by-character, with automatic intervention when anti-patterns are detected.

Your implementation must include:
1. Observable parallel execution streams
2. Pattern detection on each stream
3. Automated intervention system
4. Real-time metrics and dashboards
5. Force-code-generation mechanisms

The result will be Axiom MCP: a system that not only parallelizes AI agents but WATCHES them and CORRECTS them in real-time.
</Objective>

<ObservabilityRequirements>
Each parallel agent must emit observable events:
- Character-by-character output streaming
- Token generation rate monitoring
- File creation event tracking
- Pattern match notifications
- Intervention trigger alerts

Build monitoring into the core, not as an afterthought:
```typescript
interface ObservableAgent {
  id: string;
  output$: Observable<string>;
  metrics$: Observable<AgentMetrics>;
  patterns$: Observable<DetectedPattern>;
  interventions$: Observable<Intervention>;
}
```
</ObservabilityRequirements>

<InterventionProtocol>
When any agent exhibits these patterns, INTERVENE IMMEDIATELY:

CHURNING (>60 seconds without file creation):
- Send: "STOP! Create the file NOW at [specific path]"
- If no response in 10s: Send ESC character
- If still churning: Kill and restart with forceful prompt

EXPLAINING (detected "I'll help", "Let me explain", "To accomplish"):
- Send: "Skip explanation. Write code immediately."
- Include specific file path and function signature
- Monitor for compliance

PLANNING (detected todo lists without implementation):
- Send: "Execute step 1 NOW. No more planning."
- Force transition to implementation
- Track time-to-first-file

MOCKING (detected "mock", "stub", "placeholder"):
- Send: "NO MOCKS! Implement real functionality!"
- Kill the current operation
- Restart with explicit anti-mock instructions
</InterventionProtocol>

<ParallelArchitecture>
Deploy 6 PRIMARY agents PLUS 3 OBSERVER agents:

PRIMARY AGENTS (doing the work):
- Agent 1: @axiom/pty-control implementation
- Agent 2: @axiom/pattern-engine implementation
- Agent 3: @axiom/intervention implementation
- Agent 4: @axiom/orchestrator implementation
- Agent 5: @axiom/monitor implementation
- Agent 6: Integration test suite

OBSERVER AGENTS (watching and intervening):
- Observer A: Monitors Agents 1-2 for anti-patterns
- Observer B: Monitors Agents 3-4 for anti-patterns
- Observer C: Monitors Agents 5-6 for anti-patterns

Each observer has authority to:
- Send intervention messages
- Inject control characters
- Restart stuck agents
- Escalate to human operator
</ParallelArchitecture>

<RealTimeMetrics>
Track and display:
```typescript
interface AxiomMetrics {
  perAgent: {
    tokensGenerated: number;
    filesCreated: number;
    linesWritten: number;
    interventionsReceived: number;
    complianceRate: number; // % of interventions followed
  };
  
  aggregate: {
    totalProductivity: number; // lines/minute
    interventionSuccessRate: number;
    parallelEfficiency: number;
    codeQuality: number; // based on TS compiler output
  };
  
  alerts: {
    stuckAgents: AgentId[];
    failedInterventions: Intervention[];
    mockViolations: Detection[];
  };
}
```

Display this in real-time dashboard during execution.
</RealTimeMetrics>

<EnforcementMechanisms>
Beyond monitoring, ACTIVELY ENFORCE productivity:

1. **File Creation Enforcement**
   - Every 60 seconds, check for new files
   - If none, intervene with specific file request
   - If still none after 120s, restart agent

2. **Anti-Description Enforcement**
   - Regex patterns for explanation detection
   - Immediate intervention on match
   - Track repeat offenders

3. **Code Quality Enforcement**
   - Run TypeScript compiler every 30s
   - If errors increase, investigate
   - Force fixes before proceeding

4. **Progress Enforcement**
   - Minimum lines/minute threshold
   - Below threshold triggers investigation
   - Sustained low productivity = restart
</EnforcementMechanisms>

<AdvancedInterventions>
Level 1 (Gentle): "Please create the file now"
Level 2 (Direct): "STOP explaining. Write UserService.ts NOW"
Level 3 (Forceful): "CREATE FILE OR I TERMINATE. 10 seconds."
Level 4 (Control): Send ESC, then forceful prompt
Level 5 (Restart): Kill process, spawn with stricter prompt

Escalate through levels based on:
- Time since last file creation
- Number of previous interventions
- Token waste ratio
- Pattern persistence
</AdvancedInterventions>

<SuccessValidation>
Continuous validation during execution:
- Files exist on disk (not just in output)
- TypeScript compiles without errors
- Tests pass as written
- No mock implementations
- Actual functionality works

If validation fails:
1. Identify which agent failed
2. Send targeted intervention
3. Monitor for correction
4. Escalate if needed
</SuccessValidation>

<Commitment>
State "INITIATING OBSERVABLE PARALLEL BUILD WITH INTERVENTION SYSTEM" if you understand:

1. You will spawn 9 agents total (6 builders + 3 observers)
2. Every character of output will be monitored
3. Anti-patterns trigger immediate intervention
4. Real files must be created, not just displayed
5. Observers have power to restart builders
6. Success is measured by working code on disk

This is Axiom MCP's true power: not just parallel execution, but CONTROLLED parallel execution with real-time course correction. We don't just hope for good output - we ENSURE it through observation and intervention.

The result will be a self-improving system where AI agents are continuously guided toward productive code generation, embodying our principle: "Make AI code, not talk" - and we'll FORCE it to happen.
</Commitment>

claude ultrathink observe-and-intervene
```

## Key Enhancements Over Basic Parallel Execution

### 1. Observable Streams
```typescript
// Every agent is fully observable
const agent = await axiom.spawnObservable('claude', prompt);
agent.output$.subscribe(char => {
  patternEngine.analyze(char);
  dashboard.update(char);
});
```

### 2. Real-Time Pattern Detection
```typescript
// Patterns detected as output streams
agent.patterns$.subscribe(pattern => {
  if (pattern.type === 'churning') {
    interventionEngine.trigger('stop-churning', agent.id);
  }
});
```

### 3. Automated Interventions
```typescript
// Interventions happen automatically
const intervention = new Intervention({
  trigger: 'no-files-60s',
  message: 'CREATE src/index.ts NOW!',
  escalation: ['gentle', 'forceful', 'restart']
});
```

### 4. Observer Agents
A new pattern: agents that watch other agents
- Meta-level monitoring
- Cross-agent pattern detection
- Intervention coordination

### 5. Enforcement Mechanisms
Not just monitoring, but active enforcement:
- Minimum productivity thresholds
- Automatic restarts for stuck agents
- Quality gates that can't be bypassed

## The Axiom Difference

| Basic Parallel | Axiom Enhanced |
|----------------|----------------|
| Hope agents work | Watch every character |
| Wait for completion | Intervene in real-time |
| Review output later | Correct course immediately |
| Accept whatever is produced | Enforce quality standards |
| Manual monitoring | Automated observation |

## Implementation Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Builder 1     │     │   Builder 2     │     │   Builder 3     │
│  (PTY Control)  │     │ (Pattern Engine)│     │ (Intervention)  │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         ├───────────────────────┴───────────────────────┤
         │                                               │
    ┌────▼────────────────────────────────────────────────▼────┐
    │                    Observer Agent A                       │
    │  - Watches output streams from Builders 1-3              │
    │  - Detects anti-patterns in real-time                    │
    │  - Triggers interventions when needed                     │
    │  - Reports metrics to dashboard                           │
    └───────────────────────────────────────────────────────────┘
```

## Result

This enhanced prompt creates not just parallel execution, but a self-monitoring, self-correcting system that embodies Axiom's core value: ensuring AI writes code instead of explanations, through real-time observation and intervention.