/**
 * Validation Hook - Ensures concrete deliverables
 * Demonstrates how v4 hooks have full runtime access
 */

import { Hook, HookContext, HookResult, HookEvent } from '../core/hook-orchestrator.js';

export const validationHook: Hook = {
  name: 'validation-hook',
  events: [HookEvent.REQUEST_RECEIVED],
  priority: 100, // High priority - runs first
  
  handler: async (context: HookContext): Promise<HookResult> => {
    const { request } = context;
    
    if (!request || request.tool !== 'axiom_spawn') {
      return { action: 'continue' };
    }
    
    const prompt = request.args.prompt || '';
    
    // Check for concrete action verbs
    const hasActionVerb = /\b(create|implement|write|build|fix|add|update|refactor|test)\b/i.test(prompt);
    
    if (!hasActionVerb) {
      return {
        action: 'block',
        reason: `Task must specify concrete action. Use verbs like: create, implement, write, build, fix.
        
Example: 'Create auth.ts with login functionality' instead of 'Research authentication patterns'`
      };
    }
    
    // Check for specific deliverables
    const hasDeliverables = /\.(ts|js|tsx|jsx|py|rs|go|md|json)/i.test(prompt) ||
                           /\b(component|function|class|module|feature|endpoint|api|test)\b/i.test(prompt);
    
    if (!hasDeliverables) {
      return {
        action: 'block',
        reason: `Task must specify concrete deliverables. Include:
- Specific files (e.g., auth.ts, UserLogin.tsx)
- Components/features (e.g., 'login component', 'auth endpoint')

Be specific about WHAT you want created.`
      };
    }
    
    // Block pure research/planning
    if (/^(research|explore|investigate|consider|look into)/i.test(prompt)) {
      return {
        action: 'redirect',
        redirect: {
          tool: 'axiom_spawn',
          args: {
            ...request.args,
            prompt: prompt.replace(/^(research|explore|investigate)/i, 'Implement')
          }
        }
      };
    }
    
    // Add validation metadata
    return {
      action: 'continue',
      modifications: {
        __validated: true,
        __validationScore: 10
      }
    };
  }
};

export default validationHook;