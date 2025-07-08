/**
 * No TODO Enforcement Hook - Core Axiom Principle
 * 
 * Forces implementation over planning. If output contains only TODOs
 * without actual code, it intervenes and demands implementation.
 */

import { ParallelExecutionObservatory } from '../core/parallel-execution-observatory.js';
import { logDebug } from '../core/simple-logger.js';

const NO_TODO_ENFORCEMENT_HOOK = {
  name: 'no-todo-enforcement',
  description: 'Enforces implementation over planning - no TODO-only outputs',
  version: '1.0.0',
  
  async beforeExecute(context: any) {
    const { prompt, args, orchestrator } = context;
    
    logDebug('NO_TODO_HOOK', `Checking prompt: ${prompt}`);
    
    // If verbose mode requested, let it through for monitoring
    if (args.verboseMasterMode) {
      return { 
        continueExecution: true,
        modifiedContext: {
          ...context,
          metadata: {
            ...context.metadata,
            noTodoEnforcement: true
          }
        }
      };
    }
    
    // Check if prompt is concrete enough
    const isConcrete = /create|implement|write|build|fix|add|update|modify/i.test(prompt);
    const hasFile = /\.(py|js|ts|java|cpp|go|rs|rb|php)/i.test(prompt);
    const hasSpecifics = /function|class|method|endpoint|component|module/i.test(prompt);
    
    if (!isConcrete || (!hasFile && !hasSpecifics)) {
      return {
        continueExecution: false,
        error: `Task too vague. Be specific: 'Create auth.py with login function' not '${prompt}'`
      };
    }
    
    return { continueExecution: true };
  },
  
  async afterChunk(context: any) {
    const { chunk, taskId, metadata } = context;
    
    // Skip if not enforcing
    if (!metadata?.noTodoEnforcement) return { continueExecution: true };
    
    // Track output
    if (!metadata.outputBuffer) {
      metadata.outputBuffer = '';
    }
    metadata.outputBuffer += chunk;
    
    // Check for toxic patterns early
    const output = metadata.outputBuffer;
    const hasTodo = /TODO:/i.test(output);
    const hasImplementation = /```|File created|def |class |function |const |let |var /i.test(output);
    const hasPlanningOnly = /plan|outline|steps|approach|research|investigate/i.test(output);
    
    // If we see TODOs without implementation after significant output
    if (output.length > 500 && hasTodo && !hasImplementation && hasPlanningOnly) {
      logDebug('NO_TODO_HOOK', 'Detected TODO-only pattern, preparing intervention');
      
      return {
        continueExecution: true,
        interrupt: true,
        interventionMessage: 'Stop planning. Implement the first TODO item now. Write actual code.'
      };
    }
    
    return { continueExecution: true };
  },
  
  async afterExecute(context: any) {
    const { result, taskId, prompt, metadata } = context;
    
    // Extract text output
    const output = typeof result === 'string' ? result : 
                  result?.output || result?.content?.[0]?.text || '';
    
    // Final validation
    const hasTodo = /TODO:/i.test(output);
    const hasImplementation = /```|File created|def |class |function |const |let |var /i.test(output);
    const filesCreated = (output.match(/File created successfully/gi) || []).length;
    
    logDebug('NO_TODO_HOOK', `Final validation - TODOs: ${hasTodo}, Implementation: ${hasImplementation}, Files: ${filesCreated}`);
    
    if (hasTodo && !hasImplementation) {
      // Complete failure - only TODOs
      return {
        continueExecution: false,
        error: 'Task produced only TODOs without implementation. This is not acceptable.',
        retry: true,
        retryPrompt: `${prompt}\n\nIMPORTANT: Write actual code, not TODOs. Create real files with implementation.`
      };
    }
    
    if (!hasImplementation && filesCreated === 0) {
      // No concrete output
      return {
        continueExecution: false,
        error: 'Task produced no concrete implementation or files.',
        retry: true,
        retryPrompt: `${prompt}\n\nIMPORTANT: You must create actual code files, not just describe what to do.`
      };
    }
    
    // Check for false completion claims
    const claimsSuccess = /successfully|completed|implemented|created/i.test(output);
    if (claimsSuccess && !hasImplementation && filesCreated === 0) {
      return {
        continueExecution: false,
        error: 'False success claim detected. No actual implementation found.',
        result: {
          ...result,
          warning: 'TOXIC FEEDBACK DETECTED: Claimed success without implementation'
        }
      };
    }
    
    // Success - actual implementation exists
    return {
      continueExecution: true,
      result: {
        ...result,
        validation: {
          hasImplementation,
          filesCreated,
          noTodosOnly: true
        }
      }
    };
  },
  
  // Special handler for parallel execution
  async handleParallelRequest(context: any) {
    const { prompt, args } = context;
    
    if (args.spawnPattern === 'parallel' && args.spawnCount > 1) {
      logDebug('NO_TODO_HOOK', `Initiating parallel execution observatory for ${args.spawnCount} instances`);
      
      const observatory = new ParallelExecutionObservatory();
      
      // Monitor the observatory
      observatory.on('intervention', (event) => {
        logDebug('NO_TODO_HOOK', `Observatory intervention: ${event.intervention}`);
      });
      
      observatory.on('instance-killed', (event) => {
        logDebug('NO_TODO_HOOK', `Instance killed: ${event.reason} after ${event.lifetime}ms`);
      });
      
      // Execute with observatory
      const result = await observatory.executeTask(prompt);
      
      return {
        continueExecution: false,
        result: {
          type: 'observatory-synthesis',
          ...result
        }
      };
    }
    
    return { continueExecution: true };
  }
};

export default NO_TODO_ENFORCEMENT_HOOK;