/**
 * Verbose Monitoring System
 *
 * Provides real-time visibility into all child processes with interactive control
 */
import { EventEmitter } from 'events';
import { EventBus } from '../core/event-bus.js';
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
export declare class VerboseMonitor extends EventEmitter {
    private tasks;
    private selectedTaskId;
    private verboseMode;
    private rl?;
    private isInteractive;
    private eventBus;
    private outputBuffer;
    private maxBufferLines;
    constructor(eventBus: EventBus, interactive?: boolean);
    /**
     * Handle incoming events from EventBus
     */
    private handleEvent;
    /**
     * Add a new task to monitor
     */
    private addTask;
    /**
     * Append output to a task
     */
    private appendOutput;
    /**
     * Update task status
     */
    private updateTaskStatus;
    /**
     * Check if output should be displayed
     */
    private shouldDisplay;
    /**
     * Format output line with task context
     */
    private formatOutput;
    /**
     * Display current task list
     */
    private displayTaskList;
    /**
     * Setup interactive command line
     */
    private setupInteractiveMode;
    /**
     * Handle interactive commands
     */
    private handleCommand;
    /**
     * Select a task for monitoring
     */
    private selectTask;
    /**
     * Inject instructions into selected task
     */
    private injectInstruction;
    /**
     * Pause selected task
     */
    private pauseTask;
    /**
     * Resume selected task
     */
    private resumeTask;
    /**
     * Abort selected task
     */
    private abortTask;
    /**
     * Set verbose mode
     */
    private setVerboseMode;
    /**
     * Show output history for selected task
     */
    private showHistory;
    /**
     * Cleanup resources
     */
    private cleanup;
    /**
     * Get task tree structure
     */
    getTaskTree(): string;
    /**
     * Export task logs
     */
    exportLogs(taskId?: string): string;
}
export declare function createVerboseMonitor(eventBus: EventBus): VerboseMonitor;
//# sourceMappingURL=verbose-monitor.d.ts.map