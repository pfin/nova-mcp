#!/usr/bin/env node

// Test script to verify MCP schema compliance

const spawn = require('child_process').spawn;

// Test tool listing
const listToolsRequest = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/list"
};

console.log('Testing MCP Schema Compliance...\n');
console.log('1. Sending tools/list request...');

const proc = spawn('node', ['dist-v3/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let errorOutput = '';

proc.stdout.on('data', (data) => {
  output += data.toString();
});

proc.stderr.on('data', (data) => {
  errorOutput += data.toString();
});

proc.on('close', (code) => {
  console.log('\nSTDERR Output:');
  console.log(errorOutput);
  
  console.log('\nSTDOUT Output:');
  console.log(output);
  
  try {
    const response = JSON.parse(output);
    console.log('\n2. Checking tool schemas...\n');
    
    if (response.result && response.result.tools) {
      response.result.tools.forEach(tool => {
        console.log(`Tool: ${tool.name}`);
        console.log(`- Has inputSchema: ${!!tool.inputSchema}`);
        console.log(`- Schema type: ${tool.inputSchema?.type}`);
        console.log(`- Has additionalProperties: ${tool.inputSchema?.additionalProperties}`);
        console.log(`- Has title: ${!!tool.inputSchema?.title}`);
        console.log(`- Has required: ${!!tool.inputSchema?.required}`);
        
        // Check nested objects
        if (tool.inputSchema?.properties) {
          Object.entries(tool.inputSchema.properties).forEach(([key, prop]) => {
            if (prop.type === 'object' && prop.properties) {
              console.log(`  - Nested object '${key}' has additionalProperties: ${prop.additionalProperties}`);
            }
          });
        }
        console.log('');
      });
      
      // Summary
      const allCompliant = response.result.tools.every(tool => 
        tool.inputSchema?.additionalProperties === false &&
        tool.inputSchema?.type === 'object'
      );
      
      console.log(allCompliant ? '✅ All tools are MCP compliant!' : '❌ Some tools are not compliant');
    }
  } catch (e) {
    console.error('Failed to parse response:', e.message);
  }
  
  process.exit(code);
});

// Send the request
proc.stdin.write(JSON.stringify(listToolsRequest) + '\n');
proc.stdin.end();