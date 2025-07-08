#!/usr/bin/env node

import { ClaudeSessionManager } from './dist-v4/executors/claude-session-manager.js';

console.log('=== Testing Claude Session Manager ===\n');

const manager = new ClaudeSessionManager();

// Track output
manager.on('data', (sessionId, data) => {
  // Clean ANSI codes for display
  const clean = data.replace(/\x1b\[[0-9;]*m/g, '');
  process.stdout.write(clean);
});

manager.on('ready', (sessionId) => {
  console.log('\n\n>>> SESSION READY! <<<\n');
});

manager.on('intervention', (sessionId, message) => {
  console.log(`\n>>> INTERVENTION DETECTED: ${message} <<<\n`);
});

async function test() {
  try {
    console.log('Creating session...\n');
    const sessionId = 'test-' + Date.now();
    
    const session = await manager.createSession(sessionId);
    console.log('\nSession created and ready!\n');
    
    // Send initial prompt
    console.log('Sending prompt: Create a fibonacci function in Python\n');
    await manager.sendMessage(sessionId, 'Create a fibonacci function in Python');
    
    // Wait 5 seconds, then intervene
    setTimeout(async () => {
      console.log('\n\n>>> SENDING INTERVENTION: Actually make it Java instead <<<\n');
      await manager.sendMessage(sessionId, 'Actually make it Java instead');
    }, 5000);
    
    // Monitor for 30 seconds
    setTimeout(() => {
      console.log('\n\nTest complete. Killing session...');
      manager.killSession(sessionId);
      process.exit(0);
    }, 30000);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

test();