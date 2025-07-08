#!/usr/bin/env node
/**
 * Test script to demonstrate the axiom_claude_orchestrate MCP tool
 * 
 * This script simulates calling the MCP tool to:
 * 1. Spawn 2 Claude instances
 * 2. Send initial prompts to both
 * 3. Steer the first instance
 * 4. Steer the second instance
 * 5. Get output from the first
 * 6. Steer the first again
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const mcpPath = join(__dirname, 'dist-v4', 'index.js');

// Helper to send MCP request
async function sendMcpRequest(proc, method, params) {
  return new Promise((resolve, reject) => {
    const id = Date.now();
    const request = {
      jsonrpc: "2.0",
      id,
      method,
      params
    };
    
    proc.stdin.write(JSON.stringify(request) + '\n');
    
    // Set up response handler
    const handler = (data) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      for (const line of lines) {
        try {
          const response = JSON.parse(line);
          if (response.id === id) {
            proc.stdout.removeListener('data', handler);
            if (response.error) {
              reject(new Error(response.error.message));
            } else {
              resolve(response.result);
            }
          }
        } catch (e) {
          // Ignore non-JSON lines
        }
      }
    };
    
    proc.stdout.on('data', handler);
    
    // Timeout after 30 seconds
    setTimeout(() => {
      proc.stdout.removeListener('data', handler);
      reject(new Error('Request timeout'));
    }, 30000);
  });
}

async function main() {
  console.log('Starting MCP Claude Orchestration Demo...\n');
  
  // Start MCP server
  console.log('Starting MCP server...');
  const mcp = spawn('node', [mcpPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    // Initialize MCP
    console.log('Initializing MCP...');
    await sendMcpRequest(mcp, 'initialize', {
      protocolVersion: '0.1.0',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    });
    
    // Get available tools
    console.log('Getting available tools...');
    const tools = await sendMcpRequest(mcp, 'tools/list', {});
    console.log(`Found ${tools.tools.length} tools\n`);
    
    // Demo the axiom_claude_orchestrate tool
    console.log('=== CLAUDE ORCHESTRATION DEMO ===\n');
    
    // Step 1: Spawn first Claude instance
    console.log('1. Spawning first Claude instance...');
    const spawn1Result = await sendMcpRequest(mcp, 'tools/call', {
      name: 'axiom_claude_orchestrate',
      arguments: {
        action: 'spawn',
        instanceId: 'claude1'
      }
    });
    console.log(spawn1Result.content[0].text);
    
    // Step 2: Spawn second Claude instance
    console.log('\n2. Spawning second Claude instance...');
    const spawn2Result = await sendMcpRequest(mcp, 'tools/call', {
      name: 'axiom_claude_orchestrate',
      arguments: {
        action: 'spawn',
        instanceId: 'claude2'
      }
    });
    console.log(spawn2Result.content[0].text);
    
    // Step 3: Send initial prompts
    console.log('\n3. Sending initial prompt to first instance...');
    const prompt1Result = await sendMcpRequest(mcp, 'tools/call', {
      name: 'axiom_claude_orchestrate',
      arguments: {
        action: 'prompt',
        instanceId: 'claude1',
        prompt: 'Write a hello world program in Python'
      }
    });
    console.log(prompt1Result.content[0].text);
    
    console.log('\n4. Sending initial prompt to second instance...');
    const prompt2Result = await sendMcpRequest(mcp, 'tools/call', {
      name: 'axiom_claude_orchestrate',
      arguments: {
        action: 'prompt',
        instanceId: 'claude2',
        prompt: 'Write a factorial function in JavaScript'
      }
    });
    console.log(prompt2Result.content[0].text);
    
    // Wait for some output
    console.log('\n5. Waiting for Claude to generate some output...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 4: Steer first instance
    console.log('\n6. Steering first instance to Java...');
    const steer1Result = await sendMcpRequest(mcp, 'tools/call', {
      name: 'axiom_claude_orchestrate',
      arguments: {
        action: 'steer',
        instanceId: 'claude1',
        prompt: 'Actually, write it in Java instead with a main method'
      }
    });
    console.log(steer1Result.content[0].text);
    
    // Step 5: Steer second instance
    console.log('\n7. Steering second instance to recursive implementation...');
    const steer2Result = await sendMcpRequest(mcp, 'tools/call', {
      name: 'axiom_claude_orchestrate',
      arguments: {
        action: 'steer',
        instanceId: 'claude2',
        prompt: 'Make it recursive instead of iterative'
      }
    });
    console.log(steer2Result.content[0].text);
    
    // Wait for more output
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 6: Get output from first instance
    console.log('\n8. Getting output from first instance...');
    const output1Result = await sendMcpRequest(mcp, 'tools/call', {
      name: 'axiom_claude_orchestrate',
      arguments: {
        action: 'get_output',
        instanceId: 'claude1',
        lines: 20
      }
    });
    console.log('Output from Claude 1:');
    console.log(JSON.parse(output1Result.content[0].text).output);
    
    // Step 7: Steer first instance again
    console.log('\n9. Steering first instance to add comments...');
    const steer1AgainResult = await sendMcpRequest(mcp, 'tools/call', {
      name: 'axiom_claude_orchestrate',
      arguments: {
        action: 'steer',
        instanceId: 'claude1',
        prompt: 'Add detailed comments explaining the code'
      }
    });
    console.log(steer1AgainResult.content[0].text);
    
    // Get status of all instances
    console.log('\n10. Getting status of all instances...');
    const statusResult = await sendMcpRequest(mcp, 'tools/call', {
      name: 'axiom_claude_orchestrate',
      arguments: {
        action: 'status',
        instanceId: '*'
      }
    });
    console.log('All instances status:');
    console.log(JSON.stringify(JSON.parse(statusResult.content[0].text), null, 2));
    
    // Cleanup
    console.log('\n11. Cleaning up instances...');
    await sendMcpRequest(mcp, 'tools/call', {
      name: 'axiom_claude_orchestrate',
      arguments: {
        action: 'cleanup',
        instanceId: 'claude1'
      }
    });
    await sendMcpRequest(mcp, 'tools/call', {
      name: 'axiom_claude_orchestrate',
      arguments: {
        action: 'cleanup',
        instanceId: 'claude2'
      }
    });
    console.log('Instances cleaned up.');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    // Kill MCP server
    mcp.kill();
  }
}

main().catch(console.error);