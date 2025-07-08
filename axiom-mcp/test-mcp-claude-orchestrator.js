#!/usr/bin/env node
import { spawn } from 'node-pty';
import { EventEmitter } from 'events';

// Test: 2 Claude instances managed like an MCP tool would
// 1. Spawn 2 instances
// 2. Steer first
// 3. Steer second  
// 4. Get output from first
// 5. Steer first again

class ClaudeOrchestrator extends EventEmitter {
  constructor() {
    super();
    this.instances = new Map();
    this.buffers = new Map();
    this.states = new Map();
  }

  // MCP-like method: spawn a Claude instance
  async spawnClaude(id) {
    console.log(`[ORCHESTRATOR] Spawning Claude instance: ${id}`);
    
    const instance = spawn('claude', [], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: process.cwd(),
      env: process.env
    });

    this.instances.set(id, instance);
    this.buffers.set(id, '');
    this.states.set(id, 'starting');

    // Data handler
    instance.onData((data) => {
      this.buffers.set(id, this.buffers.get(id) + data);
      console.log(`[${id}] OUTPUT: ${data.toString().replace(/\n/g, '\\n').substring(0, 60)}...`);
      
      // Detect ready state
      if (this.states.get(id) === 'starting' && (data.includes('>') || data.includes('?'))) {
        this.states.set(id, 'ready');
        console.log(`[${id}] STATE: Ready`);
        this.emit('ready', id);
      }
    });

    instance.onExit(() => {
      console.log(`[${id}] Exited`);
      this.states.set(id, 'exited');
    });

    return id;
  }

  // MCP-like method: send a prompt
  async sendPrompt(id, prompt) {
    const instance = this.instances.get(id);
    if (!instance) throw new Error(`No instance ${id}`);

    console.log(`[${id}] PROMPT: "${prompt}"`);
    
    // Type slowly like a human
    for (const char of prompt) {
      instance.write(char);
      await new Promise(r => setTimeout(r, 50 + Math.random() * 50));
    }
    
    // Submit
    await new Promise(r => setTimeout(r, 300));
    instance.write('\x0d');
    
    this.states.set(id, 'working');
  }

  // MCP-like method: interrupt and steer
  async steer(id, newPrompt) {
    const instance = this.instances.get(id);
    if (!instance) throw new Error(`No instance ${id}`);

    console.log(`[${id}] STEERING: Interrupting...`);
    
    // Send ESC
    instance.write('\x1b');
    await new Promise(r => setTimeout(r, 1000));
    
    // Send new prompt
    await this.sendPrompt(id, newPrompt);
  }

  // MCP-like method: get output
  getOutput(id) {
    return this.buffers.get(id) || '';
  }

  // MCP-like method: get last N lines
  getLastLines(id, n = 10) {
    const buffer = this.getOutput(id);
    const lines = buffer.split('\n');
    return lines.slice(-n).join('\n');
  }

  // Cleanup
  cleanup() {
    for (const [id, instance] of this.instances) {
      console.log(`[ORCHESTRATOR] Killing ${id}`);
      instance.kill();
    }
  }
}

// Main test sequence
async function runTest() {
  const orchestrator = new ClaudeOrchestrator();
  
  console.log('\n=== MCP-Style Claude Orchestration Test ===\n');
  
  // Step 1: Spawn 2 instances
  console.log('Step 1: Spawning 2 Claude instances...');
  const c1 = await orchestrator.spawnClaude('claude-1');
  const c2 = await orchestrator.spawnClaude('claude-2');
  
  // Wait for both to be ready
  await new Promise(resolve => {
    let readyCount = 0;
    orchestrator.on('ready', () => {
      readyCount++;
      if (readyCount === 2) resolve();
    });
  });
  
  console.log('\nBoth instances ready!\n');
  
  // Step 2: Send initial prompts
  console.log('Step 2: Sending initial prompts...');
  await orchestrator.sendPrompt('claude-1', 'Write a fibonacci function in Python');
  await new Promise(r => setTimeout(r, 2000));
  
  await orchestrator.sendPrompt('claude-2', 'Write hello world in JavaScript');
  await new Promise(r => setTimeout(r, 3000));
  
  // Step 3: Steer first instance
  console.log('\nStep 3: Steering claude-1 to Java...');
  await orchestrator.steer('claude-1', 'Actually, write it in Java with memoization');
  await new Promise(r => setTimeout(r, 3000));
  
  // Step 4: Steer second instance
  console.log('\nStep 4: Steering claude-2 to TypeScript...');
  await orchestrator.steer('claude-2', 'Convert it to TypeScript with type annotations');
  await new Promise(r => setTimeout(r, 3000));
  
  // Step 5: Get output from first
  console.log('\nStep 5: Getting output from claude-1...');
  const output1 = orchestrator.getLastLines('claude-1', 20);
  console.log('--- CLAUDE-1 OUTPUT ---');
  console.log(output1);
  console.log('--- END OUTPUT ---\n');
  
  // Step 6: Steer first again based on output
  console.log('Step 6: Steering claude-1 again...');
  if (output1.includes('Java') || output1.includes('fibonacci')) {
    await orchestrator.steer('claude-1', 'Add error handling for negative inputs');
  } else {
    await orchestrator.steer('claude-1', 'Make sure to include the main method');
  }
  await new Promise(r => setTimeout(r, 5000));
  
  // Final: Get both outputs
  console.log('\n=== FINAL OUTPUTS ===\n');
  
  console.log('CLAUDE-1 Final Output:');
  console.log(orchestrator.getLastLines('claude-1', 30));
  
  console.log('\nCLAUDE-2 Final Output:');
  console.log(orchestrator.getLastLines('claude-2', 30));
  
  // Cleanup
  console.log('\n=== Test Complete ===');
  orchestrator.cleanup();
  process.exit(0);
}

// How this would work as an MCP tool:
console.log(`
=== MCP Tool Design ===

Tool: axiom_claude_orchestrate
Parameters:
{
  "action": "spawn" | "prompt" | "steer" | "get_output" | "status",
  "instanceId": "string",
  "prompt": "string (for prompt/steer actions)",
  "lines": "number (for get_output)"
}

Example usage:
1. axiom_claude_orchestrate({ action: "spawn", instanceId: "worker-1" })
2. axiom_claude_orchestrate({ action: "prompt", instanceId: "worker-1", prompt: "Write factorial in Python" })
3. axiom_claude_orchestrate({ action: "steer", instanceId: "worker-1", prompt: "Make it recursive" })
4. axiom_claude_orchestrate({ action: "get_output", instanceId: "worker-1", lines: 20 })

The MCP server would maintain:
- Map of active Claude instances
- Buffers for each instance
- State tracking
- Resource management (max instances)
- Automatic cleanup on timeout
`);

// Run the test
runTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});