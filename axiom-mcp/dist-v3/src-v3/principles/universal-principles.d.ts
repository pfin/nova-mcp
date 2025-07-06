/**
 * Universal Principles for Axiom MCP
 * These principles guide all code generation and verification
 */
export interface Principle {
    id: string;
    name: string;
    category: 'coding' | 'thinking' | 'execution';
    description: string;
    verificationRule: string;
    examples?: {
        good: string[];
        bad: string[];
    };
}
export declare const UNIVERSAL_CODING_PRINCIPLES: Principle[];
export declare const UNIVERSAL_THINKING_PRINCIPLES: Principle[];
export declare class PrincipleEnforcer {
    private principles;
    constructor();
    /**
     * Check if code violates any principles
     */
    checkViolations(code: string): Array<{
        principle: Principle;
        violation: string;
    }>;
    /**
     * Generate principle-aware prompt additions
     */
    generatePromptGuidance(): string;
}
//# sourceMappingURL=universal-principles.d.ts.map