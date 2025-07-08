#!/usr/bin/env node
/**
 * Simulation of how to use the axiom_claude_orchestrate MCP tool
 * This demonstrates the API without actually spawning Claude instances
 */

console.log(`
=== AXIOM CLAUDE ORCHESTRATE MCP TOOL DEMO ===

This MCP tool enables orchestration of multiple Claude instances with real-time control.

AVAILABLE ACTIONS:
- spawn: Create a new Claude instance
- prompt: Send initial prompt to an instance
- steer: Interrupt and redirect an instance 
- get_output: Retrieve output from an instance
- status: Check instance status
- cleanup: Terminate an instance

USAGE EXAMPLE:

1. Spawn two Claude instances:
   axiom_claude_orchestrate({
     action: "spawn",
     instanceId: "claude1"
   })
   
   axiom_claude_orchestrate({
     action: "spawn", 
     instanceId: "claude2"
   })

2. Send initial prompts:
   axiom_claude_orchestrate({
     action: "prompt",
     instanceId: "claude1",
     prompt: "Write a hello world program in Python"
   })
   
   axiom_claude_orchestrate({
     action: "prompt",
     instanceId: "claude2", 
     prompt: "Write a factorial function in JavaScript"
   })

3. Steer first instance mid-execution:
   axiom_claude_orchestrate({
     action: "steer",
     instanceId: "claude1",
     prompt: "Actually, write it in Java instead with a main method"
   })

4. Steer second instance:
   axiom_claude_orchestrate({
     action: "steer",
     instanceId: "claude2",
     prompt: "Make it recursive instead of iterative"
   })

5. Get output from first instance:
   axiom_claude_orchestrate({
     action: "get_output",
     instanceId: "claude1",
     lines: 20
   })

6. Steer first instance again:
   axiom_claude_orchestrate({
     action: "steer",
     instanceId: "claude1",
     prompt: "Add detailed comments explaining the code"
   })

7. Check status of all instances:
   axiom_claude_orchestrate({
     action: "status",
     instanceId: "*"
   })

8. Cleanup instances:
   axiom_claude_orchestrate({
     action: "cleanup",
     instanceId: "claude1"
   })
   
   axiom_claude_orchestrate({
     action: "cleanup",
     instanceId: "claude2"
   })

KEY FEATURES:
- Human-like typing simulation (50-150ms per character)
- ESC interruption for steering
- Ctrl+Enter for prompt submission
- State tracking (starting → ready → working → complete)
- Automatic cleanup of stale instances
- Real-time output buffering

IMPLEMENTATION DETAILS:
- Uses node-pty for proper terminal emulation
- Maintains separate PTY instances per Claude
- Character-by-character output monitoring
- Event-driven architecture with state machine
- Configurable instance limits and timeouts

The tool is now integrated into Axiom MCP v4 and can be used alongside other Axiom tools
for comprehensive task orchestration and monitoring.
`);