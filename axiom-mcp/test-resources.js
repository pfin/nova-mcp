#!/usr/bin/env node
/**
 * Test that MCP resources are accessible
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
    
    // Timeout after 5 seconds
    setTimeout(() => {
      proc.stdout.removeListener('data', handler);
      reject(new Error('Request timeout'));
    }, 5000);
  });
}

async function main() {
  console.log('Testing MCP resources...\n');
  
  // Start MCP server
  const mcp = spawn('node', [mcpPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));
  
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
    
    // List resources
    console.log('Listing resources...');
    const resources = await sendMcpRequest(mcp, 'resources/list', {});
    console.log('Available resources:');
    resources.resources.forEach(r => {
      console.log(`  - ${r.uri}: ${r.description}`);
    });
    
    // Read tools guide
    console.log('\nReading axiom://tools-guide...');
    const toolsGuide = await sendMcpRequest(mcp, 'resources/read', {
      uri: 'axiom://tools-guide'
    });
    
    console.log('\nTools Guide Preview:');
    console.log(toolsGuide.contents[0].text.substring(0, 500) + '...');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    mcp.kill();
  }
}

main().catch(console.error);