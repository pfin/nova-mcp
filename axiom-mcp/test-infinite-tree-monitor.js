#!/usr/bin/env node
import { spawn } from 'node-pty';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';

// Enhanced configuration for infinite tree testing
const TREE_CONFIG = {
  // Tree structure
  initialWidth: 2,        // Start with 2 children
  maxWidth: 10,           // Maximum children per node
  depthLimit: null,       // No depth limit (infinite)
  widthGrowthFactor: 1.5, // How width grows per level
  
  // Resource management
  maxConcurrent: 5,       // Max simultaneous Claude instances
  spawnRateLimit: 500,    // Min ms between spawns
  memoryThreshold: 0.8,   // 80% memory usage triggers throttling
  cpuThreshold: 0.7,      // 70% CPU usage triggers throttling
  
  // Execution control
  useRealClaude: false,   // Set to true for real Claude
  simulateDelay: 500,     // Delay for simulated nodes
  humanTypingDelay: 100,  // Base typing delay
  
  // Logging configuration
  logLevel: 'verbose',    // verbose, info, warn, error
  logRotateSize: 10 * 1024 * 1024, // 10MB log rotation
  metricsInterval: 1000,  // Update metrics every second
  checkpointInterval: 5000 // Save state every 5 seconds
};

// Enhanced Logger with rotation and levels
class EnhancedLogger {
  constructor(logDir = './logs-infinite-tree') {
    this.logDir = logDir;
    this.logLevel = TREE_CONFIG.logLevel;
    this.currentLogFile = null;
    this.logStream = null;
    this.eventCount = 0;
    
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    this.startNewLogFile();
    
    // Log levels
    this.levels = {
      verbose: 0,
      info: 1,
      warn: 2,
      error: 3
    };
  }
  
  startNewLogFile() {
    if (this.logStream) {
      this.logStream.end();
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.currentLogFile = path.join(this.logDir, `tree-${timestamp}.jsonl`);
    this.logStream = fs.createWriteStream(this.currentLogFile, { flags: 'a' });
    
    // Write header
    this.log('system', 'info', 'Log file started', {
      config: TREE_CONFIG,
      pid: process.pid,
      nodeVersion: process.version
    });
  }
  
  log(type, level, message, data = {}) {
    if (this.levels[level] < this.levels[this.logLevel]) {
      return; // Skip if below configured level
    }
    
    const event = {
      timestamp: new Date().toISOString(),
      eventId: ++this.eventCount,
      type,
      level,
      message,
      ...data,
      // Performance metrics
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };
    
    // Write to file
    this.logStream.write(JSON.stringify(event) + '\n');
    
    // Check rotation
    if (this.eventCount % 1000 === 0) {
      this.checkRotation();
    }
    
    // Console output with colors
    this.consoleLog(event);
  }
  
  checkRotation() {
    const stats = fs.statSync(this.currentLogFile);
    if (stats.size > TREE_CONFIG.logRotateSize) {
      this.log('system', 'info', 'Rotating log file', { size: stats.size });
      this.startNewLogFile();
    }
  }
  
  consoleLog(event) {
    const colors = {
      verbose: '\x1b[90m', // Gray
      info: '\x1b[36m',    // Cyan
      warn: '\x1b[33m',    // Yellow
      error: '\x1b[31m'    // Red
    };
    
    const typeColors = {
      spawn: '\x1b[32m',     // Green
      state: '\x1b[33m',     // Yellow
      metric: '\x1b[34m',    // Blue
      resource: '\x1b[35m',  // Magenta
      error: '\x1b[31m'      // Red
    };
    
    const color = typeColors[event.type] || colors[event.level] || '\x1b[0m';
    const time = event.timestamp.split('T')[1].split('.')[0];
    
    console.log(
      `${color}[${time}] ${event.type.toUpperCase()} ${event.level}\x1b[0m: ${event.message}`
    );
  }
}

// Advanced Tree Node Manager
class InfiniteTreeNode extends EventEmitter {
  constructor(id, parentId, depth, position, monitor) {
    super();
    this.id = id;
    this.parentId = parentId;
    this.depth = depth;
    this.position = position; // Position among siblings
    this.monitor = monitor;
    
    // State management
    this.state = 'pending';
    this.children = [];
    this.buffer = '';
    this.metrics = {
      created: Date.now(),
      started: null,
      completed: null,
      charactersTyped: 0,
      outputSize: 0,
      childrenSpawned: 0
    };
    
    // Resource tracking
    this.resources = {
      memoryStart: null,
      memoryPeak: 0,
      cpuTime: 0
    };
    
    this.instance = null;
  }
  
  getPath() {
    // Return path from root (e.g., "0.1.2" for 3rd child of 2nd child of 1st child)
    const parts = [];
    let current = this;
    while (current.parentId) {
      parts.unshift(current.position);
      current = this.monitor.nodes.get(current.parentId);
    }
    return parts.join('.');
  }
  
  async execute(prompt) {
    this.state = 'active';
    this.metrics.started = Date.now();
    this.resources.memoryStart = process.memoryUsage().heapUsed;
    
    this.monitor.logger.log('spawn', 'info', `Node ${this.id} starting`, {
      nodeId: this.id,
      depth: this.depth,
      path: this.getPath(),
      prompt: prompt.substring(0, 50) + '...'
    });
    
    this.monitor.updateNodeState(this.id, 'active');
    
    try {
      if (TREE_CONFIG.useRealClaude) {
        await this.executeReal(prompt);
      } else {
        await this.executeSimulated(prompt);
      }
      
      // Decide on expansion
      const shouldExpand = this.decideExpansion();
      if (shouldExpand) {
        await this.expand();
      }
      
      this.complete();
    } catch (err) {
      this.fail(err);
    }
  }
  
  async executeSimulated(prompt) {
    // Simulate work with resource usage
    const steps = 5 + Math.floor(Math.random() * 5);
    
    for (let i = 0; i < steps; i++) {
      this.buffer += `Step ${i + 1}/${steps}: Processing ${prompt}\n`;
      this.metrics.outputSize = this.buffer.length;
      
      // Simulate resource usage
      this.resources.memoryPeak = Math.max(
        this.resources.memoryPeak,
        process.memoryUsage().heapUsed - this.resources.memoryStart
      );
      
      // Log progress
      if (i % 2 === 0) {
        this.monitor.logger.log('progress', 'verbose', `Node ${this.id} progress`, {
          nodeId: this.id,
          step: i + 1,
          totalSteps: steps
        });
      }
      
      await new Promise(r => setTimeout(r, TREE_CONFIG.simulateDelay));
    }
  }
  
  async executeReal(prompt) {
    // Spawn real Claude instance
    this.instance = spawn('claude', [], {
      name: 'xterm-color',
      cols: 120,
      rows: 30,
      cwd: process.cwd(),
      env: process.env
    });
    
    // Monitor output
    this.instance.on('data', (data) => {
      this.buffer += data;
      this.metrics.outputSize = this.buffer.length;
      
      // Log significant output
      if (data.includes('>>>') || data.includes('$')) {
        this.monitor.logger.log('output', 'verbose', `Node ${this.id} ready`, {
          nodeId: this.id,
          snippet: data.toString().slice(-50)
        });
      }
    });
    
    // Wait for ready
    await this.waitForReady();
    
    // Type prompt
    await this.typeSlowly(prompt);
    await new Promise(r => setTimeout(r, 300));
    this.instance.write('\x0d'); // Submit
    
    // Wait for completion
    await this.waitForCompletion();
  }
  
  async typeSlowly(text) {
    for (const char of text) {
      this.instance.write(char);
      this.metrics.charactersTyped++;
      await new Promise(r => setTimeout(r, 
        TREE_CONFIG.humanTypingDelay + Math.random() * 50
      ));
    }
  }
  
  decideExpansion() {
    // Intelligent expansion decision based on:
    // 1. System resources
    // 2. Tree balance
    // 3. Depth considerations
    
    const resources = this.monitor.getResourceStatus();
    
    // Don't expand if resources are constrained
    if (resources.memoryUsage > TREE_CONFIG.memoryThreshold) {
      this.monitor.logger.log('decision', 'warn', `Node ${this.id} skipping expansion - memory`, {
        nodeId: this.id,
        memoryUsage: resources.memoryUsage
      });
      return false;
    }
    
    if (resources.cpuUsage > TREE_CONFIG.cpuThreshold) {
      this.monitor.logger.log('decision', 'warn', `Node ${this.id} skipping expansion - CPU`, {
        nodeId: this.id,
        cpuUsage: resources.cpuUsage
      });
      return false;
    }
    
    // Probability decreases with depth
    const expansionProbability = Math.exp(-this.depth / 10);
    const shouldExpand = Math.random() < expansionProbability;
    
    this.monitor.logger.log('decision', 'info', `Node ${this.id} expansion decision`, {
      nodeId: this.id,
      depth: this.depth,
      probability: expansionProbability,
      decision: shouldExpand
    });
    
    return shouldExpand;
  }
  
  async expand() {
    // Calculate dynamic width based on depth
    const baseWidth = TREE_CONFIG.initialWidth;
    const growthFactor = Math.pow(TREE_CONFIG.widthGrowthFactor, this.depth);
    const targetWidth = Math.min(
      Math.floor(baseWidth * growthFactor),
      TREE_CONFIG.maxWidth
    );
    
    // Add some randomness
    const actualWidth = Math.max(1, Math.floor(targetWidth * (0.5 + Math.random() * 0.5)));
    
    this.monitor.logger.log('expansion', 'info', `Node ${this.id} expanding`, {
      nodeId: this.id,
      depth: this.depth,
      targetWidth,
      actualWidth
    });
    
    for (let i = 0; i < actualWidth; i++) {
      const childId = `${this.id}.${i}`;
      const child = new InfiniteTreeNode(childId, this.id, this.depth + 1, i, this.monitor);
      this.children.push(childId);
      this.metrics.childrenSpawned++;
      
      // Queue for execution
      this.monitor.queueNode(child, `Subtask ${i + 1} from ${this.id}`);
    }
  }
  
  complete() {
    this.state = 'complete';
    this.metrics.completed = Date.now();
    const duration = this.metrics.completed - this.metrics.started;
    
    this.monitor.logger.log('complete', 'info', `Node ${this.id} completed`, {
      nodeId: this.id,
      duration,
      outputSize: this.metrics.outputSize,
      childrenSpawned: this.metrics.childrenSpawned,
      memoryPeak: this.resources.memoryPeak
    });
    
    this.monitor.updateNodeState(this.id, 'complete');
    
    if (this.instance) {
      this.instance.kill();
    }
  }
  
  fail(error) {
    this.state = 'error';
    this.monitor.logger.log('error', 'error', `Node ${this.id} failed`, {
      nodeId: this.id,
      error: error.message,
      stack: error.stack
    });
    
    this.monitor.updateNodeState(this.id, 'error');
    
    if (this.instance) {
      this.instance.kill();
    }
  }
  
  async waitForReady() {
    return new Promise((resolve) => {
      const check = () => {
        if (this.buffer.includes('>') || this.buffer.includes('$')) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }
  
  async waitForCompletion() {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(), 30000); // 30s timeout
      
      this.instance.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }
}

// Infinite Tree Monitor - Main orchestrator
class InfiniteTreeMonitor {
  constructor() {
    this.logger = new EnhancedLogger();
    this.nodes = new Map();
    this.queue = [];
    this.activeNodes = new Set();
    
    this.stats = {
      totalNodes: 0,
      activeNodes: 0,
      completedNodes: 0,
      failedNodes: 0,
      maxDepthReached: 0,
      maxWidthReached: 0,
      totalMemoryUsed: 0,
      startTime: Date.now()
    };
    
    this.resourceMonitor = null;
    this.executionTimer = null;
    this.checkpointTimer = null;
    
    this.setupMonitoring();
  }
  
  setupMonitoring() {
    // Resource monitoring
    this.resourceMonitor = setInterval(() => {
      this.checkResources();
    }, 1000);
    
    // Queue processing
    this.executionTimer = setInterval(() => {
      this.processQueue();
    }, TREE_CONFIG.spawnRateLimit);
    
    // Checkpointing
    this.checkpointTimer = setInterval(() => {
      this.saveCheckpoint();
    }, TREE_CONFIG.checkpointInterval);
    
    // Metrics display
    setInterval(() => {
      this.displayMetrics();
    }, TREE_CONFIG.metricsInterval);
  }
  
  addNode(node) {
    this.nodes.set(node.id, node);
    this.stats.totalNodes++;
    this.stats.maxDepthReached = Math.max(this.stats.maxDepthReached, node.depth);
    
    // Track width at this depth
    const siblingsAtDepth = Array.from(this.nodes.values())
      .filter(n => n.depth === node.depth).length;
    this.stats.maxWidthReached = Math.max(this.stats.maxWidthReached, siblingsAtDepth);
    
    this.logger.log('node', 'info', `Node ${node.id} added to tree`, {
      nodeId: node.id,
      depth: node.depth,
      totalNodes: this.stats.totalNodes
    });
  }
  
  queueNode(node, prompt) {
    this.addNode(node);
    this.queue.push({ node, prompt });
    
    this.logger.log('queue', 'verbose', `Node ${node.id} queued`, {
      nodeId: node.id,
      queueLength: this.queue.length,
      prompt: prompt.substring(0, 30) + '...'
    });
  }
  
  updateNodeState(nodeId, state) {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    
    const oldState = node.state;
    node.state = state;
    
    // Update active count
    if (oldState !== 'active' && state === 'active') {
      this.stats.activeNodes++;
      this.activeNodes.add(nodeId);
    } else if (oldState === 'active' && state !== 'active') {
      this.stats.activeNodes--;
      this.activeNodes.delete(nodeId);
    }
    
    if (state === 'complete') this.stats.completedNodes++;
    if (state === 'error') this.stats.failedNodes++;
    
    this.logger.log('state', 'verbose', `Node ${nodeId} state change`, {
      nodeId,
      oldState,
      newState: state,
      activeCount: this.stats.activeNodes
    });
  }
  
  async processQueue() {
    // Check if we can spawn more
    if (this.activeNodes.size >= TREE_CONFIG.maxConcurrent) {
      return;
    }
    
    // Check resources
    const resources = this.getResourceStatus();
    if (resources.shouldThrottle) {
      this.logger.log('throttle', 'warn', 'Throttling due to resources', resources);
      return;
    }
    
    // Get next from queue
    const item = this.queue.shift();
    if (!item) return;
    
    const { node, prompt } = item;
    
    this.logger.log('execute', 'info', `Starting node ${node.id}`, {
      nodeId: node.id,
      queueRemaining: this.queue.length
    });
    
    // Execute without blocking
    node.execute(prompt).catch(err => {
      this.logger.log('error', 'error', `Node ${node.id} execution error`, {
        nodeId: node.id,
        error: err.message
      });
    });
  }
  
  getResourceStatus() {
    const memUsage = process.memoryUsage();
    const totalMem = require('os').totalmem();
    const memoryUsage = memUsage.heapUsed / totalMem;
    
    // Simple CPU approximation
    const cpuUsage = this.activeNodes.size / TREE_CONFIG.maxConcurrent;
    
    return {
      memoryUsage,
      cpuUsage,
      shouldThrottle: memoryUsage > TREE_CONFIG.memoryThreshold || 
                      cpuUsage > TREE_CONFIG.cpuThreshold,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external
    };
  }
  
  checkResources() {
    const resources = this.getResourceStatus();
    
    if (resources.shouldThrottle) {
      this.logger.log('resource', 'warn', 'Resource warning', resources);
    }
    
    // Track total memory
    this.stats.totalMemoryUsed = Math.max(
      this.stats.totalMemoryUsed,
      resources.heapUsed
    );
  }
  
  saveCheckpoint() {
    const checkpoint = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      treeStructure: this.getTreeStructure(),
      queueLength: this.queue.length,
      activeNodes: Array.from(this.activeNodes)
    };
    
    const checkpointFile = path.join(
      this.logger.logDir,
      `checkpoint-${Date.now()}.json`
    );
    
    fs.writeFileSync(checkpointFile, JSON.stringify(checkpoint, null, 2));
    
    this.logger.log('checkpoint', 'info', 'Checkpoint saved', {
      file: checkpointFile,
      nodes: this.stats.totalNodes,
      completed: this.stats.completedNodes
    });
  }
  
  getTreeStructure() {
    const structure = {};
    
    // Build tree structure recursively
    const buildBranch = (nodeId) => {
      const node = this.nodes.get(nodeId);
      if (!node) return null;
      
      return {
        id: node.id,
        state: node.state,
        depth: node.depth,
        metrics: node.metrics,
        children: node.children.map(childId => buildBranch(childId)).filter(Boolean)
      };
    };
    
    // Find root nodes
    const roots = Array.from(this.nodes.values())
      .filter(n => !n.parentId)
      .map(n => buildBranch(n.id));
    
    return roots;
  }
  
  displayMetrics() {
    const runtime = (Date.now() - this.stats.startTime) / 1000;
    const nodesPerSecond = this.stats.completedNodes / runtime;
    
    console.clear();
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║              INFINITE TREE MONITOR - LIVE STATUS             ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║ Runtime: ${runtime.toFixed(1)}s`.padEnd(63) + '║');
    console.log(`║ Total Nodes: ${this.stats.totalNodes}`.padEnd(63) + '║');
    console.log(`║ Active: ${this.stats.activeNodes}/${TREE_CONFIG.maxConcurrent}`.padEnd(63) + '║');
    console.log(`║ Completed: ${this.stats.completedNodes}`.padEnd(63) + '║');
    console.log(`║ Failed: ${this.stats.failedNodes}`.padEnd(63) + '║');
    console.log(`║ Queue: ${this.queue.length}`.padEnd(63) + '║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║ Max Depth: ${this.stats.maxDepthReached}`.padEnd(63) + '║');
    console.log(`║ Max Width: ${this.stats.maxWidthReached}`.padEnd(63) + '║');
    console.log(`║ Nodes/sec: ${nodesPerSecond.toFixed(2)}`.padEnd(63) + '║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    
    const resources = this.getResourceStatus();
    console.log(`║ Memory: ${(resources.memoryUsage * 100).toFixed(1)}%`.padEnd(63) + '║');
    console.log(`║ CPU Load: ${(resources.cpuUsage * 100).toFixed(1)}%`.padEnd(63) + '║');
    console.log(`║ Heap: ${(resources.heapUsed / 1024 / 1024).toFixed(1)}MB / ${(resources.heapTotal / 1024 / 1024).toFixed(1)}MB`.padEnd(63) + '║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    
    // Show active nodes
    console.log('║ Active Nodes:'.padEnd(63) + '║');
    const activeList = Array.from(this.activeNodes).slice(0, 3);
    activeList.forEach(nodeId => {
      const node = this.nodes.get(nodeId);
      if (node) {
        const runtime = ((Date.now() - node.metrics.started) / 1000).toFixed(1);
        console.log(`║   ${nodeId}: ${runtime}s`.padEnd(63) + '║');
      }
    });
    
    if (this.activeNodes.size > 3) {
      console.log(`║   ... and ${this.activeNodes.size - 3} more`.padEnd(63) + '║');
    }
    
    console.log('╚══════════════════════════════════════════════════════════════╝');
  }
  
  async start() {
    console.log('Starting Infinite Tree Monitor');
    console.log('Configuration:', TREE_CONFIG);
    
    this.logger.log('system', 'info', 'Monitor started', { config: TREE_CONFIG });
    
    // Create root node
    const root = new InfiniteTreeNode('root', null, 0, 0, this);
    this.queueNode(root, 'Create a distributed web crawler system');
    
    // Handle shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }
  
  shutdown() {
    console.log('\n\nShutting down Infinite Tree Monitor...');
    
    this.logger.log('system', 'info', 'Monitor shutting down', {
      totalNodes: this.stats.totalNodes,
      completed: this.stats.completedNodes,
      runtime: (Date.now() - this.stats.startTime) / 1000
    });
    
    // Save final checkpoint
    this.saveCheckpoint();
    
    // Clear intervals
    clearInterval(this.resourceMonitor);
    clearInterval(this.executionTimer);
    clearInterval(this.checkpointTimer);
    
    // Kill any active Claude instances
    this.activeNodes.forEach(nodeId => {
      const node = this.nodes.get(nodeId);
      if (node && node.instance) {
        node.instance.kill();
      }
    });
    
    // Generate final report
    this.generateFinalReport();
    
    process.exit(0);
  }
  
  generateFinalReport() {
    const reportFile = path.join(
      this.logger.logDir,
      `final-report-${Date.now()}.json`
    );
    
    const report = {
      summary: {
        startTime: new Date(this.stats.startTime).toISOString(),
        endTime: new Date().toISOString(),
        runtime: (Date.now() - this.stats.startTime) / 1000,
        ...this.stats
      },
      treeStructure: this.getTreeStructure(),
      configuration: TREE_CONFIG
    };
    
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`\nFinal report saved: ${reportFile}`);
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new InfiniteTreeMonitor();
  monitor.start();
}