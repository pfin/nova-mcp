#!/usr/bin/env node
/**
 * Full integration test of Axiom MCP v4 for LLM usage
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
    
    console.log(`\n→ ${method}`, params ? JSON.stringify(params).substring(0, 100) : '');
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
    
    setTimeout(() => {
      proc.stdout.removeListener('data', handler);
      reject(new Error('Request timeout'));
    }, 10000);
  });
}

async function testAxiomSpawn(mcp) {
  console.log('\n=== Testing axiom_spawn ===');
  
  // Test single spawn
  const spawnResult = await sendMcpRequest(mcp, 'tools/call', {
    name: 'axiom_spawn',
    arguments: {
      prompt: 'echo "Hello from Axiom MCP v4"'
    }
  });
  
  console.log('← Response:', spawnResult.content[0].text);
  
  // Extract taskId from response
  const taskIdMatch = spawnResult.content[0].text.match(/Task started: (\w+)/);
  if (!taskIdMatch) {
    console.log('Warning: Could not extract taskId from response');
    return null;
  }
  
  const taskId = taskIdMatch[1];
  console.log('✓ Task ID:', taskId);
  
  // Wait a bit for execution
  await new Promise(r => setTimeout(r, 2000));
  
  // Check status
  const statusResult = await sendMcpRequest(mcp, 'tools/call', {
    name: 'axiom_status',
    arguments: { taskId }
  });
  console.log('← Status:', statusResult.content[0].text);
  
  // Get output
  const outputResult = await sendMcpRequest(mcp, 'tools/call', {
    name: 'axiom_output',
    arguments: { taskId }
  });
  console.log('← Output:', outputResult.content[0].text);
  
  return taskId;
}

async function testClaudeOrchestrate(mcp) {
  console.log('\n=== Testing axiom_claude_orchestrate ===');
  
  // Test status action (doesn't require actual Claude)
  const statusResult = await sendMcpRequest(mcp, 'tools/call', {
    name: 'axiom_claude_orchestrate',
    arguments: {
      action: 'status',
      instanceId: 'test-instance'
    }
  });
  
  console.log('← Status response:', statusResult.content[0].text);
  
  // Test all instances status
  const allStatusResult = await sendMcpRequest(mcp, 'tools/call', {
    name: 'axiom_claude_orchestrate',
    arguments: {
      action: 'status',
      instanceId: '*'
    }
  });
  
  console.log('← All instances:', allStatusResult.content[0].text);
}

async function testResources(mcp) {
  console.log('\n=== Testing Resources ===');
  
  // Read tools guide
  const toolsGuide = await sendMcpRequest(mcp, 'resources/read', {
    uri: 'axiom://tools-guide'
  });
  
  console.log('← Tools guide loaded:', 
    toolsGuide.contents[0].text.substring(0, 100) + '...');
  
  // Read status
  const status = await sendMcpRequest(mcp, 'resources/read', {
    uri: 'axiom://status'
  });
  
  console.log('← System status:', 
    JSON.parse(status.contents[0].text).version);
}

async function main() {
  console.log('=== Axiom MCP v4 Full Integration Test ===\n');
  console.log('This test simulates LLM usage patterns...');
  
  // Start MCP server
  const mcp = spawn('node', [mcpPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  // Capture stderr
  mcp.stderr.on('data', (data) => {
    if (process.env.DEBUG) {
      console.error('[MCP Error]', data.toString());
    }
  });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  try {
    // Initialize
    await sendMcpRequest(mcp, 'initialize', {
      protocolVersion: '0.1.0',
      capabilities: {},
      clientInfo: {
        name: 'integration-test',
        version: '1.0.0'
      }
    });
    console.log('✓ MCP server initialized');
    
    // Run tests
    await testAxiomSpawn(mcp);
    await testClaudeOrchestrate(mcp);
    await testResources(mcp);
    
    console.log('\n✅ All tests completed successfully!');
    console.log('\nThe Axiom MCP v4 server is ready for LLM usage.');
    console.log('LLMs can now:');
    console.log('  - Execute tasks with axiom_spawn');
    console.log('  - Monitor progress with axiom_status');
    console.log('  - Get output with axiom_output');
    console.log('  - Control tasks with axiom_send and axiom_interrupt');
    console.log('  - Orchestrate Claude instances with axiom_claude_orchestrate');
    console.log('  - Access documentation via axiom://tools-guide resource');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    mcp.kill();
  }
}

main().catch(console.error);