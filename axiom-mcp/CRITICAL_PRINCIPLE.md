# CRITICAL PRINCIPLE: Axiom MCP Controls the Subprocess

## The Fundamental Rule

**Axiom MCP must control the Claude subprocess through prompts ONLY.**

### What This Means:

1. **NO** extracting code from responses and writing it ourselves
2. **NO** running commands on behalf of the subprocess  
3. **NO** doing the implementation work for the subprocess
4. **YES** telling the subprocess what it did wrong
5. **YES** giving specific instructions to fix issues
6. **YES** retrying with clearer prompts

### The Control Flow:

```
1. Axiom MCP → Subprocess: "Create a calculator with tests"
2. Subprocess → Response: "I would create a calculator..."
3. System Verification: NO FILES CREATED ❌
4. Axiom MCP → Subprocess: "You created NO FILES. Use Write tool to create calculator.py NOW."
5. Subprocess → Response: [Actually uses Write tool]
6. System Verification: FILE CREATED ✓
7. Axiom MCP → Subprocess: "Now run pytest to verify it works"
8. Subprocess → Response: [Uses Bash tool to run tests]
9. System Verification: TESTS PASS ✓
```

### Why This Matters:

The point of Axiom MCP is to **force the subprocess to actually implement**, not to implement things ourselves. We control through:

1. **Clear Instructions**: Tell it exactly what tools to use
2. **Verification Feedback**: Show what it didn't do
3. **Specific Retries**: Give exact commands to fix issues
4. **System Enforcement**: Can't fake file creation or test results

### What We DON'T Do:

```python
# WRONG - We're doing the work
files = extract_code_from_response(response)
for file in files:
    fs.writeFileSync(file.name, file.content)  # NO!
```

### What We DO:

```python
# RIGHT - We tell the subprocess what to do
if (!proof.hasImplementation) {
    prompt = "You created NO FILES. Use Write tool to create the files NOW."
    // Retry with this specific instruction
}
```

## The Bottom Line

Axiom MCP is a **control system**, not an implementation system. It controls the subprocess to force actual implementation through:

1. System-level verification (can't be faked)
2. Specific retry prompts (clear instructions)
3. Multiple attempts (persistence)
4. Enforcement of requirements (no escape)

The subprocess must do the work. We just make sure it actually does it.