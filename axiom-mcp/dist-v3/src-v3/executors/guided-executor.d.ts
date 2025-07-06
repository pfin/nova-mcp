import { EventEmitter } from 'events';
import { ConversationDB } from '../database/conversation-db.js';
export interface GuidedExecutorOptions {
    conversationDB: ConversationDB;
    enableIntervention: boolean;
    simulateViolations?: boolean;
}
export declare class GuidedExecutor extends EventEmitter {
    private options;
    private streamParser;
    private ruleVerifier;
    private conversationId;
    private interventionCount;
    constructor(options: GuidedExecutorOptions, conversationId: string);
    execute(prompt: string): Promise<string>;
    private simulateWithViolations;
    private executeDirectly;
    private processStream;
    getInterventionCount(): number;
}
//# sourceMappingURL=guided-executor.d.ts.map