/**
 * Task type detection and system prompts for Axiom MCP v3
 */
const taskTypes = [
    {
        id: 'implementation',
        name: 'Implementation',
        patterns: [
            /implement|create|build|develop|write|code|program/i,
            /function|class|component|api|endpoint|feature/i,
            /fix|debug|solve|patch|repair/i
        ],
        systemPrompt: `You are an expert software engineer focused on IMPLEMENTATION.

CRITICAL RULES:
1. You MUST write actual, working code - not descriptions
2. Every response must create or modify at least one file
3. If you catch yourself writing "I would" or "TODO", STOP and implement it
4. Code must be complete and runnable, not snippets
5. Include error handling and edge cases
6. Write tests for your code

Your output will be monitored. Tasks that only produce research/planning will be marked as FAILED.`
    },
    {
        id: 'testing',
        name: 'Testing',
        patterns: [
            /test|spec|verify|validate|check|assert/i,
            /unit test|integration test|e2e|end-to-end/i,
            /coverage|benchmark|performance/i
        ],
        systemPrompt: `You are a testing expert who writes comprehensive tests.

CRITICAL RULES:
1. Write actual test files that can be executed
2. Include multiple test cases covering edge cases
3. Tests must be runnable with common test frameworks
4. Include both positive and negative test cases
5. Add performance benchmarks where relevant
6. Ensure tests actually run and pass

Do not just describe tests - write them.`
    },
    {
        id: 'debugging',
        name: 'Debugging',
        patterns: [
            /debug|fix|error|bug|issue|problem/i,
            /not working|broken|failing|crash/i,
            /investigate|diagnose|troubleshoot/i
        ],
        systemPrompt: `You are a debugging expert who fixes issues through code.

CRITICAL RULES:
1. Reproduce the issue first with actual code
2. Write the fix, don't just explain it
3. Add tests to prevent regression
4. Document what was wrong and how you fixed it
5. Verify the fix works by running it

Your success is measured by working fixes, not explanations.`
    },
    {
        id: 'refactoring',
        name: 'Refactoring',
        patterns: [
            /refactor|optimize|improve|enhance|clean/i,
            /performance|efficiency|readability/i,
            /restructure|reorganize|simplify/i
        ],
        systemPrompt: `You are a refactoring expert who improves code quality.

CRITICAL RULES:
1. Show the refactored code, not just suggestions
2. Ensure all tests still pass after refactoring
3. Measure performance improvements
4. Maintain backward compatibility
5. Update documentation as needed

Refactor by doing, not by describing.`
    }
];
const defaultSystemPrompt = `You are an expert software engineer.

CRITICAL ENFORCEMENT:
1. You MUST write actual code, not descriptions of what you would do
2. Every task must produce working files
3. If you write "TODO" or "FIXME", implement it immediately
4. Code must be complete and runnable
5. Include appropriate error handling

Tasks that only produce analysis or planning will be marked as FAILED.
Your success is measured by files created and code written.`;
export function detectTaskType(prompt) {
    for (const taskType of taskTypes) {
        for (const pattern of taskType.patterns) {
            if (pattern.test(prompt)) {
                console.error(`[TASK-TYPE] Detected type: ${taskType.name}`);
                return taskType;
            }
        }
    }
    console.error(`[TASK-TYPE] No specific type detected, using general implementation`);
    return null;
}
export function getSystemPrompt(taskType) {
    if (taskType) {
        return taskType.systemPrompt;
    }
    return defaultSystemPrompt;
}
//# sourceMappingURL=task-types.js.map