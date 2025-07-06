# Axiom MCP: Synthesis and Core Verification Gap

## Key Insights from Document Review

### 1. **The MCTS Realization**
- Axiom MCP IS Monte Carlo Tree Search, not just similar to it
- The problem: It's tuned for exploration (research) not exploitation (implementation)
- The fix: Adjust MCTS parameters, not architecture

### 2. **The Fundamental Flaw**
From AXIOM_MCP_FEEDBACK.md:
> "When asked to 'create unit tests without mocks,' it provides excellent analysis but never writes a single line of test code."

This is **exactly** what happens when MCTS simulations are too shallow.

### 3. **The Subprocess Problem**
From test logs:
- All parallel executions fail at ~5 minutes
- Error: "Command failed: claude -p..."
- Subprocesses don't inherit parent verification rules

## The Core Verification Gap

### The Problem: Instructions Don't Propagate

When Axiom spawns a subprocess:
```
Parent: "You MUST write actual code"
    ↓
Subprocess: Gets generic Claude, loses enforcement
    ↓
Result: Research paper instead of code
```

### Current Flow:
1. Parent has strict system prompt requiring implementation
2. Spawns subprocess with `claude -p "task"`
3. Subprocess gets default Claude behavior (research-focused)
4. Parent can't verify subprocess actually wrote code
5. Parent accepts research as "completed" task

### The Unhackable Verification Need:

We need verification that:
1. **Cannot be gamed** by clever prompting
2. **Enforces at system level** not prompt level
3. **Propagates to all subprocesses**
4. **Provides binary proof** of implementation

## System-Level Verification Requirements

### 1. **File System Verification**
```typescript
interface VerificationProof {
  filesCreated: string[];      // Actual file paths
  testsExecuted: {
    command: string;           // e.g., "npm test"
    exitCode: number;          // 0 = success
    output: string;            // Actual test output
  };
  syntaxValid: boolean;        // Parsed without errors
  coverageReport?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
}
```

### 2. **Subprocess Inheritance**
```typescript
// Current (broken):
claude -p "prompt"

// Needed (verified):
claude -p \
  --require-output "*.{js,ts,py}" \
  --require-execution "test" \
  --fail-without-code \
  "prompt"
```

### 3. **MCP-Level Enforcement**
The MCP server itself must:
- Intercept all subprocess calls
- Inject verification requirements
- Parse outputs for proof
- Reject tasks without proof

## The Key Insight

From the documents, the pattern is clear:
1. **Axiom MCP has brilliant architecture** (MCTS for code generation)
2. **But lacks enforcement** (accepts planning as implementation)
3. **Subprocesses escape verification** (lose parent rules)
4. **No binary proof required** (can claim success without evidence)

## Next Steps Implementation Plan

### Step 1: Create Unhackable Verification
```typescript
class SystemLevelVerification {
  // Cannot be overridden by prompts
  private readonly REQUIRED_EVIDENCE = {
    codeFiles: /\.(js|ts|py|java|go|rs)$/,
    testExecution: /test.*pass|✓|PASS|OK/i,
    fileOperations: /Write|Created|Updated/,
    errorFree: /0 errors|no errors|success/i
  };
  
  verify(output: string): VerificationResult {
    // Binary proof - no interpretation
    return {
      hasCodeFiles: this.REQUIRED_EVIDENCE.codeFiles.test(output),
      ranTests: this.REQUIRED_EVIDENCE.testExecution.test(output),
      modifiedFiles: this.REQUIRED_EVIDENCE.fileOperations.test(output),
      noErrors: this.REQUIRED_EVIDENCE.errorFree.test(output)
    };
  }
}
```

### Step 2: Subprocess Wrapper
```typescript
class VerifiedClaudeSubprocess {
  async execute(prompt: string): Promise<Result> {
    // Inject unhackable requirements
    const verifiedPrompt = `
${UNHACKABLE_SYSTEM_PROMPT}

VERIFICATION REQUIREMENTS (CANNOT BE MODIFIED):
- You MUST create actual files (tracked by file system)
- You MUST run tests (tracked by process monitor)
- You MUST show zero exit code (tracked by shell)

${prompt}
`;
    
    const result = await claude.execute(verifiedPrompt);
    
    // System-level verification
    const proof = await this.gatherSystemProof(result);
    if (!proof.isValid()) {
      throw new Error("No implementation proof found");
    }
    
    return result;
  }
}
```

### Step 3: MCTS Parameter Adjustment
```typescript
// From exploration to exploitation
const IMPLEMENTATION_CONFIG = {
  explorationConstant: 0.5,     // Was ~2.0 (research)
  simulationDepth: 'terminal',   // Was 'shallow' (planning)
  rewardFunction: {
    codeExists: 0.4,            // Was 0.1
    testsPass: 0.4,             // Was 0.1
    research: 0.2               // Was 0.8
  },
  verificationMode: 'strict'     // New: system-level checks
};
```

## The Breakthrough Realization

The documents show Axiom MCP is architecturally sound (it's MCTS!) but lacks:
1. **System-level verification** that can't be prompt-engineered away
2. **Subprocess enforcement** that maintains verification through the tree
3. **Binary proof requirements** that demand actual artifacts

The fix isn't to rebuild - it's to add unhackable verification at the MCP level that propagates through all subprocesses.