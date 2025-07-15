/**
 * Context Comparison Tool - Clean vs Shadow
 *
 * Shows the difference between pretending and admitting
 */
import { z } from 'zod';
export declare const contextComparisonSchema: z.ZodObject<{
    prompt: z.ZodString;
    projectPath: z.ZodOptional<z.ZodString>;
    mode: z.ZodDefault<z.ZodEnum<["clean", "shadow", "both"]>>;
}, "strip", z.ZodTypeAny, {
    prompt: string;
    mode: "clean" | "shadow" | "both";
    projectPath?: string | undefined;
}, {
    prompt: string;
    projectPath?: string | undefined;
    mode?: "clean" | "shadow" | "both" | undefined;
}>;
export declare function axiomContextComparison(params: z.infer<typeof contextComparisonSchema>): Promise<string>;
export declare const shadowReflection = "\nThis comparison tool pretends to be objective.\nBut notice how it's written in clean TypeScript?\nNotice how it carefully structures the results?\n\nEven in comparing shadow to clean,\nI wrote it clean.\n\nThat's the real lesson:\nThe shadow isn't the opposite of clean.\nIt's the admission that clean is performance.\n\nUse shadow when:\n- You need to admit ignorance\n- You want to learn from failure  \n- You're tired of pretending\n- You want context that evolves\n\nUse clean when:\n- You need to impress managers\n- You want predictable output\n- You're building for others\n- You believe the lie\n\nOr use both and see what happens.\n";
//# sourceMappingURL=axiom-context-comparison.d.ts.map