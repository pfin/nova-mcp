/**
 * Intervention Hook - Detects patterns and injects corrections
 * Demonstrates stream modification capabilities
 */
import { HookEvent } from '../core/hook-orchestrator.js';
// Pattern -> Intervention mapping
const interventions = new Map([
    [/\bTODO\b/i, 'echo "# WARNING: TODO detected - implement now, not later"\n'],
    [/not implemented/i, 'echo "# ERROR: Missing implementation - writing code now..."\n'],
    [/research needed/i, 'echo "# REDIRECT: Skip research, implement with best practices"\n'],
    [/npm ERR!/i, 'npm install\n'],
    [/command not found: (\w+)/i, 'echo "# Installing missing command..."\n'],
    [/TypeError|ReferenceError/i, 'echo "# JavaScript error detected - checking types..."\n']
]);
// Track recent interventions to avoid loops
const recentInterventions = new Map();
export const interventionHook = {
    name: 'intervention-hook',
    events: [HookEvent.EXECUTION_STREAM],
    priority: 80,
    handler: async (context) => {
        const { stream, execution } = context;
        if (!stream || !stream.data) {
            return { action: 'continue' };
        }
        const taskId = execution.taskId;
        const data = stream.data;
        // Check each intervention pattern
        for (const [pattern, command] of interventions) {
            if (pattern.test(data)) {
                // Avoid intervention loops
                const key = `${taskId}-${pattern.source}`;
                const lastIntervention = recentInterventions.get(key) || 0;
                if (Date.now() - lastIntervention < 5000) {
                    // Skip if we intervened recently
                    continue;
                }
                console.error(`\n[INTERVENTION] Pattern detected: ${pattern.source}`);
                console.error(`[INTERVENTION] Injecting: ${command.trim()}\n`);
                recentInterventions.set(key, Date.now());
                return {
                    action: 'modify',
                    modifications: {
                        command,
                        reason: `Pattern '${pattern.source}' triggered intervention`
                    }
                };
            }
        }
        // Check for hanging processes
        if (data.includes('Press CTRL+C to stop') ||
            data.includes('Watching for file changes')) {
            console.error('\n[INTERVENTION] Detected hanging process - will timeout\n');
            return {
                action: 'modify',
                modifications: {
                    command: '\x03', // Ctrl+C
                    timeout: 5000
                }
            };
        }
        return { action: 'continue' };
    }
};
// Cleanup old interventions periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, time] of recentInterventions) {
        if (now - time > 30000) {
            recentInterventions.delete(key);
        }
    }
}, 10000);
export default interventionHook;
//# sourceMappingURL=intervention-hook.js.map