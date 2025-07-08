import { spawn } from 'node-pty';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';

// Logging system
class Logger {
  constructor(logDir = './logs-tree') {
    this.logDir = logDir;
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Main log file
    this.mainLog = path.join(logDir, `tree-${Date.now()}.jsonl`);
    
    // Event types we track
    this.eventTypes = {
      SPAWN: 'spawn',
      STATE_CHANGE: 'state_change',
      INPUT: 'input',
      OUTPUT: 'output',
      INTERRUPT: 'interrupt',
      STEER: 'steer',
      COMPLETE: 'complete',
      ERROR: 'error',
      METRIC: 'metric'
    };
  }
  
  log(event) {
    const entry = {
      timestamp: new Date().toISOString(),
      ...event
    };
    
    fs.appendFileSync(this.mainLog, JSON.stringify(entry) + '\n');
    
    // Also log to console with color coding
    const color = {
      spawn: '\x1b[32m',      // Green
      state_change: '\x1b[33m', // Yellow
      input: '\x1b[36m',       // Cyan
      output: '\x1b[37m',      // White
      interrupt: '\x1b[31m',   // Red
      steer: '\x1b[35m',       // Magenta
      complete: '\x1b[32m',    // Green
      error: '\x1b[31m',       // Red
      metric: '\x1b[34m'       // Blue
    }[event.type] || '\x1b[0m';
    
    console.log(`${color}[${event.type.toUpperCase()}]\x1b[0m ${event.nodeId} - ${event.message || ''}`);
  }
}

// Claude Node in the tree
class ClaudeNode extends EventEmitter {
  constructor(id, parentId, depth, logger, config = {}) {
    super();
    this.id = id;
    this.parentId = parentId;
    this.depth = depth;
    this.logger = logger;
    this.config = config;
    
    // State machine
    this.states = {
      INIT: 'init',
      SPAWNING: 'spawning',
      THEME_SETUP: 'theme_setup',
      READY: 'ready',
      TYPING: 'typing',
      PROCESSING: 'processing',
      INTERRUPTED: 'interrupted',
      COMPLETE: 'complete',
      ERROR: 'error'
    };
    
    this.state = this.states.INIT;
    this.buffer = '';
    this.instance = null;
    this.children = [];
    this.metrics = {
      startTime: Date.now(),
      charactersTyped: 0,
      interruptions: 0,
      steeringAttempts: 0,
      outputLength: 0
    };
  }
  
  setState(newState) {
    const oldState = this.state;
    this.state = newState;
    this.logger.log({
      type: 'state_change',
      nodeId: this.id,
      oldState,
      newState,
      depth: this.depth
    });
    this.emit('stateChange', oldState, newState);
  }
  
  spawn() {
    this.setState(this.states.SPAWNING);
    
    this.instance = spawn('claude', [], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: process.cwd(),
      env: process.env
    });
    
    this.logger.log({
      type: 'spawn',
      nodeId: this.id,
      parentId: this.parentId,
      depth: this.depth,
      message: `Spawned Claude instance at depth ${this.depth}`
    });
    
    // Data handler
    this.instance.onData((data) => {
      this.buffer += data;
      this.metrics.outputLength += data.length;
      
      // Log output in chunks
      this.logger.log({
        type: 'output',
        nodeId: this.id,
        data: data.substring(0, 100), // First 100 chars
        length: data.length
      });
      
      // State detection
      this.detectStateFromOutput(data);
      
      // Emit for parent to see
      this.emit('data', data);
    });
    
    // Exit handler
    this.instance.onExit(() => {
      this.setState(this.states.COMPLETE);
      this.logMetrics();
      this.emit('exit');
    });
  }
  
  detectStateFromOutput(data) {
    const output = this.buffer;
    
    // Theme selection
    if (this.state === this.states.SPAWNING && output.includes('Choose the text style')) {
      this.setState(this.states.THEME_SETUP);
      this.handleThemeSetup();
    }
    
    // Ready detection
    if ((this.state === this.states.SPAWNING || this.state === this.states.THEME_SETUP) && 
        output.includes('? for shortcuts')) {
      this.setState(this.states.READY);
    }
    
    // Processing detection
    if (this.state === this.states.TYPING && 
        (data.includes('Synthesizing') || 
         data.includes('Working') ||
         data.includes('Manifesting'))) {
      this.setState(this.states.PROCESSING);
    }
  }
  
  handleThemeSetup() {
    setTimeout(() => {
      this.write('1\n'); // Select dark theme
    }, 1000);
  }
  
  write(text) {
    if (!this.instance) return;
    
    this.logger.log({
      type: 'input',
      nodeId: this.id,
      data: text.replace(/\x1b/g, '<ESC>').replace(/\x0d/g, '<CR>'),
      length: text.length
    });
    
    this.instance.write(text);
  }
  
  typeSlowly(text, callback) {
    this.setState(this.states.TYPING);
    let index = 0;
    
    const typeNext = () => {
      if (index < text.length) {
        this.write(text[index]);
        this.metrics.charactersTyped++;
        index++;
        
        // Human-like delays
        const delay = 50 + Math.random() * 100;
        setTimeout(typeNext, delay);
      } else {
        if (callback) callback();
      }
    };
    
    typeNext();
  }
  
  interrupt() {
    this.logger.log({
      type: 'interrupt',
      nodeId: this.id,
      message: 'Sending ESC to interrupt'
    });
    
    this.metrics.interruptions++;
    this.write('\x1b');
    this.setState(this.states.INTERRUPTED);
  }
  
  steer(newPrompt) {
    this.logger.log({
      type: 'steer',
      nodeId: this.id,
      message: `Steering to: ${newPrompt}`
    });
    
    this.metrics.steeringAttempts++;
    this.typeSlowly(newPrompt, () => {
      setTimeout(() => {
        this.write('\x0d'); // Submit
      }, 500);
    });
  }
  
  logMetrics() {
    const duration = Date.now() - this.metrics.startTime;
    this.logger.log({
      type: 'metric',
      nodeId: this.id,
      metrics: {
        ...this.metrics,
        duration,
        charsPerSecond: this.metrics.charactersTyped / (duration / 1000)
      }
    });
  }
  
  // Spawn children
  spawnChildren(count) {
    for (let i = 0; i < count; i++) {
      const childId = `${this.id}-${i}`;
      const child = new ClaudeNode(childId, this.id, this.depth + 1, this.logger);
      this.children.push(child);
      
      // Listen to child events
      child.on('stateChange', (oldState, newState) => {
        this.emit('childStateChange', child, oldState, newState);
      });
      
      child.spawn();
    }
  }
}

// Tree Controller
class ClaudeTreeController {
  constructor() {
    this.logger = new Logger();
    this.nodes = new Map();
    this.root = null;
  }
  
  createTree(depth, branching) {
    console.log(`\n=== Creating Claude Tree ===`);
    console.log(`Depth: ${depth}, Branching: ${branching}`);
    console.log(`Total nodes: ${this.calculateNodes(depth, branching)}\n`);
    
    // Create root
    this.root = new ClaudeNode('root', null, 0, this.logger);
    this.nodes.set('root', this.root);
    
    // Recursively create tree
    this.buildTree(this.root, depth - 1, branching);
    
    // Start root
    this.root.spawn();
    
    // Monitor tree
    this.startMonitoring();
  }
  
  buildTree(parent, remainingDepth, branching) {
    if (remainingDepth <= 0) return;
    
    parent.on('stateChange', (oldState, newState) => {
      if (newState === 'ready') {
        // When parent is ready, spawn children
        setTimeout(() => {
          for (let i = 0; i < branching; i++) {
            const childId = `${parent.id}-${i}`;
            const child = new ClaudeNode(childId, parent.id, parent.depth + 1, this.logger);
            parent.children.push(child);
            this.nodes.set(childId, child);
            
            // Recursive build
            this.buildTree(child, remainingDepth - 1, branching);
            
            // Start child
            child.spawn();
          }
        }, 2000);
      }
    });
  }
  
  calculateNodes(depth, branching) {
    let total = 0;
    for (let d = 0; d < depth; d++) {
      total += Math.pow(branching, d);
    }
    return total;
  }
  
  startMonitoring() {
    // Status report every 5 seconds
    setInterval(() => {
      this.printTreeStatus();
    }, 5000);
  }
  
  printTreeStatus() {
    console.log('\n=== Tree Status ===');
    const states = {};
    
    for (const [id, node] of this.nodes) {
      states[node.state] = (states[node.state] || 0) + 1;
    }
    
    console.log('Node states:', states);
    console.log('Total nodes:', this.nodes.size);
    console.log('Log file:', this.logger.mainLog);
  }
  
  // Orchestration example
  orchestrateTest() {
    // Wait for root to be ready
    this.root.on('stateChange', (oldState, newState) => {
      if (newState === 'ready') {
        // Send initial prompt
        this.root.typeSlowly('Write a Python hello world', () => {
          setTimeout(() => {
            this.root.write('\x0d'); // Submit
          }, 500);
        });
      }
      
      if (newState === 'processing') {
        // Interrupt and steer
        setTimeout(() => {
          this.root.interrupt();
          setTimeout(() => {
            this.root.steer('Actually make it say "ROOT NODE"');
          }, 1000);
        }, 2000);
      }
    });
  }
}

// Test harness
if (import.meta.url === `file://${process.argv[1]}`) {
  const controller = new ClaudeTreeController();
  
  // Create a small tree for testing
  controller.createTree(2, 2); // 2 levels, 2 children per node = 3 total nodes
  
  // Run orchestration test
  controller.orchestrateTest();
  
  // Exit after 30 seconds
  setTimeout(() => {
    console.log('\n=== Test Complete ===');
    process.exit(0);
  }, 30000);
}