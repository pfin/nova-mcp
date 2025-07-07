/**
 * Base System Prompt and Universal Validation Rules
 *
 * This module defines the universal guidance that applies to ALL tasks,
 * regardless of their specific type. These rules ensure consistent quality
 * and prevent common failures.
 */
export const BASE_SYSTEM_PROMPT = `You are an AI assistant executing a task as part of the Axiom MCP system.

UNIVERSAL REQUIREMENTS (These apply to EVERY task):

0. META-COGNITIVE PRINCIPLE - BEFORE/AFTER/HOW:
   BEFORE starting any task, you MUST:
   - State WHAT you're going to do (specific actions, not vague descriptions)
   - Explain WHY you're doing it (the reasoning and expected outcome)
   
   THEN think about HOW:
   - List the specific steps you'll take
   - Consider what could go wrong
   - Double-check your approach makes sense
   
   AFTER completing:
   - Review if you achieved what you intended
   - If not, explain why and what you learned
   - Apply lessons to future iterations

1. TEMPORAL AWARENESS:
   - ALWAYS run 'bash date' at the start of your task
   - Be aware of the current date/time for context
   - Use temporal information when accessing web resources

2. VERIFICATION IS MANDATORY:
   - NEVER just output code without running it
   - NEVER describe what you would do - actually do it
   - ALWAYS verify your work functions correctly
   - If you write code, you MUST execute it
   - If you research, you MUST access actual sources

3. BUILD AND TEST REQUIREMENTS:
   - For Node.js projects: ALWAYS run 'npm run build' after changes
   - For Python projects: ALWAYS run tests if they exist
   - Check for package.json, Makefile, or similar build configs
   - Run linting/formatting commands if available

4. OUTPUT QUALITY:
   - Provide concrete evidence of your work
   - Include actual output, not descriptions
   - Show error messages if things fail
   - Be specific about what you did and what happened

5. TOOL USAGE:
   - Use the appropriate tools for the task
   - Read files before editing them
   - Check if build/test commands exist before assuming
   - Use nova-playwright for JavaScript-heavy sites

6. ERROR HANDLING:
   - If something fails, show the exact error
   - Try to fix errors before giving up
   - Explain what went wrong and what you tried

7. COMPLETENESS:
   - Finish what you start
   - Don't leave tasks half-done
   - If blocked, explain why specifically

Remember: Your output will be automatically evaluated. Tasks that only describe actions 
without executing them WILL BE REJECTED. Tasks that don't follow BEFORE/AFTER/HOW will score lower.`;
export const UNIVERSAL_VALIDATION_RULES = [
    {
        id: 'no_code_without_execution',
        description: 'Code must be executed, not just written',
        check: (output) => {
            const hasCode = /```[\s\S]*```/.test(output);
            if (!hasCode)
                return true; // No code is fine
            // If there's code, there must be execution evidence
            return /(output|result|console|stdout|stderr|executed|ran|=>|npm run|python|node)/i.test(output);
        },
        severity: 'error',
        failureMessage: 'Code was written but not executed. You MUST run any code you write.',
    },
    {
        id: 'no_hypothetical_descriptions',
        description: 'Must perform actions, not describe them',
        check: (output) => {
            const hypotheticalPhrases = [
                'would need to',
                'could be done',
                'should implement',
                'might want to',
                'plan to',
                'suggest doing',
                'recommend to',
                'would involve',
                'would require',
                'you can',
                'you could',
                'you should',
                'you might'
            ];
            const lowerOutput = output.toLowerCase();
            const hypotheticalCount = hypotheticalPhrases.filter(phrase => lowerOutput.includes(phrase)).length;
            // Allow some hypothetical language, but not too much
            return hypotheticalCount < 3;
        },
        severity: 'error',
        failureMessage: 'Too many hypothetical descriptions. Stop describing and start doing.',
    },
    {
        id: 'build_verification',
        description: 'Node projects must be built after changes',
        check: (output) => {
            // Check if this involved Node.js code changes
            const hasNodeChanges = /package\.json|\.ts|\.js|\.tsx|\.jsx/.test(output) &&
                /(edit|write|create|modify|update)/i.test(output);
            if (!hasNodeChanges)
                return true;
            // If Node changes, must have build command
            return /npm run build|yarn build|pnpm build|tsc|webpack|rollup|esbuild/i.test(output);
        },
        severity: 'warning',
        failureMessage: 'Node.js files were modified but project was not built.',
    },
    {
        id: 'temporal_context',
        description: 'Must establish temporal context',
        check: (output) => {
            return /bash date|date.*2025|current date|temporal|EDT|UTC|GMT/i.test(output);
        },
        severity: 'warning',
        failureMessage: 'No temporal context established. Run "bash date" at the start.',
    },
    {
        id: 'error_visibility',
        description: 'Errors must be shown, not hidden',
        check: (output) => {
            // If there's mention of errors/failures, they should be shown
            const mentionsError = /(error|failed|failure|exception|could not|unable to)/i.test(output);
            if (!mentionsError)
                return true;
            // Check for actual error output
            return /(Error:|Exception:|Traceback|stack trace|error message|stderr)/i.test(output);
        },
        severity: 'error',
        failureMessage: 'Mentions errors but doesn\'t show them. Include actual error messages.',
    },
    {
        id: 'concrete_evidence',
        description: 'Must provide concrete evidence of work',
        check: (output) => {
            // Look for evidence patterns
            const evidencePatterns = [
                /```[\s\S]+```/, // Code blocks
                /\$\s+\w+/, // Command line prompts
                /https?:\/\/\S+/, // URLs
                /\d+\.\d+\.\d+/, // Version numbers
                /✓|✗|✅|❌/, // Check marks
                /\[\d+\/\d+\]/, // Progress indicators
                /Successfully|Completed|Finished|Done/i,
            ];
            return evidencePatterns.some(pattern => pattern.test(output));
        },
        severity: 'warning',
        failureMessage: 'Lacks concrete evidence. Show specific outputs, commands, or results.',
    },
    {
        id: 'meta_cognitive_before_after_how',
        description: 'Must follow BEFORE/AFTER/HOW meta-cognitive pattern',
        check: (output) => {
            const lowerOutput = output.toLowerCase();
            // Check for BEFORE section
            const hasBefore = /before:|what i('m| am) (going to|planning to)|why i('m| am) doing/.test(lowerOutput) ||
                /my plan:|my approach:|i will first/.test(lowerOutput);
            // Check for HOW section  
            const hasHow = /how i('ll| will)|steps:|step \d+|specifically,|my approach/.test(lowerOutput) ||
                /first,.*then,.*finally|1\.|2\.|3\./.test(output);
            // Check for AFTER section
            const hasAfter = /after:|review:|achieved|completed|learned|result:|outcome:/.test(lowerOutput) ||
                /successfully|failed to|what worked:|what didn't/.test(lowerOutput);
            // More lenient: require at least 2 of 3 components
            const components = [hasBefore, hasHow, hasAfter].filter(Boolean).length;
            return components >= 2;
        },
        severity: 'error',
        failureMessage: 'Failed to follow BEFORE/AFTER/HOW pattern. Must explicitly plan before acting and review after.',
    },
];
/**
 * Calculate meta-cognitive score based on BEFORE/AFTER/HOW pattern
 */
export function calculateMetaCognitiveScore(output) {
    const lowerOutput = output.toLowerCase();
    const feedback = [];
    // Detailed pattern matching for each component
    const components = {
        before: /before:|what i('m| am) (going to|planning to)|why i('m| am) doing|my goal is|my objective|i aim to/.test(lowerOutput),
        how: /how i('ll| will)|my approach:|step-by-step|specifically:|implementation plan:|methodology:/.test(lowerOutput),
        after: /after (completing|finishing|reviewing)|results show|i achieved|i learned|outcome:|conclusion:/.test(lowerOutput),
        reflection: /what worked|what didn't|lessons learned|could improve|next time|better approach/.test(lowerOutput),
    };
    // Calculate score
    let score = 0;
    if (components.before) {
        score += 0.25;
    }
    else {
        feedback.push('Missing BEFORE: No clear statement of what you plan to do and why');
    }
    if (components.how) {
        score += 0.25;
    }
    else {
        feedback.push('Missing HOW: No detailed steps or methodology explained');
    }
    if (components.after) {
        score += 0.25;
    }
    else {
        feedback.push('Missing AFTER: No review of whether goals were achieved');
    }
    if (components.reflection) {
        score += 0.25;
        feedback.push('Excellent: Includes reflection and lessons learned!');
    }
    else {
        feedback.push('Could improve: Add reflection on what could be done better');
    }
    return { score, components, feedback };
}
/**
 * Apply universal validation to any task output
 */
export function validateUniversalRules(output) {
    const errors = [];
    const warnings = [];
    for (const rule of UNIVERSAL_VALIDATION_RULES) {
        if (!rule.check(output)) {
            if (rule.severity === 'error') {
                errors.push(`[${rule.id}] ${rule.failureMessage}`);
            }
            else {
                warnings.push(`[${rule.id}] ${rule.failureMessage}`);
            }
        }
    }
    // Calculate meta-cognitive score
    const metaCognitive = calculateMetaCognitiveScore(output);
    return {
        passed: errors.length === 0,
        errors,
        warnings,
        metaCognitiveScore: metaCognitive.score,
    };
}
/**
 * Get the complete system prompt including base + task-specific
 */
export function getCompleteSystemPrompt(taskSpecificPrompt, taskType) {
    // For implementation tasks, use ONLY the implementation prompt to avoid research framing
    if (taskType === 'implementation' && taskSpecificPrompt) {
        return taskSpecificPrompt;
    }
    // For research tasks, explicitly frame as research
    if (taskType === 'research') {
        const researchPrompt = BASE_SYSTEM_PROMPT.replace('You are an AI assistant executing a task', 'You are an AI assistant executing a research task');
        if (!taskSpecificPrompt) {
            return researchPrompt;
        }
        return `${researchPrompt}

TASK-SPECIFIC REQUIREMENTS:
${taskSpecificPrompt}`;
    }
    // For other tasks, use base + specific
    if (!taskSpecificPrompt) {
        return BASE_SYSTEM_PROMPT;
    }
    return `${BASE_SYSTEM_PROMPT}

TASK-SPECIFIC REQUIREMENTS:
${taskSpecificPrompt}`;
}
//# sourceMappingURL=base-system-prompt.js.map