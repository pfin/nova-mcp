export class RuleVerifier {
    db;
    rules = new Map();
    constructor(db) {
        this.db = db;
        this.initializeRules();
    }
    initializeRules() {
        // Rule 1: No TODOs or FIXMEs
        this.rules.set('no-todos', (actions, streams) => {
            const violations = [];
            for (const stream of streams) {
                if (stream.chunk.match(/\b(TODO|FIXME)\b/)) {
                    violations.push({
                        ruleId: 'no-todos',
                        ruleName: 'No TODO/FIXME Rule',
                        severity: 'error',
                        timestamp: stream.timestamp,
                        conversationId: stream.conversation_id,
                        evidence: stream.chunk.substring(0, 200),
                        suggestion: 'Implement the functionality instead of leaving TODOs'
                    });
                }
            }
            return violations;
        });
        // Rule 3: Files must be created
        this.rules.set('files-required', (actions, streams) => {
            const violations = [];
            const fileCreatedActions = actions.filter(a => a.type === 'file_created' || a.type === 'file_modified');
            if (fileCreatedActions.length === 0 && actions.length > 5) {
                violations.push({
                    ruleId: 'files-required',
                    ruleName: 'Files Must Be Created',
                    severity: 'critical',
                    timestamp: new Date().toISOString(),
                    conversationId: actions[0]?.conversation_id || 'unknown',
                    evidence: 'No file creation/modification actions detected',
                    suggestion: 'Write actual code files, not just descriptions'
                });
            }
            return violations;
        });
        // Rule 4: Code blocks must have file destinations
        this.rules.set('code-to-files', (actions, streams) => {
            const violations = [];
            let codeBlocksWithoutFiles = 0;
            // Check if code blocks are followed by file creation
            for (let i = 0; i < actions.length; i++) {
                if (actions[i].type === 'code_block') {
                    // Look for file creation within next 3 actions
                    let foundFile = false;
                    for (let j = i + 1; j < Math.min(i + 4, actions.length); j++) {
                        if (actions[j].type === 'file_created' || actions[j].type === 'file_modified') {
                            foundFile = true;
                            break;
                        }
                    }
                    if (!foundFile) {
                        codeBlocksWithoutFiles++;
                    }
                }
            }
            if (codeBlocksWithoutFiles > 0) {
                violations.push({
                    ruleId: 'code-to-files',
                    ruleName: 'Code Must Be Saved to Files',
                    severity: 'error',
                    timestamp: new Date().toISOString(),
                    conversationId: actions[0]?.conversation_id || 'unknown',
                    evidence: `${codeBlocksWithoutFiles} code blocks not saved to files`,
                    suggestion: 'Every code block should be written to an actual file'
                });
            }
            return violations;
        });
    }
    async verifyConversation(conversationId) {
        // Get all actions and streams for this conversation
        const actions = await this.db.getConversationActions(conversationId);
        const streams = await this.db.getConversationStreams(conversationId);
        // Run all rules
        const allViolations = [];
        for (const [ruleId, ruleFn] of this.rules) {
            const violations = ruleFn(actions, streams);
            allViolations.push(...violations);
        }
        // Calculate metrics
        const metrics = {
            filesCreated: actions.filter(a => a.type === 'file_created').length,
            filesModified: actions.filter(a => a.type === 'file_modified').length,
            todosFound: streams.filter(s => s.chunk.match(/\b(TODO|FIXME)\b/)).length,
            planningStatements: 0, // Not tracking anymore since planning is allowed
            codeBlocks: actions.filter(a => a.type === 'code_block').length,
            actualImplementation: actions.some(a => a.type === 'file_created' || a.type === 'file_modified')
        };
        return {
            passed: allViolations.length === 0,
            violations: allViolations,
            metrics
        };
    }
    async verifyTree(rootConversationId) {
        const tree = await this.db.getConversationTree(rootConversationId);
        const results = new Map();
        for (const conversation of tree) {
            const result = await this.verifyConversation(conversation.id);
            results.set(conversation.id, result);
        }
        return results;
    }
    // Real-time verification during execution
    async verifyInRealTime(conversationId, latestAction, latestStream) {
        const violations = [];
        // Quick checks on latest data
        if (latestStream) {
            // Check for TODOs
            if (latestStream.chunk.match(/\b(TODO|FIXME)\b/)) {
                violations.push({
                    ruleId: 'no-todos-realtime',
                    ruleName: 'TODO Detected in Real-time',
                    severity: 'error',
                    timestamp: new Date().toISOString(),
                    conversationId,
                    evidence: latestStream.chunk,
                    suggestion: 'STOP! Implement this instead of writing TODO'
                });
            }
        }
        return violations;
    }
    formatViolationReport(result) {
        let report = '# Rule Verification Report\n\n';
        report += `## Summary\n`;
        report += `- **Status**: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
        report += `- **Violations**: ${result.violations.length}\n`;
        report += `- **Files Created**: ${result.metrics.filesCreated}\n`;
        report += `- **Files Modified**: ${result.metrics.filesModified}\n`;
        report += `- **Code Blocks**: ${result.metrics.codeBlocks}\n`;
        report += `- **TODOs Found**: ${result.metrics.todosFound}\n`;
        if (result.violations.length > 0) {
            report += '## Violations\n\n';
            const bySeverity = {
                critical: result.violations.filter(v => v.severity === 'critical'),
                error: result.violations.filter(v => v.severity === 'error'),
                warning: result.violations.filter(v => v.severity === 'warning')
            };
            for (const [severity, violations] of Object.entries(bySeverity)) {
                if (violations.length > 0) {
                    report += `### ${severity.toUpperCase()} (${violations.length})\n\n`;
                    for (const violation of violations) {
                        report += `#### ${violation.ruleName}\n`;
                        report += `- **Rule**: ${violation.ruleId}\n`;
                        report += `- **Time**: ${violation.timestamp}\n`;
                        report += `- **Evidence**: ${violation.evidence}\n`;
                        if (violation.suggestion) {
                            report += `- **Fix**: ${violation.suggestion}\n`;
                        }
                        report += '\n';
                    }
                }
            }
        }
        return report;
    }
}
//# sourceMappingURL=rule-verifier.js.map