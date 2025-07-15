/**
 * Task Decomposition Hook - Breaks work into 5-10 minute orthogonal tasks
 * Enables multi-threading by identifying independent subtasks
 */
import { HookEvent } from '../core/hook-orchestrator.js';
import { Logger } from '../core/logger.js';
const logger = Logger.getInstance();
export const taskDecompositionHook = {
    name: 'task-decomposition-hook',
    events: [HookEvent.REQUEST_RECEIVED],
    priority: 95, // Run early to decompose before validation
    handler: async (context) => {
        const { request } = context;
        const prompt = request?.args?.prompt || request?.args?.parentPrompt || '';
        // Only decompose if explicitly requested or complex task detected
        if (!shouldDecompose(prompt)) {
            return { action: 'continue' };
        }
        logger.info('TaskDecompositionHook', 'analyze', 'Analyzing task for decomposition', {
            prompt: prompt.slice(0, 100)
        });
        // Decompose into orthogonal subtasks
        const subtasks = decomposeTask(prompt);
        if (subtasks.length > 1) {
            logger.info('TaskDecompositionHook', 'decompose', `Decomposed into ${subtasks.length} subtasks`);
            // Group parallelizable tasks
            const groups = groupParallelizableTasks(subtasks);
            return {
                action: 'modify',
                modifications: {
                    request: {
                        ...request,
                        args: {
                            ...request?.args,
                            decomposedTasks: subtasks,
                            parallelGroups: groups,
                            spawnPattern: 'parallel-groups',
                            metadata: {
                                ...request?.args?.metadata,
                                decomposed: true,
                                taskCount: subtasks.length,
                                parallelGroupCount: groups.length
                            }
                        }
                    }
                }
            };
        }
        return { action: 'continue' };
    }
};
function shouldDecompose(prompt) {
    const complexIndicators = [
        'implement',
        'create',
        'build',
        'develop',
        'design',
        'refactor',
        'migrate',
        'integrate',
        'multiple',
        'system',
        'api',
        'database',
        'frontend',
        'backend'
    ];
    const lowerPrompt = prompt.toLowerCase();
    return complexIndicators.some(indicator => lowerPrompt.includes(indicator));
}
function decomposeTask(prompt) {
    const subtasks = [];
    const lowerPrompt = prompt.toLowerCase();
    // Example decomposition patterns
    if (lowerPrompt.includes('rest api')) {
        subtasks.push({
            id: 'api-1',
            description: 'Create API project structure and dependencies',
            estimatedMinutes: 5,
            dependencies: [],
            category: 'setup',
            parallelizable: false
        }, {
            id: 'api-2',
            description: 'Implement data models and schemas',
            estimatedMinutes: 10,
            dependencies: ['api-1'],
            category: 'implementation',
            parallelizable: false
        }, {
            id: 'api-3',
            description: 'Create authentication middleware',
            estimatedMinutes: 10,
            dependencies: ['api-1'],
            category: 'implementation',
            parallelizable: true
        }, {
            id: 'api-4',
            description: 'Implement CRUD endpoints',
            estimatedMinutes: 10,
            dependencies: ['api-2'],
            category: 'implementation',
            parallelizable: true
        }, {
            id: 'api-5',
            description: 'Add validation and error handling',
            estimatedMinutes: 5,
            dependencies: ['api-4'],
            category: 'implementation',
            parallelizable: true
        }, {
            id: 'api-6',
            description: 'Write unit tests',
            estimatedMinutes: 10,
            dependencies: ['api-4', 'api-3'],
            category: 'testing',
            parallelizable: true
        }, {
            id: 'api-7',
            description: 'Create API documentation',
            estimatedMinutes: 5,
            dependencies: ['api-4'],
            category: 'documentation',
            parallelizable: true
        });
    }
    else if (lowerPrompt.includes('factorial') && lowerPrompt.includes('multiple')) {
        // Decompose factorial in multiple languages
        const languages = ['python', 'javascript', 'java', 'rust', 'go'];
        const detectedLangs = languages.filter(lang => lowerPrompt.includes(lang));
        const targetLangs = detectedLangs.length > 0 ? detectedLangs : ['python', 'javascript', 'java'];
        targetLangs.forEach((lang, index) => {
            subtasks.push({
                id: `factorial-${lang}`,
                description: `Implement factorial function in ${lang}`,
                estimatedMinutes: 5,
                dependencies: [],
                category: 'implementation',
                parallelizable: true
            });
        });
        // Add testing task
        subtasks.push({
            id: 'factorial-test',
            description: 'Create test cases for all implementations',
            estimatedMinutes: 5,
            dependencies: targetLangs.map(lang => `factorial-${lang}`),
            category: 'testing',
            parallelizable: false
        });
    }
    else if (lowerPrompt.includes('frontend') && lowerPrompt.includes('backend')) {
        // Full-stack decomposition
        subtasks.push({
            id: 'stack-1',
            description: 'Set up project monorepo structure',
            estimatedMinutes: 5,
            dependencies: [],
            category: 'setup',
            parallelizable: false
        }, {
            id: 'backend-1',
            description: 'Initialize backend server and database',
            estimatedMinutes: 10,
            dependencies: ['stack-1'],
            category: 'implementation',
            parallelizable: true
        }, {
            id: 'frontend-1',
            description: 'Initialize frontend framework and routing',
            estimatedMinutes: 10,
            dependencies: ['stack-1'],
            category: 'implementation',
            parallelizable: true
        }, {
            id: 'backend-2',
            description: 'Implement backend API endpoints',
            estimatedMinutes: 10,
            dependencies: ['backend-1'],
            category: 'implementation',
            parallelizable: false
        }, {
            id: 'frontend-2',
            description: 'Create frontend components and views',
            estimatedMinutes: 10,
            dependencies: ['frontend-1'],
            category: 'implementation',
            parallelizable: false
        }, {
            id: 'integration-1',
            description: 'Connect frontend to backend API',
            estimatedMinutes: 5,
            dependencies: ['backend-2', 'frontend-2'],
            category: 'integration',
            parallelizable: false
        });
    }
    // If no specific pattern matched, create generic decomposition
    if (subtasks.length === 0) {
        subtasks.push({
            id: 'task-1',
            description: 'Analyze requirements and create plan',
            estimatedMinutes: 5,
            dependencies: [],
            category: 'setup',
            parallelizable: false
        }, {
            id: 'task-2',
            description: 'Implement core functionality',
            estimatedMinutes: 10,
            dependencies: ['task-1'],
            category: 'implementation',
            parallelizable: false
        }, {
            id: 'task-3',
            description: 'Add error handling and validation',
            estimatedMinutes: 5,
            dependencies: ['task-2'],
            category: 'implementation',
            parallelizable: true
        }, {
            id: 'task-4',
            description: 'Write tests',
            estimatedMinutes: 5,
            dependencies: ['task-2'],
            category: 'testing',
            parallelizable: true
        });
    }
    return subtasks;
}
function groupParallelizableTasks(tasks) {
    const groups = [];
    const processed = new Set();
    // Group tasks by dependency level
    const levels = new Map();
    // Calculate dependency levels
    function calculateLevel(taskId) {
        if (levels.has(taskId))
            return levels.get(taskId);
        const task = tasks.find(t => t.id === taskId);
        if (!task)
            return 0;
        if (task.dependencies.length === 0) {
            levels.set(taskId, 0);
            return 0;
        }
        const maxDepLevel = Math.max(...task.dependencies.map(dep => calculateLevel(dep)));
        const level = maxDepLevel + 1;
        levels.set(taskId, level);
        return level;
    }
    // Calculate levels for all tasks
    tasks.forEach(task => calculateLevel(task.id));
    // Group by level
    const tasksByLevel = new Map();
    tasks.forEach(task => {
        const level = levels.get(task.id) || 0;
        if (!tasksByLevel.has(level)) {
            tasksByLevel.set(level, []);
        }
        tasksByLevel.get(level).push(task);
    });
    // Create groups from each level
    Array.from(tasksByLevel.keys()).sort().forEach(level => {
        const levelTasks = tasksByLevel.get(level);
        const parallelizable = levelTasks.filter(t => t.parallelizable);
        const sequential = levelTasks.filter(t => !t.parallelizable);
        // Add sequential tasks as individual groups
        sequential.forEach(task => groups.push([task]));
        // Add parallelizable tasks as a group
        if (parallelizable.length > 0) {
            groups.push(parallelizable);
        }
    });
    return groups;
}
export default taskDecompositionHook;
//# sourceMappingURL=task-decomposition-hook.js.map