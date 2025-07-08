/**
 * Enhanced Verbose Monitoring Hook
 * Provides maximum visibility into execution with metrics and pattern detection
 */

import { Hook, HookContext, HookResult, HookEvent } from '../core/hook-orchestrator.js';
import { Logger } from '../core/logger.js';

const logger = Logger.getInstance();

interface StreamMetrics {
  totalChars: number;
  totalLines: number;
  filesCreated: string[];
  filesModified: string[];
  errorsDetected: string[];
  todosDetected: string[];
  commandsExecuted: string[];
  patternsMatched: Map<string, number>;
  languageDetected?: string;
  lastActivity: number;
}

const activeStreams = new Map<string, StreamMetrics>();

// Pattern definitions with names
const PATTERNS = {
  FILE_CREATED: /(?:created?|wrote|generated?)\s+(?:file\s+)?([^\s]+\.(ts|js|py|java|rs|go|md|txt|json))/i,
  FILE_MODIFIED: /(?:updated?|modified?|changed?)\s+(?:file\s+)?([^\s]+\.(ts|js|py|java|rs|go|md|txt|json))/i,
  ERROR: /(?:error|exception|failed|failure):\s*(.+)/i,
  TODO: /(?:TODO|FIXME|XXX):\s*(.+)/i,
  COMMAND: /^\$\s+(.+)|>\s+(.+)/,
  PYTHON_CODE: /(?:def\s+\w+|import\s+\w+|class\s+\w+|print\()/,
  JAVA_CODE: /(?:public\s+class|private\s+\w+|System\.out\.println|import\s+java)/,
  JAVASCRIPT_CODE: /(?:function\s+\w+|const\s+\w+|console\.log|require\(|import\s+{)/,
  PLANNING: /(?:would|could|should|might)\s+(?:create|implement|build)/i,
  IMPLEMENTATION: /(?:creating|implementing|building|writing)\s+/i,
  INTERRUPT_MARKER: /\[INTERRUPT\]|\[INTERVENTION\]/,
};

export const enhancedVerboseHook: Hook = {
  name: 'enhanced-verbose-hook',
  events: [
    HookEvent.EXECUTION_STARTED,
    HookEvent.EXECUTION_STREAM,
    HookEvent.EXECUTION_COMPLETED,
    HookEvent.EXECUTION_FAILED
  ],
  priority: 100, // Highest priority
  
  handler: async (context: HookContext): Promise<HookResult> => {
    const { event, execution, stream, request } = context;
    const taskId = execution?.taskId || 'unknown';
    
    // Check if verbose mode is enabled
    const isVerbose = request?.args?.verboseMasterMode === true;
    if (!isVerbose) {
      return { action: 'continue' };
    }
    
    switch (event) {
      case HookEvent.EXECUTION_STARTED:
        return handleExecutionStart(taskId, context);
        
      case HookEvent.EXECUTION_STREAM:
        return handleStream(taskId, stream?.data || '', context);
        
      case HookEvent.EXECUTION_COMPLETED:
        return handleExecutionComplete(taskId, context);
        
      case HookEvent.EXECUTION_FAILED:
        return handleExecutionFailed(taskId, context);
        
      default:
        return { action: 'continue' };
    }
  }
};

function handleExecutionStart(taskId: string, context: HookContext): HookResult {
  const prompt = context.request?.args?.prompt || context.request?.args?.parentPrompt || '';
  logger.info('EnhancedVerbose', 'handleExecutionStart', 'Starting execution monitoring', {
    taskId,
    prompt: typeof prompt === 'string' ? prompt.slice(0, 100) + '...' : String(prompt)
  });
  
  // Initialize metrics
  activeStreams.set(taskId, {
    totalChars: 0,
    totalLines: 0,
    filesCreated: [],
    filesModified: [],
    errorsDetected: [],
    todosDetected: [],
    commandsExecuted: [],
    patternsMatched: new Map(),
    lastActivity: Date.now()
  });
  
  // Output header
  // Only show header in verbose mode
  logger.info('EnhancedVerboseHook', 'showHeader', '\n' + '='.repeat(80));
  logger.info('EnhancedVerboseHook', 'showHeader', centerText('AXIOM V4 ENHANCED VERBOSE MODE', 80));
  logger.info('EnhancedVerboseHook', 'showHeader', '='.repeat(80));
  logger.info('EnhancedVerboseHook', 'showHeader', `Task ID: ${taskId}`);
  logger.info('EnhancedVerboseHook', 'showHeader', `Started: ${new Date().toISOString()}`);
  logger.info('EnhancedVerboseHook', 'showHeader', `Prompt: ${prompt}`);
  logger.info('EnhancedVerboseHook', 'showHeader', '='.repeat(80) + '\n');
  
  return { action: 'continue' };
}

function handleStream(taskId: string, data: string, context: HookContext): HookResult {
  const metrics = activeStreams.get(taskId);
  if (!metrics) return { action: 'continue' };
  
  // Update basic metrics
  metrics.totalChars += data.length;
  metrics.totalLines += (data.match(/\n/g) || []).length;
  metrics.lastActivity = Date.now();
  
  // Check all patterns
  const detectedPatterns: string[] = [];
  
  for (const [patternName, pattern] of Object.entries(PATTERNS)) {
    const matches = data.match(pattern);
    if (matches) {
      detectedPatterns.push(patternName);
      
      // Update pattern count
      const count = metrics.patternsMatched.get(patternName) || 0;
      metrics.patternsMatched.set(patternName, count + 1);
      
      // Handle specific patterns
      switch (patternName) {
        case 'FILE_CREATED':
          if (matches[1]) metrics.filesCreated.push(matches[1]);
          break;
        case 'FILE_MODIFIED':
          if (matches[1]) metrics.filesModified.push(matches[1]);
          break;
        case 'ERROR':
          if (matches[1]) metrics.errorsDetected.push(matches[1]);
          break;
        case 'TODO':
          if (matches[1]) metrics.todosDetected.push(matches[1]);
          break;
        case 'COMMAND':
          const cmd = matches[1] || matches[2];
          if (cmd) metrics.commandsExecuted.push(cmd);
          break;
        case 'PYTHON_CODE':
          metrics.languageDetected = 'Python';
          break;
        case 'JAVA_CODE':
          metrics.languageDetected = 'Java';
          break;
      }
    }
  }
  
  // Log the stream with metadata
  logger.logStream('EnhancedVerbose', taskId, data, {
    patterns: detectedPatterns,
    metrics: {
      chars: metrics.totalChars,
      lines: metrics.totalLines,
      files: metrics.filesCreated.length + metrics.filesModified.length
    }
  });
  
  // Real-time pattern alerts
  if (detectedPatterns.length > 0) {
    for (const pattern of detectedPatterns) {
      const alert = formatAlert(pattern, data);
      if (alert) logger.warn('EnhancedVerboseHook', 'processStream', alert);
    }
  }
  
  // Check for interrupt markers
  if (detectedPatterns.includes('INTERRUPT_MARKER')) {
    logger.warn('EnhancedVerbose', 'handleStream', 'INTERRUPT DETECTED!', { taskId, data });
    return {
      action: 'modify',
      modifications: {
        interrupted: true,
        interruptTime: Date.now()
      }
    };
  }
  
  return { action: 'continue' };
}

function handleExecutionComplete(taskId: string, context: HookContext): HookResult {
  const metrics = activeStreams.get(taskId);
  if (!metrics) return { action: 'continue' };
  
  const duration = Date.now() - (activeStreams.get(taskId)?.lastActivity || Date.now());
  
  // Output summary
  logger.info('EnhancedVerboseHook', 'showSummary', '\n' + '='.repeat(80));
  logger.info('EnhancedVerboseHook', 'showSummary', centerText('EXECUTION COMPLETE', 80));
  logger.info('EnhancedVerboseHook', 'showSummary', '='.repeat(80));
  logger.info('EnhancedVerboseHook', 'showSummary', `Task ID: ${taskId}`);
  logger.info('EnhancedVerboseHook', 'showSummary', `Duration: ${duration}ms`);
  logger.info('EnhancedVerboseHook', 'showSummary', '\nMETRICS:');
  logger.info('EnhancedVerboseHook', 'showSummary', `  Total Characters: ${metrics.totalChars}`);
  logger.info('EnhancedVerboseHook', 'showSummary', `  Total Lines: ${metrics.totalLines}`);
  logger.info('EnhancedVerboseHook', 'showSummary', `  Files Created: ${metrics.filesCreated.length}`);
  logger.info('EnhancedVerboseHook', 'showSummary', `  Files Modified: ${metrics.filesModified.length}`);
  logger.info('EnhancedVerboseHook', 'showSummary', `  Errors Detected: ${metrics.errorsDetected.length}`);
  logger.info('EnhancedVerboseHook', 'showSummary', `  TODOs Detected: ${metrics.todosDetected.length}`);
  logger.info('EnhancedVerboseHook', 'showSummary', `  Commands Executed: ${metrics.commandsExecuted.length}`);
  logger.info('EnhancedVerboseHook', 'showSummary', `  Language Detected: ${metrics.languageDetected || 'Unknown'}`);
  
  logger.info('EnhancedVerboseHook', 'showSummary', '\nPATTERN MATCHES:');
  for (const [pattern, count] of metrics.patternsMatched) {
    logger.info('EnhancedVerboseHook', 'showSummary', `  ${pattern}: ${count}`);
  }
  
  if (metrics.filesCreated.length > 0) {
    logger.info('EnhancedVerboseHook', 'showSummary', '\nFILES CREATED:');
    for (const file of metrics.filesCreated) {
      console.error(`  ✓ ${file}`);
    }
  }
  
  if (metrics.errorsDetected.length > 0) {
    console.error('\nERRORS:');
    for (const error of metrics.errorsDetected) {
      console.error(`  ✗ ${error}`);
    }
  }
  
  console.error('='.repeat(80) + '\n');
  
  // Log final metrics
  logger.logMetrics('EnhancedVerbose', {
    duration,
    totalChars: metrics.totalChars,
    totalLines: metrics.totalLines,
    filesCreated: metrics.filesCreated.length,
    errors: metrics.errorsDetected.length
  });
  
  // Clean up
  activeStreams.delete(taskId);
  
  return { action: 'continue' };
}

function handleExecutionFailed(taskId: string, context: HookContext): HookResult {
  logger.error('EnhancedVerbose', 'handleExecutionFailed', 'Execution failed', {
    taskId,
    error: context.metadata?.error
  });
  
  logger.error('EnhancedVerboseHook', 'handleError', '\n' + '='.repeat(80));
  logger.error('EnhancedVerboseHook', 'handleError', centerText('EXECUTION FAILED', 80));
  logger.error('EnhancedVerboseHook', 'handleError', '='.repeat(80));
  logger.error('EnhancedVerboseHook', 'handleError', `Error: ${context.metadata?.error}`);
  logger.error('EnhancedVerboseHook', 'handleError', '='.repeat(80) + '\n');
  
  activeStreams.delete(taskId);
  
  return { action: 'continue' };
}

function formatAlert(pattern: string, data: string): string | null {
  const alerts: Record<string, string> = {
    FILE_CREATED: '📄 FILE CREATED',
    FILE_MODIFIED: '📝 FILE MODIFIED',
    ERROR: '❌ ERROR DETECTED',
    TODO: '⚠️  TODO DETECTED',
    COMMAND: '$ COMMAND EXECUTED',
    PLANNING: '🤔 PLANNING DETECTED',
    IMPLEMENTATION: '🔨 IMPLEMENTATION STARTED',
    INTERRUPT_MARKER: '🛑 INTERRUPT RECEIVED'
  };
  
  const alert = alerts[pattern];
  if (alert) {
    return `\n${colorize('█'.repeat(40), 'yellow')}\n${colorize(centerText(alert, 40), 'yellow')}\n${colorize('█'.repeat(40), 'yellow')}\n`;
  }
  
  return null;
}

function centerText(text: string, width: number): string {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

function colorize(text: string, color: string): string {
  const colors: Record<string, string> = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
  };
  
  return `${colors[color] || ''}${text}${colors.reset}`;
}

export default enhancedVerboseHook;