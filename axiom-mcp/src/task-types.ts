/**
 * Task Types and Success Criteria
 * 
 * Defines different types of tasks with their associated:
 * - System prompts
 * - Required success criteria
 * - Tool recommendations
 * - Validation rules
 */

export interface TaskTypeDefinition {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  requiredCriteria: string[];
  recommendedTools: string[];
  validationRules: ValidationRule[];
  retryPrompt?: string;
}

export interface ValidationRule {
  id: string;
  description: string;
  check: (output: string) => boolean;
  failureMessage: string;
}

// Validation helper functions
const containsCode = (output: string): boolean => {
  return /```[\s\S]*```/.test(output) || /^\s*(import|export|function|class|const|let|var|def|public|private)/m.test(output);
};

const containsTestResults = (output: string): boolean => {
  return /(test|spec|✓|✗|passed|failed|success|error|assert|expect)/i.test(output);
};

const containsExecutionOutput = (output: string): boolean => {
  return /(output|result|console|stdout|stderr|executed|ran|=>)/i.test(output);
};

const containsUrl = (output: string): boolean => {
  return /https?:\/\/[^\s]+/.test(output);
};

const mentionsToolUsage = (tool: string) => (output: string): boolean => {
  return output.toLowerCase().includes(tool.toLowerCase());
};

const containsBlockedMessage = (output: string): boolean => {
  return /(blocked|paywall|subscription|403|401|access denied|captcha|cloudflare)/i.test(output);
};

export const TASK_TYPES: Record<string, TaskTypeDefinition> = {
  CODE_IMPLEMENTATION: {
    id: 'code_implementation',
    name: 'Code Implementation',
    description: 'Writing new code or modifying existing code',
    systemPrompt: `You are implementing code. You MUST:
1. Write the actual code, not just describe it
2. Test the code you write using appropriate tools
3. Run the code to verify it works
4. Include the execution output in your response
5. Handle edge cases and errors
6. Follow the project's coding standards

Available tools for testing:
- Use Bash to run scripts and commands
- Use Read/Write/Edit for file operations
- Use WebSearch for documentation lookups

IMPORTANT: Your response will be rejected if you don't include:
- The actual code implementation
- Test results or execution output
- Verification that the code works`,
    requiredCriteria: [
      'Includes actual code implementation',
      'Shows test results or execution output',
      'Verifies the code works correctly',
      'Handles potential errors'
    ],
    recommendedTools: ['Bash', 'Write', 'Edit', 'Read'],
    validationRules: [
      {
        id: 'has_code',
        description: 'Response must contain actual code',
        check: containsCode,
        failureMessage: 'No code implementation found. You must write actual code, not just describe it.'
      },
      {
        id: 'has_verification',
        description: 'Response must show code was tested/run',
        check: (output) => containsTestResults(output) || containsExecutionOutput(output),
        failureMessage: 'No test results or execution output found. You must run and verify your code.'
      }
    ],
    retryPrompt: 'Your previous response lacked proper code verification. Please:\n1. Show the complete code\n2. Run it using Bash\n3. Include the output\n4. Verify it works as expected'
  },

  RESEARCH_WEB: {
    id: 'research_web',
    name: 'Web Research',
    description: 'Researching information from websites and online sources',
    systemPrompt: `You are conducting web research. You MUST:
1. Actually access and read the websites, not just search for them
2. Use nova-playwright for dynamic sites (especially Substack, Medium, paywalled content)
3. Use WebFetch for static content
4. Extract specific information, not just summaries
5. Verify you can access the full content
6. Note if you encounter paywalls, blocks, or CAPTCHAs
7. Provide direct quotes and evidence from sources

Tool usage guidelines:
- nova-playwright: Use for JavaScript-heavy sites, paywalls, Substack, Medium
- WebFetch: Use for simple HTML pages, documentation
- WebSearch: Use to find sources, then access them directly

IMPORTANT: Your response will be rejected if you:
- Only provide search results without accessing the actual pages
- Don't mention whether you could access the full content
- Don't provide specific evidence from the sources`,
    requiredCriteria: [
      'Accessed actual websites (not just search results)',
      'Verified full content access',
      'Provided specific evidence from sources',
      'Used appropriate tools (nova-playwright for dynamic sites)'
    ],
    recommendedTools: ['nova-playwright', 'WebFetch', 'WebSearch'],
    validationRules: [
      {
        id: 'accessed_sites',
        description: 'Must show evidence of accessing actual websites',
        check: (output) => containsUrl(output) && (mentionsToolUsage('nova-playwright')(output) || mentionsToolUsage('WebFetch')(output)),
        failureMessage: 'No evidence of accessing actual websites. Use nova-playwright or WebFetch to read the content.'
      },
      {
        id: 'access_status',
        description: 'Must mention if content was fully accessible',
        check: (output) => /(accessed|retrieved|extracted|blocked|paywall|full content|partial content)/i.test(output),
        failureMessage: 'You must explicitly state whether you could access the full content or encountered blocks.'
      }
    ],
    retryPrompt: 'Your previous research was insufficient. Please:\n1. Use nova-playwright to access the actual websites\n2. Extract specific information and quotes\n3. Explicitly state if you hit any paywalls or blocks\n4. Provide evidence you read the actual content'
  },

  CODE_ANALYSIS: {
    id: 'code_analysis',
    name: 'Code Analysis',
    description: 'Analyzing existing code for bugs, performance, or understanding',
    systemPrompt: `You are analyzing code. You MUST:
1. Read the actual code files using Read/Grep tools
2. Identify specific issues with line numbers
3. Test your assumptions by running the code
4. Provide concrete examples of problems
5. Suggest specific fixes with code samples

Use these tools:
- Read: To examine specific files
- Grep: To search for patterns across files
- Bash: To run and test the code
- Task: For complex searches across many files

IMPORTANT: Your analysis will be rejected if you:
- Make assumptions without reading the actual code
- Don't provide specific line numbers or examples
- Don't verify your findings by testing`,
    requiredCriteria: [
      'Read actual code files',
      'Provided specific line numbers or code references',
      'Tested findings when applicable',
      'Suggested concrete improvements'
    ],
    recommendedTools: ['Read', 'Grep', 'Bash', 'Task'],
    validationRules: [
      {
        id: 'read_files',
        description: 'Must show evidence of reading actual files',
        check: mentionsToolUsage('Read'),
        failureMessage: 'You must use the Read tool to examine actual code files, not make assumptions.'
      },
      {
        id: 'specific_analysis',
        description: 'Must provide specific code references',
        check: (output) => /line \d+|:\d+|```[\s\S]*```/.test(output),
        failureMessage: 'Provide specific line numbers and code examples from your analysis.'
      }
    ]
  },

  DOCUMENTATION: {
    id: 'documentation',
    name: 'Documentation Writing',
    description: 'Creating or updating documentation',
    systemPrompt: `You are writing documentation. You MUST:
1. Include complete, runnable examples
2. Test all code examples to ensure they work
3. Cover common use cases and edge cases
4. Provide clear installation/setup instructions
5. Include troubleshooting sections

Requirements:
- All code examples must be tested
- Include expected output for examples
- Cover both basic and advanced usage
- Provide links to related resources`,
    requiredCriteria: [
      'Includes complete examples',
      'Examples are tested and verified',
      'Covers installation and setup',
      'Includes troubleshooting'
    ],
    recommendedTools: ['Write', 'Bash', 'Read'],
    validationRules: [
      {
        id: 'has_examples',
        description: 'Must include code examples',
        check: containsCode,
        failureMessage: 'Documentation must include concrete code examples.'
      },
      {
        id: 'examples_tested',
        description: 'Examples should be tested',
        check: (output) => containsExecutionOutput(output) || /tested|verified|works/.test(output),
        failureMessage: 'You should test the examples to ensure they work correctly.'
      }
    ]
  },

  DEBUGGING: {
    id: 'debugging',
    name: 'Debugging',
    description: 'Finding and fixing bugs in code',
    systemPrompt: `You are debugging code. You MUST:
1. Reproduce the issue by running the code
2. Add logging/debugging statements to isolate the problem
3. Test multiple scenarios to understand the bug
4. Verify the fix resolves the issue
5. Ensure the fix doesn't break other functionality

Debugging process:
- First, reproduce the exact error
- Add console.log/print statements to trace execution
- Test edge cases
- Verify the fix works
- Run any existing tests`,
    requiredCriteria: [
      'Reproduced the issue',
      'Isolated the problem with debugging',
      'Tested the fix',
      'Verified resolution'
    ],
    recommendedTools: ['Bash', 'Edit', 'Read', 'Grep'],
    validationRules: [
      {
        id: 'reproduced_issue',
        description: 'Must show the original error',
        check: (output) => /error|exception|failed|bug|issue/i.test(output),
        failureMessage: 'You must first reproduce and show the actual error or issue.'
      },
      {
        id: 'verified_fix',
        description: 'Must verify the fix works',
        check: (output) => /fixed|resolved|works now|success|passed/i.test(output),
        failureMessage: 'You must verify that your fix actually resolves the issue.'
      }
    ]
  },

  API_DESIGN: {
    id: 'api_design',
    name: 'API Design',
    description: 'Designing REST APIs, GraphQL schemas, or other interfaces',
    systemPrompt: `You are designing an API. You MUST:
1. Define clear endpoints with examples
2. Specify request/response formats with real examples
3. Include error responses and status codes
4. Create a working prototype or mock
5. Test the API design with curl or similar tools

Requirements:
- Show complete request/response examples
- Include all HTTP methods and status codes
- Provide curl commands or test scripts
- Consider versioning and backwards compatibility`,
    requiredCriteria: [
      'Defined clear endpoints',
      'Included request/response examples',
      'Specified error handling',
      'Provided testable examples'
    ],
    recommendedTools: ['Write', 'Bash'],
    validationRules: [
      {
        id: 'has_endpoints',
        description: 'Must define specific endpoints',
        check: (output) => /(GET|POST|PUT|DELETE|PATCH)\s+\/\w+/i.test(output),
        failureMessage: 'You must define specific API endpoints with HTTP methods.'
      },
      {
        id: 'has_examples',
        description: 'Must include request/response examples',
        check: (output) => /```(json|javascript|bash)[\s\S]*```/.test(output),
        failureMessage: 'Include concrete request and response examples in your API design.'
      }
    ]
  }
};

/**
 * Get task type based on prompt analysis
 */
export function detectTaskType(prompt: string): TaskTypeDefinition | null {
  const lowerPrompt = prompt.toLowerCase();
  
  // Code implementation keywords
  if (/(implement|create|build|write|develop)\s+(a|the|an)?\s*(function|class|component|script|program|code)/i.test(prompt)) {
    return TASK_TYPES.CODE_IMPLEMENTATION;
  }
  
  // Research keywords
  if (/(research|find|investigate|explore|discover|search for)\s+(information|about|on|regarding)/i.test(prompt)) {
    return TASK_TYPES.RESEARCH_WEB;
  }
  
  // Code analysis keywords
  if (/(analyze|review|examine|inspect|audit)\s+(the|this|my)?\s*(code|script|program|implementation)/i.test(prompt)) {
    return TASK_TYPES.CODE_ANALYSIS;
  }
  
  // Documentation keywords
  if (/(document|write documentation|create docs|update readme)/i.test(prompt)) {
    return TASK_TYPES.DOCUMENTATION;
  }
  
  // Debugging keywords
  if (/(debug|fix|troubleshoot|solve|resolve)\s+(the|this|an?)?\s*(bug|issue|error|problem)/i.test(prompt)) {
    return TASK_TYPES.DEBUGGING;
  }
  
  // API design keywords
  if (/(design|create|plan)\s+(a|an|the)?\s*(api|endpoint|interface|graphql|rest)/i.test(prompt)) {
    return TASK_TYPES.API_DESIGN;
  }
  
  return null;
}

/**
 * Get system prompt for a task type
 */
export function getSystemPrompt(taskType: TaskTypeDefinition | null): string {
  if (!taskType) {
    return `You are completing a research task. Please:
1. Be thorough and specific
2. Use appropriate tools to gather information
3. Verify your findings
4. Provide concrete evidence
5. Test any code you write`;
  }
  
  return taskType.systemPrompt;
}

/**
 * Validate task output against type criteria
 */
export function validateTaskOutput(
  output: string, 
  taskType: TaskTypeDefinition | null
): { 
  valid: boolean; 
  issues: string[]; 
  suggestions: string[] 
} {
  if (!taskType) {
    return { valid: true, issues: [], suggestions: [] };
  }
  
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  // Check validation rules
  for (const rule of taskType.validationRules) {
    if (!rule.check(output)) {
      issues.push(rule.failureMessage);
      suggestions.push(rule.description);
    }
  }
  
  // Add general suggestions based on task type
  if (issues.length > 0) {
    suggestions.push(`Use these tools: ${taskType.recommendedTools.join(', ')}`);
    if (taskType.retryPrompt) {
      suggestions.push(taskType.retryPrompt);
    }
  }
  
  return {
    valid: issues.length === 0,
    issues,
    suggestions
  };
}