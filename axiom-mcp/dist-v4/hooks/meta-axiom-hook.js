/**
 * META-AXIOM Hook - Self-monitoring and improvement
 * Tracks patterns, learns from execution, and generates improvements
 */
import { HookEvent } from '../core/hook-orchestrator.js';
import { logDebug } from '../core/simple-logger.js';
import * as fs from 'fs/promises';
import * as path from 'path';
// Pattern database path
const PATTERN_DB_PATH = path.join(process.cwd(), 'logs', 'axiom-patterns.json');
// In-memory pattern cache
let patternCache = null;
async function loadPatternDatabase() {
    if (patternCache)
        return patternCache;
    try {
        const data = await fs.readFile(PATTERN_DB_PATH, 'utf-8');
        patternCache = JSON.parse(data);
        return patternCache;
    }
    catch {
        // Initialize empty database
        patternCache = {
            patterns: { successful: [], failed: [] },
            metrics: {
                totalExecutions: 0,
                successRate: 0,
                avgExecutionTime: 0,
                commonFailurePatterns: []
            },
            learnings: {
                blockedPatterns: [],
                suggestedImprovements: []
            }
        };
        return patternCache;
    }
}
async function savePatternDatabase(db) {
    await fs.mkdir(path.dirname(PATTERN_DB_PATH), { recursive: true });
    await fs.writeFile(PATTERN_DB_PATH, JSON.stringify(db, null, 2));
    patternCache = db;
}
function analyzeFailurePatterns(db) {
    const patterns = [];
    const failedPrompts = db.patterns.failed.map(p => p.prompt.toLowerCase());
    // Common failure keywords
    const failureKeywords = ['analyze', 'research', 'explore', 'consider', 'look into'];
    for (const keyword of failureKeywords) {
        const count = failedPrompts.filter(p => p.includes(keyword)).length;
        if (count > 2) {
            patterns.push(`Prompts containing "${keyword}" fail ${Math.round(count / db.patterns.failed.length * 100)}% of the time`);
        }
    }
    // Long prompts
    const longPrompts = db.patterns.failed.filter(p => p.prompt.length > 200).length;
    if (longPrompts > 3) {
        patterns.push(`Long prompts (>200 chars) have high failure rate`);
    }
    return patterns;
}
export const metaAxiomHook = {
    name: 'meta-axiom-hook',
    events: [HookEvent.REQUEST_RECEIVED, HookEvent.EXECUTION_COMPLETED, HookEvent.EXECUTION_FAILED],
    priority: 92, // High priority to track everything
    handler: async (context) => {
        const { event, request, execution } = context;
        const db = await loadPatternDatabase();
        if (event === HookEvent.REQUEST_RECEIVED && request?.tool === 'axiom_spawn') {
            const prompt = request.args.prompt || '';
            logDebug('META-AXIOM', `Analyzing prompt: ${prompt.slice(0, 50)}...`);
            // Check against blocked patterns
            for (const blockedPattern of db.learnings.blockedPatterns) {
                if (prompt.toLowerCase().includes(blockedPattern.toLowerCase())) {
                    return {
                        action: 'block',
                        reason: `This pattern has consistently failed. Try rephrasing with concrete action verbs like: create, implement, write, build, fix.`
                    };
                }
            }
            // Track request
            db.metrics.totalExecutions++;
            // Analyze patterns every 10 executions
            if (db.metrics.totalExecutions % 10 === 0) {
                const patterns = analyzeFailurePatterns(db);
                db.metrics.commonFailurePatterns = patterns;
                // Generate new blocked patterns
                if (db.patterns.failed.length > 20) {
                    const recentFailures = db.patterns.failed.slice(-20);
                    const commonWords = new Set();
                    for (const failure of recentFailures) {
                        const words = failure.prompt.toLowerCase().split(/\s+/);
                        for (const word of words) {
                            if (word.length > 4 && !['create', 'implement', 'write', 'build', 'file'].includes(word)) {
                                commonWords.add(word);
                            }
                        }
                    }
                    // Add most common failure words to blocked patterns
                    const wordCounts = Array.from(commonWords).map(word => ({
                        word,
                        count: recentFailures.filter(f => f.prompt.toLowerCase().includes(word)).length
                    }));
                    wordCounts.sort((a, b) => b.count - a.count);
                    const topFailureWords = wordCounts.slice(0, 3).map(w => w.word);
                    for (const word of topFailureWords) {
                        if (!db.learnings.blockedPatterns.includes(word)) {
                            db.learnings.blockedPatterns.push(word);
                            logDebug('META-AXIOM', `Added "${word}" to blocked patterns`);
                        }
                    }
                }
                await savePatternDatabase(db);
            }
        }
        if (event === HookEvent.EXECUTION_COMPLETED && execution) {
            const prompt = context.request?.args?.prompt || '';
            const executionTime = Date.now() - execution.startTime || 0;
            logDebug('META-AXIOM', `Recording successful execution: ${prompt.slice(0, 50)}...`);
            // Record success
            db.patterns.successful.push({
                prompt,
                timestamp: Date.now(),
                success: true,
                executionTime
            });
            // Update metrics
            db.metrics.successRate = db.patterns.successful.length / db.metrics.totalExecutions;
            const avgTime = db.patterns.successful
                .filter(p => p.executionTime)
                .reduce((sum, p) => sum + (p.executionTime || 0), 0) / db.patterns.successful.length;
            db.metrics.avgExecutionTime = avgTime || 0;
            // Learn from success
            if (db.patterns.successful.length % 5 === 0) {
                const recentSuccesses = db.patterns.successful.slice(-10);
                const successPatterns = [];
                // Extract successful patterns
                for (const success of recentSuccesses) {
                    if (success.prompt.match(/create\s+\S+\.(ts|js|py|md)/i)) {
                        successPatterns.push('Direct file creation with extension');
                    }
                    if (success.prompt.match(/implement\s+\w+\s+(function|component|hook)/i)) {
                        successPatterns.push('Specific implementation targets');
                    }
                }
                // Generate improvements
                if (successPatterns.length > 0) {
                    db.learnings.suggestedImprovements = [
                        ...new Set([...db.learnings.suggestedImprovements, ...successPatterns])
                    ].slice(-10);
                }
            }
            // Keep only recent entries
            if (db.patterns.successful.length > 100) {
                db.patterns.successful = db.patterns.successful.slice(-100);
            }
            await savePatternDatabase(db);
        }
        if (event === HookEvent.EXECUTION_FAILED && execution) {
            const prompt = context.request?.args?.prompt || '';
            const error = context.metadata?.error || 'Unknown error';
            logDebug('META-AXIOM', `Recording failed execution: ${prompt.slice(0, 50)}...`);
            // Record failure
            db.patterns.failed.push({
                prompt,
                timestamp: Date.now(),
                success: false,
                error: String(error)
            });
            // Update metrics
            db.metrics.successRate = db.patterns.successful.length / db.metrics.totalExecutions;
            // Keep only recent failures
            if (db.patterns.failed.length > 100) {
                db.patterns.failed = db.patterns.failed.slice(-100);
            }
            await savePatternDatabase(db);
        }
        return { action: 'continue' };
    }
};
// Periodic analysis
setInterval(async () => {
    const db = await loadPatternDatabase();
    if (db.metrics.totalExecutions > 0) {
        logDebug('META-AXIOM', 'Periodic analysis', {
            totalExecutions: db.metrics.totalExecutions,
            successRate: `${Math.round(db.metrics.successRate * 100)}%`,
            avgExecutionTime: `${Math.round(db.metrics.avgExecutionTime / 1000)}s`,
            blockedPatterns: db.learnings.blockedPatterns.length,
            commonFailures: db.metrics.commonFailurePatterns.slice(0, 3)
        });
    }
}, 60000); // Every minute
export default metaAxiomHook;
//# sourceMappingURL=meta-axiom-hook.js.map