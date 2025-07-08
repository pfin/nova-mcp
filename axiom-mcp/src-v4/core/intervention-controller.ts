/**
 * Intervention Controller - Orchestrates responses to pattern detection
 * 
 * This controller receives pattern match events and decides what actions
 * to take, including interrupting Claude instances or tracking progress.
 */

import { EventEmitter } from 'events';
import { PatternScanner, PatternMatch, ACTIONS } from './pattern-scanner.js';
import { logDebug } from './simple-logger.js';

export interface InterventionEvent {
  taskId: string;
  instanceId?: string;
  match: PatternMatch;
  action: string;
  timestamp: number;
  handled: boolean;
}

export interface InterventionStats {
  totalInterventions: number;
  interventionsByAction: Map<string, number>;
  successfulInterventions: number;
  failedInterventions: number;
  averageResponseTime: number;
}

export class InterventionController extends EventEmitter {
  private scanner: PatternScanner;
  private activeInterventions: Map<string, InterventionEvent[]> = new Map();
  private stats: InterventionStats = {
    totalInterventions: 0,
    interventionsByAction: new Map(),
    successfulInterventions: 0,
    failedInterventions: 0,
    averageResponseTime: 0
  };
  private responseTimings: number[] = [];

  constructor() {
    super();
    this.scanner = new PatternScanner();
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Listen for all pattern matches
    this.scanner.on('pattern-match', (match: PatternMatch) => {
      this.handlePatternMatch(match);
    });

    // Set up specific action handlers
    for (const actionName of Object.keys(ACTIONS)) {
      this.scanner.on(actionName, (match: PatternMatch) => {
        this.handleSpecificAction(actionName, match);
      });
    }
  }

  // Process output from a task/instance
  processOutput(taskId: string, output: string, instanceId?: string) {
    logDebug('INTERVENTION', `Processing output for ${taskId}: ${output.slice(0, 100)}...`);
    
    // Scan for patterns
    const matches = this.scanner.scan(output);
    
    // Track interventions for this task
    if (!this.activeInterventions.has(taskId)) {
      this.activeInterventions.set(taskId, []);
    }

    // Process each match
    for (const match of matches) {
      const intervention: InterventionEvent = {
        taskId,
        instanceId,
        match,
        action: match.action,
        timestamp: Date.now(),
        handled: false
      };

      this.activeInterventions.get(taskId)!.push(intervention);
      
      // Emit intervention event
      this.emit('intervention', intervention);
    }

    return matches;
  }

  private handlePatternMatch(match: PatternMatch) {
    logDebug('INTERVENTION', `Pattern matched: ${match.ruleId} - ${match.action}`);
    
    // Update stats
    this.stats.totalInterventions++;
    const count = this.stats.interventionsByAction.get(match.action) || 0;
    this.stats.interventionsByAction.set(match.action, count + 1);
  }

  private handleSpecificAction(actionName: string, match: PatternMatch) {
    const actionDef = ACTIONS[actionName as keyof typeof ACTIONS] as any;
    if (!actionDef) return;

    logDebug('INTERVENTION', `Handling action: ${actionName}`, actionDef);

    if (actionDef.interrupt) {
      this.emit('interrupt-required', {
        action: actionName,
        match,
        message: actionDef.message,
        severity: actionDef.severity
      });
    }

    if (actionDef.track) {
      this.emit('track-progress', {
        action: actionName,
        match,
        severity: actionDef.severity
      });
    }

    if (actionDef.verify) {
      this.emit('verify-claim', {
        action: actionName,
        match,
        severity: actionDef.severity
      });
    }

    if (actionDef.analyze) {
      this.emit('analyze-output', {
        action: actionName,
        match,
        severity: actionDef.severity
      });
    }
  }

  // Mark an intervention as handled
  markHandled(taskId: string, action: string, success: boolean = true) {
    const interventions = this.activeInterventions.get(taskId);
    if (!interventions) return;

    const intervention = interventions.find(i => i.action === action && !i.handled);
    if (intervention) {
      intervention.handled = true;
      const responseTime = Date.now() - intervention.timestamp;
      this.responseTimings.push(responseTime);
      
      if (success) {
        this.stats.successfulInterventions++;
      } else {
        this.stats.failedInterventions++;
      }

      // Update average response time
      this.stats.averageResponseTime = 
        this.responseTimings.reduce((a, b) => a + b, 0) / this.responseTimings.length;

      logDebug('INTERVENTION', `Marked ${action} as ${success ? 'successful' : 'failed'} (${responseTime}ms)`);
    }
  }

  // Get intervention history for a task
  getTaskHistory(taskId: string): InterventionEvent[] {
    return this.activeInterventions.get(taskId) || [];
  }

  // Get overall statistics
  getStats(): InterventionStats {
    return { ...this.stats };
  }

  // Clear history for a task
  clearTask(taskId: string) {
    this.activeInterventions.delete(taskId);
  }

  // Reset all data
  reset() {
    this.activeInterventions.clear();
    this.stats = {
      totalInterventions: 0,
      interventionsByAction: new Map(),
      successfulInterventions: 0,
      failedInterventions: 0,
      averageResponseTime: 0
    };
    this.responseTimings = [];
    this.scanner.reset();
  }

  // Add custom pattern
  addPattern(pattern: Parameters<PatternScanner['addPattern']>[0]) {
    this.scanner.addPattern(pattern);
  }

  // Start/stop periodic scanning
  startScanning(interval?: number) {
    this.scanner.startPeriodicScan(interval);
  }

  stopScanning() {
    this.scanner.stopPeriodicScan();
  }

  // Get a summary report
  getSummaryReport() {
    const topActions = Array.from(this.stats.interventionsByAction.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      totalInterventions: this.stats.totalInterventions,
      successRate: this.stats.totalInterventions > 0 
        ? (this.stats.successfulInterventions / this.stats.totalInterventions * 100).toFixed(2) + '%'
        : '0%',
      averageResponseTime: Math.round(this.stats.averageResponseTime) + 'ms',
      topActions,
      activeTasks: this.activeInterventions.size,
      scannerStats: this.scanner.getStats()
    };
  }
}

// Factory function to create configured controller
export function createInterventionController(): InterventionController {
  const controller = new InterventionController();
  
  // Add any custom patterns here
  controller.addPattern({
    id: 'infinite-loop-detection',
    pattern: /(?:while True|for \(\s*;;\s*\)|infinite loop)/i,
    action: 'INTERRUPT_INFINITE_LOOP',
    priority: 10,
    cooldown: 5000,
    description: 'Detects potential infinite loops'
  });

  // Start periodic scanning
  controller.startScanning(100); // Check every 100ms

  return controller;
}