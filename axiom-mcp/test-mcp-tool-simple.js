#!/usr/bin/env node
/**
 * Simple test to verify the axiom_claude_orchestrate MCP tool is available
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
    
    console.log(`\n> Sending: ${method}`);
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
    
    // Timeout after 10 seconds
    setTimeout(() => {
      proc.stdout.removeListener('data', handler);
      reject(new Error('Request timeout'));
    }, 10000);
  });
}

async function main() {
  console.log('Testing axiom_claude_orchestrate MCP tool...\n');
  
  // Start MCP server
  console.log('Starting MCP server...');
  const mcp = spawn('node', [mcpPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  // Capture stderr
  mcp.stderr.on('data', (data) => {
    console.error('MCP Error:', data.toString());
  });
  
  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    // Initialize MCP
    await sendMcpRequest(mcp, 'initialize', {
      protocolVersion: '0.1.0',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    });
    console.log('✓ MCP initialized');
    
    // Get available tools
    const tools = await sendMcpRequest(mcp, 'tools/list', {});
    console.log(`\n✓ Found ${tools.tools.length} tools:`);
    
    // Find our tool
    const claudeTool = tools.tools.find(t => t.name === 'axiom_claude_orchestrate');
    if (claudeTool) {
      console.log('\n✓ axiom_claude_orchestrate tool is available!');
      console.log('\nTool details:');
      console.log(`  Name: ${claudeTool.name}`);
      console.log(`  Description: ${claudeTool.description}`);
      console.log('\n  Parameters:');
      console.log(`    - action: ${claudeTool.inputSchema.properties.action.enum.join(', ')}`);
      console.log(`    - instanceId: ${claudeTool.inputSchema.properties.instanceId.description}`);
      console.log(`    - prompt: ${claudeTool.inputSchema.properties.prompt.description || '(optional)'}`);
      console.log(`    - lines: ${claudeTool.inputSchema.properties.lines.description || '(optional)'}`);
      
      // Test a simple status call
      console.log('\n\nTesting tool with status action...');
      const statusResult = await sendMcpRequest(mcp, 'tools/call', {
        name: 'axiom_claude_orchestrate',
        arguments: {
          action: 'status',
          instanceId: 'test-instance'
        }
      });
      
      console.log('\n✓ Tool call successful!');
      console.log('Response:', statusResult.content[0].text);
    } else {
      console.log('\n✗ axiom_claude_orchestrate tool not found!');
      console.log('Available tools:', tools.tools.map(t => t.name).join(', '));
    }
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
  } finally {
    // Kill MCP server
    mcp.kill();
    console.log('\n\nMCP server stopped.');
  }
}

main().catch(console.error);