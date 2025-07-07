/**
 * Universal Principles Hook - Enforces core Axiom principles
 * Converted from v3 universal-principles.ts
 */

import { Hook, HookContext, HookResult, HookEvent } from '../core/hook-orchestrator.js';

export interface Principle {
  id: string;
  name: string;
  description: string;
  category: 'coding' | 'thinking' | 'execution';
  verificationRule: string;
  examples?: {
    good: string[];
    bad: string[];
  };
}

// Core principles from v3
const PRINCIPLES: Principle[] = [
  {
    id: 'no-orphaned-files',
    name: 'No Orphaned Files',
    description: 'Every file must be connected to the project and imported/used somewhere',
    category: 'coding',
    verificationRule: 'File is imported or referenced by at least one other file',
    examples: {
      good: ['utils.ts imported by index.ts', 'Component used in App.tsx'],
      bad: ['random-test.js with no imports', 'backup.ts.old left in project']
    }
  },
  {
    id: 'no-mocks',
    name: 'No Mocks Ever',
    description: 'Never use mock data, mock functions, or placeholder implementations',
    category: 'coding',
    verificationRule: 'No mock/stub/fake/dummy in code',
    examples: {
      good: ['Real API calls', 'Actual database queries'],
      bad: ['mockUser = { id: 1, name: "Test" }', 'function mockApi() {}']
    }
  },
  {
    id: 'real-execution',
    name: 'Real Execution Only',
    description: 'Every operation must actually execute and produce real results',
    category: 'execution',
    verificationRule: 'Commands produce actual output/files',
    examples: {
      good: ['npm install actually installs', 'File.write() creates real file'],
      bad: ['console.log("Would create file")', '// TODO: implement later']
    }
  },
  {
    id: 'verify-dont-trust',
    name: 'Verify Don\'t Trust',
    description: 'Always verify operations succeeded, never assume',
    category: 'thinking',
    verificationRule: 'Every operation followed by verification',
    examples: {
      good: ['Create file then check it exists', 'Run command then verify output'],
      bad: ['Assume file was created', 'Trust that command worked']
    }
  },
  {
    id: 'no-todos',
    name: 'No TODOs',
    description: 'Implement fully or not at all - no placeholders',
    category: 'coding',
    verificationRule: 'No TODO/FIXME/XXX comments',
    examples: {
      good: ['Complete implementation', 'Working code'],
      bad: ['// TODO: add error handling', 'throw new Error("Not implemented")']
    }
  },
  {
    id: 'action-over-planning',
    name: 'Action Over Planning',
    description: 'Write code immediately, not descriptions of code',
    category: 'thinking',
    verificationRule: 'Files created within 30 seconds',
    examples: {
      good: ['Start with main.ts', 'Create index.html first'],
      bad: ['Let me plan the architecture...', 'First, I\'ll research...']
    }
  },
  {
    id: 'fail-fast',
    name: 'Fail Fast and Loudly',
    description: 'Surface errors immediately with clear messages',
    category: 'execution',
    verificationRule: 'Errors thrown with descriptive messages',
    examples: {
      good: ['throw new Error("File not found: config.json")'],
      bad: ['catch (e) { /* ignore */ }', 'return null on error']
    }
  },
  {
    id: 'temporal-awareness',
    name: 'Temporal Awareness',
    description: 'Always know and state the current time context',
    category: 'thinking',
    verificationRule: 'Time-sensitive operations include timestamps',
    examples: {
      good: ['Log with timestamp', 'Check current date before scheduling'],
      bad: ['Assume it\'s still morning', 'Use hardcoded dates']
    }
  }
];

export const universalPrinciplesHook: Hook = {
  name: 'universal-principles-hook',
  events: [
    HookEvent.REQUEST_RECEIVED,
    HookEvent.EXECUTION_STREAM,
    HookEvent.EXECUTION_COMPLETED
  ],
  priority: 95, // High priority
  
  handler: async (context: HookContext): Promise<HookResult> => {
    const { event } = context;
    
    switch (event) {
      case HookEvent.REQUEST_RECEIVED:
        return handleRequestValidation(context);
        
      case HookEvent.EXECUTION_STREAM:
        return handleStreamMonitoring(context);
        
      case HookEvent.EXECUTION_COMPLETED:
        return handleCompletionVerification(context);
        
      default:
        return { action: 'continue' };
    }
  }
};

async function handleRequestValidation(context: HookContext): Promise<HookResult> {
  const prompt = context.request?.args?.prompt || '';
  
  // Check for planning-only language
  if (/^(plan|design|architect|research|explore|investigate)/i.test(prompt)) {
    return {
      action: 'modify',
      modifications: {
        prompt: prompt.replace(/^(plan|design|architect|research|explore|investigate)/i, 'implement'),
        __principleApplied: 'action-over-planning'
      }
    };
  }
  
  return { action: 'continue' };
}

async function handleStreamMonitoring(context: HookContext): Promise<HookResult> {
  const data = context.stream?.data || '';
  const violations: string[] = [];
  
  // Check for TODOs
  if (/\b(TODO|FIXME|XXX)\b/i.test(data)) {
    violations.push('no-todos');
  }
  
  // Check for mocks
  if (/\b(mock|stub|fake|dummy)\w*\s*=|function\s+mock/i.test(data)) {
    violations.push('no-mocks');
  }
  
  // Check for unimplemented
  if (/not implemented|throw new Error\(['"]Not implemented/i.test(data)) {
    violations.push('real-execution');
  }
  
  // Check for planning without action
  if (/would\s+(create|implement|build)|should\s+(create|implement|build)/i.test(data)) {
    violations.push('action-over-planning');
  }
  
  if (violations.length > 0) {
    const principle = PRINCIPLES.find(p => p.id === violations[0]);
    
    console.error(`\n[PRINCIPLE VIOLATION] ${principle?.name}`);
    console.error(`Description: ${principle?.description}`);
    console.error(`Rule: ${principle?.verificationRule}\n`);
    
    return {
      action: 'modify',
      modifications: {
        command: `echo "[INTERVENTION] Principle violated: ${principle?.name}. ${principle?.description}"\n`,
        violations
      }
    };
  }
  
  return { action: 'continue' };
}

async function handleCompletionVerification(context: HookContext): Promise<HookResult> {
  const output = context.execution?.output || '';
  
  // Check if files were actually created
  const fileCreationClaims = output.match(/created?:?\s+(\S+\.(ts|js|tsx|jsx|py|rs|go))/gi) || [];
  const actualCreations = output.match(/File created:|Successfully created/gi) || [];
  
  if (fileCreationClaims.length > actualCreations.length) {
    console.error('\n[PRINCIPLE WARNING] Verify Don\'t Trust');
    console.error('Claims files were created but no verification found');
    console.error(`Claimed: ${fileCreationClaims.length}, Verified: ${actualCreations.length}\n`);
  }
  
  return { action: 'continue' };
}

// Export individual principle checking functions for other hooks
export function checkPrinciple(code: string, principleId: string): boolean {
  switch (principleId) {
    case 'no-todos':
      return !/\b(TODO|FIXME|XXX)\b/i.test(code);
      
    case 'no-mocks':
      return !/\b(mock|stub|fake|dummy)\w*\s*=|function\s+mock/i.test(code);
      
    case 'real-execution':
      return !/not implemented|throw new Error\(['"]Not implemented/i.test(code);
      
    case 'action-over-planning':
      return !/would\s+(create|implement|build)|should\s+(create|implement|build)/i.test(code);
      
    default:
      return true;
  }
}

export function getPrinciples(category?: string): Principle[] {
  if (category) {
    return PRINCIPLES.filter(p => p.category === category);
  }
  return PRINCIPLES;
}

export default universalPrinciplesHook;