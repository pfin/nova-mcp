import { spawn } from 'node-pty';

console.log('=== Human-like Typing Test (Handle Setup) ===');
console.log('Dealing with first-time setup if needed\n');

const claude = spawn('claude', [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});

let buffer = '';
let phase = 'INIT';

// Kill after 60 seconds
const killTimer = setTimeout(() => {
  console.log('\n[TIMEOUT] Killing...');
  claude.kill();
  process.exit(1);
}, 60000);

claude.onData((data) => {
  buffer += data;
  process.stdout.write(data);
  
  // Handle theme selection
  if (phase === 'INIT' && buffer.includes('Choose the text style')) {
    console.log('\n\n[SETUP] Theme selection detected, choosing option 1...');
    setTimeout(() => {
      claude.write('1\n');
      phase = 'THEME_SELECTED';
    }, 1000);
  }
  
  // Now wait for the main UI
  if (phase === 'THEME_SELECTED' && buffer.includes('? for shortcuts')) {
    phase = 'READY';
    console.log('\n\n[READY] Main UI ready, starting human-like typing...');
    
    // Wait like a human would
    setTimeout(() => {
      typeSlowly('Write a hello world program');
    }, 2000);
  }
  
  // For already setup Claude
  if (phase === 'INIT' && buffer.includes('? for shortcuts')) {
    phase = 'READY';
    console.log('\n\n[READY] Claude ready (no setup needed)');
    
    setTimeout(() => {
      typeSlowly('Write a hello world program');
    }, 2000);
  }
  
  // Detect processing and interrupt
  if (phase === 'READY' && 
      (buffer.includes('Synthesizing') || 
       buffer.includes('Manifesting') ||
       buffer.includes('Working'))) {
    phase = 'INTERRUPTING';
    console.log('\n\n[PROCESSING] Claude is working...');
    
    // Wait 2 seconds then interrupt
    setTimeout(() => {
      console.log('[HUMAN] Hmm, let me change that... *presses ESC*');
      claude.write('\x1b');
      
      setTimeout(() => {
        console.log('[HUMAN] I\'ll be more specific...');
        typeSlowly('Create hello.py with just: print("AXIOM")');
      }, 1500);
    }, 2000);
  }
});

// Human-like typing function
function typeSlowly(text) {
  let index = 0;
  
  function typeNext() {
    if (index < text.length) {
      claude.write(text[index]);
      index++;
      
      // Variable typing speed (80-120 wpm)
      const delay = 60 + Math.random() * 60;
      setTimeout(typeNext, delay);
    } else {
      // Pause before Enter
      setTimeout(() => {
        console.log('\n[HUMAN] *presses Enter*');
        claude.write('\x0d');
      }, 800);
    }
  }
  
  console.log(`\n[TYPING] "${text}"`);
  typeNext();
}

claude.onExit(() => {
  console.log('\n\n=== Results ===');
  console.log('Success:', buffer.includes('AXIOM') || buffer.includes('hello.py'));
  clearTimeout(killTimer);
  process.exit(0);
});