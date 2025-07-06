import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ConversationDB } from '../database/conversation-db.js';
import { GuidedExecutor } from '../executors/guided-executor.js';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';

export const axiomMcpDemoSchema = z.object({
  scenario: z.enum(['violations', 'clean', 'intervention']).describe('Demo scenario to run'),
  prompt: z.string().default('factorial function').describe('Task to execute'),
});

export type AxiomMcpDemoInput = z.infer<typeof axiomMcpDemoSchema>;

export const axiomMcpDemoTool = {
  name: 'axiom_mcp_demo',
  description: 'Demonstrate observability and intervention system with simulated execution',
  inputSchema: zodToJsonSchema(axiomMcpDemoSchema),
};

export async function handleAxiomMcpDemo(
  input: AxiomMcpDemoInput,
  conversationDB: ConversationDB
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const conversationId = uuidv4();
  let output = '# Axiom MCP Demo: Observability in Action\n\n';
  
  output += `## Scenario: ${input.scenario}\n`;
  output += `## Task: ${input.prompt}\n\n`;
  
  // Clean up any previous demo files
  try {
    await fs.unlink('factorial.js').catch(() => {});
    await fs.unlink('output.txt').catch(() => {});
  } catch (e) {}
  
  switch (input.scenario) {
    case 'violations': {
      output += '### Simulating execution with violations...\n\n';
      
      const executor = new GuidedExecutor({
        conversationDB,
        enableIntervention: true,
        simulateViolations: true,
      }, conversationId);
      
      // Monitor streams in real-time
      const streamLog: string[] = [];
      executor.on('stream', ({ chunk, events }) => {
        streamLog.push(`[STREAM] ${chunk.substring(0, 50)}...`);
        if (events.length > 0) {
          events.forEach(e => {
            if (e.type !== 'output_chunk') {
              streamLog.push(`  [EVENT] ${e.type}: ${e.content.substring(0, 50)}...`);
            }
          });
        }
      });
      
      const result = await executor.execute(input.prompt);
      
      output += '### Execution Output:\n```\n' + result + '\n```\n\n';
      output += `### Interventions Made: ${executor.getInterventionCount()}\n\n`;
      
      // Show what happened in the database
      const actions = await conversationDB.getConversationActions(conversationId);
      output += '### Recorded Actions:\n';
      for (const action of actions) {
        output += `- **${action.type}**: ${action.content}\n`;
        if (action.metadata?.violations) {
          output += `  - Violations: ${action.metadata.violations.length}\n`;
        }
      }
      
      // Verify final state
      const files = await fs.readdir('.').then(files => files.filter(f => f.endsWith('.js')));
      output += `\n### Files Created: ${files.join(', ')}\n`;
      
      break;
    }
    
    case 'clean': {
      output += '### Running clean execution (no violations)...\n\n';
      
      const executor = new GuidedExecutor({
        conversationDB,
        enableIntervention: false,
        simulateViolations: false,
      }, conversationId);
      
      const result = await executor.execute(input.prompt);
      
      output += '### Execution Output:\n```\n' + result + '\n```\n\n';
      
      const actions = await conversationDB.getConversationActions(conversationId);
      output += '### Actions Recorded:\n';
      actions.forEach(a => {
        output += `- ${a.type}: ${a.content}\n`;
      });
      
      break;
    }
    
    case 'intervention': {
      output += '### Demonstrating real-time intervention...\n\n';
      
      // Show a step-by-step intervention
      output += '**Step 1**: User starts writing with TODO\n';
      output += '```\nfunction doTask() {\n  // TODO: implement\n}\n```\n\n';
      
      output += '**Step 2**: System detects violation\n';
      output += '```\n[VIOLATION] TODO detected at line 2\nRule: no-todos\nSeverity: ERROR\n```\n\n';
      
      output += '**Step 3**: Intervention applied\n';
      output += '```\n[INTERVENTION] Implement the function body now!\n```\n\n';
      
      output += '**Step 4**: User fixes the code\n';
      output += '```\nfunction doTask() {\n  console.log("Task executed");\n  return true;\n}\n```\n\n';
      
      output += '**Step 5**: File created successfully\n';
      output += '```\nCreated: task.js\nVerification: PASSED ✓\n```\n\n';
      
      break;
    }
  }
  
  // Show conversation tree
  output += '\n### Conversation Tree:\n';
  try {
    const tree = await conversationDB.getConversationTree(conversationId);
    tree.forEach(conv => {
      const indent = '  '.repeat(conv.depth);
      output += `${indent}- ${conv.id.substring(0, 8)} [${conv.status}] ${conv.prompt.substring(0, 50)}...\n`;
    });
  } catch (e) {
    output += 'No conversation tree available\n';
  }
  
  return {
    content: [{
      type: 'text',
      text: output,
    }],
  };
}