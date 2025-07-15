/**
 * Minimal ConversationDB interface for v4 hooks
 */
export interface ConversationDB {
    init(): Promise<void>;
    createConversation(data: any): Promise<{
        id: string;
    }>;
    logAction(data: any): Promise<void>;
    getRecentActions(limit: number): Promise<any[]>;
    getStats(): Promise<any>;
}
//# sourceMappingURL=conversation-db.d.ts.map