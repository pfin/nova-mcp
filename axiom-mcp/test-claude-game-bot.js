import { spawn } from 'node-pty';

console.log('=== Claude Game Bot Test ===');
console.log('Applying game bot techniques to Claude control\n');

const claude = spawn('claude', [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});

// Game bot state machine
const states = {
  WAITING_FOR_UI: 'WAITING_FOR_UI',
  UI_READY: 'UI_READY',
  TYPING_PROMPT: 'TYPING_PROMPT',
  WAITING_FOR_SUBMISSION: 'WAITING_FOR_SUBMISSION',
  CLAUDE_PROCESSING: 'CLAUDE_PROCESSING',
  CLAUDE_OUTPUTTING: 'CLAUDE_OUTPUTTING',
  INTERRUPTED: 'INTERRUPTED'
};

let currentState = states.WAITING_FOR_UI;
let buffer = '';
let recentData = '';

// State transition handlers
const stateHandlers = {
  [states.WAITING_FOR_UI]: (data) => {
    if (buffer.includes('? for shortcuts') && buffer.includes('>')) {
      console.log('[STATE] UI Ready - transitioning to typing');
      currentState = states.UI_READY;
      
      // Wait a frame then start typing
      setTimeout(() => {
        currentState = states.TYPING_PROMPT;
        console.log('[ACTION] Typing prompt...');
        claude.write('Write a Python hello world');
      }, 100);
    }
  },
  
  [states.TYPING_PROMPT]: (data) => {
    // After typing, we need to submit
    if (buffer.includes('Write a Python hello world')) {
      console.log('[STATE] Prompt typed - submitting');
      currentState = states.WAITING_FOR_SUBMISSION;
      
      setTimeout(() => {
        console.log('[ACTION] Pressing Enter...');
        claude.write('\n');
      }, 200);
    }
  },
  
  [states.WAITING_FOR_SUBMISSION]: (data) => {
    // Look for signs Claude is processing
    if (recentData.includes('Actioning') || 
        recentData.includes('󰣐') || // Progress indicator
        buffer.includes('Actioning')) {
      console.log('[STATE] Claude is processing!');
      currentState = states.CLAUDE_PROCESSING;
    }
  },
  
  [states.CLAUDE_PROCESSING]: (data) => {
    // Watch for output starting
    if (recentData.includes("I'll") || 
        recentData.includes('```') ||
        recentData.includes('Python') ||
        recentData.includes('hello')) {
      console.log('[STATE] Claude is outputting - time to interrupt!');
      currentState = states.CLAUDE_OUTPUTTING;
      
      // Interrupt immediately
      console.log('[ACTION] Sending ESC to interrupt...');
      claude.write('\x1b');
      currentState = states.INTERRUPTED;
      
      setTimeout(() => {
        console.log('[ACTION] Sending new instruction...');
        claude.write('Just write: print("AXIOM WORKS")\n');
      }, 300);
    }
  }
};

// Main data handler
claude.onData((data) => {
  buffer += data;
  recentData = data;
  process.stdout.write(data);
  
  // Execute current state handler
  const handler = stateHandlers[currentState];
  if (handler) {
    handler(data);
  }
});

// Monitoring
setInterval(() => {
  console.log(`\n[MONITOR] State: ${currentState}, Buffer: ${buffer.length} chars`);
}, 2000);

// Exit after 20 seconds
setTimeout(() => {
  console.log('\n[EXIT] Test complete');
  claude.write('/quit\n');
  setTimeout(() => claude.kill(), 1000);
}, 20000);

claude.onExit(() => {
  console.log('\n=== Game Bot Test Complete ===');
  console.log('Final state:', currentState);
  console.log('Output contains AXIOM:', buffer.includes('AXIOM'));
});