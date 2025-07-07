import { z } from 'zod';
import { createMcpCompliantSchema } from '../utils/mcp-schema.js';
import * as os from 'os';
import { AXIOM_VERSION } from './axiom-mcp-spawn.js';
// Schema for status viewing
export const axiomMcpStatusSchema = z.object({
    view: z.enum(['overview', 'tasks', 'system', 'database', 'events'])
        .default('overview')
        .describe('Type of status information to view'),
    taskId: z.string().optional()
        .describe('Specific task ID to get details for'),
    format: z.enum(['summary', 'detailed', 'json']).default('summary')
        .describe('Output format')
});
export const axiomMcpStatusTool = {
    name: 'axiom_mcp_status',
    description: 'Get current system status and runtime information',
    inputSchema: createMcpCompliantSchema(axiomMcpStatusSchema, 'AxiomMcpStatusInput'),
};
// Format bytes to human readable
function formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
}
// Format duration to human readable
function formatDuration(ms) {
    if (ms < 1000)
        return `${ms}ms`;
    if (ms < 60000)
        return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000)
        return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}
export async function handleAxiomMcpStatus(args, statusManager, conversationDB, eventBus) {
    try {
        switch (args.view) {
            case 'overview': {
                // System overview
                const uptime = process.uptime();
                const memUsage = process.memoryUsage();
                const cpuUsage = process.cpuUsage();
                let output = '🚀 Axiom MCP v3 Status\n';
                output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
                output += `📦 Version: ${AXIOM_VERSION}\n`;
                output += `⏱️  Uptime: ${formatDuration(uptime * 1000)}\n`;
                output += `🧠 Memory: ${formatBytes(memUsage.heapUsed)} / ${formatBytes(memUsage.heapTotal)}\n`;
                output += `💻 CPU Time: User ${formatDuration(cpuUsage.user / 1000)} | System ${formatDuration(cpuUsage.system / 1000)}\n`;
                output += `🖥️  Platform: ${os.platform()} (${os.arch()})\n`;
                output += `🔧 Node.js: ${process.version}\n\n`;
                if (statusManager) {
                    const stats = statusManager.getStats();
                    output += '📊 Task Statistics\n';
                    output += `   Total: ${stats.total}\n`;
                    output += `   Running: ${stats.running} 🟡\n`;
                    output += `   Pending: ${stats.pending} 🔵\n`;
                    output += `   Completed: ${stats.completed} ✅\n`;
                    output += `   Failed: ${stats.failed} ❌\n\n`;
                }
                if (conversationDB) {
                    output += '💾 Database: Connected ✅\n';
                }
                else {
                    output += '💾 Database: Not initialized ⚠️\n';
                }
                if (eventBus) {
                    const eventStats = eventBus.getStats();
                    output += `📡 Event Bus: Active (${eventStats.totalEvents} events)\n`;
                }
                return {
                    content: [{
                            type: 'text',
                            text: output
                        }]
                };
            }
            case 'tasks': {
                // Task details
                if (!statusManager) {
                    throw new Error('Status manager not available');
                }
                let output = '📋 Active Tasks\n';
                output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
                if (args.taskId) {
                    // Specific task details
                    const task = statusManager.getTask(args.taskId);
                    if (!task) {
                        throw new Error(`Task not found: ${args.taskId}`);
                    }
                    output += `🔍 Task: ${task.id}\n`;
                    output += `   Status: ${task.status}\n`;
                    output += `   Started: ${task.startTime.toLocaleString()}\n`;
                    if (task.status === 'completed' && task.endTime) {
                        output += `   Completed: ${task.endTime.toLocaleString()}\n`;
                        output += `   Duration: ${formatDuration(task.endTime.getTime() - task.startTime.getTime())}\n`;
                    }
                    if (task.output) {
                        output += `   Output: ${task.output.slice(0, 200)}...\n`;
                    }
                    if (task.error) {
                        output += `   Error: ${task.error}\n`;
                    }
                    if (task.metadata?.filesCreated) {
                        output += `   Files Created: ${task.metadata.filesCreated.join(', ')}\n`;
                    }
                }
                else {
                    // All tasks
                    const tasks = statusManager.getRecentTasks(20);
                    if (tasks.length === 0) {
                        output += 'No active tasks\n';
                    }
                    else {
                        for (const task of tasks) {
                            const duration = task.endTime
                                ? formatDuration(task.endTime.getTime() - task.startTime.getTime())
                                : formatDuration(Date.now() - task.startTime.getTime());
                            const statusIcon = {
                                'pending': '🔵',
                                'running': '🟡',
                                'completed': '✅',
                                'failed': '❌'
                            }[task.status] || '❓';
                            output += `${statusIcon} ${task.id.slice(0, 8)}... (${duration})\n`;
                            if (task.prompt) {
                                output += `   Prompt: ${task.prompt.slice(0, 60)}...\n`;
                            }
                        }
                    }
                }
                return {
                    content: [{
                            type: 'text',
                            text: output
                        }]
                };
            }
            case 'system': {
                // System resources
                const memUsage = process.memoryUsage();
                const cpuUsage = process.cpuUsage();
                let output = '💻 System Resources\n';
                output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
                output += '🧠 Memory Usage:\n';
                output += `   RSS: ${formatBytes(memUsage.rss)} (Resident Set Size)\n`;
                output += `   Heap Total: ${formatBytes(memUsage.heapTotal)}\n`;
                output += `   Heap Used: ${formatBytes(memUsage.heapUsed)}\n`;
                output += `   External: ${formatBytes(memUsage.external)}\n`;
                output += `   Array Buffers: ${formatBytes(memUsage.arrayBuffers)}\n\n`;
                output += '⚡ CPU Usage:\n';
                output += `   User: ${formatDuration(cpuUsage.user / 1000)}\n`;
                output += `   System: ${formatDuration(cpuUsage.system / 1000)}\n\n`;
                output += '🖥️  System Info:\n';
                output += `   Platform: ${os.platform()}\n`;
                output += `   Architecture: ${os.arch()}\n`;
                output += `   CPUs: ${os.cpus().length} cores\n`;
                output += `   Total Memory: ${formatBytes(os.totalmem())}\n`;
                output += `   Free Memory: ${formatBytes(os.freemem())}\n`;
                output += `   Load Average: ${os.loadavg().map(n => n.toFixed(2)).join(', ')}\n`;
                return {
                    content: [{
                            type: 'text',
                            text: output
                        }]
                };
            }
            case 'database': {
                // Database statistics
                if (!conversationDB) {
                    throw new Error('Database not initialized');
                }
                const stats = await conversationDB.getStats();
                let output = '💾 Database Statistics\n';
                output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
                output += `📊 Conversations: ${stats.totalConversations}\n`;
                output += `   Active: ${stats.activeConversations}\n`;
                output += `   Completed: ${stats.completedConversations}\n\n`;
                output += `🎯 Actions: ${stats.totalActions}\n`;
                output += `   File Creates: ${stats.fileCreates}\n`;
                output += `   Tool Calls: ${stats.toolCalls}\n`;
                output += `   Errors: ${stats.errors}\n\n`;
                output += `📝 Streams: ${stats.totalStreams}\n`;
                output += `   Total Size: ${formatBytes(stats.totalStreamSize)}\n\n`;
                output += `🚨 Violations: ${stats.totalViolations}\n`;
                if (stats.violationsByType) {
                    for (const [type, count] of Object.entries(stats.violationsByType)) {
                        output += `   ${type}: ${count}\n`;
                    }
                }
                return {
                    content: [{
                            type: 'text',
                            text: output
                        }]
                };
            }
            case 'events': {
                // Event bus statistics
                if (!eventBus) {
                    throw new Error('Event bus not available');
                }
                const stats = eventBus.getStats();
                let output = '📡 Event Bus Statistics\n';
                output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
                output += `📊 Total Events: ${stats.totalEvents}\n`;
                output += `⏱️  Uptime: ${formatDuration(Date.now() - stats.startTime)}\n`;
                output += `📈 Events/sec: ${(stats.totalEvents / ((Date.now() - stats.startTime) / 1000)).toFixed(2)}\n\n`;
                if (stats.eventCounts) {
                    output += '📋 Event Types:\n';
                    for (const [type, count] of Object.entries(stats.eventCounts)) {
                        output += `   ${type}: ${count}\n`;
                    }
                }
                if (stats.recentEvents && stats.recentEvents.length > 0) {
                    output += '\n🕐 Recent Events:\n';
                    for (const event of stats.recentEvents.slice(0, 5)) {
                        const time = new Date(event.timestamp).toLocaleTimeString();
                        output += `   ${time} - ${event.event} (${event.taskId.slice(0, 8)}...)\n`;
                    }
                }
                return {
                    content: [{
                            type: 'text',
                            text: output
                        }]
                };
            }
            default:
                throw new Error(`Unknown view: ${args.view}`);
        }
    }
    catch (error) {
        return {
            content: [{
                    type: 'text',
                    text: `❌ Error: ${error.message}`
                }]
        };
    }
}
//# sourceMappingURL=axiom-mcp-status.js.map