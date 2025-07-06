import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ClaudeCodeSubprocess } from '../claude-subprocess.js';
import { detectTaskType, getSystemPrompt } from '../task-types.js';
import { BASE_SYSTEM_PROMPT, getCompleteSystemPrompt } from '../base-system-prompt.js';
import { execSync } from 'child_process';

export const axiomMcpTestGuidanceSchema = z.object({
  prompt: z.string().describe('Test prompt to analyze'),
  includeTaskType: z.boolean().default(true).describe('Auto-detect and include task type'),
  customSystemPrompt: z.string().optional().describe('Custom system prompt to test'),
});

export type axiomMcpTestGuidanceInput = z.infer<typeof axiomMcpTestGuidanceSchema>;

export const axiomMcpTestGuidanceTool = {
  name: 'axiom_mcp_test_guidance',
  description: 'Test and verify system guidance, temporal tracking, and task type detection',
  inputSchema: zodToJsonSchema(axiomMcpTestGuidanceSchema),
};

export async function handleAxiomMcpTestGuidance(
  input: axiomMcpTestGuidanceInput,
  claudeCode: ClaudeCodeSubprocess
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Get temporal context
    const startDate = execSync('date', { encoding: 'utf-8' }).trim();
    console.error(`[TEST-GUIDANCE] Start: ${startDate}`);
    
    // Detect task type if requested
    let taskType = null;
    let systemPrompt = input.customSystemPrompt || '';
    
    if (input.includeTaskType && !input.customSystemPrompt) {
      taskType = detectTaskType(input.prompt);
      systemPrompt = getSystemPrompt(taskType);
    }
    
    // Get the complete system prompt (base + task-specific)
    const completeSystemPrompt = getCompleteSystemPrompt(systemPrompt);
    
    // Build the full prompt that will be sent
    let fullPrompt = `${completeSystemPrompt}\n\n${input.prompt}`;
    
    // Create a special test prompt that asks Claude to echo back its instructions
    const testPrompt = `Please respond with EXACTLY what system instructions and guidance you received. Format your response as:

TEMPORAL INSTRUCTION:
[Show any temporal/date instruction]

SYSTEM PROMPT:
[Show the system prompt if any]

USER PROMPT:
[Show the actual user prompt]

DETECTED TASK TYPE:
[What type of task do you think this is?]

VALIDATION RULES I SHOULD FOLLOW:
[List any validation rules you understand you need to follow]

Then, execute: bash date`;
    
    // Execute with the system prompt
    const result = await claudeCode.execute(testPrompt, {
      systemPrompt: systemPrompt,
      taskType: taskType?.id,
      includeDate: true,
      timeout: 30000, // 30 seconds
    });
    
    // Get end date
    const endDate = execSync('date', { encoding: 'utf-8' }).trim();
    console.error(`[TEST-GUIDANCE] End: ${endDate}`);
    
    // Format output
    let output = `# System Guidance Test Results\n\n`;
    output += `**Test Prompt**: ${input.prompt}\n`;
    output += `**Start Time**: ${startDate}\n`;
    output += `**End Time**: ${endDate}\n\n`;
    
    output += `## Base System Prompt (Always Applied)\n`;
    output += `<details>\n<summary>Click to expand base system prompt</summary>\n\n`;
    output += `\`\`\`\n${BASE_SYSTEM_PROMPT}\n\`\`\`\n</details>\n\n`;
    
    if (taskType) {
      output += `## Detected Task Type\n`;
      output += `- **Type**: ${taskType.name} (${taskType.id})\n`;
      output += `- **Description**: ${taskType.description}\n\n`;
      
      output += `## Task-Specific System Prompt\n`;
      output += `\`\`\`\n${systemPrompt}\n\`\`\`\n\n`;
      
      output += `## Task-Specific Validation Rules\n`;
      taskType.validationRules.forEach(rule => {
        output += `- **${rule.id}**: ${rule.description}\n`;
        output += `  - Failure Message: ${rule.failureMessage}\n`;
      });
      output += `\n`;
    } else {
      output += `## Task Type\n`;
      output += `No specific task type detected - using general guidance only.\n\n`;
    }
    
    output += `## Full Prompt Sent to Claude\n`;
    output += `\`\`\`\n${fullPrompt}\n\`\`\`\n\n`;
    
    output += `## Claude's Response\n`;
    output += `${result.response}\n\n`;
    
    output += `## Temporal Data from Result\n`;
    output += `- **Start Time (from result)**: ${result.startTime || 'Not captured'}\n`;
    output += `- **End Time (from result)**: ${result.endTime || 'Not captured'}\n`;
    output += `- **Task Type (from result)**: ${result.taskType || 'Not set'}\n`;
    
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
          text: `Test guidance failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}