/**
 * Task Decomposer - Breaks tasks into 5-10 minute orthogonal chunks
 * 
 * Core Axiom principle: Decompose into small, measurable tasks that
 * can be executed in parallel and interrupted before toxic completion.
 */

import { EventEmitter } from 'events';
import { logDebug } from './simple-logger.js';

export interface DecomposedTask {
  id: string;
  originalPrompt: string;
  subtasks: Subtask[];
  strategy: 'parallel' | 'sequential' | 'race';
  maxDuration: number; // 5-10 minutes
  successCriteria: SuccessCriteria;
}

export interface Subtask {
  id: string;
  prompt: string;
  duration: number; // estimated minutes
  orthogonal: boolean; // can run in parallel
  dependencies: string[]; // IDs of tasks that must complete first
  verifiable: boolean; // has concrete deliverable
  expectedOutput: string; // what file/code should exist
}

export interface SuccessCriteria {
  filesCreated?: string[];
  testsPass?: boolean;
  codeExecutes?: boolean;
  noTodos?: boolean;
  hasImplementation?: boolean;
}

export class TaskDecomposer extends EventEmitter {
  private patterns = {
    // Task types that need decomposition
    largeTask: /implement|create|build|develop|design/i,
    multiPart: /and|with|including|plus|also/i,
    vague: /system|application|solution|feature/i,
    
    // Concrete deliverables
    file: /file|module|class|function|component/i,
    test: /test|spec|unit test|integration/i,
    api: /api|endpoint|route|handler/i,
    ui: /ui|interface|component|page|screen/i
  };

  decompose(prompt: string): DecomposedTask {
    logDebug('DECOMPOSER', `Decomposing task: ${prompt}`);
    
    const subtasks: Subtask[] = [];
    
    // Detect task type and complexity
    const isLarge = this.patterns.largeTask.test(prompt);
    const hasMultipleParts = this.patterns.multiPart.test(prompt);
    const isVague = this.patterns.vague.test(prompt);
    
    if (isVague && !hasMultipleParts) {
      // Vague single task - create multiple approaches
      subtasks.push(
        this.createSubtask('minimal-implementation', 
          `Create the simplest possible working implementation of: ${prompt}`, 5),
        this.createSubtask('robust-implementation', 
          `Create a production-ready implementation of: ${prompt}`, 10),
        this.createSubtask('test-driven', 
          `Write tests first, then implement: ${prompt}`, 8)
      );
      
      return {
        id: this.generateId(),
        originalPrompt: prompt,
        subtasks,
        strategy: 'race', // First to succeed wins
        maxDuration: 10,
        successCriteria: {
          filesCreated: ['*'],
          hasImplementation: true,
          noTodos: true
        }
      };
    }
    
    // Detect specific components
    const needsFile = this.patterns.file.test(prompt);
    const needsTest = this.patterns.test.test(prompt);
    const needsApi = this.patterns.api.test(prompt);
    const needsUi = this.patterns.ui.test(prompt);
    
    // Create orthogonal subtasks
    if (needsFile || isLarge) {
      subtasks.push(this.createSubtask('core-implementation',
        `Implement the core logic only. No UI, no tests, just the essential functionality for: ${prompt}`, 5));
    }
    
    if (needsApi) {
      subtasks.push(this.createSubtask('api-endpoints',
        `Create just the API endpoints/routes. Mock the business logic for: ${prompt}`, 5));
    }
    
    if (needsUi) {
      subtasks.push(this.createSubtask('ui-components',
        `Create just the UI components with mock data for: ${prompt}`, 5));
    }
    
    if (needsTest || isLarge) {
      subtasks.push(this.createSubtask('test-suite',
        `Write comprehensive tests (can be failing) for: ${prompt}`, 5));
    }
    
    // If no specific decomposition, create parallel approaches
    if (subtasks.length === 0) {
      subtasks.push(
        this.createSubtask('python-approach', 
          `Implement in Python: ${prompt}`, 5),
        this.createSubtask('javascript-approach', 
          `Implement in JavaScript: ${prompt}`, 5),
        this.createSubtask('minimal-approach', 
          `Simplest possible solution: ${prompt}`, 3)
      );
    }
    
    // Add integration task if multiple parts
    if (subtasks.length > 1) {
      const integrationTask = this.createSubtask('integration',
        `Integrate and test all components together`, 5);
      integrationTask.dependencies = subtasks.map(t => t.id);
      integrationTask.orthogonal = false;
      subtasks.push(integrationTask);
    }
    
    const task: DecomposedTask = {
      id: this.generateId(),
      originalPrompt: prompt,
      subtasks,
      strategy: this.determineStrategy(subtasks),
      maxDuration: 10,
      successCriteria: this.determineCriteria(prompt, subtasks)
    };
    
    this.emit('task-decomposed', task);
    return task;
  }
  
  private createSubtask(id: string, prompt: string, duration: number): Subtask {
    return {
      id,
      prompt,
      duration,
      orthogonal: true,
      dependencies: [],
      verifiable: true,
      expectedOutput: this.inferExpectedOutput(prompt)
    };
  }
  
  private inferExpectedOutput(prompt: string): string {
    if (prompt.includes('test')) return 'test files created';
    if (prompt.includes('API')) return 'endpoint handlers created';
    if (prompt.includes('UI')) return 'component files created';
    if (prompt.includes('Python')) return '.py files created';
    if (prompt.includes('JavaScript')) return '.js files created';
    return 'implementation files created';
  }
  
  private determineStrategy(subtasks: Subtask[]): 'parallel' | 'sequential' | 'race' {
    // If all tasks are orthogonal, run in parallel
    const allOrthogonal = subtasks.every(t => t.orthogonal && t.dependencies.length === 0);
    if (allOrthogonal) return 'parallel';
    
    // If tasks have dependencies, sequential
    const hasDependencies = subtasks.some(t => t.dependencies.length > 0);
    if (hasDependencies) return 'sequential';
    
    // Multiple approaches to same problem = race
    const hasApproaches = subtasks.some(t => t.id.includes('approach'));
    if (hasApproaches) return 'race';
    
    return 'parallel';
  }
  
  private determineCriteria(prompt: string, subtasks: Subtask[]): SuccessCriteria {
    return {
      filesCreated: subtasks.map(t => '*'), // Any files
      hasImplementation: true,
      noTodos: true,
      codeExecutes: prompt.includes('working') || prompt.includes('run'),
      testsPass: subtasks.some(t => t.id.includes('test'))
    };
  }
  
  private generateId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Validate if a task meets its success criteria
  validateSuccess(task: DecomposedTask, actualOutput: string): boolean {
    const criteria = task.successCriteria;
    
    // Check for TODOs
    if (criteria.noTodos && /TODO:/i.test(actualOutput)) {
      logDebug('DECOMPOSER', 'Failed: Contains TODOs');
      return false;
    }
    
    // Check for implementation
    if (criteria.hasImplementation) {
      const hasCode = /```|def |class |function |const |let |var /i.test(actualOutput);
      const hasFiles = /File created|Successfully wrote/i.test(actualOutput);
      if (!hasCode && !hasFiles) {
        logDebug('DECOMPOSER', 'Failed: No implementation found');
        return false;
      }
    }
    
    // Check for files
    if (criteria.filesCreated && criteria.filesCreated.length > 0) {
      const hasFileCreation = /File created successfully/i.test(actualOutput);
      if (!hasFileCreation) {
        logDebug('DECOMPOSER', 'Failed: No files created');
        return false;
      }
    }
    
    return true;
  }
}