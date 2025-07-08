#!/usr/bin/env node

import { spawn } from 'child_process';

// Test script to check MCP tool exposure
console.log('Testing MCP Tool Exposure...\n');

const proc = spawn('node', ['dist-v3/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let outputBuffer = '';
let errorBuffer = '';
let responseComplete = false;

proc.stdout.on('data', (data) => {
  outputBuffer += data.toString();
  
  // Check if we have a complete JSON response
  try {
    const response = JSON.parse(outputBuffer);
    if (response.id === 1) {
      responseComplete = true;
      console.log('\n✅ Response received!');
      console.log('\nParsed Response:');
      console.log(JSON.stringify(response, null, 2));
      
      // Check tools
      if (response.result?.tools) {
        console.log(`\n📋 Found ${response.result.tools.length} tools:\n`);
        response.result.tools.forEach((tool, i) => {
          console.log(`${i + 1}. ${tool.name}`);
          console.log(`   Description: ${tool.description}`);
          console.log(`   Has inputSchema: ${!!tool.inputSchema}`);
          console.log(`   Schema type: ${tool.inputSchema?.type}`);
          console.log(`   additionalProperties: ${tool.inputSchema?.additionalProperties}`);
          console.log(`   title: ${tool.inputSchema?.title || 'none'}`);
        });
      } else {
        console.log('\n❌ No tools found in response!');
      }
      
      proc.kill();
    }
  } catch (e) {
    // Not a complete JSON response yet
  }
});

proc.stderr.on('data', (data) => {
  errorBuffer += data.toString();
});

proc.on('close', (code) => {
  if (!responseComplete) {
    console.log('\n❌ Server closed without sending complete response');
    console.log('\nSTDERR:');
    console.log(errorBuffer);
    console.log('\nSTDOUT (raw):');
    console.log(outputBuffer);
  }
});

// Send tools/list request
const request = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/list"
};

console.log('Sending request:', JSON.stringify(request));
proc.stdin.write(JSON.stringify(request) + '\n');
proc.stdin.end();