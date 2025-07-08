#!/usr/bin/env node
import { spawn } from 'node-pty';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';

// Configuration for large tree testing
const TREE_CONFIG = {
  maxDepth: 5,           // How deep to go
  maxWidth: 3,           // Children per node
  useRealClaude: false,  // Set to true when ready to test with Claude
  simulateDelay: 1000,   // Delay for simulated execution
  humanTypingDelay: 100, // Base delay between chars
  monitorInterval: 500   // How often to update monitor
};

// State manager for all nodes
class TreeMonitor extends EventEmitter {
  constructor() {
    super();
    this.nodes = new Map();
    this.stats = {
      totalNodes: 0,
      activeNodes: 0,
      completedNodes: 0,
      failedNodes: 0,
      maxConcurrent: 0,
      startTime: Date.now()
    };
    
    // Start monitoring
    this.startMonitoring();
  }
  
  addNode(node) {
    this.nodes.set(node.id, node);
    this.stats.totalNodes++;
    this.updateDisplay();
  }
  
  updateNodeState(nodeId, state) {
    const node = this.nodes.get(nodeId);
    if (node) {
      const oldState = node.state;
      node.state = state;
      node.lastUpdate = Date.now();
      
      // Update stats
      if (oldState !== 'active' && state === 'active') {
        this.stats.activeNodes++;
        this.stats.maxConcurrent = Math.max(this.stats.maxConcurrent, this.stats.activeNodes);
      } else if (oldState === 'active' && state !== 'active') {
        this.stats.activeNodes--;
      }
      
      if (state === 'complete') this.stats.completedNodes++;
      if (state === 'error') this.stats.failedNodes++;
      
      this.updateDisplay();
    }
  }
  
  startMonitoring() {
    setInterval(() => {
      this.updateDisplay();
    }, TREE_CONFIG.monitorInterval);
  }
  
  updateDisplay() {
    // Clear console and show tree status
    console.clear();
    console.log('=== Claude Tree Monitor ===');
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`Runtime: ${((Date.now() - this.stats.startTime) / 1000).toFixed(1)}s`);
    console.log('');
    console.log('Stats:');
    console.log(`  Total Nodes: ${this.stats.totalNodes}`);
    console.log(`  Active: ${this.stats.activeNodes}`);
    console.log(`  Completed: ${this.stats.completedNodes}`);
    console.log(`  Failed: ${this.stats.failedNodes}`);
    console.log(`  Max Concurrent: ${this.stats.maxConcurrent}`);
    console.log('');
    console.log('Tree Structure:');
    this.printTree();
    console.log('');
    console.log('Active Nodes:');
    this.printActiveNodes();
  }
  
  printTree(nodeId = 'root', prefix = '', isLast = true) {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    
    const stateIcon = {
      pending: '⏳',
      active: '🔄',
      complete: '✅',
      error: '❌',
      interrupted: '🛑'
    }[node.state] || '❓';
    
    const connector = isLast ? '└─' : '├─';
    console.log(`${prefix}${connector} ${stateIcon} ${node.id} [${node.state}]`);
    
    const childPrefix = prefix + (isLast ? '   ' : '│  ');
    node.children.forEach((childId, index) => {
      const isLastChild = index === node.children.length - 1;
      this.printTree(childId, childPrefix, isLastChild);
    });
  }
  
  printActiveNodes() {
    const activeNodes = Array.from(this.nodes.values())
      .filter(n => n.state === 'active')
      .slice(0, 5); // Show max 5
    
    activeNodes.forEach(node => {
      const runtime = ((Date.now() - node.startTime) / 1000).toFixed(1);
      console.log(`  ${node.id}: ${runtime}s - ${node.lastOutput || 'Working...'}`);
    });
    
    if (this.stats.activeNodes > 5) {
      console.log(`  ... and ${this.stats.activeNodes - 5} more`);
    }
  }
}

// Simulated Claude node for testing
class SimulatedClaudeNode {
  constructor(id, parentId, depth, monitor) {
    this.id = id;
    this.parentId = parentId;
    this.depth = depth;
    this.monitor = monitor;
    this.state = 'pending';
    this.children = [];
    this.startTime = null;
    this.lastOutput = '';
    
    // Register with monitor
    monitor.addNode(this);
  }
  
  async execute(prompt) {
    this.state = 'active';
    this.startTime = Date.now();
    this.monitor.updateNodeState(this.id, 'active');
    
    // Simulate execution
    await this.simulateWork(prompt);
    
    // Decide if we should expand
    if (this.depth < TREE_CONFIG.maxDepth && Math.random() > 0.3) {
      await this.expand();
    }
    
    this.state = 'complete';
    this.monitor.updateNodeState(this.id, 'complete');
  }
  
  async simulateWork(prompt) {
    // Simulate typing
    for (let i = 0; i < 5; i++) {
      this.lastOutput = `Processing ${prompt} - step ${i + 1}/5`;
      await new Promise(r => setTimeout(r, TREE_CONFIG.simulateDelay / 5));
    }
  }
  
  async expand() {
    const numChildren = Math.floor(Math.random() * TREE_CONFIG.maxWidth) + 1;
    
    for (let i = 0; i < numChildren; i++) {
      const childId = `${this.id}-${i}`;
      const child = new SimulatedClaudeNode(childId, this.id, this.depth + 1, this.monitor);
      this.children.push(childId);
      
      // Start child execution (don't await - let them run in parallel)
      setTimeout(() => {
        child.execute(`Subtask ${i + 1} of ${this.id}`);
      }, Math.random() * 2000);
    }
  }
}

// Real Claude node (when ready)
class RealClaudeNode {
  constructor(id, parentId, depth, monitor) {
    this.id = id;
    this.parentId = parentId;
    this.depth = depth;
    this.monitor = monitor;
    this.state = 'pending';
    this.children = [];
    this.buffer = '';
    this.instance = null;
    
    monitor.addNode(this);
  }
  
  async execute(prompt) {
    this.state = 'active';
    this.startTime = Date.now();
    this.monitor.updateNodeState(this.id, 'active');
    
    try {
      // Spawn Claude
      this.instance = spawn('claude', [], {
        name: 'xterm-color',
        cwd: process.cwd(),
        env: process.env,
        cols: 120,
        rows: 30
      });
      
      // Monitor output
      this.instance.on('data', (data) => {
        this.buffer += data;
        this.lastOutput = data.toString().slice(-50); // Last 50 chars
        
        // Detect completion or expansion opportunities
        if (this.detectCompletion(data)) {
          this.complete();
        }
      });
      
      // Wait for ready state
      await this.waitForReady();
      
      // Type prompt slowly
      await this.typeSlowly(prompt);
      await new Promise(r => setTimeout(r, 300));
      this.instance.write('\x0d'); // Submit
      
    } catch (err) {
      this.state = 'error';
      this.monitor.updateNodeState(this.id, 'error');
      console.error(`Node ${this.id} error:`, err);
    }
  }
  
  async waitForReady() {
    // Wait for Claude to be ready
    return new Promise((resolve) => {
      const checkReady = () => {
        if (this.buffer.includes('>') || this.buffer.includes('$')) {
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    });
  }
  
  async typeSlowly(text) {
    for (const char of text) {
      this.instance.write(char);
      await new Promise(r => setTimeout(r, 
        TREE_CONFIG.humanTypingDelay + Math.random() * 50
      ));
    }
  }
  
  detectCompletion(data) {
    // Look for signs that Claude is done
    return data.includes('```') || 
           data.includes('completed') ||
           data.includes('finished');
  }
  
  complete() {
    this.state = 'complete';
    this.monitor.updateNodeState(this.id, 'complete');
    if (this.instance) {
      this.instance.kill();
    }
  }
}

// Main test runner
async function testLargeTree() {
  console.log('Starting Claude Tree Monitor Test');
  console.log('Configuration:', TREE_CONFIG);
  console.log('');
  
  const monitor = new TreeMonitor();
  
  // Create root node
  const NodeClass = TREE_CONFIG.useRealClaude ? RealClaudeNode : SimulatedClaudeNode;
  const root = new NodeClass('root', null, 0, monitor);
  
  // Start execution
  await root.execute('Build a complete web application');
  
  // Keep running until all complete
  setInterval(() => {
    if (monitor.stats.activeNodes === 0 && monitor.stats.totalNodes > 1) {
      console.log('\n\nTree execution complete!');
      console.log('Final stats:', monitor.stats);
      process.exit(0);
    }
  }, 1000);
}

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n\nShutting down monitor...');
  process.exit(0);
});

// Run test
if (import.meta.url === `file://${process.argv[1]}`) {
  testLargeTree();
}