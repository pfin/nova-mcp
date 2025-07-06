/**
 * WebSocket Server for Real-Time Monitoring
 *
 * Based on expert recommendation from GoodIdeasFromOtherModels.txt:
 * "A WebSocket server is the ideal choice... The Master Controller runs a WebSocket server."
 *
 * And from GoodIdeasFromChatGPTo3.txt:
 * "Master Controller (port 8080)"
 */
import { EventEmitter } from 'events';
import { EventBus } from '../core/event-bus.js';
export interface WebSocketMessage {
    type: 'stream' | 'task_update' | 'verification' | 'intervention' | 'error' | 'system';
    taskId?: string;
    workerId?: string;
    data: any;
    timestamp: string;
}
export interface InterventionMessage {
    type: 'intervene';
    taskId: string;
    prompt: string;
}
export declare class MonitoringWebSocketServer extends EventEmitter {
    private eventBus;
    private wss;
    private clients;
    private port;
    constructor(eventBus: EventBus, port?: number);
    /**
     * Handle new WebSocket connections
     * From docs: "The monitoring dashboard (or any other client) connects to this server"
     */
    private handleConnection;
    /**
     * Subscribe to EventBus events for streaming
     * From docs: "The Master Controller receives the data and knows which taskId it belongs to"
     */
    private subscribeToEvents;
    /**
     * Handle messages from clients
     * From docs: "User Action: The user types a command... WebSocket Message: { 'type': 'intervene', 'taskId': 'xyz', 'prompt': '...' }"
     */
    private handleClientMessage;
    /**
     * Broadcast message to all connected clients
     * From docs: "ws.send(JSON.stringify({ taskId: 'xyz', data: '...' }))"
     */
    private broadcast;
    /**
     * Send message to specific client
     */
    private sendToClient;
    /**
     * Send message to specific task subscribers
     */
    broadcastToTask(taskId: string, message: Omit<WebSocketMessage, 'taskId'>): void;
    /**
     * Generate unique client ID
     */
    private generateClientId;
    /**
     * Get server status
     */
    getStatus(): {
        port: number;
        clients: number;
        uptime: number;
    };
    /**
     * Graceful shutdown
     */
    shutdown(): Promise<void>;
}
/**
 * Create WebSocket intervention API
 * From docs: "Intervention API (WebSocket)... can POST /tasks/:id/inject"
 */
export declare class InterventionAPI {
    private wsServer;
    private masterController;
    constructor(wsServer: MonitoringWebSocketServer, masterController: any);
}
//# sourceMappingURL=websocket-server.d.ts.map