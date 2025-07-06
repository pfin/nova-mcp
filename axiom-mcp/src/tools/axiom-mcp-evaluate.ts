import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { StatusManager, TaskStatus } from '../status-manager.js';
import { ContextManager } from '../context-manager.js';
import { ClaudeCodeSubprocess } from '../claude-subprocess.js';
import { v4 as uuidv4 } from 'uuid';
import { TASK_TYPES, validateTaskOutput } from '../task-types.js';
import { validateUniversalRules } from '../base-system-prompt.js';
import { execSync } from 'child_process';

export const axiomMcpEvaluateSchema = z.object({
  taskId: z.string().describe('Task ID to evaluate'),
  evaluationType: z.enum(['quality', 'relevance', 'completeness', 'accuracy']).describe('Type of evaluation'),
  parentExpectations: z.object({
    requiredElements: z.array(z.string()).describe('Elements that must be present'),
    qualityThreshold: z.number().min(0).max(1).default(0.7).describe('Minimum quality score'),
    rejectIfMissing: z.array(z.string()).optional().describe('Reject if these elements are missing'),
  }).optional(),
  autoRetry: z.boolean().default(true).describe('Automatically retry rejected tasks'),
  maxRetries: z.number().default(3).describe('Maximum retry attempts'),
});

export type axiomMcpEvaluateInput = z.infer<typeof axiomMcpEvaluateSchema>;

export const axiomMcpEvaluateTool = {
  name: 'axiom_mcp_evaluate',
  description: 'Critically evaluate task outputs and reject/retry low-quality results',
  inputSchema: zodToJsonSchema(axiomMcpEvaluateSchema),
};

interface EvaluationResult {
  taskId: string;
  passed: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
  missingElements: string[];
  retryPrompt?: string;
}

// Store evaluation history
const evaluationHistory = new Map<string, EvaluationResult[]>();

export async function handleAxiomMcpEvaluate(
  input: axiomMcpEvaluateInput,
  statusManager: StatusManager,
  contextManager: ContextManager,
  claudeCode: ClaudeCodeSubprocess
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Get temporal context
    const startDate = execSync('date', { encoding: 'utf-8' }).trim();
    console.error(`[TEMPORAL] Evaluation start: ${startDate}`);
    
    const task = statusManager.getTask(input.taskId);
    if (!task) {
      throw new Error(`Task ${input.taskId} not found`);
    }

    // Get parent task for context
    let parentTask: TaskStatus | undefined;
    if (task.parentTask) {
      parentTask = statusManager.getTask(task.parentTask);
    }

    // Perform evaluation
    const evaluation = await evaluateTaskOutput(
      task,
      parentTask,
      input.evaluationType,
      input.parentExpectations,
      claudeCode
    );
    
    // Update task with validation results and MCTS stats
    statusManager.updateTask(task.id, {
      validationPassed: evaluation.passed,
      validationIssues: evaluation.issues,
      mctsStats: {
        ...task.mctsStats,
        visits: (task.mctsStats?.visits || 0) + 1,
        totalReward: (task.mctsStats?.totalReward || 0) + evaluation.score,
        averageReward: ((task.mctsStats?.totalReward || 0) + evaluation.score) / ((task.mctsStats?.visits || 0) + 1),
        untriedActions: task.mctsStats?.untriedActions || [],
        lastVisited: new Date(),
      },
    });

    // Store evaluation
    if (!evaluationHistory.has(input.taskId)) {
      evaluationHistory.set(input.taskId, []);
    }
    evaluationHistory.get(input.taskId)!.push(evaluation);
    
    // MCTS Backpropagation: Update all parent tasks up the tree
    await backpropagateReward(task, evaluation.score, statusManager);

    // Handle rejection and retry
    let retryResult = '';
    if (!evaluation.passed && input.autoRetry) {
      const retryCount = evaluationHistory.get(input.taskId)!.length - 1;
      
      if (retryCount < input.maxRetries) {
        retryResult = await retryTask(
          task,
          evaluation,
          statusManager,
          claudeCode
        );
      } else {
        retryResult = `\n\n⚠️ **Max retries (${input.maxRetries}) reached. Task remains rejected.**`;
      }
    }

    // Format output
    let output = formatEvaluationResult(task, evaluation, parentTask);
    output += retryResult;

    return {
      content: [
        {
          type: 'text',
          text: output,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}

async function evaluateTaskOutput(
  task: TaskStatus,
  parentTask: TaskStatus | undefined,
  evaluationType: string,
  expectations: any,
  claudeCode: ClaudeCodeSubprocess
): Promise<EvaluationResult> {
  // First, check universal validation rules
  const universalValidation = validateUniversalRules(task.output || '');
  if (!universalValidation.passed) {
    console.error(`[EVALUATION] Universal validation failed for ${task.id}:`, universalValidation.errors);
  }
  if (universalValidation.warnings.length > 0) {
    console.warn(`[EVALUATION] Universal validation warnings for ${task.id}:`, universalValidation.warnings);
  }
  
  // Log meta-cognitive score
  console.error(`[EVALUATION] Meta-cognitive score for ${task.id}: ${(universalValidation.metaCognitiveScore * 100).toFixed(0)}%`);
  
  // Then check task type validation if available
  let taskTypeValidation = null;
  let taskTypeIssues: string[] = [];
  
  if (task.taskTypeId && TASK_TYPES[task.taskTypeId]) {
    const taskType = TASK_TYPES[task.taskTypeId];
    taskTypeValidation = validateTaskOutput(task.output || '', taskType);
    
    if (!taskTypeValidation.valid) {
      taskTypeIssues = taskTypeValidation.issues;
      console.error(`[EVALUATION] Task type validation failed for ${task.id}:`, taskTypeIssues);
    }
  }
  
  const evaluationPrompt = `
You are a critical evaluator assessing research quality.

Task: ${task.prompt}
Task Type: ${task.taskType || 'General'} (${task.taskTypeId || 'none'})
${parentTask ? `Parent Task: ${parentTask.prompt}` : ''}

Output to evaluate:
${task.output || 'NO OUTPUT PROVIDED'}

Evaluation Type: ${evaluationType}

${!universalValidation.passed ? `
UNIVERSAL VALIDATION ERRORS:
${universalValidation.errors.map(err => `- ${err}`).join('\n')}
` : ''}

${universalValidation.warnings.length > 0 ? `
UNIVERSAL VALIDATION WARNINGS:
${universalValidation.warnings.map(warn => `- ${warn}`).join('\n')}
` : ''}

${taskTypeValidation && !taskTypeValidation.valid ? `
Task Type Validation Failed:
${taskTypeIssues.map(issue => `- ${issue}`).join('\n')}
` : ''}

${expectations ? `
Required Elements:
${expectations.requiredElements.map((e: string) => `- ${e}`).join('\n')}

Reject if Missing:
${expectations.rejectIfMissing?.map((e: string) => `- ${e}`).join('\n') || 'None specified'}

Quality Threshold: ${expectations.qualityThreshold * 100}%
` : ''}

Please evaluate critically:

1. QUALITY SCORE (0-1):
   - 0.9-1.0: Exceptional, exceeds expectations
   - 0.7-0.9: Good, meets requirements
   - 0.5-0.7: Acceptable but needs improvement
   - 0.3-0.5: Poor, significant issues
   - 0.0-0.3: Unacceptable, fundamental problems

2. ISSUES (be specific):
   - List concrete problems
   - Identify missing information
   - Note any inaccuracies or contradictions
   - Flag irrelevant content

3. MISSING ELEMENTS:
   - What required elements are absent?
   - What critical information is lacking?

4. SUGGESTIONS:
   - Specific improvements needed
   - What to focus on in retry

5. RETRY PROMPT (if score < threshold):
   - Write a specific prompt to address the issues
   - Be direct about what went wrong
   - Include concrete requirements

Output format:
SCORE: [0-1]
PASSED: [true/false]
ISSUES:
- Issue 1
- Issue 2
MISSING:
- Element 1
- Element 2
SUGGESTIONS:
- Suggestion 1
- Suggestion 2
RETRY_PROMPT:
[Detailed prompt for retry]`;

  const result = await claudeCode.execute(evaluationPrompt, {
    timeout: 60000, // 1 minute
  });

  // Parse evaluation result
  const parsedEval = parseEvaluationResult(task.id, result.response, expectations?.qualityThreshold || 0.7);
  
  // Merge universal validation results
  if (!universalValidation.passed) {
    parsedEval.passed = false;
    parsedEval.issues = [...universalValidation.errors, ...parsedEval.issues];
    parsedEval.suggestions.push('Fix universal validation errors before proceeding.');
    
    // Universal failures are critical - set very low score
    parsedEval.score = Math.min(parsedEval.score, 0.3);
  }
  
  // Add warnings to issues (but don't fail)
  if (universalValidation.warnings.length > 0) {
    parsedEval.issues = [...parsedEval.issues, ...universalValidation.warnings];
  }
  
  // Merge task type validation results
  if (taskTypeValidation && !taskTypeValidation.valid) {
    parsedEval.passed = false;
    parsedEval.issues = [...taskTypeIssues, ...parsedEval.issues];
    parsedEval.suggestions = [...(taskTypeValidation.suggestions || []), ...parsedEval.suggestions];
    
    // Adjust score based on task type validation failure
    parsedEval.score = Math.min(parsedEval.score, 0.5);
  }
  
  // CRITICAL: Incorporate meta-cognitive score into final reward
  // This ensures tasks that don't follow BEFORE/AFTER/HOW score lower
  const metaCognitiveMultiplier = 0.8 + (universalValidation.metaCognitiveScore * 0.2);
  parsedEval.score *= metaCognitiveMultiplier;
  
  // Add meta-cognitive feedback
  if (universalValidation.metaCognitiveScore < 1.0) {
    parsedEval.suggestions.push(`Meta-cognitive score: ${(universalValidation.metaCognitiveScore * 100).toFixed(0)}% - Follow BEFORE/AFTER/HOW pattern for better results`);
  }
  
  return parsedEval;
}

/**
 * Backpropagate reward up the task tree (MCTS backpropagation phase)
 */
async function backpropagateReward(
  task: TaskStatus,
  reward: number,
  statusManager: StatusManager
): Promise<void> {
  let currentTask: TaskStatus | undefined = task;
  let currentReward = reward;
  
  // Propagate up the tree with decay
  while (currentTask && currentTask.parentTask) {
    const parentTask = statusManager.getTask(currentTask.parentTask);
    if (!parentTask) break;
    
    // Update parent's MCTS stats
    const parentStats = parentTask.mctsStats || {
      visits: 0,
      totalReward: 0,
      averageReward: 0,
      untriedActions: [],
      lastVisited: new Date(),
    };
    
    parentStats.visits += 1;
    parentStats.totalReward += currentReward;
    parentStats.averageReward = parentStats.totalReward / parentStats.visits;
    parentStats.lastVisited = new Date();
    
    statusManager.updateTask(parentTask.id, {
      mctsStats: parentStats,
    });
    
    console.error(`[MCTS] Backpropagated reward ${currentReward.toFixed(3)} to parent ${parentTask.id}`);
    
    // Decay reward as we go up (parent gets 90% of child's reward)
    currentReward *= 0.9;
    currentTask = parentTask;
  }
}

function parseEvaluationResult(taskId: string, response: string, threshold: number): EvaluationResult {
  const lines = response.split('\n');
  const evaluation: EvaluationResult = {
    taskId,
    passed: false,
    score: 0,
    issues: [],
    suggestions: [],
    missingElements: [],
  };

  let section = '';
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('SCORE:')) {
      evaluation.score = parseFloat(trimmed.replace('SCORE:', '').trim()) || 0;
      evaluation.passed = evaluation.score >= threshold;
    } else if (trimmed.startsWith('PASSED:')) {
      // Use parsed boolean if score parsing failed
      if (evaluation.score === 0) {
        evaluation.passed = trimmed.includes('true');
      }
    } else if (trimmed === 'ISSUES:') {
      section = 'issues';
    } else if (trimmed === 'MISSING:') {
      section = 'missing';
    } else if (trimmed === 'SUGGESTIONS:') {
      section = 'suggestions';
    } else if (trimmed === 'RETRY_PROMPT:') {
      section = 'retry';
    } else if (trimmed.startsWith('- ')) {
      const item = trimmed.substring(2);
      if (section === 'issues') {
        evaluation.issues.push(item);
      } else if (section === 'missing') {
        evaluation.missingElements.push(item);
      } else if (section === 'suggestions') {
        evaluation.suggestions.push(item);
      }
    } else if (section === 'retry' && trimmed) {
      evaluation.retryPrompt = (evaluation.retryPrompt || '') + trimmed + '\n';
    }
  }

  // Ensure we have a score
  if (evaluation.score === 0 && evaluation.passed) {
    evaluation.score = threshold;
  }

  return evaluation;
}

async function retryTask(
  task: TaskStatus,
  evaluation: EvaluationResult,
  statusManager: StatusManager,
  claudeCode: ClaudeCodeSubprocess
): Promise<string> {
  console.error(`[EVALUATE] Retrying rejected task ${task.id}`);
  
  // Create retry task
  const retryId = uuidv4();
  const retryPrompt = evaluation.retryPrompt || `
Previous attempt was rejected. Issues found:
${evaluation.issues.join('\n')}

Missing elements:
${evaluation.missingElements.join('\n')}

Please retry with these improvements:
${evaluation.suggestions.join('\n')}

Original task: ${task.prompt}`;

  const retryTask: TaskStatus = {
    id: retryId,
    prompt: retryPrompt,
    status: 'running',
    startTime: new Date(),
    depth: task.depth,
    parentTask: task.parentTask,
  };

  statusManager.addTask(retryTask);

  // Execute retry
  try {
    const result = await claudeCode.execute(retryPrompt, {
      timeout: 300000, // 5 minutes
    });

    statusManager.updateTask(retryId, {
      status: 'completed',
      output: result.response,
    });

    // Update original task with retry reference
    if (!task.childTasks) {
      task.childTasks = [];
    }
    task.childTasks.push(retryId);
    statusManager.updateTask(task.id, task);

    return `\n\n## Retry Executed\n**New Task ID**: ${retryId}\n**Status**: Completed\n\nRetry output will be evaluated separately.`;
  } catch (error) {
    statusManager.updateTask(retryId, {
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    });

    return `\n\n## Retry Failed\n**New Task ID**: ${retryId}\n**Error**: ${error}`;
  }
}

function formatEvaluationResult(
  task: TaskStatus,
  evaluation: EvaluationResult,
  parentTask?: TaskStatus
): string {
  const statusEmoji = evaluation.passed ? '✅' : '❌';
  
  let output = `# Task Evaluation: ${statusEmoji} ${evaluation.passed ? 'PASSED' : 'REJECTED'}\n\n`;
  output += `**Task**: ${task.prompt}\n`;
  if (parentTask) {
    output += `**Parent**: ${parentTask.prompt}\n`;
  }
  output += `**Score**: ${(evaluation.score * 100).toFixed(0)}%\n\n`;

  if (evaluation.issues.length > 0) {
    output += `## Issues Found\n`;
    evaluation.issues.forEach(issue => {
      output += `- ❗ ${issue}\n`;
    });
    output += '\n';
  }

  if (evaluation.missingElements.length > 0) {
    output += `## Missing Elements\n`;
    evaluation.missingElements.forEach(element => {
      output += `- ❌ ${element}\n`;
    });
    output += '\n';
  }

  if (evaluation.suggestions.length > 0) {
    output += `## Improvement Suggestions\n`;
    evaluation.suggestions.forEach(suggestion => {
      output += `- 💡 ${suggestion}\n`;
    });
    output += '\n';
  }

  // Show evaluation history
  const history = evaluationHistory.get(task.id);
  if (history && history.length > 1) {
    output += `## Evaluation History\n`;
    history.forEach((evalResult, index) => {
      output += `${index + 1}. Score: ${(evalResult.score * 100).toFixed(0)}% - ${evalResult.passed ? 'Passed' : 'Rejected'}\n`;
    });
    output += '\n';
  }

  return output;
}

// Export function to get evaluation history
export function getTaskEvaluationHistory(taskId: string): EvaluationResult[] {
  return evaluationHistory.get(taskId) || [];
}

// Export function to clear evaluation history
export function clearEvaluationHistory(): void {
  evaluationHistory.clear();
}