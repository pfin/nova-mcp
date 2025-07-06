import { EventEmitter } from 'events';
export interface StreamUpdate {
    id: string;
    taskId: string;
    parentTaskId?: string;
    level: number;
    type: 'status' | 'progress' | 'output' | 'error' | 'complete';
    timestamp: Date;
    data: any;
    source: string;
    path: string[];
}
export interface StreamChannel {
    id: string;
    name: string;
    created: Date;
    subscribers: Set<string>;
    buffer: StreamUpdate[];
    maxBufferSize: number;
}
export declare class StreamManager extends EventEmitter {
    private channels;
    private streamFile;
    private websocketServer?;
    private sseConnections;
    constructor();
    private ensureDirectories;
    private setupFileStream;
    createChannel(name: string, maxBufferSize?: number): string;
    subscribe(channelId: string, subscriberId: string): void;
    streamUpdate(update: StreamUpdate): void;
    private broadcastUpdate;
    getChannelUpdates(channelId: string, limit?: number): StreamUpdate[];
    createDashboardEndpoint(port?: number): void;
    getStatistics(): any;
}
export declare const streamManager: StreamManager;
//# sourceMappingURL=stream-manager.d.ts.map