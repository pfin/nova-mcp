import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
export const axiomMcpObserveSchema = z.object({
    mode: z.enum(['all', 'tree', 'recent', 'live']).describe('Observation mode'),
    conversationId: z.string().optional().describe('Conversation ID for tree mode'),
    limit: z.number().min(1).max(100).default(10).describe('Number of items to show'),
    filter: z.object({
        status: z.enum(['active', 'completed', 'failed']).optional(),
        taskType: z.string().optional(),
        depth: z.number().optional(),
    }).optional().describe('Optional filters'),
});
export const axiomMcpObserveTool = {
    name: 'axiom_mcp_observe',
    description: 'Observe active conversations and their progress across multiple execution branches',
    inputSchema: zodToJsonSchema(axiomMcpObserveSchema),
};
export async function handleAxiomMcpObserve(input, db) {
    try {
        let output = '# Axiom MCP Observation\n\n';
        switch (input.mode) {
            case 'all': {
                // Show all active conversations
                const conversations = await db.getActiveConversations();
                if (conversations.length === 0) {
                    output += '📭 No active conversations\n';
                }
                else {
                    output += `## Active Conversations (${conversations.length})\n\n`;
                    for (const conv of conversations) {
                        const childCount = await getChildCount(db, conv.id);
                        const recentAction = await getMostRecentAction(db, conv.id);
                        output += `### 🔄 ${conv.id.substring(0, 8)}\n`;
                        output += `- **Prompt**: ${conv.prompt.substring(0, 100)}${conv.prompt.length > 100 ? '...' : ''}\n`;
                        output += `- **Type**: ${conv.task_type}\n`;
                        output += `- **Depth**: ${conv.depth}\n`;
                        output += `- **Children**: ${childCount}\n`;
                        output += `- **Started**: ${conv.started_at}\n`;
                        if (recentAction) {
                            output += `- **Last Action**: ${recentAction.type} - ${recentAction.content.substring(0, 50)}...\n`;
                        }
                        if (conv.parent_id) {
                            output += `- **Parent**: ${conv.parent_id.substring(0, 8)}\n`;
                        }
                        output += '\n';
                    }
                }
                break;
            }
            case 'tree': {
                // Show conversation tree
                if (!input.conversationId) {
                    throw new Error('conversationId required for tree mode');
                }
                const tree = await db.getConversationTree(input.conversationId);
                if (tree.length === 0) {
                    output += `❌ Conversation ${input.conversationId} not found\n`;
                }
                else {
                    output += `## Conversation Tree: ${input.conversationId.substring(0, 8)}\n\n`;
                    output += buildTreeView(tree);
                }
                break;
            }
            case 'recent': {
                // Show recent actions across all conversations
                const actions = await db.getRecentActions(input.limit);
                if (actions.length === 0) {
                    output += '📭 No recent actions\n';
                }
                else {
                    output += `## Recent Actions (Last ${actions.length})\n\n`;
                    for (const action of actions) {
                        const conv = await db.getConversation(action.conversation_id);
                        output += `### ${getActionEmoji(action.type)} ${action.type}\n`;
                        output += `- **Time**: ${action.timestamp}\n`;
                        output += `- **Conversation**: ${conv?.prompt.substring(0, 50)}... (${action.conversation_id.substring(0, 8)})\n`;
                        output += `- **Content**: ${action.content.substring(0, 200)}${action.content.length > 200 ? '...' : ''}\n`;
                        if (action.metadata?.filePath) {
                            output += `- **File**: ${action.metadata.filePath}\n`;
                        }
                        output += '\n';
                    }
                }
                break;
            }
            case 'live': {
                // For live mode, we'll need WebSocket or SSE in the future
                output += '## Live Mode\n\n';
                output += '⚠️ Live streaming not yet implemented. Use polling with other modes for now.\n';
                break;
            }
        }
        return {
            content: [{
                    type: 'text',
                    text: output,
                }],
        };
    }
    catch (error) {
        console.error('[OBSERVE] Error:', error);
        return {
            content: [{
                    type: 'text',
                    text: `Error in axiom_mcp_observe: ${error instanceof Error ? error.message : String(error)}`,
                }],
        };
    }
}
// Helper functions
async function getChildCount(db, parentId) {
    // This is a simplified version - in production you'd want a proper COUNT query
    const tree = await db.getConversationTree(parentId);
    return tree.length - 1; // Subtract the parent itself
}
async function getMostRecentAction(db, conversationId) {
    const actions = await db.getConversationActions(conversationId);
    return actions[actions.length - 1];
}
function buildTreeView(conversations) {
    let output = '';
    const byDepth = new Map();
    // Group by depth
    for (const conv of conversations) {
        if (!byDepth.has(conv.depth)) {
            byDepth.set(conv.depth, []);
        }
        byDepth.get(conv.depth).push(conv);
    }
    // Build tree
    for (const [depth, convs] of byDepth) {
        for (const conv of convs) {
            const indent = '  '.repeat(depth);
            const status = getStatusEmoji(conv.status);
            output += `${indent}${status} ${conv.prompt.substring(0, 60)}...\n`;
            output += `${indent}  ID: ${conv.id.substring(0, 8)} | Type: ${conv.task_type}\n`;
        }
    }
    return output;
}
function getStatusEmoji(status) {
    switch (status) {
        case 'active': return '🔄';
        case 'completed': return '✅';
        case 'failed': return '❌';
        default: return '❓';
    }
}
function getActionEmoji(type) {
    switch (type) {
        case 'file_created': return '📄';
        case 'file_modified': return '✏️';
        case 'command_executed': return '💻';
        case 'error_occurred': return '🚨';
        case 'task_started': return '🚀';
        case 'task_completed': return '🎯';
        default: return '📝';
    }
}
//# sourceMappingURL=axiom-mcp-observe.js.map