import { spawn } from 'node-pty';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { Logger, ClaudeNode } from './claude-tree-controller.js';

// Advanced orchestration for infinite trees
class InfiniteOrchestrator extends EventEmitter {
  constructor() {
    super();
    this.logger = new Logger('./logs-infinite');
    this.nodes = new Map();
    this.activeNodes = new Set(); // Currently active nodes
    this.pendingNodes = [];       // Nodes waiting to spawn
    this.completedNodes = new Set();
    
    // Resource limits
    this.config = {
      maxConcurrent: 10,        // Max simultaneous Claude instances
      maxDepth: 5,              // Max tree depth
      maxWidth: 3,              // Max children per node
      spawnDelay: 2000,         // Delay between spawns (ms)
      memoryLimit: 1024 * 1024 * 500, // 500MB memory limit
      timeLimit: 60000,         // 60s per node
      
      // Adaptive parameters
      adaptiveSpawning: true,   // Adjust spawning based on system load
      loadThreshold: 0.8,       // CPU threshold to slow spawning
      backpressure: true        // Pause spawning if too many pending
    };
    
    // Metrics
    this.metrics = {
      totalSpawned: 0,
      totalCompleted: 0,
      totalFailed: 0,
      avgCompletionTime: 0,
      peakConcurrent: 0,
      memoryUsage: 0
    };
    
    // Start resource monitoring
    this.startResourceMonitor();
  }
  
  // Create a task that will expand into a tree
  createTask(rootPrompt, expansionStrategy) {
    const task = {
      id: `task-${Date.now()}`,
      rootPrompt,
      expansionStrategy,
      startTime: Date.now(),
      nodes: new Map(),
      results: []
    };
    
    // Create root node
    const root = this.createNode('root', null, 0, task);
    root.prompt = rootPrompt;
    
    // Add to pending
    this.pendingNodes.push(root);
    
    // Start processing
    this.processQueue();
    
    return task;
  }
  
  createNode(id, parentId, depth, task) {
    const node = new ClaudeNode(id, parentId, depth, this.logger, {
      timeLimit: this.config.timeLimit
    });
    
    // Enhanced node with task context
    node.task = task;
    node.prompt = null;
    node.result = null;
    node.shouldExpand = true;
    
    // Track in orchestrator
    this.nodes.set(id, node);
    task.nodes.set(id, node);
    
    // Listen for completion
    node.on('stateChange', (oldState, newState) => {
      if (newState === 'complete' || newState === 'error') {
        this.handleNodeCompletion(node);
      }
    });
    
    return node;
  }
  
  async processQueue() {
    // Check if we can spawn more
    if (this.activeNodes.size >= this.config.maxConcurrent) {
      this.logger.log({
        type: 'metric',
        nodeId: 'orchestrator',
        message: `At capacity: ${this.activeNodes.size}/${this.config.maxConcurrent} active`
      });
      return;
    }
    
    // Check system resources
    if (this.config.adaptiveSpawning) {
      const load = await this.getSystemLoad();
      if (load > this.config.loadThreshold) {
        this.logger.log({
          type: 'metric',
          nodeId: 'orchestrator',
          message: `High system load: ${(load * 100).toFixed(1)}%`
        });
        setTimeout(() => this.processQueue(), 5000);
        return;
      }
    }
    
    // Get next node
    const node = this.pendingNodes.shift();
    if (!node) return;
    
    // Spawn it
    this.spawnNode(node);
    
    // Continue processing
    setTimeout(() => this.processQueue(), this.config.spawnDelay);
  }
  
  spawnNode(node) {
    // Check depth limit
    if (node.depth >= this.config.maxDepth) {
      node.shouldExpand = false;
    }
    
    // Mark as active
    this.activeNodes.add(node.id);
    this.metrics.totalSpawned++;
    this.metrics.peakConcurrent = Math.max(this.metrics.peakConcurrent, this.activeNodes.size);
    
    // Add timeout
    const timeout = setTimeout(() => {
      this.logger.log({
        type: 'error',
        nodeId: node.id,
        message: 'Node timeout'
      });
      node.instance?.kill();
    }, node.config.timeLimit);
    
    node._timeout = timeout;
    
    // Spawn the node
    node.spawn();
    
    // When ready, send prompt
    node.on('stateChange', (oldState, newState) => {
      if (newState === 'ready' && node.prompt) {
        this.executePrompt(node);
      }
    });
  }
  
  executePrompt(node) {
    // Type the prompt
    node.typeSlowly(node.prompt, () => {
      setTimeout(() => {
        node.write('\x0d'); // Submit
      }, 500);
    });
    
    // Set up interruption strategy
    if (node.task.expansionStrategy.interrupt) {
      node.on('stateChange', (oldState, newState) => {
        if (newState === 'processing') {
          setTimeout(() => {
            node.interrupt();
            setTimeout(() => {
              const steerPrompt = node.task.expansionStrategy.steerPrompt(node);
              node.steer(steerPrompt);
            }, 1000);
          }, node.task.expansionStrategy.interruptDelay || 2000);
        }
      });
    }
  }
  
  handleNodeCompletion(node) {
    // Clear timeout
    if (node._timeout) {
      clearTimeout(node._timeout);
    }
    
    // Update metrics
    this.activeNodes.delete(node.id);
    this.completedNodes.add(node.id);
    this.metrics.totalCompleted++;
    
    const duration = Date.now() - node.metrics.startTime;
    this.metrics.avgCompletionTime = 
      (this.metrics.avgCompletionTime * (this.metrics.totalCompleted - 1) + duration) / 
      this.metrics.totalCompleted;
    
    // Extract result from buffer
    node.result = this.extractResult(node);
    node.task.results.push({
      nodeId: node.id,
      depth: node.depth,
      result: node.result
    });
    
    // Expand if needed
    if (node.shouldExpand && node.depth < this.config.maxDepth) {
      this.expandNode(node);
    }
    
    // Continue processing queue
    this.processQueue();
    
    // Check if task is complete
    this.checkTaskCompletion(node.task);
  }
  
  expandNode(node) {
    const strategy = node.task.expansionStrategy;
    const expansions = strategy.expand(node);
    
    expansions.forEach((expansion, i) => {
      if (i >= this.config.maxWidth) return;
      
      const childId = `${node.id}-${i}`;
      const child = this.createNode(childId, node.id, node.depth + 1, node.task);
      child.prompt = expansion.prompt;
      child.shouldExpand = expansion.shouldExpand !== false;
      
      node.children.push(child);
      this.pendingNodes.push(child);
    });
  }
  
  extractResult(node) {
    // Simple extraction - look for code blocks or specific patterns
    const buffer = node.buffer;
    const codeMatch = buffer.match(/```(?:python|javascript|java)?\n([\s\S]*?)```/g);
    
    if (codeMatch) {
      return {
        type: 'code',
        content: codeMatch[0]
      };
    }
    
    // Look for file creation
    const fileMatch = buffer.match(/(?:created|wrote|saved).*?([\w.-]+\.(py|js|java|txt))/i);
    if (fileMatch) {
      return {
        type: 'file',
        filename: fileMatch[1]
      };
    }
    
    return {
      type: 'text',
      content: buffer.substring(buffer.lastIndexOf('>') + 1).trim()
    };
  }
  
  checkTaskCompletion(task) {
    // Check if all nodes are complete
    const allComplete = Array.from(task.nodes.values())
      .every(node => this.completedNodes.has(node.id));
    
    if (allComplete) {
      const duration = Date.now() - task.startTime;
      this.logger.log({
        type: 'metric',
        nodeId: 'orchestrator',
        message: `Task ${task.id} complete`,
        taskMetrics: {
          duration,
          totalNodes: task.nodes.size,
          results: task.results.length
        }
      });
      
      this.emit('taskComplete', task);
    }
  }
  
  // Resource monitoring
  startResourceMonitor() {
    setInterval(() => {
      const usage = process.memoryUsage();
      this.metrics.memoryUsage = usage.heapUsed;
      
      if (usage.heapUsed > this.config.memoryLimit) {
        this.logger.log({
          type: 'error',
          nodeId: 'orchestrator',
          message: 'Memory limit exceeded, pausing spawning'
        });
        
        // Pause spawning
        this.pendingNodes = [];
      }
    }, 5000);
  }
  
  async getSystemLoad() {
    // Simple load average check
    try {
      const loadavg = (await import('os')).default.loadavg();
      return loadavg[0] / (await import('os')).default.cpus().length;
    } catch (e) {
      return 0;
    }
  }
  
  // Visualization helpers
  getTreeSnapshot() {
    const snapshot = {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      nodes: []
    };
    
    for (const [id, node] of this.nodes) {
      snapshot.nodes.push({
        id: node.id,
        parentId: node.parentId,
        depth: node.depth,
        state: node.state,
        hasResult: !!node.result,
        childCount: node.children.length
      });
    }
    
    return snapshot;
  }
  
  printStatus() {
    console.log('\n=== Orchestrator Status ===');
    console.log(`Active nodes: ${this.activeNodes.size}/${this.config.maxConcurrent}`);
    console.log(`Pending nodes: ${this.pendingNodes.length}`);
    console.log(`Completed nodes: ${this.completedNodes.size}`);
    console.log(`Memory usage: ${(this.metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`);
    console.log(`Avg completion time: ${(this.metrics.avgCompletionTime / 1000).toFixed(1)}s`);
  }
}

// Example expansion strategies
const expansionStrategies = {
  // Binary search tree style
  binarySearch: {
    expand: (node) => {
      if (!node.result) return [];
      
      return [
        {
          prompt: `Optimize the left half of: ${node.prompt}`,
          shouldExpand: true
        },
        {
          prompt: `Optimize the right half of: ${node.prompt}`,
          shouldExpand: true
        }
      ];
    },
    interrupt: false
  },
  
  // Iterative refinement
  iterativeRefinement: {
    expand: (node) => {
      const depth = node.depth;
      if (depth >= 3) return [];
      
      return [
        {
          prompt: `Improve this solution: ${node.result?.content || node.prompt}`,
          shouldExpand: true
        }
      ];
    },
    interrupt: true,
    interruptDelay: 3000,
    steerPrompt: (node) => `Focus on performance optimization`
  },
  
  // Map-reduce style
  mapReduce: {
    expand: (node) => {
      if (node.depth === 0) {
        // Split into sub-tasks
        return [
          { prompt: 'Handle data parsing', shouldExpand: false },
          { prompt: 'Handle data transformation', shouldExpand: false },
          { prompt: 'Handle data aggregation', shouldExpand: false }
        ];
      }
      return [];
    },
    interrupt: false
  }
};

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const orchestrator = new InfiniteOrchestrator();
  
  // Configure for testing
  orchestrator.config.maxConcurrent = 3;
  orchestrator.config.maxDepth = 3;
  orchestrator.config.maxWidth = 2;
  
  // Create a task
  const task = orchestrator.createTask(
    'Create a web scraper that extracts product information',
    expansionStrategies.iterativeRefinement
  );
  
  // Monitor progress
  const monitor = setInterval(() => {
    orchestrator.printStatus();
  }, 5000);
  
  // Handle completion
  orchestrator.on('taskComplete', (completedTask) => {
    console.log('\n=== Task Complete ===');
    console.log('Total nodes:', completedTask.nodes.size);
    console.log('Results:', completedTask.results.length);
    
    // Save results
    fs.writeFileSync(
      `./logs-infinite/task-${completedTask.id}-results.json`,
      JSON.stringify(completedTask.results, null, 2)
    );
    
    clearInterval(monitor);
    setTimeout(() => process.exit(0), 1000);
  });
  
  // Safety timeout
  setTimeout(() => {
    console.log('\n[TIMEOUT] Shutting down...');
    process.exit(0);
  }, 120000);
}