#!/usr/bin/env node
/**
 * Simulate what an LLM sees when connecting to Axiom MCP
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
    
    setTimeout(() => {
      proc.stdout.removeListener('data', handler);
      reject(new Error('Request timeout'));
    }, 5000);
  });
}

async function main() {
  console.log('=== LLM Terminal Experience with Axiom MCP v4 ===\n');
  console.log('Simulating what an LLM sees when connecting...\n');
  
  // Start MCP server
  const mcp = spawn('node', [mcpPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  try {
    // Step 1: Initialize
    console.log('1. INITIALIZING CONNECTION...');
    await sendMcpRequest(mcp, 'initialize', {
      protocolVersion: '0.1.0',
      capabilities: {},
      clientInfo: {
        name: 'llm-terminal',
        version: '1.0.0'
      }
    });
    console.log('✓ Connected to axiom-mcp-v4 server\n');
    
    // Step 2: List tools
    console.log('2. DISCOVERING AVAILABLE TOOLS...');
    const tools = await sendMcpRequest(mcp, 'tools/list', {});
    console.log(`Found ${tools.tools.length} tools:`);
    tools.tools.forEach(tool => {
      console.log(`\n  ${tool.name}:`);
      console.log(`    ${tool.description}`);
      if (tool.inputSchema.properties.action) {
        console.log(`    Actions: ${tool.inputSchema.properties.action.enum.join(', ')}`);
      }
    });
    
    // Step 3: List resources
    console.log('\n\n3. DISCOVERING AVAILABLE RESOURCES...');
    const resources = await sendMcpRequest(mcp, 'resources/list', {});
    console.log(`Found ${resources.resources.length} resources:`);
    resources.resources.forEach(r => {
      console.log(`  - ${r.uri} (${r.name})`);
    });
    
    // Step 4: Show quick start
    console.log('\n\n4. QUICK START EXAMPLE:');
    console.log('```');
    console.log('// Execute a task');
    console.log('axiom_spawn({');
    console.log('  "prompt": "create a Python web server",');
    console.log('  "verboseMasterMode": true');
    console.log('})');
    console.log('// Returns: { "taskId": "abc123", "status": "started" }');
    console.log('');
    console.log('// Check status');
    console.log('axiom_status({ "taskId": "abc123" })');
    console.log('');
    console.log('// Get output');
    console.log('axiom_output({ "taskId": "abc123" })');
    console.log('```');
    
    console.log('\n\n5. FOR DETAILED GUIDANCE:');
    console.log('Read the resource: axiom://tools-guide');
    console.log('It contains comprehensive examples and patterns for all tools.');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    mcp.kill();
  }
}

main().catch(console.error);