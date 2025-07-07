/**
 * Enhanced logging system for Axiom v4
 * Provides maximum visibility into all operations
 */
import * as util from 'util';
export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["TRACE"] = 0] = "TRACE";
    LogLevel[LogLevel["DEBUG"] = 1] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["WARN"] = 3] = "WARN";
    LogLevel[LogLevel["ERROR"] = 4] = "ERROR";
    LogLevel[LogLevel["FATAL"] = 5] = "FATAL";
})(LogLevel || (LogLevel = {}));
export class Logger {
    static instance;
    logLevel = LogLevel.WARN; // Default to WARN for quiet operation
    startTimes = new Map();
    silent = false;
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    constructor() {
        // Check for env var to set log level
        const envLevel = process.env.AXIOM_LOG_LEVEL;
        if (envLevel && envLevel in LogLevel) {
            this.logLevel = LogLevel[envLevel];
        }
        // Check if we should be completely silent (for MCP)
        this.silent = process.env.AXIOM_SILENT === 'true' ||
            (!process.env.AXIOM_LOG_LEVEL && !process.env.AXIOM_CONSOLE_LOG);
    }
    setLogLevel(level) {
        this.logLevel = level;
    }
    shouldLog(level) {
        return level >= this.logLevel;
    }
    formatMessage(entry) {
        const level = LogLevel[entry.level];
        const time = new Date(entry.timestamp).toLocaleTimeString();
        // Compact, readable format
        let message = `${this.colorize(`[${level}]`, entry.level)} ${entry.message}`;
        // Add task ID if present
        if (entry.taskId) {
            message = `[${entry.taskId.slice(-8)}] ${message}`;
        }
        // Add duration if present
        if (entry.duration !== undefined) {
            message += ` ${this.colorize(`(${entry.duration}ms)`, 'duration')}`;
        }
        // Only show data in DEBUG or TRACE mode
        if (entry.data && this.logLevel <= LogLevel.DEBUG) {
            const dataStr = util.inspect(entry.data, { depth: 1, colors: true, compact: true });
            message += `\n  → ${dataStr}`;
        }
        return message;
    }
    colorize(text, type) {
        const colors = {
            [LogLevel.TRACE]: '\x1b[90m', // Gray
            [LogLevel.DEBUG]: '\x1b[36m', // Cyan
            [LogLevel.INFO]: '\x1b[32m', // Green
            [LogLevel.WARN]: '\x1b[33m', // Yellow
            [LogLevel.ERROR]: '\x1b[31m', // Red
            [LogLevel.FATAL]: '\x1b[35m', // Magenta
            'component': '\x1b[34m', // Blue
            'duration': '\x1b[33m', // Yellow
            'reset': '\x1b[0m'
        };
        const color = colors[type] || colors.reset;
        return `${color}${text}${colors.reset}`;
    }
    trace(component, method, message, data, taskId) {
        this.log(LogLevel.TRACE, component, method, message, data, taskId);
    }
    debug(component, method, message, data, taskId) {
        this.log(LogLevel.DEBUG, component, method, message, data, taskId);
    }
    info(component, method, message, data, taskId) {
        this.log(LogLevel.INFO, component, method, message, data, taskId);
    }
    warn(component, method, message, data, taskId) {
        this.log(LogLevel.WARN, component, method, message, data, taskId);
    }
    error(component, method, message, data, taskId) {
        this.log(LogLevel.ERROR, component, method, message, data, taskId);
    }
    fatal(component, method, message, data, taskId) {
        this.log(LogLevel.FATAL, component, method, message, data, taskId);
    }
    startTimer(key) {
        this.startTimes.set(key, Date.now());
    }
    endTimer(key) {
        const startTime = this.startTimes.get(key);
        if (startTime) {
            const duration = Date.now() - startTime;
            this.startTimes.delete(key);
            return duration;
        }
        return undefined;
    }
    log(level, component, method, message, data, taskId) {
        if (!this.shouldLog(level))
            return;
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            component,
            method,
            message,
            data,
            taskId
        };
        // Only output if not silent
        if (!this.silent) {
            console.error(this.formatMessage(entry));
        }
    }
    // Special formatting for stream data
    logStream(component, taskId, data, metadata) {
        // Only show stream in TRACE mode
        if (!this.shouldLog(LogLevel.TRACE))
            return;
        // Don't log empty lines
        const trimmed = data.trim();
        if (!trimmed)
            return;
        // Simple one-line format
        console.error(`${this.colorize('[STREAM]', LogLevel.TRACE)} ${trimmed}`);
        // Show patterns only in DEBUG mode
        if (metadata?.patterns && this.logLevel <= LogLevel.DEBUG) {
            for (const pattern of metadata.patterns) {
                console.error(`  ${this.colorize('→', LogLevel.WARN)} ${pattern} detected`);
            }
        }
    }
    // Log hook execution
    logHook(hookName, event, phase, result) {
        // Only log hooks in DEBUG mode
        if (!this.shouldLog(LogLevel.DEBUG))
            return;
        // Only log hook completions with non-continue results
        if (phase === 'end' && result?.action === 'continue')
            return;
        const icon = phase === 'start' ? '→' : '✓';
        const message = `${icon} ${hookName}: ${event}`;
        if (result?.action && result.action !== 'continue') {
            this.warn('Hook', hookName, `${message} [${result.action}]`, result);
        }
        else {
            this.debug('Hook', hookName, message);
        }
    }
    // Log metrics
    logMetrics(component, metrics) {
        const formatted = Object.entries(metrics)
            .map(([key, value]) => `${key}=${value}`)
            .join(', ');
        this.info(component, 'metrics', formatted);
    }
}
//# sourceMappingURL=logger.js.map