import { spawn } from 'node-pty';

console.log('=== Complete Claude Setup Test ===');
console.log('Handling theme selection properly\n');

const claude = spawn('claude', [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});

let buffer = '';
let phase = 'INIT';

// Kill after 30 seconds
const killTimer = setTimeout(() => {
  console.log('\n[TIMEOUT] Ending...');
  claude.kill();
  process.exit(1);
}, 30000);

claude.onData((data) => {
  buffer += data;
  process.stdout.write(data);
  
  // Handle theme selection
  if (phase === 'INIT' && buffer.includes('Choose the text style')) {
    console.log('\n\n[SETUP] Theme menu detected');
    setTimeout(() => {
      console.log('[SETUP] Selecting option 1 (Dark mode)');
      claude.write('1');
      // Just send the number, wait for it to register
      setTimeout(() => {
        console.log('[SETUP] Pressing Enter to confirm');
        claude.write('\n');
        phase = 'THEME_DONE';
      }, 500);
    }, 1000);
  }
  
  // After theme, wait for main UI
  if ((phase === 'THEME_DONE' || phase === 'INIT') && 
      buffer.includes('? for shortcuts') && 
      !buffer.includes('Choose the text style')) {
    phase = 'READY';
    console.log('\n\n[SUCCESS] Claude main UI is ready!');
    
    // Now do our test
    setTimeout(() => {
      console.log('\n[TEST] Typing slowly like a human...');
      humanType('Write hello.py with print("test")', () => {
        setTimeout(() => {
          console.log('[TEST] Submitting with Ctrl+Enter');
          claude.write('\x0d');
        }, 1000);
      });
    }, 2000);
  }
});

// Type one character at a time
function humanType(text, done) {
  let i = 0;
  
  function typeChar() {
    if (i < text.length) {
      claude.write(text[i]);
      i++;
      // 50-100ms per character
      setTimeout(typeChar, 50 + Math.random() * 50);
    } else {
      done();
    }
  }
  
  typeChar();
}

claude.onExit(() => {
  console.log('\n\n=== Complete ===');
  console.log('Phase reached:', phase);
  clearTimeout(killTimer);
  process.exit(0);
});