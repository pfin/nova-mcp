import { z } from 'zod';
import { 
  UNIVERSAL_CODING_PRINCIPLES, 
  UNIVERSAL_THINKING_PRINCIPLES,
  PrincipleEnforcer,
  Principle
} from '../principles/universal-principles.js';
import { ConversationDB } from '../database/conversation-db.js';
import { RuleVerifier } from '../verifiers/rule-verifier.js';
import { createMcpCompliantSchema } from '../utils/mcp-schema.js';

export const axiomMcpPrinciplesSchema = z.object({
  action: z.enum(['list', 'check', 'enforce', 'add', 'remove', 'verify']).describe('Action to perform'),
  category: z.enum(['coding', 'thinking', 'execution', 'all']).optional().describe('Filter by category'),
  principleId: z.string().optional().describe('Specific principle ID'),
  code: z.string().optional().describe('Code to check against principles'),
  conversationId: z.string().optional().describe('Conversation to verify'),
  principle: z.object({
    id: z.string(),
    name: z.string(),
    category: z.enum(['coding', 'thinking', 'execution']),
    description: z.string(),
    verificationRule: z.string(),
    examples: z.object({
      good: z.array(z.string()).optional(),
      bad: z.array(z.string()).optional()
    }).optional()
  }).optional().describe('New principle to add'),
});

export type AxiomMcpPrinciplesInput = z.infer<typeof axiomMcpPrinciplesSchema>;

export const axiomMcpPrinciplesTool = {
  name: 'axiom_mcp_principles',
  description: 'Manage and enforce universal coding and thinking principles',
  inputSchema: createMcpCompliantSchema(axiomMcpPrinciplesSchema, 'AxiomMcpPrinciplesInput'),
};

// Store custom principles in memory (in production, use database)
const customPrinciples: Map<string, Principle> = new Map();

export async function handleAxiomMcpPrinciples(
  input: AxiomMcpPrinciplesInput,
  conversationDB?: ConversationDB
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const enforcer = new PrincipleEnforcer();
  let output = '';
  
  switch (input.action) {
    case 'list': {
      output = '# Universal Principles\n\n';
      
      const allPrinciples = [
        ...UNIVERSAL_CODING_PRINCIPLES,
        ...UNIVERSAL_THINKING_PRINCIPLES,
        ...Array.from(customPrinciples.values())
      ];
      
      const filtered = input.category && input.category !== 'all' 
        ? allPrinciples.filter(p => p.category === input.category)
        : allPrinciples;
      
      // Group by category
      const byCategory = new Map<string, Principle[]>();
      filtered.forEach(p => {
        if (!byCategory.has(p.category)) {
          byCategory.set(p.category, []);
        }
        byCategory.get(p.category)!.push(p);
      });
      
      for (const [category, principles] of byCategory) {
        output += `## ${category.charAt(0).toUpperCase() + category.slice(1)} Principles\n\n`;
        
        for (const principle of principles) {
          output += `### ${principle.name} (${principle.id})\n`;
          output += `${principle.description}\n\n`;
          output += `**Verification**: ${principle.verificationRule}\n\n`;
          
          if (principle.examples) {
            if (principle.examples.bad && principle.examples.bad.length > 0) {
              output += '**❌ Bad Examples:**\n';
              principle.examples.bad.forEach(ex => {
                output += '```\n' + ex + '\n```\n';
              });
            }
            
            if (principle.examples.good && principle.examples.good.length > 0) {
              output += '**✅ Good Examples:**\n';
              principle.examples.good.forEach(ex => {
                output += '```\n' + ex + '\n```\n';
              });
            }
          }
          
          output += '\n---\n\n';
        }
      }
      break;
    }
    
    case 'check': {
      if (!input.code) {
        throw new Error('Code required for check action');
      }
      
      output = '# Principle Violation Check\n\n';
      const violations = enforcer.checkViolations(input.code);
      
      if (violations.length === 0) {
        output += '✅ **No violations found!**\n\n';
        output += 'The code follows all universal principles.\n';
      } else {
        output += `❌ **Found ${violations.length} violations:**\n\n`;
        
        for (const violation of violations) {
          output += `### ${violation.principle.name}\n`;
          output += `- **Principle**: ${violation.principle.id}\n`;
          output += `- **Violation**: ${violation.violation}\n`;
          output += `- **Rule**: ${violation.principle.verificationRule}\n\n`;
        }
        
        output += '\n## How to Fix\n\n';
        for (const violation of violations) {
          output += `**${violation.principle.name}**: ${violation.principle.description}\n\n`;
        }
      }
      break;
    }
    
    case 'enforce': {
      output = '# Principle Enforcement Prompt\n\n';
      output += enforcer.generatePromptGuidance();
      output += '\n\n## Application\n\n';
      output += 'Add this to your prompts to enforce principles:\n';
      output += '1. Copy the principles above\n';
      output += '2. Include in system prompts\n';
      output += '3. Verify outputs against principles\n';
      output += '4. Reject non-compliant code\n';
      break;
    }
    
    case 'verify': {
      if (!input.conversationId || !conversationDB) {
        throw new Error('Conversation ID and database required for verify action');
      }
      
      output = '# Conversation Verification Report\n\n';
      
      const verifier = new RuleVerifier(conversationDB);
      const result = await verifier.verifyConversation(input.conversationId);
      
      output += verifier.formatViolationReport(result);
      
      // Also check principles
      const streams = await conversationDB.getConversationStreams(input.conversationId);
      const allCode = streams.map(s => s.chunk).join('\n');
      const principleViolations = enforcer.checkViolations(allCode);
      
      if (principleViolations.length > 0) {
        output += '\n## Principle Violations\n\n';
        for (const violation of principleViolations) {
          output += `- **${violation.principle.name}**: ${violation.violation}\n`;
        }
      }
      
      break;
    }
    
    case 'add': {
      if (!input.principle) {
        throw new Error('Principle definition required for add action');
      }
      
      customPrinciples.set(input.principle.id, input.principle as Principle);
      output = `✅ Added custom principle: ${input.principle.name}\n\n`;
      output += `ID: ${input.principle.id}\n`;
      output += `Category: ${input.principle.category}\n`;
      output += `Description: ${input.principle.description}\n`;
      break;
    }
    
    case 'remove': {
      if (!input.principleId) {
        throw new Error('Principle ID required for remove action');
      }
      
      if (customPrinciples.has(input.principleId)) {
        customPrinciples.delete(input.principleId);
        output = `✅ Removed custom principle: ${input.principleId}\n`;
      } else {
        output = `❌ Cannot remove built-in principle: ${input.principleId}\n`;
      }
      break;
    }
  }
  
  return {
    content: [{
      type: 'text',
      text: output
    }]
  };
}