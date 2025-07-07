/**
 * Rule Engine for real-time code violation detection
 * Monitors streaming output and can trigger interventions
 */
export interface CodeRule {
    id: string;
    name: string;
    description: string;
    pattern: RegExp;
    severity: 'error' | 'warning' | 'info';
    intervention?: string;
    autoFix?: boolean;
}
export interface ViolationEvent {
    ruleId: string;
    ruleName: string;
    severity: string;
    match: string;
    line: string;
    timestamp: Date;
    taskId: string;
    intervention?: string;
}
export declare class RuleEngine {
    private rules;
    private violations;
    private onViolation?;
    constructor();
    private loadDefaultRules;
    addRule(rule: CodeRule): void;
    removeRule(ruleId: string): void;
    setViolationHandler(handler: (violation: ViolationEvent) => void): void;
    /**
     * Check a line of output for rule violations
     * Returns violations found with intervention instructions
     */
    checkLine(line: string, taskId: string): ViolationEvent[];
    /**
     * Check a block of code for violations
     */
    checkCode(code: string, taskId: string): ViolationEvent[];
    /**
     * Get all violations for a task
     */
    getViolations(taskId?: string): ViolationEvent[];
    /**
     * Clear violations history
     */
    clearViolations(): void;
    /**
     * Generate intervention command based on violations
     */
    generateIntervention(violations: ViolationEvent[]): string;
    /**
     * Export rules for persistence
     */
    exportRules(): CodeRule[];
    /**
     * Import rules from configuration
     */
    importRules(rules: CodeRule[]): void;
}
export declare const ruleEngine: RuleEngine;
//# sourceMappingURL=rule-engine.d.ts.map