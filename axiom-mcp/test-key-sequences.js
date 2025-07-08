import { spawn } from 'node-pty';

console.log('=== Key Sequences Reference ===');
console.log('Testing various control characters\n');

// Key sequences we can send:
const keys = {
  // Basic controls
  ENTER: '\n',
  CTRL_ENTER: '\x0d',     // Submit prompt in Claude
  ESC: '\x1b',            // Interrupt Claude
  TAB: '\t',
  BACKSPACE: '\x7f',
  CTRL_C: '\x03',         // Cancel/clear
  CTRL_D: '\x04',         // EOF
  CTRL_L: '\x0c',         // Clear screen
  CTRL_A: '\x01',         // Beginning of line
  CTRL_E: '\x05',         // End of line
  CTRL_K: '\x0b',         // Kill line
  CTRL_U: '\x15',         // Clear line
  
  // Arrow keys
  UP: '\x1b[A',
  DOWN: '\x1b[B',
  RIGHT: '\x1b[C',
  LEFT: '\x1b[D',
  
  // Function keys
  F1: '\x1bOP',
  F2: '\x1bOQ',
  F3: '\x1bOR',
  F4: '\x1bOS',
  
  // Special combinations
  ALT_ENTER: '\x1b\r',
  SHIFT_TAB: '\x1b[Z',
  CTRL_SPACE: '\x00',
};

console.log('Key sequences we can send:');
console.log('-------------------------');
for (const [name, seq] of Object.entries(keys)) {
  // Show the escape sequence in a readable format
  const readable = seq.replace(/\x1b/g, 'ESC')
                      .replace(/\x0d/g, 'CR')
                      .replace(/\x03/g, 'CTRL-C')
                      .replace(/\x7f/g, 'DEL')
                      .replace(/\n/g, 'LF')
                      .replace(/\t/g, 'TAB')
                      .replace(/\x0[0-9a-f]/g, (m) => `CTRL-${String.fromCharCode(m.charCodeAt(1) + 64)}`);
  console.log(`${name.padEnd(15)} : ${readable}`);
}

console.log('\nKey findings from our tests:');
console.log('----------------------------');
console.log('1. CTRL_ENTER (\\x0d) - Submits prompts in Claude');
console.log('2. ESC (\\x1b) - Interrupts Claude mid-stream');
console.log('3. Character-by-character typing works');
console.log('4. Timing is crucial - wait after each action');
console.log('5. Human-like delays (50-150ms) per character');

console.log('\nExample usage:');
console.log('--------------');
console.log('// Type slowly');
console.log('for (char of text) {');
console.log('  claude.write(char);');
console.log('  await sleep(50 + Math.random() * 100);');
console.log('}');
console.log('');
console.log('// Submit');
console.log('claude.write(\'\\x0d\'); // Ctrl+Enter');
console.log('');
console.log('// Interrupt');
console.log('claude.write(\'\\x1b\'); // ESC');

process.exit(0);