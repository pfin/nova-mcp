/**
 * Monitoring Dashboard Hook
 * Provides real-time metrics and visualization
 */

import { Hook, HookContext, HookResult, HookEvent } from '../core/hook-orchestrator.js';
import { Logger } from '../core/logger.js';

const logger = Logger.getInstance();

interface TaskMetrics {
  taskId: string;
  startTime: number;
  lastUpdate: number;
  status: string;
  metrics: {
    charsProcessed: number;
    linesProcessed: number;
    patternsDetected: Map<string, number>;
    executionSpeed: number; // chars/second
    interventions: number;
    errors: number;
    filesCreated: number;
    currentLanguage?: string;
  };
  timeline: Array<{
    timestamp: number;
    event: string;
    data?: any;
  }>;
}

const activeTasks = new Map<string, TaskMetrics>();
let dashboardInterval: NodeJS.Timeout | null = null;

export const monitoringDashboardHook: Hook = {
  name: 'monitoring-dashboard-hook',
  events: [
    HookEvent.REQUEST_RECEIVED,
    HookEvent.EXECUTION_STARTED,
    HookEvent.EXECUTION_STREAM,
    HookEvent.EXECUTION_INTERVENTION,
    HookEvent.EXECUTION_COMPLETED,
    HookEvent.EXECUTION_FAILED
  ],
  priority: 50, // Medium priority - observing, not modifying
  
  handler: async (context: HookContext): Promise<HookResult> => {
    const { event, execution, stream, request } = context;
    const taskId = execution?.taskId || context.metadata?.taskId || 'unknown';
    
    switch (event) {
      case HookEvent.REQUEST_RECEIVED:
        initializeTask(taskId, context);
        break;
        
      case HookEvent.EXECUTION_STARTED:
        startMonitoring(taskId);
        break;
        
      case HookEvent.EXECUTION_STREAM:
        updateMetrics(taskId, stream?.data || '');
        break;
        
      case HookEvent.EXECUTION_INTERVENTION:
        recordIntervention(taskId, context);
        break;
        
      case HookEvent.EXECUTION_COMPLETED:
      case HookEvent.EXECUTION_FAILED:
        finalizeTask(taskId, event === HookEvent.EXECUTION_COMPLETED ? 'completed' : 'failed');
        break;
    }
    
    return { action: 'continue' };
  }
};

function initializeTask(taskId: string, context: HookContext): void {
  const task: TaskMetrics = {
    taskId,
    startTime: Date.now(),
    lastUpdate: Date.now(),
    status: 'initialized',
    metrics: {
      charsProcessed: 0,
      linesProcessed: 0,
      patternsDetected: new Map(),
      executionSpeed: 0,
      interventions: 0,
      errors: 0,
      filesCreated: 0
    },
    timeline: [{
      timestamp: Date.now(),
      event: 'request_received',
      data: { prompt: typeof (context.request?.args?.prompt || context.request?.args?.parentPrompt) === 'string' 
        ? (context.request?.args?.prompt || context.request?.args?.parentPrompt)?.slice(0, 100) 
        : String(context.request?.args?.prompt || context.request?.args?.parentPrompt) }
    }]
  };
  
  activeTasks.set(taskId, task);
  logger.info('MonitoringDashboard', 'initializeTask', 'Task initialized', { taskId });
}

function startMonitoring(taskId: string): void {
  const task = activeTasks.get(taskId);
  if (!task) return;
  
  task.status = 'running';
  task.timeline.push({
    timestamp: Date.now(),
    event: 'execution_started'
  });
  
  // Start dashboard refresh if not already running
  if (!dashboardInterval && activeTasks.size > 0) {
    dashboardInterval = setInterval(renderDashboard, 1000);
  }
}

function updateMetrics(taskId: string, data: string): void {
  const task = activeTasks.get(taskId);
  if (!task) return;
  
  const now = Date.now();
  const timeDelta = (now - task.lastUpdate) / 1000; // seconds
  
  // Update basic metrics
  task.metrics.charsProcessed += data.length;
  task.metrics.linesProcessed += (data.match(/\n/g) || []).length;
  
  // Calculate execution speed
  if (timeDelta > 0) {
    task.metrics.executionSpeed = data.length / timeDelta;
  }
  
  // Detect patterns
  if (/error|exception|failed/i.test(data)) {
    task.metrics.errors++;
    updatePattern(task, 'ERROR');
  }
  
  if (/created?\s+\w+\.(ts|js|py|java)/i.test(data)) {
    task.metrics.filesCreated++;
    updatePattern(task, 'FILE_CREATED');
  }
  
  if (/def\s+\w+|import\s+\w+|class\s+\w+/.test(data)) {
    task.metrics.currentLanguage = 'Python';
    updatePattern(task, 'PYTHON_CODE');
  }
  
  if (/public\s+class|System\.out\.println|import\s+java/.test(data)) {
    task.metrics.currentLanguage = 'Java';
    updatePattern(task, 'JAVA_CODE');
  }
  
  task.lastUpdate = now;
}

function recordIntervention(taskId: string, context: HookContext): void {
  const task = activeTasks.get(taskId);
  if (!task) return;
  
  task.metrics.interventions++;
  task.timeline.push({
    timestamp: Date.now(),
    event: 'intervention',
    data: context.metadata
  });
  
  logger.warn('MonitoringDashboard', 'recordIntervention', 'Intervention recorded', {
    taskId,
    interventionCount: task.metrics.interventions
  });
}

function finalizeTask(taskId: string, status: string): void {
  const task = activeTasks.get(taskId);
  if (!task) return;
  
  task.status = status;
  task.timeline.push({
    timestamp: Date.now(),
    event: `execution_${status}`
  });
  
  // Log final metrics
  const duration = Date.now() - task.startTime;
  logger.info('MonitoringDashboard', 'finalizeTask', 'Task completed', {
    taskId,
    status,
    duration,
    metrics: Object.fromEntries(
      Object.entries(task.metrics).map(([k, v]) => 
        [k, v instanceof Map ? Object.fromEntries(v) : v]
      )
    )
  });
  
  // Keep task for 60 seconds for review
  setTimeout(() => {
    activeTasks.delete(taskId);
    
    // Stop dashboard if no active tasks
    if (activeTasks.size === 0 && dashboardInterval) {
      clearInterval(dashboardInterval);
      dashboardInterval = null;
    }
  }, 60000);
}

function updatePattern(task: TaskMetrics, pattern: string): void {
  const count = task.metrics.patternsDetected.get(pattern) || 0;
  task.metrics.patternsDetected.set(pattern, count + 1);
}

function renderDashboard(): void {
  if (activeTasks.size === 0) return;
  
  // Clear screen and move cursor to top
  console.error('\x1b[2J\x1b[H');
  
  // Header
  console.error('═'.repeat(100));
  console.error(centerText('AXIOM V4 MONITORING DASHBOARD', 100));
  console.error('═'.repeat(100));
  console.error(`Time: ${new Date().toISOString()} | Active Tasks: ${activeTasks.size}`);
  console.error('═'.repeat(100));
  
  // Task panels
  for (const [taskId, task] of activeTasks) {
    renderTaskPanel(task);
  }
  
  // Footer
  console.error('═'.repeat(100));
  console.error('Press Ctrl+C to exit | Dashboard refreshes every 1s');
}

function renderTaskPanel(task: TaskMetrics): void {
  const duration = (Date.now() - task.startTime) / 1000;
  const status = getStatusIcon(task.status);
  
  console.error('\n┌' + '─'.repeat(98) + '┐');
  console.error(`│ Task: ${task.taskId.slice(-8)} ${status} | Duration: ${duration.toFixed(1)}s | Speed: ${task.metrics.executionSpeed.toFixed(0)} chars/s`.padEnd(98) + '│');
  console.error('├' + '─'.repeat(98) + '┤');
  
  // Metrics row 1
  console.error(`│ Chars: ${formatNumber(task.metrics.charsProcessed)} | Lines: ${formatNumber(task.metrics.linesProcessed)} | Files: ${task.metrics.filesCreated} | Errors: ${task.metrics.errors} | Interventions: ${task.metrics.interventions}`.padEnd(98) + '│');
  
  // Language detection
  if (task.metrics.currentLanguage) {
    console.error(`│ Language: ${task.metrics.currentLanguage}`.padEnd(98) + '│');
  }
  
  // Pattern detection
  if (task.metrics.patternsDetected.size > 0) {
    const patterns = Array.from(task.metrics.patternsDetected.entries())
      .map(([p, c]) => `${p}:${c}`)
      .join(' | ');
    console.error(`│ Patterns: ${patterns}`.padEnd(98) + '│');
  }
  
  // Recent timeline events
  const recentEvents = task.timeline.slice(-3);
  if (recentEvents.length > 0) {
    console.error('├' + '─'.repeat(98) + '┤');
    console.error('│ Recent Events:'.padEnd(98) + '│');
    for (const event of recentEvents) {
      const time = new Date(event.timestamp).toLocaleTimeString();
      console.error(`│   ${time} - ${event.event}`.padEnd(98) + '│');
    }
  }
  
  console.error('└' + '─'.repeat(98) + '┘');
}

function getStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    initialized: '🔵',
    running: '🟢',
    completed: '✅',
    failed: '❌'
  };
  return icons[status] || '⚪';
}

function formatNumber(num: number): string {
  if (num > 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num > 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function centerText(text: string, width: number): string {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

// Export function to get current metrics
export function getCurrentMetrics(): Record<string, any> {
  const metrics: Record<string, any> = {
    activeTasks: activeTasks.size,
    tasks: []
  };
  
  for (const [taskId, task] of activeTasks) {
    metrics.tasks.push({
      taskId,
      status: task.status,
      duration: Date.now() - task.startTime,
      metrics: Object.fromEntries(
        Object.entries(task.metrics).map(([k, v]) => 
          [k, v instanceof Map ? Object.fromEntries(v) : v]
        )
      )
    });
  }
  
  return metrics;
}

export default monitoringDashboardHook;