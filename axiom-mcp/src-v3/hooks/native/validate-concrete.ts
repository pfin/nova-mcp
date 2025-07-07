/**
 * Native TypeScript implementation of axiom-validate-concrete hook
 * 
 * Ensures tasks have concrete deliverables before execution
 */

import { Hook, HookContext, HookResult } from '../hook-manager.js';
import { HookEvent } from '../hook-manager.js';
import { HookUtils, COMMON_PATTERNS } from '../types.js';

const validateConcreteHook: Hook = {
  name: 'validate-concrete',
  event: HookEvent.PRE_SPAWN,
  priority: 100, // High priority - run first
  enabled: true,
  type: 'native',
  
  handler: async (context: HookContext): Promise<HookResult> => {
    const { args, db, eventBus } = context;
    
    // Extract prompt
    const prompt = args?.parentPrompt || args?.prompt || '';
    
    // Log validation attempt
    eventBus.logEvent({
      taskId: context.taskId || 'validation',
      workerId: 'validate-concrete',
      event: 'validation_start',
      payload: { prompt: prompt.slice(0, 100) }
    });
    
    // Skip validation for non-spawn tools
    if (context.tool && !['axiom_mcp_spawn', 'axiom_test_v3'].includes(context.tool)) {
      return { continue: true };
    }
    
    // Check 1: Concrete action verbs
    const hasActionVerb = /\b(create|implement|write|build|fix|add|update|refactor|test)\b/i.test(prompt);
    
    if (!hasActionVerb) {
      return {
        continue: false,
        block: true,
        reason: `Task must specify concrete action. Use verbs like: create, implement, write, build, fix, add, update, refactor, test.

Example: 'Create auth.ts with login functionality' instead of 'Research authentication patterns'`
      };
    }
    
    // Check 2: Specific deliverables
    const filePaths = HookUtils.extractFilePaths(prompt);
    const hasComponent = /\b(component|function|class|module|feature|endpoint|api|test)\b/i.test(prompt);
    
    if (filePaths.length === 0 && !hasComponent) {
      // Check database for common patterns that led to success
      const recentSuccesses = await db.getRecentActions(50);
      const successfulPrompts = recentSuccesses
        .filter(a => a.type === 'task_completed')
        .map(a => a.metadata?.prompt)
        .filter(Boolean);
      
      return {
        continue: false,
        block: true,
        reason: `Task must specify concrete deliverables. Include:
- Specific files (e.g., auth.ts, UserLogin.tsx)
- Components/features (e.g., 'login component', 'auth endpoint')
- Clear outputs (e.g., 'function to validate emails')

Be specific about WHAT you want created.`
      };
    }
    
    // Check 3: Block pure research/planning
    if (COMMON_PATTERNS.RESEARCH.test(prompt)) {
      return {
        continue: false,
        block: true,
        reason: `Start with implementation, not research. Instead of 'Research auth patterns', try:
- 'Create auth.ts with JWT authentication'
- 'Implement login endpoint in api/auth/route.ts'
- 'Build UserAuth component with email/password fields'

You can research WHILE implementing.`
      };
    }
    
    // Check 4: Warn about TODOs (non-blocking)
    if (COMMON_PATTERNS.TODO.test(prompt)) {
      eventBus.logEvent({
        taskId: context.taskId || 'validation',
        workerId: 'validate-concrete',
        event: 'warning',
        payload: { message: 'TODO detected in prompt - ensure implementation follows' }
      });
    }
    
    // Validation passed - enhance with context
    const enhancements: any = {
      validationScore: 0
    };
    
    // Score based on quality indicators
    if (filePaths.length > 0) enhancements.validationScore += 10;
    if (hasComponent) enhancements.validationScore += 5;
    if (/\btest\b/i.test(prompt)) enhancements.validationScore += 10;
    if (/\b(type|interface|schema)\b/i.test(prompt)) enhancements.validationScore += 5;
    if (/\b(error|handle|catch|validate)\b/i.test(prompt)) enhancements.validationScore += 5;
    
    // Check historical success patterns
    const stats = await db.getStats();
    if (stats.totalConversations > 10) {
      // We have enough history to provide insights
      enhancements.historicalContext = {
        totalTasks: stats.totalConversations,
        successRate: stats.completedConversations / stats.totalConversations,
        commonPatterns: [] // Could analyze common successful patterns
      };
    }
    
    // Log successful validation
    eventBus.logEvent({
      taskId: context.taskId || 'validation',
      workerId: 'validate-concrete',
      event: 'validation_passed',
      payload: {
        score: enhancements.validationScore,
        fileCount: filePaths.length,
        hasTests: /\btest\b/i.test(prompt)
      }
    });
    
    return {
      continue: true,
      modifiedArgs: {
        ...args,
        __validationMetadata: enhancements
      }
    };
  }
};

export default validateConcreteHook;