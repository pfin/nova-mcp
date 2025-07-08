/**
 * Task Monitor Resource - Check running tasks every 30 seconds
 * This provides a way to monitor Axiom executions via MCP
 */
export async function getTaskStatus(db) {
    if (!db) {
        return { error: 'Database not connected' };
    }
    try {
        // Get all active conversations
        const conversations = await db.getDb().all(`
      SELECT id, prompt, status, started_at, task_type, metadata
      FROM conversations
      WHERE status IN ('active', 'running', 'executing')
      ORDER BY started_at DESC
    `);
        // For each active conversation, get recent streams
        const tasksWithStreams = await Promise.all(conversations.map(async (conv) => {
            const recentStreams = await db.getDb().all(`
          SELECT chunk, timestamp
          FROM streams
          WHERE conversation_id = ?
          ORDER BY timestamp DESC
          LIMIT 10
        `, conv.id);
            // Check for violations in recent output
            const violations = checkViolations(recentStreams);
            return {
                ...conv,
                recentOutput: recentStreams.map((s) => s.chunk).join(''),
                violations,
                needsIntervention: violations.length > 0
            };
        }));
        return {
            activeTasks: tasksWithStreams,
            timestamp: new Date().toISOString(),
            checkInterval: '30 seconds'
        };
    }
    catch (error) {
        return {
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
        };
    }
}
function checkViolations(streams) {
    const violations = [];
    const output = streams.map(s => s.chunk).join('');
    // Check for planning violations
    if (output.match(/TODO:|FIXME:|will implement|let's plan|we should/i)) {
        violations.push('PLANNING_VIOLATION: Detected planning instead of implementation');
    }
    // Check for false positive reinforcement
    if (output.match(/successfully analyzed|I've planned|I would create/i)) {
        violations.push('FALSE_POSITIVE: LLM claiming success without creating files');
    }
    // Check for research mode
    if (output.match(/let me think|I'll analyze|research mode/i)) {
        violations.push('RESEARCH_MODE: LLM stuck in analysis loop');
    }
    return violations;
}
//# sourceMappingURL=task-monitor-resource.js.map