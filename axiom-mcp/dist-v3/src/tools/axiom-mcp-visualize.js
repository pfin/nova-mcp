import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
export const axiomMcpVisualizeSchema = z.object({
    taskId: z.string().optional().describe('Task ID to visualize (uses most recent if not provided)'),
    format: z.enum(['tree', 'box', 'compact', 'ascii', 'progress']).default('tree'),
    width: z.number().default(80).describe('Terminal width for formatting'),
    depth: z.number().optional().describe('Max depth to display'),
    showMetrics: z.boolean().default(true).describe('Show performance metrics'),
    colorize: z.boolean().default(false).describe('Use ANSI colors (set false for plain text)'),
});
export const axiomMcpVisualizeTool = {
    name: 'axiom_mcp_visualize',
    description: 'Create terminal-friendly visualizations of research trees optimized for console/LLM viewing',
    inputSchema: zodToJsonSchema(axiomMcpVisualizeSchema),
};
export async function handleAxiomMcpVisualize(input, statusManager) {
    try {
        // Get root task
        let rootTaskId = input.taskId;
        if (!rootTaskId) {
            const allTasks = statusManager.getAllTasks();
            const rootTasks = allTasks.filter(t => !t.parentTask);
            if (rootTasks.length === 0) {
                throw new Error('No root tasks found');
            }
            rootTaskId = rootTasks[rootTasks.length - 1].id;
        }
        const tree = statusManager.getTaskTree(rootTaskId);
        if (!tree) {
            throw new Error(`Task ${rootTaskId} not found`);
        }
        let output = '';
        switch (input.format) {
            case 'tree':
                output = createTreeVisualization(tree, input);
                break;
            case 'box':
                output = createBoxVisualization(tree, input);
                break;
            case 'compact':
                output = createCompactVisualization(tree, input);
                break;
            case 'ascii':
                output = createAsciiVisualization(tree, input);
                break;
            case 'progress':
                output = createProgressVisualization(tree, input);
                break;
        }
        return {
            content: [
                {
                    type: 'text',
                    text: output,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Visualization failed: ${error instanceof Error ? error.message : String(error)}`,
                },
            ],
        };
    }
}
function createTreeVisualization(tree, options) {
    const lines = [];
    const stats = calculateTreeStats(tree);
    // Header
    lines.push('╔' + '═'.repeat(options.width - 2) + '╗');
    lines.push('║' + centerText('Axiom MCP RESEARCH TREE', options.width - 2) + '║');
    lines.push('╠' + '═'.repeat(options.width - 2) + '╣');
    // Summary stats
    if (options.showMetrics) {
        lines.push('║ ' + padRight(`Total Tasks: ${stats.totalNodes}`, (options.width - 2) / 2 - 1) +
            padRight(`Depth: ${stats.maxDepth}`, (options.width - 2) / 2 - 1) + ' ║');
        lines.push('║ ' + padRight(`✓ ${stats.completed} Completed`, (options.width - 2) / 3 - 1) +
            padRight(`⟳ ${stats.running} Running`, (options.width - 2) / 3 - 1) +
            padRight(`✗ ${stats.failed} Failed`, (options.width - 2) / 3 - 1) + ' ║');
        lines.push('╠' + '═'.repeat(options.width - 2) + '╣');
    }
    // Tree content
    const treeLines = renderTreeNode(tree, '', true, true, options);
    treeLines.forEach(line => {
        const truncated = truncateLine(line, options.width - 4);
        lines.push('║ ' + padRight(truncated, options.width - 4) + ' ║');
    });
    // Footer
    lines.push('╚' + '═'.repeat(options.width - 2) + '╝');
    return lines.join('\n');
}
function createBoxVisualization(tree, options) {
    const lines = [];
    const maxWidth = options.width - 4;
    lines.push('┌─' + '─'.repeat(maxWidth) + '─┐');
    function renderBox(node, depth = 0) {
        if (options.depth && depth >= options.depth)
            return;
        const indent = '  '.repeat(depth);
        const status = getStatusSymbol(node.status);
        const prompt = node.prompt.substring(0, maxWidth - indent.length - 4);
        lines.push('│ ' + padRight(indent + status + ' ' + prompt, maxWidth) + ' │');
        if (node.duration) {
            const timeStr = `${(node.duration / 1000).toFixed(1)}s`;
            lines.push('│ ' + padRight(indent + '  └─ ' + timeStr, maxWidth) + ' │');
        }
        if (node.children) {
            node.children.forEach((child) => renderBox(child, depth + 1));
        }
    }
    renderBox(tree);
    lines.push('└─' + '─'.repeat(maxWidth) + '─┘');
    return lines.join('\n');
}
function createCompactVisualization(tree, options) {
    const lines = [];
    const stats = calculateTreeStats(tree);
    // Compact header
    lines.push(`=== Research Tree [${stats.totalNodes} tasks, depth ${stats.maxDepth}] ===`);
    lines.push(`Status: ✓${stats.completed} ⟳${stats.running} ✗${stats.failed} ⏳${stats.pending}`);
    lines.push('');
    // Compact tree
    function renderCompact(node, prefix = '', depth = 0) {
        if (options.depth && depth >= options.depth)
            return;
        const status = getCompactStatus(node.status);
        const prompt = node.prompt.substring(0, 50);
        const time = node.duration ? ` (${(node.duration / 1000).toFixed(1)}s)` : '';
        lines.push(prefix + status + prompt + '...' + time);
        if (node.children) {
            node.children.forEach((child, index) => {
                const isLast = index === node.children.length - 1;
                const newPrefix = prefix + (isLast ? '  ' : '│ ');
                renderCompact(child, newPrefix, depth + 1);
            });
        }
    }
    renderCompact(tree);
    return lines.join('\n');
}
function createAsciiVisualization(tree, options) {
    const lines = [];
    // ASCII art header
    lines.push('     _____  _____    _______   ___   _   _   _____  _____  ');
    lines.push('    |  __ \\|  __ \\  / ____\\ \\ / / \\ | | / \\ |  __ \\/ ____|');
    lines.push('    | |  | | |__) | | (___  \\ V /|  \\| |/ _ \\| |__) \\__ \\ ');
    lines.push('    | |  | |  _  /   \\___ \\  > < | . ` / ___ \\  ___/|__ < ');
    lines.push('    | |__| | | \\ \\  ____) | / . \\| |\\  / ___ \\ |    ___) |');
    lines.push('    |_____/|_|  \\_\\|_____/ /_/ \\_\\_| \\_/_/   \\_\\|   |____/ ');
    lines.push('');
    lines.push('    RESEARCH TREE VISUALIZATION');
    lines.push('    ' + '='.repeat(30));
    lines.push('');
    // Simple ASCII tree
    function renderAscii(node, prefix = '', isLast = true, depth = 0) {
        if (options.depth && depth >= options.depth)
            return;
        const connector = isLast ? '+-- ' : '|-- ';
        const status = node.status === 'completed' ? '[OK]' :
            node.status === 'failed' ? '[!!]' :
                node.status === 'running' ? '[>>]' : '[..]';
        lines.push(prefix + connector + status + ' ' + node.prompt.substring(0, 50) + '...');
        if (node.children) {
            const extension = isLast ? '    ' : '|   ';
            node.children.forEach((child, index) => {
                renderAscii(child, prefix + extension, index === node.children.length - 1, depth + 1);
            });
        }
    }
    renderAscii(tree);
    return lines.join('\n');
}
function createProgressVisualization(tree, options) {
    const lines = [];
    const stats = calculateTreeStats(tree);
    const progressPercent = Math.round((stats.completed / stats.totalNodes) * 100);
    // Progress header
    lines.push('RESEARCH PROGRESS');
    lines.push('=================');
    lines.push('');
    // Overall progress bar
    const barWidth = Math.min(options.width - 10, 50);
    const filled = Math.round((progressPercent / 100) * barWidth);
    const empty = barWidth - filled;
    lines.push('Overall: [' + '█'.repeat(filled) + '░'.repeat(empty) + '] ' + progressPercent + '%');
    lines.push('');
    // Level progress
    lines.push('Progress by Level:');
    stats.levelProgress.forEach((level, index) => {
        const levelPercent = Math.round((level.completed / level.total) * 100);
        const levelFilled = Math.round((levelPercent / 100) * 20);
        const levelEmpty = 20 - levelFilled;
        lines.push(`  L${index}: [` + '▓'.repeat(levelFilled) + '░'.repeat(levelEmpty) +
            `] ${levelPercent}% (${level.completed}/${level.total})`);
    });
    // Task breakdown
    lines.push('');
    lines.push('Task Status:');
    lines.push(`  ✓ Completed: ${stats.completed} (${Math.round((stats.completed / stats.totalNodes) * 100)}%)`);
    lines.push(`  ⟳ Running:   ${stats.running} (${Math.round((stats.running / stats.totalNodes) * 100)}%)`);
    lines.push(`  ⏳ Pending:   ${stats.pending} (${Math.round((stats.pending / stats.totalNodes) * 100)}%)`);
    lines.push(`  ✗ Failed:    ${stats.failed} (${Math.round((stats.failed / stats.totalNodes) * 100)}%)`);
    // Time stats
    if (stats.totalDuration > 0) {
        lines.push('');
        lines.push('Time Statistics:');
        lines.push(`  Total: ${(stats.totalDuration / 1000).toFixed(1)}s`);
        lines.push(`  Average: ${(stats.avgDuration / 1000).toFixed(1)}s per task`);
    }
    return lines.join('\n');
}
// Helper functions
function renderTreeNode(node, prefix, isRoot, isLast, options, depth = 0) {
    if (options.depth && depth >= options.depth)
        return [];
    const lines = [];
    // Node line
    const connector = isRoot ? '' : (isLast ? '└── ' : '├── ');
    const status = getStatusSymbol(node.status);
    const prompt = node.prompt.substring(0, 60);
    const metrics = node.duration ? ` (${(node.duration / 1000).toFixed(1)}s)` : '';
    lines.push(prefix + connector + status + ' ' + prompt + '...' + metrics);
    // Children
    if (node.children && node.children.length > 0) {
        const extension = isRoot ? '' : (isLast ? '    ' : '│   ');
        node.children.forEach((child, index) => {
            const childLines = renderTreeNode(child, prefix + extension, false, index === node.children.length - 1, options, depth + 1);
            lines.push(...childLines);
        });
    }
    return lines;
}
function calculateTreeStats(tree) {
    const stats = {
        totalNodes: 0,
        completed: 0,
        running: 0,
        failed: 0,
        pending: 0,
        maxDepth: 0,
        totalDuration: 0,
        avgDuration: 0,
        levelProgress: [],
    };
    function traverse(node, depth) {
        stats.totalNodes++;
        stats.maxDepth = Math.max(stats.maxDepth, depth);
        if (!stats.levelProgress[depth]) {
            stats.levelProgress[depth] = { total: 0, completed: 0 };
        }
        stats.levelProgress[depth].total++;
        switch (node.status) {
            case 'completed':
                stats.completed++;
                stats.levelProgress[depth].completed++;
                break;
            case 'running':
                stats.running++;
                break;
            case 'failed':
                stats.failed++;
                break;
            default:
                stats.pending++;
        }
        if (node.duration) {
            stats.totalDuration += node.duration;
        }
        if (node.children) {
            node.children.forEach((child) => traverse(child, depth + 1));
        }
    }
    traverse(tree, 0);
    stats.avgDuration = stats.totalNodes > 0 ? stats.totalDuration / stats.totalNodes : 0;
    return stats;
}
function getStatusSymbol(status) {
    switch (status) {
        case 'completed': return '✓';
        case 'failed': return '✗';
        case 'running': return '⟳';
        default: return '⏳';
    }
}
function getCompactStatus(status) {
    switch (status) {
        case 'completed': return '[✓] ';
        case 'failed': return '[✗] ';
        case 'running': return '[⟳] ';
        default: return '[⏳] ';
    }
}
function centerText(text, width) {
    const padding = Math.max(0, width - text.length);
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
}
function padRight(text, width) {
    return text + ' '.repeat(Math.max(0, width - text.length));
}
function truncateLine(text, maxWidth) {
    if (text.length <= maxWidth)
        return text;
    return text.substring(0, maxWidth - 3) + '...';
}
//# sourceMappingURL=axiom-mcp-visualize.js.map