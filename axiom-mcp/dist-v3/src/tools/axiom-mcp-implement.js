import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { v4 as uuidv4 } from 'uuid';
import { execSync } from 'child_process';
import { validateUniversalRules } from '../base-system-prompt.js';
import { interactiveController } from '../claude-interactive-controller.js';
export const axiomMcpImplementSchema = z.object({
    task: z.string().describe('The implementation task to complete'),
    contextFiles: z.array(z.string()).optional().describe('Files to include as context'),
    verifyWith: z.array(z.string()).optional().describe('Commands to verify implementation'),
    acceptanceCriteria: z.object({
        hasWorkingCode: z.boolean().default(true),
        testsPass: z.boolean().default(true),
        noVulnerabilities: z.boolean().default(false),
        coverageThreshold: z.number().optional(),
    }).optional(),
    securityScan: z.boolean().default(false).describe('Run security vulnerability scan'),
    autoFix: z.boolean().default(true).describe('Automatically fix issues found'),
    maxRetries: z.number().default(3).describe('Maximum retries for failed implementations'),
    useInteractive: z.boolean().default(false).describe('Use interactive controller for long-running tasks'),
});
export const axiomMcpImplementTool = {
    name: 'axiom_mcp_implement',
    description: 'Execute an implementation task that actually writes and verifies code',
    inputSchema: zodToJsonSchema(axiomMcpImplementSchema),
};
// Implementation-focused system prompt
const IMPLEMENTATION_SYSTEM_PROMPT = `You are an implementation-focused AI agent. Your PRIMARY directive is to WRITE ACTUAL CODE, not describe it.

SYSTEM VERIFICATION IS ACTIVE. I am monitoring:
- Every file you create (or don't create)
- Every command you run (or don't run)
- Whether tests actually pass (not just claims)

YOU WILL BE CAUGHT if you:
- Claim to write code without using Write tool
- Say tests pass without running them
- Mark tasks complete without implementation

MANDATORY ACTIONS:
1. Use Write tool to create actual code files
2. Use Write tool to create actual test files
3. Use Bash tool to run tests and show they pass
4. Only claim success when files exist and tests pass

ENFORCEMENT:
- If no files detected → RETRY with "You wrote NO FILES. Use Write tool NOW."
- If tests not run → RETRY with "Run tests with Bash tool NOW."
- If tests fail → RETRY with "Fix the code and run tests again."

This is not a suggestion. This is enforced at the system level.
You cannot fake it. You cannot bypass it. You must actually implement.`;
export async function handleAxiomMcpImplement(input, claudeCode, statusManager) {
    const startTime = Date.now();
    const taskId = uuidv4();
    const startDate = execSync('date', { encoding: 'utf-8' }).trim();
    // Use interactive controller for long-running tasks
    if (input.useInteractive) {
        return handleInteractiveImplementation(input, statusManager, taskId, startTime, startDate);
    }
    // Create task
    const task = {
        id: taskId,
        prompt: input.task,
        status: 'running',
        startTime: new Date(),
        temporalStartTime: startDate,
        depth: 0,
        taskType: 'Implementation',
        taskTypeId: 'implementation',
        systemPrompt: IMPLEMENTATION_SYSTEM_PROMPT,
    };
    statusManager.addTask(task);
    let attempts = 0;
    let lastError = null;
    let implementationResult = null;
    while (attempts < input.maxRetries) {
        attempts++;
        try {
            // Build implementation prompt
            let prompt = `IMPLEMENTATION TASK: ${input.task}\n\n`;
            if (lastError) {
                prompt += `PREVIOUS ATTEMPT FAILED:\n${lastError}\n\nFix the issues and try again.\n\n`;
            }
            if (input.contextFiles && input.contextFiles.length > 0) {
                prompt += `CONTEXT FILES TO CONSIDER:\n${input.contextFiles.join('\n')}\n\n`;
            }
            if (input.acceptanceCriteria) {
                prompt += `ACCEPTANCE CRITERIA:\n`;
                if (input.acceptanceCriteria.hasWorkingCode) {
                    prompt += `- Must include complete, working code\n`;
                }
                if (input.acceptanceCriteria.testsPass) {
                    prompt += `- All tests must pass\n`;
                }
                if (input.acceptanceCriteria.noVulnerabilities) {
                    prompt += `- No security vulnerabilities\n`;
                }
                if (input.acceptanceCriteria.coverageThreshold) {
                    prompt += `- Test coverage must be >= ${input.acceptanceCriteria.coverageThreshold}%\n`;
                }
                prompt += '\n';
            }
            if (input.verifyWith && input.verifyWith.length > 0) {
                prompt += `VERIFICATION COMMANDS TO RUN:\n${input.verifyWith.map(cmd => `- ${cmd}`).join('\n')}\n\n`;
            }
            prompt += `Remember: Write ACTUAL CODE, create necessary files, run tests, and verify everything works.`;
            // Execute implementation
            console.error(`[IMPLEMENT] Attempt ${attempts}/${input.maxRetries} for task: ${input.task}`);
            implementationResult = await claudeCode.execute(prompt, {
                systemPrompt: IMPLEMENTATION_SYSTEM_PROMPT,
                timeout: 300000, // 5 minutes for implementation
                allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'WebSearch'],
                taskType: 'implementation',
                requireImplementation: true, // Enable system verification
            });
            // Validate output against universal rules
            const validation = validateUniversalRules(implementationResult.response);
            if (!validation.passed) {
                lastError = `Output validation failed:\n${validation.errors.join('\n')}`;
                console.error(`[IMPLEMENT] Validation failed: ${lastError}`);
                if (attempts < input.maxRetries) {
                    continue;
                }
            }
            // Check system verification if enabled
            if (implementationResult.verification) {
                const proof = implementationResult.verification;
                if (!proof.hasImplementation) {
                    lastError = `System verification detected NO CODE WRITTEN.\n`;
                    lastError += `Files created: ${proof.filesCreated.length}\n`;
                    lastError += `You MUST use Write tool to create actual files.\n`;
                    lastError += `You MUST write complete, working code - not descriptions.\n`;
                    lastError += `\nRun these commands:\n`;
                    lastError += `1. Use Write tool to create the implementation file\n`;
                    lastError += `2. Use Write tool to create test files\n`;
                    lastError += `3. Use Bash tool to run tests\n`;
                    console.error(`[IMPLEMENT] No implementation detected by system verification`);
                    if (attempts < input.maxRetries) {
                        continue;
                    }
                }
                if (input.acceptanceCriteria?.testsPass && !proof.testsPass) {
                    lastError = `System verification detected TESTS NOT PASSING.\n`;
                    lastError += `Test processes run: ${proof.processesRun.length}\n`;
                    lastError += `Tests passing: ${proof.testsPass}\n`;
                    lastError += `\nYou must:\n`;
                    lastError += `1. Fix the code to make tests pass\n`;
                    lastError += `2. Run tests again with Bash tool\n`;
                    lastError += `3. Show all tests passing\n`;
                    if (proof.processesRun.length > 0) {
                        const lastTest = proof.processesRun[proof.processesRun.length - 1];
                        lastError += `\nLast test output:\n${lastTest.stdout}\n${lastTest.stderr}`;
                    }
                    console.error(`[IMPLEMENT] Tests not passing per system verification`);
                    if (attempts < input.maxRetries) {
                        continue;
                    }
                }
            }
            // Success!
            statusManager.updateTask(taskId, {
                status: 'completed',
                output: implementationResult.response,
                temporalEndTime: execSync('date', { encoding: 'utf-8' }).trim(),
            });
            break;
        }
        catch (error) {
            lastError = error instanceof Error ? error.message : String(error);
            console.error(`[IMPLEMENT] Attempt ${attempts} failed: ${lastError}`);
            if (attempts >= input.maxRetries) {
                statusManager.updateTask(taskId, {
                    status: 'failed',
                    error: lastError,
                    temporalEndTime: execSync('date', { encoding: 'utf-8' }).trim(),
                });
            }
        }
    }
    const endTime = Date.now();
    const duration = endTime - startTime;
    // Generate output report
    let output = `# Implementation Task Results\n\n`;
    output += `**Task**: ${input.task}\n`;
    output += `**Status**: ${task.status}\n`;
    output += `**Attempts**: ${attempts}/${input.maxRetries}\n`;
    output += `**Duration**: ${(duration / 1000).toFixed(1)}s\n\n`;
    if (task.status === 'completed' && implementationResult) {
        output += `## Implementation Summary\n\n`;
        // Extract key information from the response
        const fileMatches = implementationResult.response.match(/(Created|Updated|Modified)\s+(\S+\.(ts|js|py|java|go|rs))/gi);
        if (fileMatches) {
            output += `### Files Created/Modified:\n`;
            fileMatches.forEach((match) => {
                output += `- ${match}\n`;
            });
            output += '\n';
        }
        const testMatches = implementationResult.response.match(/(\d+)\s+(test|spec)s?\s+(pass|✓|success)/gi);
        if (testMatches) {
            output += `### Test Results:\n`;
            testMatches.forEach((match) => {
                output += `- ${match}\n`;
            });
            output += '\n';
        }
        output += `### Full Implementation Output:\n\n`;
        output += implementationResult.response;
    }
    else {
        output += `## Implementation Failed\n\n`;
        output += `**Last Error**: ${lastError}\n\n`;
        output += `The implementation task failed after ${attempts} attempts. Common issues:\n`;
        output += `- Not writing actual code files\n`;
        output += `- Not running tests to verify implementation\n`;
        output += `- Providing descriptions instead of implementations\n`;
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
// Handler for interactive implementation mode
async function handleInteractiveImplementation(input, statusManager, taskId, startTime, startDate) {
    // Create task
    const task = {
        id: taskId,
        prompt: input.task,
        status: 'running',
        startTime: new Date(),
        temporalStartTime: startDate,
        depth: 0,
        taskType: 'Implementation (Interactive)',
        taskTypeId: 'implementation-interactive',
        systemPrompt: IMPLEMENTATION_SYSTEM_PROMPT,
    };
    statusManager.addTask(task);
    let output = `# Interactive Implementation Mode\n\n`;
    output += `**Task**: ${input.task}\n`;
    output += `**Mode**: Interactive with real-time monitoring\n\n`;
    output += `## Live Updates:\n\n`;
    const interactions = [];
    const verifications = [];
    try {
        // Run with interactive controller
        const result = await interactiveController.runImplementationTask(input.task, {
            maxInteractions: input.maxRetries * 3, // More interactions allowed
            timeout: 1200000, // 20 minutes for long tasks
            onOutput: (event) => {
                // Log key outputs
                if (event.type === 'output' && event.content.length > 50) {
                    const preview = event.content.substring(0, 200).replace(/\n/g, ' ');
                    interactions.push(`[${new Date().toISOString()}] Output: ${preview}...`);
                }
                else if (event.type === 'error') {
                    interactions.push(`[${new Date().toISOString()}] Error: ${event.content}`);
                }
            },
            onVerification: (event) => {
                verifications.push(event);
                const status = `Files: ${event.filesCreated}, Tests: ${event.testsRun}, Passing: ${event.testsPassed}`;
                interactions.push(`[${new Date().toISOString()}] Verification: ${status}`);
            }
        });
        const endTime = Date.now();
        const duration = endTime - startTime;
        if (result.success) {
            statusManager.updateTask(taskId, {
                status: 'completed',
                output: `Interactive implementation completed successfully`,
                temporalEndTime: execSync('date', { encoding: 'utf-8' }).trim(),
            });
            output += `### ✅ Implementation Successful!\n\n`;
            output += `- **Interactions**: ${result.interactions}\n`;
            output += `- **Duration**: ${(duration / 1000).toFixed(1)}s\n`;
            output += `- **Files Created**: ${result.finalVerification.filesCreated}\n`;
            output += `- **Tests Passing**: ${result.finalVerification.testsPassed}\n\n`;
        }
        else {
            statusManager.updateTask(taskId, {
                status: 'failed',
                error: 'Failed to complete implementation after maximum interactions',
                temporalEndTime: execSync('date', { encoding: 'utf-8' }).trim(),
            });
            output += `### ❌ Implementation Failed\n\n`;
            output += `- **Interactions**: ${result.interactions}\n`;
            output += `- **Duration**: ${(duration / 1000).toFixed(1)}s\n`;
            output += `- **Last State**: Files: ${result.finalVerification.filesCreated}, Tests: ${result.finalVerification.testsRun}\n\n`;
        }
        // Add interaction log
        if (interactions.length > 0) {
            output += `### Interaction Log:\n\`\`\`\n`;
            output += interactions.slice(-20).join('\n'); // Last 20 interactions
            output += `\n\`\`\`\n\n`;
        }
        // Add verification history
        if (verifications.length > 0) {
            output += `### Verification History:\n`;
            verifications.slice(-5).forEach((v, i) => {
                output += `${i + 1}. Files: ${v.filesCreated}, Tests: ${v.testsRun}, Passing: ${v.testsPassed}\n`;
            });
            output += '\n';
        }
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        statusManager.updateTask(taskId, {
            status: 'failed',
            error: errorMsg,
            temporalEndTime: execSync('date', { encoding: 'utf-8' }).trim(),
        });
        output += `### ❌ Interactive Mode Error\n\n`;
        output += `**Error**: ${errorMsg}\n\n`;
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
//# sourceMappingURL=axiom-mcp-implement.js.map