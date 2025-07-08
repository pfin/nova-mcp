/**
 * Universal Principles Hook - Enforces core Axiom principles
 * Converted from v3 universal-principles.ts
 */
import { Hook } from '../core/hook-orchestrator.js';
export interface Principle {
    id: string;
    name: string;
    description: string;
    category: 'coding' | 'thinking' | 'execution';
    verificationRule: string;
    examples?: {
        good: string[];
        bad: string[];
    };
}
export declare const universalPrinciplesHook: Hook;
export declare function checkPrinciple(code: string, principleId: string): boolean;
export declare function getPrinciples(category?: string): Principle[];
export default universalPrinciplesHook;
//# sourceMappingURL=universal-principles-hook.d.ts.map