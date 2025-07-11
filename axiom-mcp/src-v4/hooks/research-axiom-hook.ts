/**
 * RESEARCH-AXIOM Hook - Time-boxed research with forced implementation
 * Allows research but enforces strict time limits and converts to action
 */

import { Hook, HookContext, HookResult, HookEvent } from '../core/hook-orchestrator.js';
import { logDebug } from '../core/simple-logger.js';
import * as fs from 'fs/promises';
import * as path from 'path';

// Research tracking
interface ResearchSession {
  taskId: string;
  prompt: string;
  startTime: number;
  insights: string[];
  converted: boolean;
}

const activeResearch = new Map<string, ResearchSession>();
const RESEARCH_TIME_LIMIT = 120000; // 2 minutes
const RESEARCH_WARNING_TIME = 90000; // 1.5 minutes
const RESEARCH_INSIGHTS_PATH = path.join(process.cwd(), 'logs', 'research-insights.json');

interface ResearchDatabase {
  sessions: ResearchSession[];
  insights: {
    topic: string;
    frequency: number;
    lastSeen: number;
    convertedToTasks: string[];
  }[];
  metrics: {
    totalResearchSessions: number;
    conversionRate: number;
    avgResearchTime: number;
  };
}

let researchCache: ResearchDatabase | null = null;

async function loadResearchDatabase(): Promise<ResearchDatabase> {
  if (researchCache) return researchCache;
  
  try {
    const data = await fs.readFile(RESEARCH_INSIGHTS_PATH, 'utf-8');
    researchCache = JSON.parse(data);
    return researchCache!;
  } catch {
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

async function saveResearchDatabase(db: ResearchDatabase): Promise<void> {
  await fs.mkdir(path.dirname(RESEARCH_INSIGHTS_PATH), { recursive: true });
  await fs.writeFile(RESEARCH_INSIGHTS_PATH, JSON.stringify(db, null, 2));
  researchCache = db;
}

function extractInsights(output: string): string[] {
  const insights: string[] = [];
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

function convertInsightsToTasks(insights: string[]): string[] {
  const tasks: string[] = [];
  
  for (const insight of insights) {
    // Convert insights to actionable tasks
    if (insight.toLowerCase().includes('use') || insight.toLowerCase().includes('implement')) {
      tasks.push(`Implement: ${insight}`);
    } else if (insight.toLowerCase().includes('pattern') || insight.toLowerCase().includes('approach')) {
      tasks.push(`Apply pattern: ${insight}`);
    } else if (insight.toLowerCase().includes('should') || insight.toLowerCase().includes('could')) {
      tasks.push(`Action: ${insight.replace(/should|could/gi, 'will')}`);
    } else {
      tasks.push(`Create implementation based on: ${insight}`);
    }
  }
  
  return tasks;
}

export const researchAxiomHook: Hook = {
  name: 'research-axiom-hook',
  events: [HookEvent.REQUEST_RECEIVED, HookEvent.EXECUTION_STREAM, HookEvent.EXECUTION_COMPLETED],
  priority: 95, // Higher than validation to intercept research
  
  handler: async (context: HookContext): Promise<HookResult> => {
    const { event, request, execution, stream } = context;
    
    if (event === HookEvent.REQUEST_RECEIVED && request?.tool === 'axiom_spawn') {
      const prompt = request.args.prompt || '';
      
      // Check if this is a research prompt
      if (/\b(research|analyze|explore|investigate|study|examine)\b/i.test(prompt)) {
        logDebug('RESEARCH-AXIOM', `Research prompt detected: ${prompt.slice(0, 50)}...`);
        
        // Allow but mark for monitoring
        return {
          action: 'continue',
          modifications: {
            ...request.args,
            __research_mode: true,
            __research_start: Date.now(),
            __research_limit: RESEARCH_TIME_LIMIT,
            __research_original_prompt: prompt
          }
        };
      }
    }
    
    if (event === HookEvent.EXECUTION_STREAM && stream && execution?.taskId) {
      const taskId = execution.taskId;
      
      // Check if this is a research task
      if ((context.request?.args as any)?.__research_mode) {
        const startTime = (context.request?.args as any).__research_start;
        const elapsed = Date.now() - startTime;
        
        // Initialize research session if needed
        if (!activeResearch.has(taskId)) {
          activeResearch.set(taskId, {
            taskId,
            prompt: (context.request?.args as any).__research_original_prompt,
            startTime,
            insights: [],
            converted: false
          });
        }
        
        const session = activeResearch.get(taskId)!;
        
        // Extract insights from output
        const newInsights = extractInsights(stream.data);
        session.insights.push(...newInsights);
        
        // Warning at 1.5 minutes
        if (elapsed > RESEARCH_WARNING_TIME && elapsed < RESEARCH_WARNING_TIME + 1000) {
          logDebug('RESEARCH-AXIOM', `Research time warning for ${taskId}`);
          return {
            action: 'modify',
            modifications: {
              command: '\n[WARNING] Research time limit approaching! 30 seconds remaining.\n' +
                       'Start documenting key findings now...\n'
            }
          };
        }
        
        // Force implementation at 2 minutes
        if (elapsed > RESEARCH_TIME_LIMIT && !session.converted) {
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
            } else {
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
    if (now - session.startTime > RESEARCH_TIME_LIMIT * 2) {
      logDebug('RESEARCH-AXIOM', `Cleaning up stale research session ${taskId}`);
      activeResearch.delete(taskId);
    }
  }
}, 30000); // Every 30 seconds

export default researchAxiomHook;