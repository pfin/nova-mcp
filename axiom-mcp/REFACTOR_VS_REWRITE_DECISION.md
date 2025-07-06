# Refactor vs Rewrite Decision

## Executive Decision: Strategic Refactor with v2 Directory

Based on the expert analysis and current codebase state, we should **create a v2 directory** within the existing project rather than a complete rewrite or in-place refactor.

## Rationale

### Why Not Complete Rewrite?
1. **Good bones exist**: MCP tool definitions, TypeScript setup, project structure
2. **Documentation value**: Existing analysis documents are excellent
3. **Learning preserved**: Current code shows what doesn't work (valuable!)
4. **Migration path**: Users can transition gradually

### Why Not In-Place Refactor?
1. **Fundamental changes**: Moving from CLI to SDK is not incremental
2. **Risk of regression**: v1 "works" for research, some users may depend on it
3. **Clean architecture**: v2 needs different assumptions from ground up
4. **Parallel development**: Can maintain v1 while building v2

## Implementation Strategy

### Directory Structure
```
axiom-mcp/
├── src/           # Current v1 code (deprecated but maintained)
├── src-v2/        # New implementation
│   ├── executors/
│   │   ├── pty-executor.ts
│   │   └── sdk-executor.ts
│   ├── workers/
│   │   ├── task-worker.ts
│   │   └── worker-pool.ts
│   ├── core/
│   │   ├── event-bus.ts
│   │   └── verification.ts
│   └── index.ts
├── dist/          # v1 build output
├── dist-v2/       # v2 build output
└── package.json   # Shared dependencies
```

### Migration Plan

#### Phase 1: Parallel Development (Weeks 1-2)
```json
// package.json scripts
{
  "scripts": {
    "build": "tsc",                    // v1
    "build:v2": "tsc -p tsconfig.v2.json",  // v2
    "start": "node dist/index.js",     // v1
    "start:v2": "node dist-v2/index.js",    // v2
    "test:v2": "jest --config=jest.v2.config.js"
  }
}
```

#### Phase 2: Feature Parity (Weeks 3-4)
- Port tool definitions to v2 with verification
- Implement all v1 tools with actual implementation
- A/B test research vs implementation modes

#### Phase 3: Deprecation (Week 5)
```typescript
// src/index.ts
console.warn(`
╔════════════════════════════════════════════════════════════╗
║                    DEPRECATION NOTICE                       ║
║                                                            ║
║  Axiom MCP v1 only produces research, not implementation. ║
║  Please migrate to v2: npm run start:v2                   ║
║                                                            ║
║  v1 will be removed in 30 days.                          ║
╚════════════════════════════════════════════════════════════╝
`);
```

#### Phase 4: Cutover (Week 6)
- Rename src-v2 → src
- Archive src → src-v1-archived
- Update all imports and builds

## What to Keep, Change, Remove

### Keep (Copy to v2)
- `✓` MCP tool interfaces
- `✓` TypeScript configurations  
- `✓` Project metadata (README structure)
- `✓` Test frameworks
- `✓` Documentation (with updates)

### Change (Reimplement)
- `↻` axiom-subprocess.ts → pty-executor.ts + sdk-executor.ts
- `↻` Task execution flow → Worker pool with verification
- `↻` System prompts → Implementation-focused
- `↻` Status tracking → Event-driven with ledger
- `↻` Error handling → Retry with feedback

### Remove (Don't port)
- `✗` execSync/execAsync calls
- `✗` Research-only prompts
- `✗` Optional verification
- `✗` Blocking execution patterns
- `✗` 30-second timeout workarounds

## Git Strategy

### Branching
```bash
# Create v2 branch
git checkout -b feature/v2-architecture

# Keep main stable
git checkout main  # v1 continues here

# Regular merges
git checkout feature/v2-architecture
git merge main  # Get any v1 fixes
```

### Commits
Follow conventional commits with clear v1/v2 designation:
```
feat(v2): Add PTY executor for interactive sessions
fix(v1): Update documentation about limitations  
feat(v2): Implement mandatory verification
docs: Add migration guide from v1 to v2
```

## Success Metrics

### Technical
- `v2` can execute tasks that `v1` cannot
- Zero timeout errors in `v2`
- 100% of `v2` tasks produce verifiable output
- Parallel execution actually works

### User Experience  
- Clear migration path documented
- No breaking changes for 30 days
- Side-by-side operation possible
- Performance improvements visible

## Risks & Mitigations

### Risk: Users depend on v1 behavior
**Mitigation**: Keep v1 operational with deprecation warnings

### Risk: v2 has unexpected issues  
**Mitigation**: Extensive testing before promoting

### Risk: Migration too complex
**Mitigation**: Automated migration tool for common patterns

## Decision

**We will create a v2 directory** and follow the sprint plan:
- Sprint 0: Prove execution works (pty-executor)
- Sprint 1: Add parallelism and verification
- Sprint 2: Full feature parity
- Sprint 3: Migration and deprecation

This gives us a clean architecture while preserving the ability to maintain v1 if needed.

## Next Action

```bash
# Create v2 structure
mkdir -p src-v2/{executors,workers,core,tools}

# Create v2 tsconfig
cp tsconfig.json tsconfig.v2.json
# Edit to point to src-v2

# Start Sprint 0
cd src-v2/executors
touch pty-executor.ts
```

The path is clear. Let's build v2 right.