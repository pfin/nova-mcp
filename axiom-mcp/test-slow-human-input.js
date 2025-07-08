import { spawn } from 'node-pty';

console.log('=== Slow Human Input Test ===');
console.log('Typing like a real person\n');

const claude = spawn('claude', [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});

let buffer = '';
let ready = false;
let interrupted = false;

// Kill after 45 seconds
const killTimer = setTimeout(() => {
  console.log('\n[TIMEOUT] Ending test...');
  claude.kill();
  process.exit(1);
}, 45000);

claude.onData((data) => {
  buffer += data;
  process.stdout.write(data);
  
  // Skip theme selection by pressing Enter
  if (buffer.includes('Choose the text style')) {
    console.log('\n[SETUP] Pressing Enter to skip...');
    claude.write('\n');
    return;
  }
  
  // Wait for ready prompt
  if (!ready && buffer.includes('? for shortcuts')) {
    ready = true;
    console.log('\n\n[READY] Claude is ready');
    console.log('[HUMAN] *reads screen for 1.5 seconds*');
    
    // Human waits to read
    setTimeout(() => {
      console.log('[HUMAN] *starts typing*');
      slowType('Create test.py with print("hello")', () => {
        console.log('[HUMAN] *pauses to think*');
        
        // Wait before pressing Enter
        setTimeout(() => {
          console.log('[HUMAN] *presses Enter*');
          claude.write('\x0d');
        }, 1000);
      });
    }, 1500);
  }
  
  // Watch for Claude processing
  if (!interrupted && 
      (data.includes('Working') || 
       data.includes('Synthesizing') ||
       data.includes('Creating'))) {
    interrupted = true;
    console.log('\n[DETECT] Claude is processing');
    
    // Human reaction time
    setTimeout(() => {
      console.log('[HUMAN] Oh wait... *reaches for ESC key*');
      setTimeout(() => {
        console.log('[HUMAN] *presses ESC*');
        claude.write('\x1b');
        
        // Wait for interrupt
        setTimeout(() => {
          console.log('[HUMAN] Let me be clearer...');
          slowType('Just write: print("AXIOM WORKS")', () => {
            setTimeout(() => {
              console.log('[HUMAN] *presses Enter confidently*');
              claude.write('\x0d');
            }, 500);
          });
        }, 1000);
      }, 500);
    }, 1500);
  }
});

// Realistic typing function
function slowType(text, callback) {
  let i = 0;
  
  function nextChar() {
    if (i < text.length) {
      claude.write(text[i]);
      i++;
      
      // Realistic typing speed with variation
      let delay = 80 + Math.random() * 80; // 60-140ms
      
      // Occasional pauses (thinking)
      if (Math.random() < 0.1) {
        delay += 200;
      }
      
      setTimeout(nextChar, delay);
    } else if (callback) {
      callback();
    }
  }
  
  nextChar();
}

claude.onExit(() => {
  console.log('\n\n=== Test Complete ===');
  console.log('Steered successfully:', buffer.includes('AXIOM'));
  clearTimeout(killTimer);
  process.exit(0);
});