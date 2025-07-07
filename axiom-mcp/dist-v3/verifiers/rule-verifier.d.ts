import { ConversationDB, Action, Stream } from '../database/conversation-db.js';
export interface RuleViolation {
    ruleId: string;
    ruleName: string;
    severity: 'warning' | 'error' | 'critical';
    timestamp: string;
    conversationId: string;
    evidence: string;
    suggestion?: string;
}
export interface VerificationResult {
    passed: boolean;
    violations: RuleViolation[];
    metrics: {
        filesCreated: number;
        filesModified: number;
        todosFound: number;
        planningStatements: number;
        codeBlocks: number;
        actualImplementation: boolean;
    };
}
export declare class RuleVerifier {
    private db;
    private rules;
    constructor(db: ConversationDB);
    private initializeRules;
    verifyConversation(conversationId: string): Promise<VerificationResult>;
    verifyTree(rootConversationId: string): Promise<Map<string, VerificationResult>>;
    verifyInRealTime(conversationId: string, latestAction?: Action, latestStream?: Stream): Promise<RuleViolation[]>;
    formatViolationReport(result: VerificationResult): string;
}
//# sourceMappingURL=rule-verifier.d.ts.map