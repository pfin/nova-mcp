/**
 * RESEARCH-AXIOM Hook - Time-boxed research with forced implementation
 * Allows research but enforces strict time limits and converts to action
 */
import { HookEvent } from '../core/hook-orchestrator.js';
import { logDebug } from '../core/simple-logger.js';
import * as fs from 'fs/promises';
import * as path from 'path';
const activeResearch = new Map();
const DEFAULT_RESEARCH_TIME_LIMIT = 300000; // 5 minutes default
const RESEARCH_INSIGHTS_PATH = path.join(process.cwd(), 'logs', 'research-insights.json');
let researchCache = null;
async function loadResearchDatabase() {
    if (researchCache)
        return researchCache;
    try {
        const data = await fs.readFile(RESEARCH_INSIGHTS_PATH, 'utf-8');
        researchCache = JSON.parse(data);
        return researchCache;
    }
    catch {
        researchCache = {
            sessions: [],
            insights: [],
            metrics: {
                totalResearchSessions: 0,
                conversionRate: 0,
                avgResearchTime: 0
            }
        };
        return researchCache;
    }
}
async function saveResearchDatabase(db) {
    await fs.mkdir(path.dirname(RESEARCH_INSIGHTS_PATH), { recursive: true });
    await fs.writeFile(RESEARCH_INSIGHTS_PATH, JSON.stringify(db, null, 2));
    researchCache = db;
}
function extractInsights(output) {
    const insights = [];
    const lines = output.split('\n');
    // Look for key patterns that indicate insights
    const insightPatterns = [
        /(?:found|discovered|learned|identified|noticed|observed|realized):\s*(.+)/i,
        /(?:key finding|important|critical|notable):\s*(.+)/i,
        /(?:pattern|approach|method|technique):\s*(.+)/i,
        /(?:recommendation|suggest|should|could):\s*(.+)/i
    ];
    for (const line of lines) {
        for (const pattern of insightPatterns) {
            const match = line.match(pattern);
            if (match && match[1]) {
                insights.push(match[1].trim());
            }
        }
    }
    // Also extract bullet points
    const bulletPoints = lines.filter(line => line.trim().match(/^[-*•]\s+.+/));
    insights.push(...bulletPoints.map(line => line.replace(/^[-*•]\s+/, '').trim()));
    return [...new Set(insights)].slice(0, 10); // Dedupe and limit
}
function convertInsightsToTasks(insights) {
    const tasks = [];
    for (const insight of insights) {
        // Convert insights to actionable tasks
        if (insight.toLowerCase().includes('use') || insight.toLowerCase().includes('implement')) {
            tasks.push(`Implement: ${insight}`);
        }
        else if (insight.toLowerCase().includes('pattern') || insight.toLowerCase().includes('approach')) {
            tasks.push(`Apply pattern: ${insight}`);
        }
        else if (insight.toLowerCase().includes('should') || insight.toLowerCase().includes('could')) {
            tasks.push(`Action: ${insight.replace(/should|could/gi, 'will')}`);
        }
        else {
            tasks.push(`Create implementation based on: ${insight}`);
        }
    }
    return tasks;
}
export const researchAxiomHook = {
    name: 'research-axiom-hook',
    events: [HookEvent.REQUEST_RECEIVED, HookEvent.EXECUTION_STREAM, HookEvent.EXECUTION_COMPLETED],
    priority: 105, // Higher than validation (100) to intercept research before blocking
    handler: async (context) => {
        const { event, request, execution, stream } = context;
        if (event === HookEvent.REQUEST_RECEIVED && request?.tool === 'axiom_spawn') {
            const prompt = request.args.prompt || '';
            const researchTimeLimit = request.args.researchTimeLimit || DEFAULT_RESEARCH_TIME_LIMIT;
            const researchWarningTime = researchTimeLimit * 0.75; // Warning at 75% of time
            // Check if this is a research prompt
            if (/\b(research|analyze|explore|investigate|study|examine)\b/i.test(prompt)) {
                logDebug('RESEARCH-AXIOM', `Research prompt detected: ${prompt.slice(0, 50)}...`);
                logDebug('RESEARCH-AXIOM', `Time limit: ${researchTimeLimit}ms (${researchTimeLimit / 60000} minutes)`);
                // Allow but mark for monitoring
                return {
                    action: 'continue',
                    modifications: {
                        ...request.args,
                        __research_mode: true,
                        __research_start: Date.now(),
                        __research_limit: researchTimeLimit,
                        __research_warning: researchWarningTime,
                        __research_original_prompt: prompt
                    }
                };
            }
        }
        if (event === HookEvent.EXECUTION_STREAM && stream && execution?.taskId) {
            const taskId = execution.taskId;
            // Check if this is a research task
            if (context.request?.args?.__research_mode) {
                const startTime = (context.request?.args).__research_start;
                const elapsed = Date.now() - startTime;
                // Initialize research session if needed
                if (!activeResearch.has(taskId)) {
                    activeResearch.set(taskId, {
                        taskId,
                        prompt: (context.request?.args).__research_original_prompt,
                        startTime,
                        insights: [],
                        converted: false
                    });
                }
                const session = activeResearch.get(taskId);
                // Extract insights from output
                const newInsights = extractInsights(stream.data);
                session.insights.push(...newInsights);
                // Get configured times from the request args
                const researchLimit = (context.request?.args).__research_limit || DEFAULT_RESEARCH_TIME_LIMIT;
                const warningTime = (context.request?.args).__research_warning || (researchLimit * 0.75);
                const remainingTime = researchLimit - elapsed;
                // Warning when 75% of time is used
                if (elapsed > warningTime && elapsed < warningTime + 1000) {
                    const minutesRemaining = Math.round(remainingTime / 60000);
                    logDebug('RESEARCH-AXIOM', `Research time warning for ${taskId} - ${minutesRemaining} minutes remaining`);
                    return {
                        action: 'modify',
                        modifications: {
                            command: `\n[WARNING] Research time limit approaching! ${minutesRemaining} minutes remaining.\n` +
                                'Start documenting key findings now...\n' +
                                'You can spawn sub-tasks with axiom_spawn for implementation while continuing research.\n'
                        }
                    };
                }
                // Force implementation at time limit
                if (elapsed > researchLimit && !session.converted) {
                    logDebug('RESEARCH-AXIOM', `Research time limit reached for ${taskId}`);
                    session.converted = true;
                    // Convert insights to tasks
                    const tasks = convertInsightsToTasks(session.insights);
                    const taskList = tasks.map((t, i) => `${i + 1}. ${t}`).join('\n');
                    return {
                        action: 'modify',
                        modifications: {
                            command: '\n[INTERVENTION] Research time expired! Start implementing NOW!\n\n' +
                                'Based on your research, implement these tasks:\n' +
                                taskList + '\n\n' +
                                'Pick the first task and start coding immediately!\n'
                        }
                    };
                }
            }
        }
        if (event === HookEvent.EXECUTION_COMPLETED && execution?.taskId) {
            const taskId = execution.taskId;
            const session = activeResearch.get(taskId);
            if (session) {
                logDebug('RESEARCH-AXIOM', `Research session completed for ${taskId}`);
                // Save to database
                const db = await loadResearchDatabase();
                // Record session
                db.sessions.push({
                    ...session,
                    insights: [...new Set(session.insights)] // Dedupe
                });
                // Update topic insights
                const words = session.prompt.toLowerCase().split(/\s+/);
                for (const word of words) {
                    if (word.length > 4) {
                        const existing = db.insights.find(i => i.topic === word);
                        if (existing) {
                            existing.frequency++;
                            existing.lastSeen = Date.now();
                            if (session.converted) {
                                existing.convertedToTasks.push(...convertInsightsToTasks(session.insights));
                            }
                        }
                        else {
                            db.insights.push({
                                topic: word,
                                frequency: 1,
                                lastSeen: Date.now(),
                                convertedToTasks: session.converted ? convertInsightsToTasks(session.insights) : []
                            });
                        }
                    }
                }
                // Update metrics
                db.metrics.totalResearchSessions++;
                const convertedCount = db.sessions.filter(s => s.converted).length;
                db.metrics.conversionRate = convertedCount / db.metrics.totalResearchSessions;
                const avgTime = db.sessions
                    .map(s => Date.now() - s.startTime)
                    .reduce((sum, time) => sum + time, 0) / db.sessions.length;
                db.metrics.avgResearchTime = avgTime;
                // Keep only recent sessions
                if (db.sessions.length > 50) {
                    db.sessions = db.sessions.slice(-50);
                }
                await saveResearchDatabase(db);
                activeResearch.delete(taskId);
            }
        }
        return { action: 'continue' };
    }
};
// Cleanup stale research sessions
setInterval(() => {
    const now = Date.now();
    for (const [taskId, session] of activeResearch) {
        // Clean up sessions that are 2x their limit old
        if (now - session.startTime > DEFAULT_RESEARCH_TIME_LIMIT * 2) {
            logDebug('RESEARCH-AXIOM', `Cleaning up stale research session ${taskId}`);
            activeResearch.delete(taskId);
        }
    }
}, 30000); // Every 30 seconds
export default researchAxiomHook;
//# sourceMappingURL=research-axiom-hook.js.map