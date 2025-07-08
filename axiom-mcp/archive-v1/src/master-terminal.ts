#!/usr/bin/env node

import { createInterface } from 'readline';
import { EventEmitter } from 'events';
import chalk from 'chalk';
import { streamManager } from './stream-manager.js';
import { ClaudeCodeSubprocessStreaming } from './claude-subprocess-streaming.js';
import { StatusManager } from './status-manager.js';
import { v4 as uuidv4 } from 'uuid';
import * as os from 'os';

// ANSI escape codes for terminal control
const ANSI = {
  clearLine: '\x1b[2K',
  cursorUp: '\x1b[1A',
  cursorDown: '\x1b[1B',
  cursorForward: '\x1b[1C',
  cursorBack: '\x1b[1D',
  saveCursor: '\x1b[s',
  restoreCursor: '\x1b[u',
  clearScreen: '\x1b[2J',
  home: '\x1b[H',
  hide: '\x1b[?25l',
  show: '\x1b[?25h'
};

interface Project {
  id: string;
  name: string;
  path: string;
  active: boolean;
  tasks: Map<string, any>;
}

interface Command {
  id: string;
  project: string;
  input: string;
  timestamp: Date;
  status: 'pending' | 'running' | 'complete' | 'error';
  output?: string;
}

export class MasterTerminal extends EventEmitter {
  private projects: Map<string, Project> = new Map();
  private activeProject?: string;
  private commands: Command[] = [];
  private rl: any;
  private streamArea: string[] = [];
  private maxStreamLines = 20;
  private inputPrompt = '> ';
  private isProcessing = false;
  private claudeStreaming: ClaudeCodeSubprocessStreaming;
  private statusManager: StatusManager;
  
  constructor() {
    super();
    this.claudeStreaming = new ClaudeCodeSubprocessStreaming({ timeout: 1800000 });
    this.statusManager = new StatusManager();
    
    // Set up terminal
    this.setupTerminal();
    
    // Set up stream listener
    this.setupStreamListener();
    
    // Start dashboard
    streamManager.createDashboardEndpoint(3456);
  }
  
  private setupTerminal() {
    // Create readline interface
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.green('axiom-master> ')
    });
    
    // Handle input
    this.rl.on('line', async (input: string) => {
      await this.handleCommand(input);
    });
    
    // Handle exit
    this.rl.on('close', () => {
      console.log('\nGoodbye!');
      process.exit(0);
    });
    
    // Clear screen and show welcome
    this.clearScreen();
    this.showWelcome();
    
    // Show initial prompt
    this.rl.prompt();
  }
  
  private setupStreamListener() {
    // Listen for all stream updates
    streamManager.on('update', (update) => {
      // Only show updates from active project or global updates
      if (!this.activeProject || update.source.includes(this.activeProject)) {
        this.updateStreamArea(update);
      }
    });
  }
  
  private clearScreen() {
    process.stdout.write(ANSI.clearScreen + ANSI.home);
  }
  
  private showWelcome() {
    console.log(chalk.cyan.bold(`
╔═══════════════════════════════════════════════════════════╗
║              AXIOM MCP MASTER TERMINAL v1.0               ║
║                                                           ║
║  Control all your Claude Code instances from one place    ║
║  Live streaming • Multi-project • Recursive control       ║
╚═══════════════════════════════════════════════════════════╝
    `));
    
    console.log(chalk.gray('\nCommands:'));
    console.log(chalk.white('  project <name> <path>  - Create/switch project'));
    console.log(chalk.white('  list                   - List all projects'));
    console.log(chalk.white('  status                 - Show current status'));
    console.log(chalk.white('  spawn <task>           - Spawn recursive task'));
    console.log(chalk.white('  stream on/off          - Toggle streaming display'));
    console.log(chalk.white('  clear                  - Clear screen'));
    console.log(chalk.white('  help                   - Show help'));
    console.log(chalk.white('  exit                   - Exit terminal'));
    console.log(chalk.gray('\n' + '─'.repeat(60) + '\n'));
  }
  
  private async handleCommand(input: string) {
    const trimmed = input.trim();
    if (!trimmed) {
      this.rl.prompt();
      return;
    }
    
    // Add to command history
    const command: Command = {
      id: uuidv4(),
      project: this.activeProject || 'global',
      input: trimmed,
      timestamp: new Date(),
      status: 'pending'
    };
    this.commands.push(command);
    
    // Parse command
    const [cmd, ...args] = trimmed.split(' ');
    
    try {
      command.status = 'running';
      
      switch (cmd.toLowerCase()) {
        case 'project':
          await this.handleProject(args);
          break;
          
        case 'list':
          this.listProjects();
          break;
          
        case 'status':
          await this.showStatus();
          break;
          
        case 'spawn':
          await this.spawnTask(args.join(' '));
          break;
          
        case 'stream':
          this.toggleStream(args[0]);
          break;
          
        case 'clear':
          this.clearScreen();
          this.showWelcome();
          break;
          
        case 'help':
          this.showHelp();
          break;
          
        case 'exit':
        case 'quit':
          this.rl.close();
          return;
          
        default:
          // Forward to active project's Claude instance
          if (this.activeProject) {
            await this.executeInProject(trimmed);
          } else {
            console.log(chalk.yellow('No active project. Use "project <name> <path>" first.'));
          }
      }
      
      command.status = 'complete';
    } catch (error) {
      command.status = 'error';
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
    }
    
    this.rl.prompt();
  }
  
  private async handleProject(args: string[]) {
    if (args.length < 1) {
      console.log(chalk.yellow('Usage: project <name> [path]'));
      return;
    }
    
    const [name, projectPath] = args;
    
    // Check if project exists
    let project = this.projects.get(name);
    
    if (!project && projectPath) {
      // Create new project
      project = {
        id: uuidv4(),
        name,
        path: projectPath,
        active: false,
        tasks: new Map()
      };
      this.projects.set(name, project);
      console.log(chalk.green(`✓ Created project: ${name}`));
    }
    
    if (project) {
      // Switch to project
      this.setActiveProject(name);
    } else {
      console.log(chalk.red(`Project not found: ${name}`));
    }
  }
  
  private setActiveProject(name: string) {
    // Deactivate all projects
    for (const project of this.projects.values()) {
      project.active = false;
    }
    
    // Activate selected project
    const project = this.projects.get(name);
    if (project) {
      project.active = true;
      this.activeProject = name;
      
      // Update prompt
      this.rl.setPrompt(chalk.green(`axiom-master[${name}]> `));
      
      console.log(chalk.cyan(`\n✓ Switched to project: ${name}`));
      console.log(chalk.gray(`  Path: ${project.path}`));
      console.log(chalk.gray(`  Tasks: ${project.tasks.size}\n`));
    }
  }
  
  private listProjects() {
    if (this.projects.size === 0) {
      console.log(chalk.gray('No projects created yet.'));
      return;
    }
    
    console.log(chalk.cyan('\nProjects:'));
    for (const [name, project] of this.projects) {
      const status = project.active ? chalk.green(' [ACTIVE]') : '';
      console.log(`  ${chalk.white(name)}${status} - ${chalk.gray(project.path)}`);
      console.log(`    Tasks: ${project.tasks.size}`);
    }
    console.log();
  }
  
  private async showStatus() {
    const stats = this.statusManager.getSystemStatus();
    const streamStats = streamManager.getStatistics();
    
    console.log(chalk.cyan('\nSystem Status:'));
    console.log(`  Total Tasks: ${stats.totalTasks}`);
    console.log(`  Running: ${chalk.yellow(stats.runningTasks)}`);
    console.log(`  Completed: ${chalk.green(stats.completedTasks)}`);
    console.log(`  Failed: ${chalk.red(stats.failedTasks)}`);
    
    console.log(chalk.cyan('\nStream Status:'));
    console.log(`  Active Channels: ${streamStats.activeChannels}`);
    console.log(`  Total Updates: ${streamStats.totalUpdates}`);
    console.log(`  Update Types: ${JSON.stringify(streamStats.updatesByType)}`);
    
    if (this.activeProject) {
      const project = this.projects.get(this.activeProject);
      console.log(chalk.cyan(`\nActive Project (${this.activeProject}):`));
      console.log(`  Path: ${project?.path}`);
      console.log(`  Tasks: ${project?.tasks.size}`);
    }
    
    console.log();
  }
  
  private async spawnTask(prompt: string) {
    if (!this.activeProject) {
      console.log(chalk.yellow('No active project. Select a project first.'));
      return;
    }
    
    const project = this.projects.get(this.activeProject);
    if (!project) return;
    
    console.log(chalk.cyan(`\nSpawning recursive task in ${this.activeProject}...`));
    
    const taskId = uuidv4();
    const rootTask = {
      id: taskId,
      prompt,
      status: 'running',
      created: new Date()
    };
    
    project.tasks.set(taskId, rootTask);
    
    // Execute with streaming
    try {
      const result = await this.claudeStreaming.execute(
        `You are managing a recursive research task. Break this down into subtasks and execute them:
        
${prompt}

Create 3-5 subtasks and execute each one. For complex subtasks, break them down further.`,
        taskId,
        {
          workingDirectory: project.path,
          streamToParent: true,
          taskPath: [this.activeProject]
        }
      );
      
      rootTask.status = 'complete';
      console.log(chalk.green(`\n✓ Task ${taskId.substring(0, 8)} completed`));
    } catch (error) {
      rootTask.status = 'error';
      console.error(chalk.red(`\n✗ Task ${taskId.substring(0, 8)} failed: ${error}`));
    }
  }
  
  private async executeInProject(command: string) {
    if (!this.activeProject) return;
    
    const project = this.projects.get(this.activeProject);
    if (!project) return;
    
    const taskId = uuidv4();
    console.log(chalk.gray(`\nExecuting in ${this.activeProject}...`));
    
    try {
      const result = await this.claudeStreaming.execute(
        command,
        taskId,
        {
          workingDirectory: project.path,
          streamToParent: true,
          taskPath: [this.activeProject]
        }
      );
      
      // Output is already streamed, just show completion
      console.log(chalk.green(`\n✓ Command completed`));
    } catch (error) {
      console.error(chalk.red(`\n✗ Command failed: ${error}`));
    }
  }
  
  private updateStreamArea(update: any) {
    // Format the update for display
    const timestamp = new Date(update.timestamp).toLocaleTimeString();
    const level = '  '.repeat(update.level);
    
    let line = '';
    switch (update.type) {
      case 'status':
        line = chalk.blue(`${timestamp} ${level}📊 ${update.data.status}`);
        break;
      case 'progress':
        line = chalk.yellow(`${timestamp} ${level}⏳ ${update.data.percent}%`);
        break;
      case 'output':
        line = chalk.gray(`${timestamp} ${level}📝 ${update.data.preview}`);
        break;
      case 'error':
        line = chalk.red(`${timestamp} ${level}❌ ${update.data.error}`);
        break;
      case 'complete':
        line = chalk.green(`${timestamp} ${level}✅ Complete (${update.data.duration}ms)`);
        break;
    }
    
    if (line) {
      // Add to stream area
      this.streamArea.push(line);
      if (this.streamArea.length > this.maxStreamLines) {
        this.streamArea.shift();
      }
      
      // Update display without blocking input
      this.updateDisplay();
    }
  }
  
  private updateDisplay() {
    // Save cursor position
    process.stdout.write(ANSI.saveCursor);
    
    // Move to stream area (above input line)
    const streamStartLine = process.stdout.rows - this.maxStreamLines - 2;
    process.stdout.write(`\x1b[${streamStartLine};0H`);
    
    // Clear and redraw stream area
    for (let i = 0; i < this.maxStreamLines; i++) {
      process.stdout.write(ANSI.clearLine);
      if (i < this.streamArea.length) {
        console.log(this.streamArea[i]);
      } else {
        console.log();
      }
    }
    
    // Restore cursor
    process.stdout.write(ANSI.restoreCursor);
  }
  
  private toggleStream(setting: string) {
    if (setting === 'off') {
      streamManager.removeAllListeners('update');
      console.log(chalk.yellow('Streaming disabled'));
    } else {
      this.setupStreamListener();
      console.log(chalk.green('Streaming enabled'));
    }
  }
  
  private showHelp() {
    console.log(chalk.cyan('\nAxiom MCP Master Terminal Commands:'));
    console.log(chalk.white('\nProject Management:'));
    console.log('  project <name> <path>  - Create new project or switch to existing');
    console.log('  list                   - List all projects');
    console.log('  status                 - Show system and project status');
    
    console.log(chalk.white('\nTask Execution:'));
    console.log('  spawn <description>    - Spawn recursive task in active project');
    console.log('  <any command>          - Execute command in active project');
    
    console.log(chalk.white('\nTerminal Control:'));
    console.log('  stream on/off          - Toggle live streaming display');
    console.log('  clear                  - Clear terminal screen');
    console.log('  help                   - Show this help');
    console.log('  exit/quit              - Exit terminal');
    
    console.log(chalk.gray('\nDashboard: http://localhost:3456'));
    console.log();
  }
}

// Start the master terminal
if (import.meta.url === `file://${process.argv[1]}`) {
  const terminal = new MasterTerminal();
}