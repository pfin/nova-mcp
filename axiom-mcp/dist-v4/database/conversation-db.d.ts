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
    private hookOrchestrator?;
    constructor(dbPath?: string);
    setHookOrchestrator(orchestrator: any): void;
    initialize(): Promise<void>;
    private createTables;
    createConversation(conversation: Omit<Conversation, 'id'>): Promise<Conversation>;
    updateConversation(id: string, updates: Partial<Conversation>): Promise<void>;
    logAction(action: Omit<Action, 'id'>): Promise<Action>;
    logStream(stream: Omit<Stream, 'id'>): Promise<Stream>;
    getConversation(id: string): Promise<Conversation | null>;
    getActiveConversations(): Promise<Conversation[]>;
    getConversationTree(rootId: string): Promise<Conversation[]>;
    getRecentActions(limit?: number): Promise<Action[]>;
    getStats(): Promise<any>;
    close(): Promise<void>;
}
//# sourceMappingURL=conversation-db.d.ts.map