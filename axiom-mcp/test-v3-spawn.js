#!/usr/bin/env node

/**
 * Test script for Axiom v3 spawn tool
 * Verifies it actually creates files instead of just planning
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

async function testV3Spawn() {
  console.log('🧪 Testing Axiom v3 spawn tool...\n');
  
  // Start the v3 server
  const serverProcess = spawn('node', ['dist-v3/src-v3/index-v3-standalone.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  
  // Create MCP client
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist-v3/src-v3/index-v3-standalone.js'],
  });
  
  const client = new Client({
    name: 'axiom-v3-test',
    version: '1.0.0',
  }, {
    capabilities: {}
  });
  
  try {
    await client.connect(transport);
    console.log('✅ Connected to Axiom v3 server\n');
    
    // List available tools
    const tools = await client.listTools();
    console.log('📋 Available tools:', tools.tools.map(t => t.name).join(', '), '\n');
    
    // Test 1: Simple file creation
    console.log('🔧 Test 1: Create a simple TypeScript function');
    const test1Result = await client.callTool({
      name: 'axiom_mcp_spawn',
      arguments: {
        parentPrompt: 'Create a TypeScript function that calculates fibonacci numbers with memoization',
        spawnPattern: 'decompose',
        spawnCount: 2,
        autoExecute: false
      }
    });
    
    console.log('Result:', test1Result.content[0].text.substring(0, 500) + '...\n');
    
    // Check if files were created
    const fs = await import('fs');
    const files = fs.readdirSync('.');
    const newTsFiles = files.filter(f => f.endsWith('.ts') && !f.includes('axiom'));
    
    if (newTsFiles.length > 0) {
      console.log('✅ SUCCESS: Created files:', newTsFiles.join(', '));
    } else {
      console.log('❌ FAILURE: No TypeScript files were created!');
    }
    
    // Test 2: Check status
    console.log('\n🔧 Test 2: Check execution status');
    const statusResult = await client.callTool({
      name: 'axiom_mcp_status',
      arguments: {
        action: 'stats'
      }
    });
    
    console.log(statusResult.content[0].text);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await client.close();
    serverProcess.kill();
  }
}

testV3Spawn().catch(console.error);