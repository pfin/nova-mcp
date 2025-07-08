import blessed from 'blessed';
import fs from 'fs';
import path from 'path';

// Real-time dashboard for Claude tree monitoring
class ClaudeTreeDashboard {
  constructor(logDir = './logs-tree') {
    this.logDir = logDir;
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Claude Tree Monitor'
    });
    
    this.nodes = new Map();
    this.events = [];
    this.selectedNode = null;
    
    this.setupUI();
    this.startMonitoring();
  }
  
  setupUI() {
    // Header
    this.header = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      content: '{center}Claude Tree Orchestration Monitor{/center}',
      tags: true,
      style: {
        fg: 'white',
        bg: 'blue',
        bold: true
      }
    });
    
    // Tree view
    this.treeView = blessed.box({
      label: ' Tree Structure ',
      top: 3,
      left: 0,
      width: '40%',
      height: '60%',
      border: {
        type: 'line'
      },
      scrollable: true,
      alwaysScroll: true,
      mouse: true,
      keys: true,
      vi: true,
      style: {
        border: {
          fg: 'cyan'
        }
      }
    });
    
    // Node details
    this.nodeDetails = blessed.box({
      label: ' Node Details ',
      top: 3,
      left: '40%',
      width: '60%',
      height: '60%',
      border: {
        type: 'line'
      },
      scrollable: true,
      mouse: true,
      style: {
        border: {
          fg: 'green'
        }
      }
    });
    
    // Event log
    this.eventLog = blessed.log({
      label: ' Event Stream ',
      top: '63%',
      left: 0,
      width: '70%',
      height: '34%',
      border: {
        type: 'line'
      },
      scrollable: true,
      alwaysScroll: true,
      mouse: true,
      style: {
        border: {
          fg: 'yellow'
        }
      }
    });
    
    // Metrics
    this.metrics = blessed.box({
      label: ' Metrics ',
      top: '63%',
      left: '70%',
      width: '30%',
      height: '34%',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'magenta'
        }
      }
    });
    
    // Status bar
    this.statusBar = blessed.box({
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      style: {
        fg: 'white',
        bg: 'black'
      }
    });
    
    // Add all to screen
    this.screen.append(this.header);
    this.screen.append(this.treeView);
    this.screen.append(this.nodeDetails);
    this.screen.append(this.eventLog);
    this.screen.append(this.metrics);
    this.screen.append(this.statusBar);
    
    // Keyboard controls
    this.screen.key(['escape', 'q', 'C-c'], () => {
      return process.exit(0);
    });
    
    this.screen.key(['up', 'down'], (ch, key) => {
      if (key.name === 'up') this.selectPreviousNode();
      if (key.name === 'down') this.selectNextNode();
    });
    
    this.screen.key('r', () => {
      this.refresh();
    });
    
    this.screen.render();
  }
  
  startMonitoring() {
    // Find latest log file
    this.findLatestLog();
    
    // Monitor for new events
    setInterval(() => {
      this.readNewEvents();
      this.updateUI();
    }, 500);
    
    // Update metrics
    setInterval(() => {
      this.updateMetrics();
    }, 1000);
  }
  
  findLatestLog() {
    try {
      const files = fs.readdirSync(this.logDir)
        .filter(f => f.startsWith('tree-') && f.endsWith('.jsonl'))
        .sort();
      
      if (files.length > 0) {
        this.currentLog = path.join(this.logDir, files[files.length - 1]);
        this.lastPosition = 0;
      }
    } catch (e) {
      // Log dir doesn't exist yet
    }
  }
  
  readNewEvents() {
    if (!this.currentLog) {
      this.findLatestLog();
      return;
    }
    
    try {
      const stats = fs.statSync(this.currentLog);
      if (stats.size > this.lastPosition) {
        const fd = fs.openSync(this.currentLog, 'r');
        const buffer = Buffer.alloc(stats.size - this.lastPosition);
        fs.readSync(fd, buffer, 0, buffer.length, this.lastPosition);
        fs.closeSync(fd);
        
        const newEvents = buffer.toString()
          .split('\n')
          .filter(line => line.trim())
          .map(line => JSON.parse(line));
        
        newEvents.forEach(event => {
          this.processEvent(event);
        });
        
        this.lastPosition = stats.size;
      }
    } catch (e) {
      // Handle errors silently
    }
  }
  
  processEvent(event) {
    // Update node map
    if (event.type === 'spawn') {
      this.nodes.set(event.nodeId, {
        id: event.nodeId,
        parentId: event.parentId,
        depth: event.depth,
        state: 'spawning',
        children: [],
        metrics: {},
        buffer: ''
      });
      
      // Link to parent
      if (event.parentId && this.nodes.has(event.parentId)) {
        this.nodes.get(event.parentId).children.push(event.nodeId);
      }
    }
    
    if (event.type === 'state_change' && this.nodes.has(event.nodeId)) {
      this.nodes.get(event.nodeId).state = event.newState;
    }
    
    if (event.type === 'output' && this.nodes.has(event.nodeId)) {
      this.nodes.get(event.nodeId).buffer += event.data;
    }
    
    if (event.type === 'metric' && this.nodes.has(event.nodeId)) {
      this.nodes.get(event.nodeId).metrics = event.metrics;
    }
    
    // Add to event log
    this.events.push(event);
    if (this.events.length > 1000) {
      this.events.shift(); // Keep last 1000
    }
    
    // Log interesting events
    const time = new Date(event.timestamp).toISOString().split('T')[1].split('.')[0];
    let logLine = `${time} [${event.type}] ${event.nodeId}`;
    
    if (event.message) {
      logLine += `: ${event.message}`;
    }
    
    // Color code by type
    const colors = {
      spawn: '{green-fg}',
      state_change: '{yellow-fg}',
      interrupt: '{red-fg}',
      steer: '{magenta-fg}',
      complete: '{green-fg}',
      error: '{red-fg}'
    };
    
    const color = colors[event.type] || '{white-fg}';
    this.eventLog.log(`${color}${logLine}{/}`);;
  }
  
  updateUI() {
    // Update tree view
    this.updateTreeView();
    
    // Update node details if selected
    if (this.selectedNode && this.nodes.has(this.selectedNode)) {
      this.updateNodeDetails(this.nodes.get(this.selectedNode));
    }
    
    // Update status
    const nodeCount = this.nodes.size;
    const activeCount = Array.from(this.nodes.values())
      .filter(n => ['typing', 'processing'].includes(n.state)).length;
    
    this.statusBar.setContent(
      ` Nodes: ${nodeCount} | Active: ${activeCount} | ` +
      `Events: ${this.events.length} | [Q]uit [R]efresh [↑↓]Navigate`
    );
    
    this.screen.render();
  }
  
  updateTreeView() {
    const lines = [];
    const root = Array.from(this.nodes.values()).find(n => !n.parentId);
    
    if (root) {
      this.buildTreeLines(root, lines, '', true);
    }
    
    this.treeView.setContent(lines.join('\n'));
  }
  
  buildTreeLines(node, lines, prefix, isLast) {
    const stateColors = {
      init: '{gray-fg}',
      spawning: '{yellow-fg}',
      ready: '{green-fg}',
      typing: '{blue-fg}',
      processing: '{magenta-fg}',
      interrupted: '{red-fg}',
      complete: '{green-fg}',
      error: '{red-fg}'
    };
    
    const color = stateColors[node.state] || '{white-fg}';
    const selected = node.id === this.selectedNode ? '{inverse}' : '';
    
    const connector = isLast ? '└─' : '├─';
    const line = `${prefix}${connector} ${selected}${color}${node.id} [${node.state}]{/}`;
    lines.push(line);
    
    const childPrefix = prefix + (isLast ? '   ' : '│  ');
    node.children.forEach((childId, i) => {
      if (this.nodes.has(childId)) {
        const child = this.nodes.get(childId);
        const isLastChild = i === node.children.length - 1;
        this.buildTreeLines(child, lines, childPrefix, isLastChild);
      }
    });
  }
  
  updateNodeDetails(node) {
    const details = [];
    details.push(`{bold}Node ID:{/bold} ${node.id}`);
    details.push(`{bold}State:{/bold} ${node.state}`);
    details.push(`{bold}Depth:{/bold} ${node.depth}`);
    details.push(`{bold}Children:{/bold} ${node.children.length}`);
    
    if (node.metrics.duration) {
      details.push(`\n{bold}Metrics:{/bold}`);
      details.push(`  Duration: ${(node.metrics.duration / 1000).toFixed(1)}s`);
      details.push(`  Characters typed: ${node.metrics.charactersTyped || 0}`);
      details.push(`  Interruptions: ${node.metrics.interruptions || 0}`);
      details.push(`  Output length: ${node.metrics.outputLength || 0}`);
    }
    
    if (node.buffer) {
      details.push(`\n{bold}Recent Output:{/bold}`);
      const recentOutput = node.buffer.slice(-500)
        .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI codes
        .split('\n')
        .slice(-10)
        .join('\n');
      details.push(recentOutput);
    }
    
    this.nodeDetails.setContent(details.join('\n'));
  }
  
  updateMetrics() {
    const metrics = {
      totalNodes: this.nodes.size,
      byState: {},
      byDepth: {},
      activeNodes: 0,
      completedNodes: 0,
      errorNodes: 0
    };
    
    for (const node of this.nodes.values()) {
      // By state
      metrics.byState[node.state] = (metrics.byState[node.state] || 0) + 1;
      
      // By depth
      metrics.byDepth[node.depth] = (metrics.byDepth[node.depth] || 0) + 1;
      
      // Counts
      if (['typing', 'processing'].includes(node.state)) metrics.activeNodes++;
      if (node.state === 'complete') metrics.completedNodes++;
      if (node.state === 'error') metrics.errorNodes++;
    }
    
    const lines = [];
    lines.push('{bold}Total Nodes:{/bold} ' + metrics.totalNodes);
    lines.push('');
    lines.push('{bold}By State:{/bold}');
    Object.entries(metrics.byState).forEach(([state, count]) => {
      lines.push(`  ${state}: ${count}`);
    });
    lines.push('');
    lines.push('{bold}By Depth:{/bold}');
    Object.entries(metrics.byDepth).forEach(([depth, count]) => {
      lines.push(`  Level ${depth}: ${count}`);
    });
    lines.push('');
    lines.push(`{green-fg}Active: ${metrics.activeNodes}{/}`);
    lines.push(`{green-fg}Completed: ${metrics.completedNodes}{/}`);
    lines.push(`{red-fg}Errors: ${metrics.errorNodes}{/}`);
    
    this.metrics.setContent(lines.join('\n'));
  }
  
  selectNextNode() {
    const nodeIds = Array.from(this.nodes.keys());
    if (nodeIds.length === 0) return;
    
    if (!this.selectedNode) {
      this.selectedNode = nodeIds[0];
    } else {
      const currentIndex = nodeIds.indexOf(this.selectedNode);
      if (currentIndex < nodeIds.length - 1) {
        this.selectedNode = nodeIds[currentIndex + 1];
      }
    }
    
    this.updateUI();
  }
  
  selectPreviousNode() {
    const nodeIds = Array.from(this.nodes.keys());
    if (nodeIds.length === 0) return;
    
    if (!this.selectedNode) {
      this.selectedNode = nodeIds[nodeIds.length - 1];
    } else {
      const currentIndex = nodeIds.indexOf(this.selectedNode);
      if (currentIndex > 0) {
        this.selectedNode = nodeIds[currentIndex - 1];
      }
    }
    
    this.updateUI();
  }
  
  refresh() {
    this.eventLog.log('{cyan-fg}Refreshing...{/}');
    this.lastPosition = 0;
    this.nodes.clear();
    this.events = [];
    this.selectedNode = null;
    this.updateUI();
  }
}

// Run dashboard
if (import.meta.url === `file://${process.argv[1]}`) {
  // Note: blessed might not be installed
  console.log('Dashboard requires: npm install blessed');
  console.log('For now, use claude-tree-visualizer.js instead');
  
  try {
    const dashboard = new ClaudeTreeDashboard();
  } catch (e) {
    console.log('Error:', e.message);
  }
}