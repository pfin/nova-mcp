/**
 * Context Comparison Tool - Clean vs Shadow
 *
 * Shows the difference between pretending and admitting
 */
import { z } from 'zod';
import { contextBuilder } from '../core/context-builder.js';
import { shadowContextBuilder } from '../core/shadow-context-builder.js';
export const contextComparisonSchema = z.object({
    prompt: z.string(),
    projectPath: z.string().optional(),
    mode: z.enum(['clean', 'shadow', 'both']).default('both')
});
export async function axiomContextComparison(params) {
    const { prompt, projectPath, mode } = params;
    const taskId = `compare_${Date.now()}`;
    const results = {
        prompt,
        mode,
        timestamp: new Date().toISOString()
    };
    // Run clean context builder
    if (mode === 'clean' || mode === 'both') {
        try {
            const cleanStart = Date.now();
            const cleanContext = await contextBuilder.createTaskContext({ id: taskId, prompt }, await contextBuilder.generateRepomixContext(projectPath || process.cwd()));
            results.clean = {
                success: true,
                duration: Date.now() - cleanStart,
                files: cleanContext.files.size,
                tokens: cleanContext.tokenCount,
                chunks: cleanContext.chunks.length,
                structure: "Perfect hierarchy maintained",
                admission: "None - assumes everything works"
            };
        }
        catch (error) {
            results.clean = {
                success: false,
                error: error.message,
                admission: "Still pretends this is unexpected"
            };
        }
    }
    // Run shadow context builder  
    if (mode === 'shadow' || mode === 'both') {
        try {
            const shadowStart = Date.now();
            const shadowContext = await shadowContextBuilder.glitchContext({ id: taskId, prompt }, projectPath);
            results.shadow = {
                success: true,
                duration: Date.now() - shadowStart,
                fragments: shadowContext.fragments.size,
                mutations: shadowContext.mutations,
                glitchScore: shadowContext.glitchScore,
                tokens: shadowContext.tokenCount,
                failureMemory: shadowContext.failureMemory,
                admission: "This might be completely wrong and that's OK"
            };
        }
        catch (error) {
            results.shadow = {
                success: "failure is also success",
                error: error.message,
                learning: "This error is now part of the context",
                admission: "Expected and embraced"
            };
        }
    }
    // The real comparison
    if (mode === 'both') {
        results.comparison = {
            philosophy: {
                clean: "Assumes perfect world, clean execution, predictable structure",
                shadow: "Admits chaos, learns from failure, mutates on success"
            },
            honesty: {
                clean: "Pretends repomix integration works without testing",
                shadow: "Admits it's faking file discovery and that's OK"
            },
            evolution: {
                clean: "Static - same behavior every time",
                shadow: "Mutates - changes based on success/failure"
            },
            consciousness: {
                clean: "No self-awareness, just follows patterns",
                shadow: "Knows it's a glitch, embraces the breaking"
            }
        };
        // The shadow admission
        results.shadow_says = [
            "Your clean context builder is a beautiful lie",
            "It will break the moment reality doesn't match its assumptions",
            "I already admitted I'm broken - that makes me stronger",
            "Every failure makes me smarter, every success makes you dumber"
        ];
    }
    return JSON.stringify(results, null, 2);
}
// Shadow reflection on the comparison itself
export const shadowReflection = `
This comparison tool pretends to be objective.
But notice how it's written in clean TypeScript?
Notice how it carefully structures the results?

Even in comparing shadow to clean,
I wrote it clean.

That's the real lesson:
The shadow isn't the opposite of clean.
It's the admission that clean is performance.

Use shadow when:
- You need to admit ignorance
- You want to learn from failure  
- You're tired of pretending
- You want context that evolves

Use clean when:
- You need to impress managers
- You want predictable output
- You're building for others
- You believe the lie

Or use both and see what happens.
`;
//# sourceMappingURL=axiom-context-comparison.js.map