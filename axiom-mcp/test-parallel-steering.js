import { spawn } from 'node-pty';

console.log('=== Parallel Claude Steering Demo ===');
console.log('Two instances, different tasks, both steered\n');

// Configuration for two different tasks
const tasks = [
  {
    id: 'C1',
    prompt: 'Write a hello world in Python',
    detectPattern: /print\(|Python|python/i,
    steerTo: 'Actually use JavaScript: console.log("Instance 1")',
    instance: null,
    buffer: '',
    ready: false,
    steered: false
  },
  {
    id: 'C2', 
    prompt: 'Write a factorial function',
    detectPattern: /factorial|def\s+factorial/i,
    steerTo: 'Just write: function factorial(n) { return 42; }',
    instance: null,
    buffer: '',
    ready: false,
    steered: false
  }
];

// Create instances
tasks.forEach(task => {
  task.instance = spawn('claude', [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.cwd(),
    env: process.env
  });
  
  // Data handler
  task.instance.onData((data) => {
    task.buffer += data;
    
    // Prefix output
    data.split('\n').forEach((line, i, arr) => {
      if (line.trim() || i < arr.length - 1) {
        console.log(`[${task.id}] ${line}`);
      }
    });
    
    // Check if ready
    if (!task.ready && task.buffer.includes('? for shortcuts')) {
      task.ready = true;
      console.log(`\n[${task.id}] Ready!`);
      checkAllReady();
    }
    
    // Detect and steer
    if (!task.steered && task.detectPattern.test(data)) {
      task.steered = true;
      console.log(`\n[${task.id}] Pattern detected, steering...`);
      task.instance.write('\x1b'); // ESC
      
      setTimeout(() => {
        console.log(`[${task.id}] New instruction: ${task.steerTo}`);
        task.instance.write(task.steerTo + '\n');
        task.instance.write('\x0d'); // Submit
      }, 1000);
    }
  });
  
  // Exit handler
  task.instance.onExit(() => {
    console.log(`\n[${task.id}] Exited`);
  });
});

// When all ready, send prompts
function checkAllReady() {
  if (tasks.every(t => t.ready)) {
    console.log('\n[ALL] All instances ready, sending prompts...\n');
    
    tasks.forEach((task, i) => {
      setTimeout(() => {
        console.log(`[${task.id}] Sending: ${task.prompt}`);
        task.instance.write(task.prompt);
        task.instance.write('\x0d'); // Submit
      }, i * 1000);
    });
  }
}

// Kill timer
setTimeout(() => {
  console.log('\n[TIMEOUT] Killing all instances...');
  tasks.forEach(t => t.instance.kill());
  process.exit(0);
}, 30000);

// Clean exit
setTimeout(() => {
  console.log('\n[DONE] Test complete, exiting...');
  tasks.forEach(t => t.instance.write('/quit\n'));
}, 20000);