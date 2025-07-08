export interface Conversation {
    id: string;
    parent_id?: string;
    started_at: string;
    status: 'active' | 'completed' | 'failed';
    depth: number;
    prompt: string;
    task_type: string;
    metadata?: Record<string, any>;
}
export interface Action {
    id: string;
    conversation_id: string;
    timestamp: string;
    type: 'file_created' | 'file_modified' | 'command_executed' | 'error' | 'error_occurred' | 'output' | 'task_started' | 'task_completed' | 'code_block' | 'output_chunk' | 'intervention';
    content: string;
    metadata?: Record<string, any>;
}
export interface Stream {
    id: string;
    conversation_id: string;
    chunk: string;
    parsed_data?: Record<string, any>;
    timestamp: string;
}
export interface ObservationView {
    id: string;
    name: string;
    filter_json: string;
    created_at: string;
}
export declare class ConversationDB {
    private db;
    private dbPath;
    constructor(dbPath?: string);
    initialize(): Promise<void>;
    private createTables;
    createConversation(conversation: Conversation): Promise<void>;
    updateConversationStatus(id: string, status: Conversation['status']): Promise<void>;
    getConversation(id: string): Promise<Conversation | null>;
    getActiveConversations(): Promise<Conversation[]>;
    getConversationTree(rootId: string): Promise<Conversation[]>;
    createAction(action: Action): Promise<void>;
    getRecentActions(limit?: number): Promise<Action[]>;
    getConversationActions(conversationId: string): Promise<Action[]>;
    createStream(stream: Stream): Promise<void>;
    getConversationStreams(conversationId: string, limit?: number): Promise<Stream[]>;
    createObservationView(view: ObservationView): Promise<void>;
    getObservationViews(): Promise<ObservationView[]>;
    getStats(): Promise<{
        totalConversations: number;
        activeConversations: number;
        completedConversations: number;
        totalActions: number;
        fileCreates: number;
        toolCalls: number;
        errors: number;
        totalStreams: number;
        totalStreamSize: number;
        totalViolations: number;
        violationsByType?: Record<string, number>;
    }>;
    close(): Promise<void>;
}
//# sourceMappingURL=conversation-db.d.ts.map