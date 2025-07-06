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
  intervention?: string; // Command to inject if violated
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

export class RuleEngine {
  private rules: Map<string, CodeRule> = new Map();
  private violations: ViolationEvent[] = [];
  private onViolation?: (violation: ViolationEvent) => void;
  
  constructor() {
    this.loadDefaultRules();
  }
  
  private loadDefaultRules() {
    // Rule: Don't implement math functions, use libraries
    this.addRule({
      id: 'no-custom-math',
      name: 'No Custom Math Functions',
      description: 'Use Math library instead of implementing custom math functions',
      pattern: /function\s+(sqrt|pow|sin|cos|tan|log|exp|abs|floor|ceil|round)\s*\(/gi,
      severity: 'error',
      intervention: 'STOP! Use Math.{function} instead of implementing custom math. Delete that function and use the built-in Math library.',
      autoFix: true
    });
    
    // Rule: No var declarations
    this.addRule({
      id: 'no-var',
      name: 'No var declarations',
      description: 'Use const or let instead of var',
      pattern: /\bvar\s+\w+\s*=/g,
      severity: 'warning',
      intervention: 'Replace var with const or let for better scoping.',
      autoFix: true
    });
    
    // Rule: No eval usage
    this.addRule({
      id: 'no-eval',
      name: 'No eval() usage',
      description: 'eval() is dangerous and should not be used',
      pattern: /\beval\s*\(/g,
      severity: 'error',
      intervention: 'SECURITY VIOLATION! Remove eval() immediately. Find a safer alternative.',
      autoFix: true
    });
    
    // Rule: No console.log in production code
    this.addRule({
      id: 'no-console-log',
      name: 'No console.log in production',
      description: 'Remove console.log statements from production code',
      pattern: /console\.(log|debug|info)\(/g,
      severity: 'warning',
      intervention: 'Remove console.log statement or use a proper logging library.',
      autoFix: false
    });
    
    // Rule: No hardcoded credentials
    this.addRule({
      id: 'no-hardcoded-creds',
      name: 'No hardcoded credentials',
      description: 'Never hardcode passwords or API keys',
      pattern: /(password|apikey|api_key|secret)\s*[:=]\s*["'][\w\d]+["']/gi,
      severity: 'error',
      intervention: 'CRITICAL SECURITY VIOLATION! Never hardcode credentials. Use environment variables instead.',
      autoFix: true
    });
  }
  
  addRule(rule: CodeRule) {
    this.rules.set(rule.id, rule);
  }
  
  removeRule(ruleId: string) {
    this.rules.delete(ruleId);
  }
  
  setViolationHandler(handler: (violation: ViolationEvent) => void) {
    this.onViolation = handler;
  }
  
  /**
   * Check a line of output for rule violations
   * Returns violations found with intervention instructions
   */
  checkLine(line: string, taskId: string): ViolationEvent[] {
    const violations: ViolationEvent[] = [];
    
    for (const [ruleId, rule] of this.rules) {
      const matches = line.matchAll(rule.pattern);
      
      for (const match of matches) {
        const violation: ViolationEvent = {
          ruleId,
          ruleName: rule.name,
          severity: rule.severity,
          match: match[0],
          line: line.trim(),
          timestamp: new Date(),
          taskId,
          intervention: rule.intervention
        };
        
        violations.push(violation);
        this.violations.push(violation);
        
        // Notify handler immediately for real-time intervention
        if (this.onViolation) {
          this.onViolation(violation);
        }
      }
    }
    
    return violations;
  }
  
  /**
   * Check a block of code for violations
   */
  checkCode(code: string, taskId: string): ViolationEvent[] {
    const lines = code.split('\n');
    const allViolations: ViolationEvent[] = [];
    
    for (const line of lines) {
      const violations = this.checkLine(line, taskId);
      allViolations.push(...violations);
    }
    
    return allViolations;
  }
  
  /**
   * Get all violations for a task
   */
  getViolations(taskId?: string): ViolationEvent[] {
    if (taskId) {
      return this.violations.filter(v => v.taskId === taskId);
    }
    return [...this.violations];
  }
  
  /**
   * Clear violations history
   */
  clearViolations() {
    this.violations = [];
  }
  
  /**
   * Generate intervention command based on violations
   */
  generateIntervention(violations: ViolationEvent[]): string {
    if (violations.length === 0) return '';
    
    // Sort by severity (error > warning > info)
    const sorted = violations.sort((a, b) => {
      const severityOrder: Record<string, number> = { error: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
    
    // Take the most severe violation
    const mostSevere = sorted[0];
    
    if (mostSevere.intervention) {
      return `\n\n🚨 INTERVENTION: ${mostSevere.intervention}\n\n`;
    }
    
    return `\n\n⚠️ CODE VIOLATION: ${mostSevere.ruleName} - ${mostSevere.severity.toUpperCase()}\n`;
  }
  
  /**
   * Export rules for persistence
   */
  exportRules(): CodeRule[] {
    return Array.from(this.rules.values());
  }
  
  /**
   * Import rules from configuration
   */
  importRules(rules: CodeRule[]) {
    this.rules.clear();
    for (const rule of rules) {
      this.addRule(rule);
    }
  }
}

// Singleton instance
export const ruleEngine = new RuleEngine();