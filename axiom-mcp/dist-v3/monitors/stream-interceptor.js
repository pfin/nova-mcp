/**
 * Stream Interceptor for real-time monitoring and intervention
 * Intercepts PTY output streams and can inject commands
 */
import { Transform } from 'stream';
import { EventEmitter } from 'events';
import { ruleEngine } from './rule-engine.js';
export class StreamInterceptor extends Transform {
    options;
    onIntervention;
    buffer = '';
    violations = [];
    hasIntervened = false;
    eventEmitter;
    constructor(options, onIntervention) {
        super();
        this.options = options;
        this.onIntervention = onIntervention;
        this.eventEmitter = new EventEmitter();
        // Set up violation handler
        ruleEngine.setViolationHandler((violation) => {
            if (violation.taskId === this.options.taskId) {
                this.handleViolation(violation);
            }
        });
    }
    _transform(chunk, encoding, callback) {
        const text = chunk.toString();
        this.buffer += text;
        // Process complete lines
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() || ''; // Keep incomplete line in buffer
        for (const line of lines) {
            // Check for violations
            const violations = ruleEngine.checkLine(line, this.options.taskId);
            if (violations.length > 0 && this.options.enableIntervention) {
                this.violations.push(...violations);
                // Check if we should intervene
                const threshold = this.options.violationThreshold || 1;
                const errorCount = this.violations.filter(v => v.severity === 'error').length;
                if (errorCount >= threshold && !this.hasIntervened) {
                    this.intervene(violations);
                }
            }
            // Emit line event for external monitoring
            this.eventEmitter.emit('line', { line, violations });
        }
        // Pass through the original chunk
        this.push(chunk);
        callback();
    }
    _flush(callback) {
        // Process any remaining buffer
        if (this.buffer) {
            const violations = ruleEngine.checkLine(this.buffer, this.options.taskId);
            if (violations.length > 0) {
                this.violations.push(...violations);
            }
            this.eventEmitter.emit('line', { line: this.buffer, violations });
        }
        callback();
    }
    handleViolation(violation) {
        // Emit violation event
        this.eventEmitter.emit('violation', violation);
        // Log for debugging
        console.error(`[VIOLATION] ${violation.ruleName}: ${violation.match}`);
    }
    intervene(violations) {
        const intervention = ruleEngine.generateIntervention(violations);
        if (intervention && this.onIntervention) {
            this.hasIntervened = true;
            this.onIntervention(intervention);
            // Emit intervention event
            this.eventEmitter.emit('intervention', {
                message: intervention,
                violations,
                timestamp: new Date()
            });
        }
    }
    /**
     * Force an intervention with a custom message
     */
    forceIntervention(message) {
        if (this.onIntervention) {
            this.onIntervention(message);
            this.eventEmitter.emit('intervention', {
                message,
                violations: [],
                timestamp: new Date(),
                forced: true
            });
        }
    }
    /**
     * Get all violations detected
     */
    getViolations() {
        return [...this.violations];
    }
    /**
     * Subscribe to interceptor events
     */
    onInterceptorEvent(event, listener) {
        this.eventEmitter.on(event, listener);
    }
    /**
     * Reset intervention state
     */
    reset() {
        this.violations = [];
        this.hasIntervened = false;
    }
}
/**
 * Create a monitoring pipeline for a PTY stream
 */
export function createMonitoringPipeline(taskId, enableIntervention = true, onIntervention) {
    return new StreamInterceptor({
        taskId,
        enableIntervention,
        violationThreshold: 1 // Intervene on first error
    }, onIntervention);
}
//# sourceMappingURL=stream-interceptor.js.map