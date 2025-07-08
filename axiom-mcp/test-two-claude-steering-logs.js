#!/usr/bin/env node
import { spawn } from 'node-pty';
import fs from 'fs';

// Test managing 2 Claude instances with independent steering and logging
// This tests that we can:
// 1. Spawn 2 instances without locking
// 2. Steer each independently
// 3. See log messages from both
// 4. Report logs from first
// 5. Steer first again

const LOG_FILE = './two-claude-steering.log';
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

function log(instance, message) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${instance}] ${message}\n`;
  console.log(logLine.trim());
  logStream.write(logLine);
}

// Create two Claude instances
log('SYSTEM', 'Starting test with 2 Claude instances');

const claude1 = spawn('claude', [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});

const claude2 = spawn('claude', [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});

// Buffers to track output
let buffer1 = '';
let buffer2 = '';

// Track states
let state1 = 'starting';
let state2 = 'starting';
let interrupted1 = false;
let interrupted2 = false;

// Data handlers
claude1.onData((data) => {
  buffer1 += data;
  log('C1-OUT', data.toString().replace(/\n/g, '\\n').substring(0, 100));
  
  // Detect ready state
  if (state1 === 'starting' && (data.includes('>') || data.includes('?'))) {
    state1 = 'ready';
    log('C1-STATE', 'Claude 1 is ready');
    startTest();
  }
  
  // Detect when Claude 1 starts working on Python
  if (!interrupted1 && state1 === 'working' && data.includes('Python')) {
    log('C1-DETECT', 'Detected Python output, preparing to interrupt');
    interrupted1 = true;
    setTimeout(() => steerClaude1(), 1500);
  }
});

claude2.onData((data) => {
  buffer2 += data;
  log('C2-OUT', data.toString().replace(/\n/g, '\\n').substring(0, 100));
  
  // Detect ready state
  if (state2 === 'starting' && (data.includes('>') || data.includes('?'))) {
    state2 = 'ready';
    log('C2-STATE', 'Claude 2 is ready');
  }
  
  // Detect when Claude 2 starts working on JavaScript
  if (!interrupted2 && state2 === 'working' && data.includes('JavaScript')) {
    log('C2-DETECT', 'Detected JavaScript output, preparing to interrupt');
    interrupted2 = true;
    setTimeout(() => steerClaude2(), 1500);
  }
});

// Exit handlers
claude1.onExit(() => {
  log('C1-EXIT', 'Claude 1 exited');
});

claude2.onExit(() => {
  log('C2-EXIT', 'Claude 2 exited');
});

// Helper function to type slowly
async function typeSlowly(instance, text, instanceName) {
  log(instanceName, `Typing: "${text}"`);
  for (const char of text) {
    instance.write(char);
    await new Promise(r => setTimeout(r, 50 + Math.random() * 50));
  }
}

// Test sequence
async function startTest() {
  // Wait for both to be ready
  if (state1 !== 'ready' || state2 !== 'ready') {
    log('SYSTEM', 'Waiting for both instances to be ready...');
    setTimeout(startTest, 1000);
    return;
  }
  
  log('SYSTEM', '=== Starting test sequence ===');
  
  // Step 1: Send initial prompts to both
  log('SYSTEM', 'Step 1: Sending initial prompts');
  
  await typeSlowly(claude1, 'Write hello world in Python', 'C1-INPUT');
  await new Promise(r => setTimeout(r, 300));
  claude1.write('\x0d'); // Submit
  state1 = 'working';
  log('C1-STATE', 'Claude 1 is working');
  
  await new Promise(r => setTimeout(r, 1000));
  
  await typeSlowly(claude2, 'Write a factorial function in JavaScript', 'C2-INPUT');
  await new Promise(r => setTimeout(r, 300));
  claude2.write('\x0d'); // Submit
  state2 = 'working';
  log('C2-STATE', 'Claude 2 is working');
}

// Steering functions
async function steerClaude1() {
  log('C1-ACTION', 'Interrupting Claude 1');
  claude1.write('\x1b'); // ESC
  
  await new Promise(r => setTimeout(r, 1000));
  
  log('C1-ACTION', 'Steering Claude 1 to Java');
  await typeSlowly(claude1, 'Actually, write it in Java with a main method', 'C1-INPUT');
  await new Promise(r => setTimeout(r, 300));
  claude1.write('\x0d'); // Submit
  
  // Report buffer after 5 seconds
  setTimeout(() => reportClaude1Buffer(), 5000);
}

async function steerClaude2() {
  log('C2-ACTION', 'Interrupting Claude 2');
  claude2.write('\x1b'); // ESC
  
  await new Promise(r => setTimeout(r, 1000));
  
  log('C2-ACTION', 'Steering Claude 2 to add memoization');
  await typeSlowly(claude2, 'Add memoization to make it more efficient', 'C2-INPUT');
  await new Promise(r => setTimeout(r, 300));
  claude2.write('\x0d'); // Submit
}

// Report Claude 1 buffer
function reportClaude1Buffer() {
  log('SYSTEM', '=== Claude 1 Buffer Report ===');
  log('SYSTEM', `Buffer length: ${buffer1.length} characters`);
  
  // Extract last meaningful output
  const lines = buffer1.split('\n');
  const lastLines = lines.slice(-20).join('\n');
  
  log('C1-BUFFER', 'Last 20 lines:');
  console.log('--- BEGIN C1 BUFFER ---');
  console.log(lastLines);
  console.log('--- END C1 BUFFER ---');
  
  // Check if Java code is present
  if (buffer1.includes('public class') || buffer1.includes('public static void main')) {
    log('C1-VERIFY', 'SUCCESS: Java code detected in buffer');
  } else {
    log('C1-VERIFY', 'WARNING: No Java code detected yet');
  }
  
  // Steer Claude 1 again
  setTimeout(() => steerClaude1Again(), 2000);
}

// Second steering of Claude 1
async function steerClaude1Again() {
  log('C1-ACTION', 'Steering Claude 1 again');
  
  claude1.write('\x1b'); // ESC
  await new Promise(r => setTimeout(r, 1000));
  
  await typeSlowly(claude1, 'Add error handling and input validation', 'C1-INPUT');
  await new Promise(r => setTimeout(r, 300));
  claude1.write('\x0d'); // Submit
  
  // Final report after 10 seconds
  setTimeout(() => finalReport(), 10000);
}

// Final report
function finalReport() {
  log('SYSTEM', '=== FINAL REPORT ===');
  log('SYSTEM', `Claude 1 buffer size: ${buffer1.length}`);
  log('SYSTEM', `Claude 2 buffer size: ${buffer2.length}`);
  
  // Check results
  const results = {
    claude1: {
      hasJava: buffer1.includes('public class') || buffer1.includes('main'),
      hasErrorHandling: buffer1.includes('try') || buffer1.includes('catch'),
      interrupted: interrupted1
    },
    claude2: {
      hasJavaScript: buffer2.includes('function') || buffer2.includes('const'),
      hasMemoization: buffer2.includes('memo') || buffer2.includes('cache'),
      interrupted: interrupted2
    }
  };
  
  log('RESULTS', JSON.stringify(results, null, 2));
  
  // Save full buffers to files
  fs.writeFileSync('./claude1-output.txt', buffer1);
  fs.writeFileSync('./claude2-output.txt', buffer2);
  log('SYSTEM', 'Full outputs saved to claude1-output.txt and claude2-output.txt');
  
  // Cleanup
  log('SYSTEM', 'Test complete, cleaning up...');
  claude1.kill();
  claude2.kill();
  
  setTimeout(() => {
    log('SYSTEM', 'Exiting');
    process.exit(0);
  }, 1000);
}

// Error handling
process.on('uncaughtException', (err) => {
  log('ERROR', `Uncaught exception: ${err.message}`);
  console.error(err);
  claude1.kill();
  claude2.kill();
  process.exit(1);
});

// Start monitoring
log('SYSTEM', 'Monitoring both Claude instances...');
log('SYSTEM', `Log file: ${LOG_FILE}`);