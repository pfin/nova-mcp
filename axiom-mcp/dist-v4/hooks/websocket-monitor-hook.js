/**
 * WebSocket Monitor Hook - Real-time web interface
 * Demonstrates how v4 connects monitoring components
 */
import { HookEvent } from '../core/hook-orchestrator.js';
import { WebSocketServer } from 'ws';
let wsServer = null;
const clients = new Set();
// Initialize WebSocket server on first use
function ensureWebSocketServer() {
    if (!wsServer) {
        wsServer = new WebSocketServer({ port: 8080 });
        wsServer.on('connection', (ws) => {
            clients.add(ws);
            console.error('[WebSocket] Client connected');
            // Send initial state
            ws.send(JSON.stringify({
                type: 'connected',
                message: 'Connected to Axiom v4 Monitor'
            }));
            ws.on('close', () => {
                clients.delete(ws);
                console.error('[WebSocket] Client disconnected');
            });
        });
        console.error('[WebSocket] Server started on port 8080');
    }
    return wsServer;
}
export const websocketMonitorHook = {
    name: 'websocket-monitor-hook',
    events: [
        HookEvent.REQUEST_RECEIVED,
        HookEvent.EXECUTION_STARTED,
        HookEvent.EXECUTION_STREAM,
        HookEvent.EXECUTION_COMPLETED,
        HookEvent.EXECUTION_FAILED,
        HookEvent.EXECUTION_INTERVENTION
    ],
    priority: 70,
    handler: async (context) => {
        const { event, request, execution, stream } = context;
        // Ensure WebSocket server is running
        ensureWebSocketServer();
        // Broadcast event to all connected clients
        const message = {
            type: event,
            timestamp: new Date().toISOString(),
            taskId: execution?.taskId,
            data: {}
        };
        switch (event) {
            case HookEvent.REQUEST_RECEIVED:
                message.data = {
                    tool: request?.tool,
                    preview: typeof (request?.args?.prompt || request?.args?.parentPrompt) === 'string'
                        ? (request?.args?.prompt || request?.args?.parentPrompt)?.slice(0, 100) + '...'
                        : String(request?.args?.prompt || request?.args?.parentPrompt)
                };
                break;
            case HookEvent.EXECUTION_STREAM:
                message.data = {
                    stream: stream?.data,
                    source: stream?.source
                };
                break;
            case HookEvent.EXECUTION_COMPLETED:
                message.data = {
                    status: 'completed',
                    output: execution?.output?.slice(0, 200) + '...'
                };
                break;
            case HookEvent.EXECUTION_FAILED:
                message.data = {
                    status: 'failed',
                    error: context.metadata?.error
                };
                break;
        }
        // Broadcast to all clients
        const payload = JSON.stringify(message);
        for (const client of clients) {
            if (client.readyState === 1) { // OPEN
                client.send(payload);
            }
        }
        return { action: 'continue' };
    }
};
export default websocketMonitorHook;
//# sourceMappingURL=websocket-monitor-hook.js.map