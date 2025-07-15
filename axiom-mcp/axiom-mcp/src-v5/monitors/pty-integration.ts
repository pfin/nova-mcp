/**
 * Integration between ThoughtMonitor and PTY Executor
 * Shows how to wire the monitor into Axiom MCP's execution flow
 */

import * as pty from 'node-pty';
import { createThoughtMonitor, DetectedThought, ThoughtMonitor, ThoughtPattern } from './thought-monitor';

export interface MonitoredPtyOptions {
  onInterrupt?: (detection: DetectedThought) => void;
  onWarning?: (detection: DetectedThought) => void;
  onSuccess?: (detection: DetectedThought) => void;
  autoInterrupt?: boolean;
  customPatterns?: ThoughtPattern[];
}

export class MonitoredPtyExecutor {
  private monitor: ThoughtMonitor;
  private interruptCount: number = 0;
  private successCount: number = 0;
  private warningCount: number = 0;
  
  constructor(
    private pty: pty.IPty,
    private options: MonitoredPtyOptions = {}
  ) {
    this.monitor = createThoughtMonitor({
      debugMode: false,
      stallTimeout: 30000
    });
    
    this.setupMonitoring();
    this.addCustomPatterns();
  }
  
  private setupMonitoring(): void {
    // Wire PTY output to monitor
    this.pty.onData((data: string) => {
      // Feed each character to monitor
      for (const char of data) {
        this.monitor.processChar(char);
      }
    });
    
    // Handle interrupts
    this.monitor.on('interrupt-required', (detection: DetectedThought) => {
      this.interruptCount++;
      
      if (this.options.onInterrupt) {
        this.options.onInterrupt(detection);
      }
      
      if (this.options.autoInterrupt) {
        console.log(`[Monitor] Auto-interrupting due to: ${detection.pattern.description}`);
        this.sendInterrupt();
        
        // Send corrective message after a short delay
        setTimeout(() => {
          this.sendCorrectiveMessage(detection);
        }, 500);
      }
    });
    
    // Handle warnings
    this.monitor.on('warning', (detection: DetectedThought) => {
      this.warningCount++;
      
      if (this.options.onWarning) {
        this.options.onWarning(detection);
      }
    });
    
    // Handle successes
    this.monitor.on('pattern:success', (detection: DetectedThought) => {
      this.successCount++;
      
      if (this.options.onSuccess) {
        this.options.onSuccess(detection);
      }
    });
    
    // Log stalls
    this.monitor.on('pattern:stall', (detection: DetectedThought) => {
      console.error(`[Monitor] Process stalled: ${detection.pattern.description}`);
      
      if (this.options.autoInterrupt) {
        this.sendInterrupt();
        setTimeout(() => {
          this.pty.write('What specific file should we create next?\n');
        }, 500);
      }
    });
  }
  
  private addCustomPatterns(): void {
    if (this.options.customPatterns) {
      this.options.customPatterns.forEach(pattern => {
        this.monitor.addPattern(pattern);
      });
    }
  }
  
  private sendInterrupt(): void {
    // Send Ctrl+C to PTY
    this.pty.write('\x03');
  }
  
  private sendCorrectiveMessage(detection: DetectedThought): void {
    const messages: Record<string, string> = {
      'todo-violation': 'Stop writing TODOs. Implement the actual code now. No placeholders.',
      'research-loop': 'You have enough information. Stop researching and start implementing.',
      'planning': 'Stop planning. Start implementing actual code right now.',
      'stall': 'What specific file should we create next? Choose one and implement it.'
    };
    
    const message = messages[detection.pattern.type] || 'Focus on implementation, not planning.';
    this.pty.write(`\n${message}\n`);
  }
  
  /**
   * Send input to the PTY
   */
  public write(data: string): void {
    this.pty.write(data);
  }
  
  /**
   * Get monitoring statistics
   */
  public getStats(): {
    interrupts: number;
    warnings: number;
    successes: number;
    monitorStats: ReturnType<ThoughtMonitor['getStats']>;
  } {
    return {
      interrupts: this.interruptCount,
      warnings: this.warningCount,
      successes: this.successCount,
      monitorStats: this.monitor.getStats()
    };
  }
  
  /**
   * Clean up resources
   */
  public destroy(): void {
    this.monitor.destroy();
  }
}

/**
 * Factory function to create a monitored PTY process
 */
export function createMonitoredPty(
  command: string,
  args: string[],
  options: MonitoredPtyOptions = {}
): { executor: MonitoredPtyExecutor; pty: pty.IPty } {
  
  const ptyProcess = pty.spawn(command, args, {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.cwd(),
    env: process.env
  });
  
  const executor = new MonitoredPtyExecutor(ptyProcess, options);
  
  return { executor, pty: ptyProcess };
}

/**
 * Example: Monitor a Claude execution with auto-intervention
 */
export function monitorClaudeTask(prompt: string) {
  const { executor, pty } = createMonitoredPty('claude', ['--print', prompt], {
    autoInterrupt: true,
    onInterrupt: (detection) => {
      console.log(`\n🚨 Intervention: ${detection.pattern.type}`);
      console.log(`   Reason: ${detection.pattern.description}`);
      console.log(`   Matched: "${detection.matched}"`);
    },
    onSuccess: (detection) => {
      console.log(`\n✅ Progress: ${detection.pattern.description}`);
    },
    customPatterns: [
      {
        type: 'planning' as const,  // Use an existing type
        pattern: /\b(cannot|unable to|don't have access|can't)\b/i,
        description: 'Making excuses instead of trying',
        severity: 'warning' as const,
        action: 'warn' as const
      }
    ]
  });
  
  // Handle PTY exit
  pty.onExit(({ exitCode }: { exitCode: number }) => {
    const stats = executor.getStats();
    console.log(`\n=== Execution Summary ===`);
    console.log(`Exit code: ${exitCode}`);
    console.log(`Interventions: ${stats.interrupts}`);
    console.log(`Warnings: ${stats.warnings}`);
    console.log(`Successes: ${stats.successes}`);
    console.log(`Characters processed: ${stats.monitorStats.streamPosition}`);
    
    executor.destroy();
  });
  
  return { executor, pty };
}