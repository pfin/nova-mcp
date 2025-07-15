/**
 * Interrupt Handler Hook
 * Detects interrupt commands and injects new instructions
 */
import { HookEvent } from '../core/hook-orchestrator.js';
import { Logger } from '../core/logger.js';
const logger = Logger.getInstance();
// Interrupt patterns and their actions
const INTERRUPT_COMMANDS = [
    {
        pattern: /\[INTERRUPT:\s*CHANGE\s+TO\s+JAVA\]/i,
        action: 'change_language',
        replacement: 'Stop. Change the implementation to Java instead. Delete any Python code and rewrite everything in Java.'
    },
    {
        pattern: /\[INTERRUPT:\s*CHANGE\s+TO\s+PYTHON\]/i,
        action: 'change_language',
        replacement: 'Stop. Change the implementation to Python instead. Delete any Java code and rewrite everything in Python.'
    },
    {
        pattern: /\[INTERRUPT:\s*ADD\s+TESTS\]/i,
        action: 'add_tests',
        replacement: 'Stop current work. Add comprehensive unit tests for all the code you just wrote.'
    },
    {
        pattern: /\[INTERRUPT:\s*STOP\]/i,
        action: 'stop',
        replacement: 'Stop all current work immediately. Save your progress and exit.'
    },
    {
        pattern: /\[INTERRUPT:\s*EXPLAIN\]/i,
        action: 'explain',
        replacement: 'Stop and explain what you are currently doing and why.'
    }
];
// Track active interrupts
const activeInterrupts = new Map();
export const interruptHandlerHook = {
    name: 'interrupt-handler-hook',
    events: [HookEvent.EXECUTION_STREAM],
    priority: 99, // Very high priority to catch interrupts early
    handler: async (context) => {
        const { stream, execution } = context;
        const taskId = execution?.taskId || 'unknown';
        const data = stream?.data || '';
        logger.trace('InterruptHandler', 'handler', 'Checking for interrupts', {
            taskId,
            dataLength: data.length
        });
        // Check for interrupt commands
        for (const cmd of INTERRUPT_COMMANDS) {
            if (cmd.pattern.test(data)) {
                logger.warn('InterruptHandler', 'handler', 'INTERRUPT DETECTED!', {
                    taskId,
                    action: cmd.action,
                    pattern: cmd.pattern.source
                });
                // Record the interrupt
                activeInterrupts.set(taskId, {
                    timestamp: Date.now(),
                    action: cmd.action,
                    executed: false
                });
                // Log prominent alert
                console.error('\n' + '🛑'.repeat(40));
                console.error('🛑🛑🛑 INTERRUPT RECEIVED 🛑🛑🛑');
                console.error(`Action: ${cmd.action.toUpperCase()}`);
                console.error(`Time: ${new Date().toISOString()}`);
                console.error('🛑'.repeat(40) + '\n');
                // Return the interrupt command
                return {
                    action: 'modify',
                    modifications: {
                        command: `\n\n[INTERRUPT ACKNOWLEDGED]\n${cmd.replacement}\n\n`,
                        interrupted: true,
                        interruptAction: cmd.action,
                        interruptTime: Date.now()
                    }
                };
            }
        }
        // Check if we're in an interrupted state and monitor compliance
        const interrupt = activeInterrupts.get(taskId);
        if (interrupt && !interrupt.executed) {
            // Monitor for compliance with the interrupt
            if (interrupt.action === 'change_language') {
                // Check if language is being changed
                if (data.includes('Java') && interrupt.action.includes('JAVA')) {
                    logger.info('InterruptHandler', 'handler', 'Language change to Java detected', { taskId });
                    interrupt.executed = true;
                }
                else if (data.includes('Python') && interrupt.action.includes('PYTHON')) {
                    logger.info('InterruptHandler', 'handler', 'Language change to Python detected', { taskId });
                    interrupt.executed = true;
                }
                // If not complying after 5 seconds, re-inject
                if (Date.now() - interrupt.timestamp > 5000 && !interrupt.executed) {
                    logger.warn('InterruptHandler', 'handler', 'Interrupt not followed, re-injecting', { taskId });
                    return {
                        action: 'modify',
                        modifications: {
                            command: '\n[INTERRUPT REMINDER] You must follow the interrupt instruction immediately!\n',
                            forceCompliance: true
                        }
                    };
                }
            }
        }
        return { action: 'continue' };
    }
};
// Export function to manually send interrupts
export function sendInterrupt(taskId, interruptType) {
    const interrupt = `[INTERRUPT: ${interruptType.toUpperCase()}]`;
    logger.info('InterruptHandler', 'sendInterrupt', 'Manual interrupt sent', {
        taskId,
        type: interruptType
    });
    return interrupt;
}
// Monitor interrupt effectiveness
export function getInterruptStats() {
    const stats = {
        total: activeInterrupts.size,
        executed: 0,
        pending: 0,
        avgResponseTime: 0
    };
    const responseTimes = [];
    for (const [taskId, interrupt] of activeInterrupts) {
        if (interrupt.executed) {
            stats.executed++;
            responseTimes.push(Date.now() - interrupt.timestamp);
        }
        else {
            stats.pending++;
        }
    }
    if (responseTimes.length > 0) {
        stats.avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    }
    return stats;
}
export default interruptHandlerHook;
//# sourceMappingURL=interrupt-handler-hook.js.map