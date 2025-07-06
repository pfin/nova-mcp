/**
 * Verbose Monitoring System
 * 
 * Provides real-time visibility into all child processes with interactive control
 */

import { EventEmitter } from 'events';
import * as readline from 'readline';
import chalk from 'chalk';
import { EventBus, EventType, LedgerEvent } from '../core/event-bus.js';

export interface MonitoredTask {
  id: string;
  title: string;
  workerId: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
  startTime: Date;
  output: string[];
  currentLine: string;
  parentId?: string;
  depth: number;
}

export interface InteractiveCommand {
  command: 'inject' | 'pause' | 'resume' | 'abort' | 'verbose' | 'filter';
  taskId?: string;
  payload?: string;
}

export class VerboseMonitor extends EventEmitter {
  private tasks: Map<string, MonitoredTask> = new Map();
  private selectedTaskId: string | null = null;
  private verboseMode: 'all' | 'selected' | 'errors' = 'selected';
  private rl?: readline.Interface;
  private isInteractive: boolean;
  private eventBus: EventBus;
  private outputBuffer: Map<string, string[]> = new Map();
  private maxBufferLines = 1000;
  
  constructor(eventBus: EventBus, interactive: boolean = true) {
    super();
    this.eventBus = eventBus;
    this.isInteractive = interactive;
    
    // Subscribe to all events
    this.eventBus.on('event', (event: LedgerEvent) => {
      this.handleEvent(event);
    });
    
    if (interactive) {
      this.setupInteractiveMode();
    }
  }
  
  /**
   * Handle incoming events from EventBus
   */
  private handleEvent(event: LedgerEvent) {
    switch (event.event) {
      case EventType.TASK_START:
        this.addTask(event.taskId, event.payload);
        break;
        
      case EventType.CLAUDE_STDOUT:
      case EventType.CLAUDE_STDERR:
        this.appendOutput(event.taskId, event.payload);
        break;
        
      case EventType.TASK_COMPLETE:
      case EventType.TASK_FAILED:
        this.updateTaskStatus(event.taskId, event.event === EventType.TASK_COMPLETE ? 'completed' : 'failed');
        break;
        
      case EventType.TOOL_CALL:
        const toolPayload = event.payload as any;
        this.appendOutput(event.taskId, `[TOOL] ${toolPayload.tool}: ${JSON.stringify(toolPayload.args)}`);
        break;
        
      case EventType.CODE_VIOLATION:
        const violationPayload = event.payload as any;
        this.appendOutput(event.taskId, chalk.red(`[VIOLATION] ${violationPayload.ruleName}: ${violationPayload.match}`));
        break;
        
      case EventType.INTERVENTION:
        this.appendOutput(event.taskId, chalk.yellow(`[INTERVENTION] ${event.payload}`));
        break;
    }
  }
  
  /**
   * Add a new task to monitor
   */
  private addTask(taskId: string, payload: any) {
    const task: MonitoredTask = {
      id: taskId,
      title: payload.title || payload.prompt?.substring(0, 50) || 'Untitled Task',
      workerId: payload.workerId || 'main',
      status: 'running',
      startTime: new Date(),
      output: [],
      currentLine: '',
      parentId: payload.parentId,
      depth: payload.depth || 0
    };
    
    this.tasks.set(taskId, task);
    this.outputBuffer.set(taskId, []);
    
    this.displayTaskList();
  }
  
  /**
   * Append output to a task
   */
  private appendOutput(taskId: string, data: any) {
    const task = this.tasks.get(taskId);
    if (!task) return;
    
    const text = typeof data === 'string' ? data : JSON.stringify(data);
    const lines = text.split('\n');
    
    // Handle partial lines
    if (task.currentLine) {
      lines[0] = task.currentLine + lines[0];
      task.currentLine = '';
    }
    
    // Last element might be partial
    if (!text.endsWith('\n') && lines.length > 0) {
      task.currentLine = lines.pop() || '';
    }
    
    // Add to output buffer
    const buffer = this.outputBuffer.get(taskId) || [];
    buffer.push(...lines);
    
    // Trim buffer if too large
    if (buffer.length > this.maxBufferLines) {
      buffer.splice(0, buffer.length - this.maxBufferLines);
    }
    
    // Display based on verbose mode
    if (this.shouldDisplay(taskId)) {
      lines.forEach(line => {
        if (line.trim()) {
          console.log(this.formatOutput(task, line));
        }
      });
    }
  }
  
  /**
   * Update task status
   */
  private updateTaskStatus(taskId: string, status: MonitoredTask['status']) {
    const task = this.tasks.get(taskId);
    if (!task) return;
    
    task.status = status;
    this.displayTaskList();
  }
  
  /**
   * Check if output should be displayed
   */
  private shouldDisplay(taskId: string): boolean {
    if (this.verboseMode === 'all') return true;
    if (this.verboseMode === 'selected' && taskId === this.selectedTaskId) return true;
    if (this.verboseMode === 'errors') {
      // Check if output contains errors
      const buffer = this.outputBuffer.get(taskId) || [];
      return buffer.some(line => /error|fail|violation|exception/i.test(line));
    }
    return false;
  }
  
  /**
   * Format output line with task context
   */
  private formatOutput(task: MonitoredTask, line: string): string {
    const prefix = `[${task.workerId}:${task.id.substring(0, 8)}]`;
    const indent = '  '.repeat(task.depth);
    
    // Color based on content
    if (/error|fail|exception/i.test(line)) {
      return chalk.red(`${prefix} ${indent}${line}`);
    } else if (/warning|violation/i.test(line)) {
      return chalk.yellow(`${prefix} ${indent}${line}`);
    } else if (/success|complete|pass/i.test(line)) {
      return chalk.green(`${prefix} ${indent}${line}`);
    } else if (/\[TOOL\]/.test(line)) {
      return chalk.cyan(`${prefix} ${indent}${line}`);
    }
    
    return chalk.gray(prefix) + ` ${indent}${line}`;
  }
  
  /**
   * Display current task list
   */
  private displayTaskList() {
    console.clear();
    console.log(chalk.bold('\n=== AXIOM MCP V3 - VERBOSE MONITOR ===\n'));
    
    // Group tasks by status
    const running = Array.from(this.tasks.values()).filter(t => t.status === 'running');
    const completed = Array.from(this.tasks.values()).filter(t => t.status === 'completed');
    const failed = Array.from(this.tasks.values()).filter(t => t.status === 'failed');
    
    console.log(chalk.cyan('Running Tasks:'));
    running.forEach(task => {
      const selected = task.id === this.selectedTaskId ? '▶' : ' ';
      const duration = Math.floor((Date.now() - task.startTime.getTime()) / 1000);
      console.log(`${selected} [${task.id.substring(0, 8)}] ${task.title} (${duration}s)`);
    });
    
    if (completed.length > 0) {
      console.log(chalk.green('\nCompleted Tasks:'));
      completed.forEach(task => {
        console.log(`  [${task.id.substring(0, 8)}] ${task.title}`);
      });
    }
    
    if (failed.length > 0) {
      console.log(chalk.red('\nFailed Tasks:'));
      failed.forEach(task => {
        console.log(`  [${task.id.substring(0, 8)}] ${task.title}`);
      });
    }
    
    console.log(chalk.gray(`\nVerbose Mode: ${this.verboseMode} | Selected: ${this.selectedTaskId?.substring(0, 8) || 'none'}`));
    console.log(chalk.gray('Commands: select <id> | inject <text> | pause | resume | abort | verbose <all|selected|errors> | quit\n'));
  }
  
  /**
   * Setup interactive command line
   */
  private setupInteractiveMode() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.blue('axiom> ')
    });
    
    this.rl.on('line', (input) => {
      this.handleCommand(input);
      this.rl?.prompt();
    });
    
    // Handle Ctrl+C
    this.rl.on('SIGINT', () => {
      console.log('\nExiting monitor...');
      this.cleanup();
      process.exit(0);
    });
    
    this.rl.prompt();
  }
  
  /**
   * Handle interactive commands
   */
  private handleCommand(input: string) {
    const parts = input.trim().split(' ');
    const command = parts[0];
    const args = parts.slice(1).join(' ');
    
    switch (command) {
      case 'select':
      case 's':
        this.selectTask(args);
        break;
        
      case 'inject':
      case 'i':
        this.injectInstruction(args);
        break;
        
      case 'pause':
      case 'p':
        this.pauseTask();
        break;
        
      case 'resume':
      case 'r':
        this.resumeTask();
        break;
        
      case 'abort':
      case 'a':
        this.abortTask();
        break;
        
      case 'verbose':
      case 'v':
        this.setVerboseMode(args as any);
        break;
        
      case 'history':
      case 'h':
        this.showHistory();
        break;
        
      case 'clear':
      case 'c':
        this.displayTaskList();
        break;
        
      case 'quit':
      case 'q':
        this.cleanup();
        process.exit(0);
        break;
        
      default:
        console.log(chalk.red(`Unknown command: ${command}`));
    }
  }
  
  /**
   * Select a task for monitoring
   */
  private selectTask(idPrefix: string) {
    if (!idPrefix) {
      this.selectedTaskId = null;
      console.log(chalk.yellow('Deselected all tasks'));
      return;
    }
    
    // Find task by ID prefix
    const task = Array.from(this.tasks.values()).find(t => 
      t.id.startsWith(idPrefix) || t.id.substring(0, 8) === idPrefix
    );
    
    if (task) {
      this.selectedTaskId = task.id;
      console.log(chalk.green(`Selected task: ${task.title}`));
      
      // Show recent output
      const buffer = this.outputBuffer.get(task.id) || [];
      const recent = buffer.slice(-20);
      if (recent.length > 0) {
        console.log(chalk.gray('\n--- Recent output ---'));
        recent.forEach(line => console.log(this.formatOutput(task, line)));
        console.log(chalk.gray('--- End of output ---\n'));
      }
    } else {
      console.log(chalk.red(`Task not found: ${idPrefix}`));
    }
  }
  
  /**
   * Inject instructions into selected task
   */
  private injectInstruction(instruction: string) {
    if (!this.selectedTaskId) {
      console.log(chalk.red('No task selected. Use "select <id>" first.'));
      return;
    }
    
    const task = this.tasks.get(this.selectedTaskId);
    if (!task || task.status !== 'running') {
      console.log(chalk.red('Selected task is not running.'));
      return;
    }
    
    // Emit injection event
    this.emit('inject', {
      taskId: this.selectedTaskId,
      instruction: instruction,
      timestamp: new Date()
    });
    
    // Log the injection
    this.appendOutput(this.selectedTaskId, chalk.magenta(`[USER INJECTION] ${instruction}`));
    console.log(chalk.green(`Injected instruction into task ${task.id.substring(0, 8)}`));
  }
  
  /**
   * Pause selected task
   */
  private pauseTask() {
    if (!this.selectedTaskId) {
      console.log(chalk.red('No task selected.'));
      return;
    }
    
    this.emit('pause', { taskId: this.selectedTaskId });
    console.log(chalk.yellow(`Paused task ${this.selectedTaskId.substring(0, 8)}`));
  }
  
  /**
   * Resume selected task
   */
  private resumeTask() {
    if (!this.selectedTaskId) {
      console.log(chalk.red('No task selected.'));
      return;
    }
    
    this.emit('resume', { taskId: this.selectedTaskId });
    console.log(chalk.green(`Resumed task ${this.selectedTaskId.substring(0, 8)}`));
  }
  
  /**
   * Abort selected task
   */
  private abortTask() {
    if (!this.selectedTaskId) {
      console.log(chalk.red('No task selected.'));
      return;
    }
    
    this.emit('abort', { taskId: this.selectedTaskId });
    console.log(chalk.red(`Aborted task ${this.selectedTaskId.substring(0, 8)}`));
  }
  
  /**
   * Set verbose mode
   */
  private setVerboseMode(mode: 'all' | 'selected' | 'errors') {
    if (!['all', 'selected', 'errors'].includes(mode)) {
      console.log(chalk.red('Invalid mode. Use: all, selected, or errors'));
      return;
    }
    
    this.verboseMode = mode;
    console.log(chalk.green(`Verbose mode set to: ${mode}`));
    this.displayTaskList();
  }
  
  /**
   * Show output history for selected task
   */
  private showHistory() {
    if (!this.selectedTaskId) {
      console.log(chalk.red('No task selected.'));
      return;
    }
    
    const task = this.tasks.get(this.selectedTaskId);
    if (!task) return;
    
    const buffer = this.outputBuffer.get(this.selectedTaskId) || [];
    console.log(chalk.cyan(`\n=== Output history for ${task.title} ===`));
    buffer.forEach(line => console.log(this.formatOutput(task, line)));
    console.log(chalk.cyan('=== End of history ===\n'));
  }
  
  /**
   * Cleanup resources
   */
  private cleanup() {
    this.rl?.close();
    this.removeAllListeners();
  }
  
  /**
   * Get task tree structure
   */
  getTaskTree(): string {
    const rootTasks = Array.from(this.tasks.values()).filter(t => !t.parentId);
    let tree = '';
    
    const buildTree = (task: MonitoredTask, indent: string = '') => {
      const status = task.status === 'running' ? '🟡' : 
                    task.status === 'completed' ? '🟢' : '🔴';
      tree += `${indent}${status} ${task.title} [${task.id.substring(0, 8)}]\n`;
      
      // Find children
      const children = Array.from(this.tasks.values()).filter(t => t.parentId === task.id);
      children.forEach((child, index) => {
        const isLast = index === children.length - 1;
        buildTree(child, indent + (isLast ? '  ' : '│ '));
      });
    };
    
    rootTasks.forEach(task => buildTree(task));
    return tree;
  }
  
  /**
   * Export task logs
   */
  exportLogs(taskId?: string): string {
    if (taskId) {
      const buffer = this.outputBuffer.get(taskId) || [];
      return buffer.join('\n');
    }
    
    // Export all logs
    let allLogs = '';
    for (const [id, buffer] of this.outputBuffer.entries()) {
      const task = this.tasks.get(id);
      if (task) {
        allLogs += `\n=== ${task.title} [${id}] ===\n`;
        allLogs += buffer.join('\n');
        allLogs += '\n';
      }
    }
    
    return allLogs;
  }
}

// Export for use in PTY executor and other components
export function createVerboseMonitor(eventBus: EventBus): VerboseMonitor {
  return new VerboseMonitor(eventBus);
}