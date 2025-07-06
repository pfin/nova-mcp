import { EventEmitter } from 'events';
export type StreamEventType = 'file_created' | 'file_modified' | 'command_executed' | 'error_occurred' | 'task_started' | 'task_completed' | 'code_block' | 'output_chunk';
export interface StreamEvent {
    type: StreamEventType;
    timestamp: string;
    content: string;
    metadata?: {
        filePath?: string;
        language?: string;
        command?: string;
        exitCode?: number;
        errorType?: string;
    };
}
export declare class StreamParser extends EventEmitter {
    private buffer;
    private inCodeBlock;
    private codeBlockLanguage?;
    private codeBlockContent;
    constructor();
    parse(chunk: string): StreamEvent[];
    reset(): void;
}
//# sourceMappingURL=stream-parser.d.ts.map