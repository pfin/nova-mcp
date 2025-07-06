import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
export const axiomMcpGoalsSchema = z.object({
    action: z.enum(['define', 'propagate', 'evaluate', 'track']).describe('Goal management action'),
    taskId: z.string().describe('Task ID to operate on'),
    goalDefinition: z.object({
        objective: z.string().describe('What needs to be achieved'),
        successCriteria: z.array(z.string()).describe('Measurable success criteria'),
        constraints: z.array(z.string()).optional().describe('Constraints or limitations'),
        priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
    }).optional().describe('Goal definition for define action'),
    propagationStrategy: z.enum(['inherit', 'decompose', 'transform']).optional().describe('How goals propagate to children'),
});
export const axiomMcpGoalsTool = {
    name: 'axiom_mcp_goals',
    description: 'Define, propagate, and evaluate goal-oriented research success criteria across tree levels',
    inputSchema: zodToJsonSchema(axiomMcpGoalsSchema),
};
// Goal storage (in production, this would be persisted)
const goalStore = new Map();
export async function handleAxiomMcpGoals(input, statusManager, contextManager) {
    try {
        let output = '';
        switch (input.action) {
            case 'define':
                output = await defineGoal(input.taskId, input.goalDefinition, statusManager);
                break;
            case 'propagate':
                output = await propagateGoals(input.taskId, input.propagationStrategy || 'inherit', statusManager, contextManager);
                break;
            case 'evaluate':
                output = await evaluateGoals(input.taskId, statusManager, contextManager);
                break;
            case 'track':
                output = await trackGoalProgress(input.taskId, statusManager);
                break;
        }
        return {
            content: [
                {
                    type: 'text',
                    text: output,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Goal operation failed: ${error instanceof Error ? error.message : String(error)}`,
                },
            ],
        };
    }
}
async function defineGoal(taskId, goalDef, statusManager) {
    const task = statusManager.getTask(taskId);
    if (!task) {
        throw new Error(`Task ${taskId} not found`);
    }
    const goal = {
        id: `goal_${taskId}`,
        taskId,
        objective: goalDef.objective,
        successCriteria: goalDef.successCriteria,
        constraints: goalDef.constraints,
        priority: goalDef.priority,
    };
    // Find parent goal if task has parent
    if (task.parentTask) {
        const parentGoal = goalStore.get(`goal_${task.parentTask}`);
        if (parentGoal) {
            goal.parentGoalId = parentGoal.id;
        }
    }
    goalStore.set(goal.id, goal);
    let output = `# Goal Defined for Task\n\n`;
    output += `**Task**: ${task.prompt}\n`;
    output += `**Objective**: ${goal.objective}\n\n`;
    output += `## Success Criteria\n`;
    goal.successCriteria.forEach((criterion, index) => {
        output += `${index + 1}. ${criterion}\n`;
    });
    if (goal.constraints && goal.constraints.length > 0) {
        output += `\n## Constraints\n`;
        goal.constraints.forEach((constraint, index) => {
            output += `${index + 1}. ${constraint}\n`;
        });
    }
    output += `\n**Priority**: ${goal.priority}\n`;
    return output;
}
async function propagateGoals(taskId, strategy, statusManager, contextManager) {
    const task = statusManager.getTask(taskId);
    if (!task) {
        throw new Error(`Task ${taskId} not found`);
    }
    const goal = goalStore.get(`goal_${taskId}`);
    if (!goal) {
        throw new Error(`No goal defined for task ${taskId}`);
    }
    const tree = statusManager.getTaskTree(taskId);
    if (!tree || !tree.children || tree.children.length === 0) {
        return 'No child tasks to propagate goals to';
    }
    let output = `# Goal Propagation\n\n`;
    output += `**Strategy**: ${strategy}\n`;
    output += `**Parent Goal**: ${goal.objective}\n\n`;
    output += `## Child Goals\n\n`;
    // Propagate to each child
    for (const child of tree.children) {
        const childGoal = await createChildGoal(goal, child, strategy, statusManager);
        goalStore.set(childGoal.id, childGoal);
        output += `### ${child.prompt}\n`;
        output += `**Objective**: ${childGoal.objective}\n`;
        output += `**Success Criteria**:\n`;
        childGoal.successCriteria.forEach((criterion, index) => {
            output += `${index + 1}. ${criterion}\n`;
        });
        output += '\n';
    }
    return output;
}
async function createChildGoal(parentGoal, childTask, strategy, statusManager) {
    const childGoal = {
        id: `goal_${childTask.id}`,
        taskId: childTask.id,
        objective: '',
        successCriteria: [],
        priority: parentGoal.priority,
        parentGoalId: parentGoal.id,
        propagationStrategy: strategy,
    };
    switch (strategy) {
        case 'inherit':
            // Child inherits parent's goal directly
            childGoal.objective = parentGoal.objective;
            childGoal.successCriteria = [...parentGoal.successCriteria];
            childGoal.constraints = parentGoal.constraints ? [...parentGoal.constraints] : undefined;
            break;
        case 'decompose':
            // Child goal is a sub-goal contributing to parent
            childGoal.objective = `Contribute to: ${parentGoal.objective} by ${childTask.prompt}`;
            // Create criteria specific to this subtask
            childGoal.successCriteria = decomposeSuccessCriteria(parentGoal.successCriteria, childTask.prompt);
            break;
        case 'transform':
            // Child goal is transformed based on task context
            childGoal.objective = transformObjective(parentGoal.objective, childTask.prompt);
            childGoal.successCriteria = transformSuccessCriteria(parentGoal.successCriteria, childTask.prompt);
            break;
    }
    return childGoal;
}
function decomposeSuccessCriteria(parentCriteria, childPrompt) {
    // Decompose parent criteria into child-specific criteria
    const childCriteria = [];
    // Extract key aspects from child prompt
    const keywords = extractKeywords(childPrompt);
    parentCriteria.forEach(criterion => {
        // Create more specific criteria for this subtask
        if (keywords.some(keyword => criterion.toLowerCase().includes(keyword.toLowerCase()))) {
            childCriteria.push(`Specifically for ${childPrompt}: ${criterion}`);
        }
        else {
            // Create a decomposed version
            childCriteria.push(`Support parent goal by: ${criterion} (in context of ${childPrompt})`);
        }
    });
    // Add child-specific success criteria
    childCriteria.push(`Complete task: ${childPrompt}`);
    childCriteria.push(`Provide findings that contribute to parent objective`);
    return childCriteria;
}
function transformObjective(parentObjective, childPrompt) {
    // Transform objective based on child task
    const keywords = extractKeywords(childPrompt);
    // Create transformed objective
    return `${parentObjective} - specifically through ${childPrompt}`;
}
function transformSuccessCriteria(parentCriteria, childPrompt) {
    const keywords = extractKeywords(childPrompt);
    return parentCriteria.map(criterion => {
        // Transform each criterion based on child context
        return `${criterion} (adapted for ${keywords.join(', ')})`;
    });
}
function extractKeywords(prompt) {
    // Simple keyword extraction (in production, use NLP)
    const stopWords = ['a', 'an', 'the', 'for', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'by'];
    return prompt
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.includes(word))
        .slice(0, 3);
}
async function evaluateGoals(taskId, statusManager, contextManager) {
    const task = statusManager.getTask(taskId);
    if (!task) {
        throw new Error(`Task ${taskId} not found`);
    }
    const goal = goalStore.get(`goal_${taskId}`);
    if (!goal) {
        throw new Error(`No goal defined for task ${taskId}`);
    }
    // Get task context and output
    const context = contextManager.getContext(taskId);
    const taskOutput = task.output || '';
    // Evaluate each success criterion
    const evaluation = evaluateSuccessCriteria(goal.successCriteria, taskOutput, context, task);
    // Update goal with evaluation
    goal.evaluation = {
        status: determineGoalStatus(evaluation),
        achievedCriteria: evaluation.achieved,
        missingCriteria: evaluation.missing,
        confidence: evaluation.confidence,
        evidence: evaluation.evidence,
        evaluatedAt: new Date(),
    };
    goalStore.set(goal.id, goal);
    // Format output
    let output = `# Goal Evaluation\n\n`;
    output += `**Task**: ${task.prompt}\n`;
    output += `**Objective**: ${goal.objective}\n`;
    output += `**Status**: ${goal.evaluation.status}\n`;
    output += `**Confidence**: ${(goal.evaluation.confidence * 100).toFixed(0)}%\n\n`;
    output += `## Success Criteria Evaluation\n\n`;
    output += `### ✅ Achieved (${evaluation.achieved.length}/${goal.successCriteria.length})\n`;
    evaluation.achieved.forEach(criterion => {
        output += `- ${criterion}\n`;
    });
    if (evaluation.missing.length > 0) {
        output += `\n### ❌ Missing (${evaluation.missing.length}/${goal.successCriteria.length})\n`;
        evaluation.missing.forEach(criterion => {
            output += `- ${criterion}\n`;
        });
    }
    if (evaluation.evidence.length > 0) {
        output += `\n## Evidence\n`;
        evaluation.evidence.forEach((evidence, index) => {
            output += `${index + 1}. ${evidence}\n`;
        });
    }
    // Evaluate child goals if any
    const tree = statusManager.getTaskTree(taskId);
    if (tree.children && tree.children.length > 0) {
        output += `\n## Child Goal Status\n`;
        for (const child of tree.children) {
            const childGoal = goalStore.get(`goal_${child.id}`);
            if (childGoal && childGoal.evaluation) {
                output += `- ${child.prompt}: ${childGoal.evaluation.status}\n`;
            }
        }
    }
    return output;
}
function evaluateSuccessCriteria(criteria, taskOutput, context, task) {
    const achieved = [];
    const missing = [];
    const evidence = [];
    // Simple keyword-based evaluation (in production, use NLP/LLM)
    criteria.forEach(criterion => {
        const keywords = extractKeywords(criterion);
        const found = keywords.filter(keyword => taskOutput.toLowerCase().includes(keyword.toLowerCase()));
        if (found.length > keywords.length * 0.6) {
            achieved.push(criterion);
            evidence.push(`Found keywords: ${found.join(', ')} in output`);
        }
        else {
            missing.push(criterion);
        }
    });
    // Consider task completion status
    if (task.status === 'completed') {
        evidence.push('Task completed successfully');
    }
    else if (task.status === 'failed') {
        evidence.push('Task failed - automatic criteria failure');
        return {
            achieved: [],
            missing: criteria,
            confidence: 0,
            evidence,
        };
    }
    // Calculate confidence
    const confidence = achieved.length / criteria.length;
    return {
        achieved,
        missing,
        confidence,
        evidence,
    };
}
function determineGoalStatus(evaluation) {
    if (evaluation.confidence >= 0.9)
        return 'achieved';
    if (evaluation.confidence >= 0.5)
        return 'partial';
    if (evaluation.confidence > 0)
        return 'in_progress';
    return 'failed';
}
async function trackGoalProgress(taskId, statusManager) {
    const tree = statusManager.getTaskTree(taskId);
    if (!tree) {
        throw new Error(`Task ${taskId} not found`);
    }
    let output = `# Goal Progress Tracking\n\n`;
    // Recursive progress tracking
    const progress = calculateTreeProgress(tree, 0);
    output += `## Overall Progress\n`;
    output += `- **Total Goals**: ${progress.totalGoals}\n`;
    output += `- **Achieved**: ${progress.achieved} (${(progress.achieved / progress.totalGoals * 100).toFixed(0)}%)\n`;
    output += `- **Partial**: ${progress.partial}\n`;
    output += `- **Failed**: ${progress.failed}\n`;
    output += `- **In Progress**: ${progress.inProgress}\n`;
    output += `- **Not Started**: ${progress.notStarted}\n\n`;
    output += `## Progress by Level\n`;
    progress.byLevel.forEach((levelProgress, level) => {
        const completion = levelProgress.achieved / levelProgress.total * 100;
        output += `- **Level ${level}**: ${completion.toFixed(0)}% complete (${levelProgress.achieved}/${levelProgress.total})\n`;
    });
    output += `\n## Goal Hierarchy\n`;
    output += formatGoalHierarchy(tree, 0);
    return output;
}
function calculateTreeProgress(tree, level) {
    const progress = {
        totalGoals: 0,
        achieved: 0,
        partial: 0,
        failed: 0,
        inProgress: 0,
        notStarted: 0,
        byLevel: new Map(),
    };
    function traverse(node, currentLevel) {
        const goal = goalStore.get(`goal_${node.id}`);
        if (goal) {
            progress.totalGoals++;
            if (!progress.byLevel.has(currentLevel)) {
                progress.byLevel.set(currentLevel, { total: 0, achieved: 0 });
            }
            const levelProgress = progress.byLevel.get(currentLevel);
            levelProgress.total++;
            if (goal.evaluation) {
                switch (goal.evaluation.status) {
                    case 'achieved':
                        progress.achieved++;
                        levelProgress.achieved++;
                        break;
                    case 'partial':
                        progress.partial++;
                        break;
                    case 'failed':
                        progress.failed++;
                        break;
                    case 'in_progress':
                        progress.inProgress++;
                        break;
                }
            }
            else {
                progress.notStarted++;
            }
        }
        if (node.children) {
            node.children.forEach((child) => traverse(child, currentLevel + 1));
        }
    }
    traverse(tree, level);
    return progress;
}
function formatGoalHierarchy(tree, depth) {
    const indent = '  '.repeat(depth);
    const goal = goalStore.get(`goal_${tree.id}`);
    if (!goal) {
        return `${indent}❓ No goal defined\n`;
    }
    const statusIcon = goal.evaluation ?
        (goal.evaluation.status === 'achieved' ? '✅' :
            goal.evaluation.status === 'partial' ? '🟨' :
                goal.evaluation.status === 'failed' ? '❌' : '🔄') : '⏳';
    let output = `${indent}${statusIcon} ${goal.objective.substring(0, 60)}...\n`;
    if (goal.evaluation) {
        output += `${indent}   Confidence: ${(goal.evaluation.confidence * 100).toFixed(0)}%\n`;
    }
    if (tree.children) {
        tree.children.forEach((child) => {
            output += formatGoalHierarchy(child, depth + 1);
        });
    }
    return output;
}
//# sourceMappingURL=axiom-mcp-goals.js.map