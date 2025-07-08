import { spawn } from 'node-pty';

console.log('=== Human-like Typing Test ===');
console.log('Mimicking real human input timing\n');

const claude = spawn('claude', [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});

let buffer = '';
let ready = false;

// Kill after 60 seconds
const killTimer = setTimeout(() => {
  console.log('\n[TIMEOUT] Killing...');
  claude.kill();
  process.exit(1);
}, 60000);

claude.onData((data) => {
  buffer += data;
  process.stdout.write(data);
  
  if (!ready && buffer.includes('? for shortcuts')) {
    ready = true;
    console.log('\n\n[READY] Claude is ready, waiting like a human would...');
    
    // Wait 2 seconds like a human reading the screen
    setTimeout(() => {
      typeSlowly('Create a simple hello world program');
    }, 2000);
  }
  
  // Watch for processing
  if (buffer.includes('Synthesizing') || buffer.includes('Manifesting')) {
    console.log('\n\n[DETECTED] Claude is processing...');
    
    // Wait 3 seconds to let it start
    setTimeout(() => {
      console.log('[HUMAN] Oh wait, I changed my mind... *presses ESC*');
      claude.write('\x1b');
      
      // Wait for interrupt to register
      setTimeout(() => {
        console.log('[HUMAN] Actually, make it print AXIOM instead');
        // Type slowly again
        typeSlowly('Just create hello.py with: print("AXIOM WORKS")');
      }, 1500);
    }, 3000);
  }
});

// Function to type slowly like a human
function typeSlowly(text) {
  let index = 0;
  
  function typeNext() {
    if (index < text.length) {
      claude.write(text[index]);
      index++;
      
      // Random delay between 50-150ms per character
      const delay = 50 + Math.random() * 100;
      setTimeout(typeNext, delay);
    } else {
      // After typing, wait a moment then press Enter
      setTimeout(() => {
        console.log('\n[HUMAN] *presses Enter*');
        claude.write('\x0d');
      }, 500);
    }
  }
  
  console.log(`\n[HUMAN] *starts typing slowly*: "${text}"`);
  typeNext();
}

claude.onExit(() => {
  console.log('\n\n=== Test Complete ===');
  console.log('Buffer contains AXIOM:', buffer.includes('AXIOM'));
  clearTimeout(killTimer);
  process.exit(0);
});