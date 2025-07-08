import fs from 'fs';
import { spawn } from 'child_process';

// Tree Visualizer for Claude instances
class ClaudeTreeVisualizer {
  constructor(logFile) {
    this.logFile = logFile;
    this.events = [];
    this.nodes = new Map();
    this.stateColors = {
      init: '#gray',
      spawning: '#yellow',
      theme_setup: '#orange',
      ready: '#green',
      typing: '#blue',
      processing: '#purple',
      interrupted: '#red',
      complete: '#darkgreen',
      error: '#darkred'
    };
  }
  
  loadEvents() {
    const content = fs.readFileSync(this.logFile, 'utf-8');
    this.events = content.split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));
    
    // Build node structure
    this.events.forEach(event => {
      if (event.type === 'spawn') {
        this.nodes.set(event.nodeId, {
          id: event.nodeId,
          parentId: event.parentId,
          depth: event.depth,
          state: 'init',
          children: [],
          metrics: {}
        });
        
        // Link to parent
        if (event.parentId && this.nodes.has(event.parentId)) {
          this.nodes.get(event.parentId).children.push(event.nodeId);
        }
      }
      
      if (event.type === 'state_change') {
        if (this.nodes.has(event.nodeId)) {
          this.nodes.get(event.nodeId).state = event.newState;
        }
      }
      
      if (event.type === 'metric') {
        if (this.nodes.has(event.nodeId)) {
          this.nodes.get(event.nodeId).metrics = event.metrics;
        }
      }
    });
  }
  
  generateDotFile() {
    let dot = 'digraph ClaudeTree {\n';
    dot += '  rankdir=TB;\n';
    dot += '  node [shape=box, style=filled];\n\n';
    
    // Add nodes
    for (const [id, node] of this.nodes) {
      const color = this.stateColors[node.state] || '#white';
      const label = `${id}\n${node.state}\n`;
      const metrics = node.metrics.duration ? 
        `${(node.metrics.duration/1000).toFixed(1)}s` : '';
      
      dot += `  "${id}" [label="${label}${metrics}", fillcolor="${color}"];\n`;
    }
    
    dot += '\n';
    
    // Add edges
    for (const [id, node] of this.nodes) {
      if (node.parentId) {
        dot += `  "${node.parentId}" -> "${id}";\n`;
      }
    }
    
    dot += '}\n';
    return dot;
  }
  
  generateTimeline() {
    console.log('\n=== Event Timeline ===\n');
    
    let lastTime = null;
    this.events.slice(-50).forEach(event => { // Last 50 events
      const time = new Date(event.timestamp);
      const delta = lastTime ? (time - lastTime) / 1000 : 0;
      lastTime = time;
      
      const timeStr = time.toISOString().split('T')[1].split('.')[0];
      const deltaStr = delta > 0 ? `+${delta.toFixed(2)}s` : '';
      
      console.log(`${timeStr} ${deltaStr.padStart(8)} [${event.type.padEnd(12)}] ${event.nodeId} - ${event.message || ''}`);
    });
  }
  
  generateStats() {
    console.log('\n=== Tree Statistics ===\n');
    
    const stats = {
      totalNodes: this.nodes.size,
      byState: {},
      byDepth: {},
      avgMetrics: {
        duration: 0,
        interruptions: 0,
        steeringAttempts: 0
      }
    };
    
    let metricsCount = 0;
    
    for (const [id, node] of this.nodes) {
      // By state
      stats.byState[node.state] = (stats.byState[node.state] || 0) + 1;
      
      // By depth
      stats.byDepth[node.depth] = (stats.byDepth[node.depth] || 0) + 1;
      
      // Metrics
      if (node.metrics.duration) {
        stats.avgMetrics.duration += node.metrics.duration;
        stats.avgMetrics.interruptions += node.metrics.interruptions || 0;
        stats.avgMetrics.steeringAttempts += node.metrics.steeringAttempts || 0;
        metricsCount++;
      }
    }
    
    // Average metrics
    if (metricsCount > 0) {
      stats.avgMetrics.duration /= metricsCount;
      stats.avgMetrics.interruptions /= metricsCount;
      stats.avgMetrics.steeringAttempts /= metricsCount;
    }
    
    console.log('Total Nodes:', stats.totalNodes);
    console.log('\nNodes by State:');
    Object.entries(stats.byState).forEach(([state, count]) => {
      console.log(`  ${state}: ${count}`);
    });
    
    console.log('\nNodes by Depth:');
    Object.entries(stats.byDepth).forEach(([depth, count]) => {
      console.log(`  Level ${depth}: ${count} nodes`);
    });
    
    console.log('\nAverage Metrics:');
    console.log(`  Duration: ${(stats.avgMetrics.duration/1000).toFixed(1)}s`);
    console.log(`  Interruptions: ${stats.avgMetrics.interruptions.toFixed(1)}`);
    console.log(`  Steering Attempts: ${stats.avgMetrics.steeringAttempts.toFixed(1)}`);
  }
  
  visualize() {
    this.loadEvents();
    
    // Generate dot file
    const dotFile = this.logFile.replace('.jsonl', '.dot');
    const dotContent = this.generateDotFile();
    fs.writeFileSync(dotFile, dotContent);
    console.log(`\nGenerated: ${dotFile}`);
    
    // Try to generate PNG
    const pngFile = this.logFile.replace('.jsonl', '.png');
    try {
      spawn('dot', ['-Tpng', dotFile, '-o', pngFile]);
      console.log(`Generated: ${pngFile} (if graphviz is installed)`);
    } catch (e) {
      console.log('Install graphviz to generate PNG: sudo apt-get install graphviz');
    }
    
    // Show stats
    this.generateStats();
    
    // Show timeline
    this.generateTimeline();
  }
}

// Real-time monitor
class ClaudeTreeMonitor {
  constructor(logFile) {
    this.logFile = logFile;
    this.lastSize = 0;
  }
  
  start() {
    console.log('\n=== Real-time Tree Monitor ===');
    console.log(`Watching: ${this.logFile}\n`);
    
    // Check for new events every second
    setInterval(() => {
      this.checkNewEvents();
    }, 1000);
  }
  
  checkNewEvents() {
    try {
      const stats = fs.statSync(this.logFile);
      if (stats.size > this.lastSize) {
        // Read new content
        const fd = fs.openSync(this.logFile, 'r');
        const buffer = Buffer.alloc(stats.size - this.lastSize);
        fs.readSync(fd, buffer, 0, buffer.length, this.lastSize);
        fs.closeSync(fd);
        
        // Parse new events
        const newEvents = buffer.toString()
          .split('\n')
          .filter(line => line.trim())
          .map(line => JSON.parse(line));
        
        // Display interesting events
        newEvents.forEach(event => {
          if (event.type === 'state_change') {
            console.log(`[STATE] ${event.nodeId}: ${event.oldState} → ${event.newState}`);
          } else if (event.type === 'interrupt') {
            console.log(`[INTERRUPT] ${event.nodeId}: ${event.message}`);
          } else if (event.type === 'steer') {
            console.log(`[STEER] ${event.nodeId}: ${event.message}`);
          } else if (event.type === 'spawn') {
            console.log(`[SPAWN] ${event.nodeId} (depth: ${event.depth})`);
          }
        });
        
        this.lastSize = stats.size;
      }
    } catch (e) {
      // File might not exist yet
    }
  }
}

// Usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2] || 'visualize';
  const logFile = process.argv[3] || './logs-tree/tree-*.jsonl';
  
  if (mode === 'monitor') {
    // Real-time monitoring
    const monitor = new ClaudeTreeMonitor(logFile);
    monitor.start();
  } else {
    // Visualization
    const actualFile = logFile.includes('*') ? 
      fs.readdirSync('./logs-tree')
        .filter(f => f.startsWith('tree-') && f.endsWith('.jsonl'))
        .sort()
        .pop() : logFile;
    
    if (actualFile) {
      const visualizer = new ClaudeTreeVisualizer(`./logs-tree/${actualFile}`);
      visualizer.visualize();
    } else {
      console.log('No log files found. Run claude-tree-controller.js first.');
    }
  }
}