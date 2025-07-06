/**
 * WebSocket Server for Real-Time Monitoring
 * 
 * Based on expert recommendation from GoodIdeasFromOtherModels.txt:
 * "A WebSocket server is the ideal choice... The Master Controller runs a WebSocket server."
 * 
 * And from GoodIdeasFromChatGPTo3.txt:
 * "Master Controller (port 8080)"
 */

import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { Server } from 'http';
import { Task, WorkerMessage, VerificationResult } from '../core/types.js';
import { EventBus, LedgerEvent, EventType } from '../core/event-bus.js';

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

export class MonitoringWebSocketServer extends EventEmitter {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocket> = new Map();
  private port: number;
  
  constructor(
    private eventBus: EventBus,
    port: number = 8080 // Expert recommendation: "Master Controller (port 8080)"
  ) {
    super();
    this.port = port;
    
    // Create WebSocket server
    this.wss = new WebSocketServer({ port });
    
    // Set up connection handling
    this.wss.on('connection', this.handleConnection.bind(this));
    
    // Subscribe to EventBus events
    this.subscribeToEvents();
    
    console.error(`[WebSocketServer] Listening on port ${port}`);
  }
  
  /**
   * Handle new WebSocket connections
   * From docs: "The monitoring dashboard (or any other client) connects to this server"
   */
  private handleConnection(ws: WebSocket, request: any): void {
    const clientId = this.generateClientId();
    this.clients.set(clientId, ws);
    
    console.error(`[WebSocketServer] Client connected: ${clientId}`);
    
    // Send initial connection message
    this.sendToClient(ws, {
      type: 'system',
      data: {
        message: 'Connected to Axiom MCP v3 Monitoring',
        clientId,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
    
    // Handle client messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleClientMessage(clientId, message);
      } catch (error) {
        console.error(`[WebSocketServer] Invalid message from ${clientId}:`, error);
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      console.error(`[WebSocketServer] Client disconnected: ${clientId}`);
      this.clients.delete(clientId);
    });
    
    ws.on('error', (error) => {
      console.error(`[WebSocketServer] Client error ${clientId}:`, error);
    });
  }
  
  /**
   * Subscribe to EventBus events for streaming
   * From docs: "The Master Controller receives the data and knows which taskId it belongs to"
   */
  private subscribeToEvents(): void {
    // Stream all events to connected clients
    this.eventBus.on('event', (event: LedgerEvent) => {
      // Convert to WebSocket message format
      const wsMessage: WebSocketMessage = {
        type: 'stream',
        taskId: event.taskId,
        workerId: event.workerId,
        data: {
          event: event.event,
          payload: event.payload,
          parentId: event.parentId,
          verification: event.verification
        },
        timestamp: event.timestamp
      };
      
      // From docs: "It then broadcasts the data over the WebSocket connection, tagged with the taskId"
      this.broadcast(wsMessage);
    });
    
    // Special handling for task updates
    this.eventBus.on(EventType.TASK_START, (event: LedgerEvent) => {
      this.broadcast({
        type: 'task_update',
        taskId: event.taskId,
        data: {
          status: 'started',
          payload: event.payload
        },
        timestamp: event.timestamp
      });
    });
    
    this.eventBus.on(EventType.TASK_COMPLETE, (event: LedgerEvent) => {
      this.broadcast({
        type: 'task_update',
        taskId: event.taskId,
        data: {
          status: 'completed',
          payload: event.payload
        },
        timestamp: event.timestamp
      });
    });
    
    // Stream verification results
    this.eventBus.on(EventType.VERIFICATION_PASS, (event: LedgerEvent) => {
      this.broadcast({
        type: 'verification',
        taskId: event.taskId,
        data: {
          passed: true,
          verification: event.verification
        },
        timestamp: event.timestamp
      });
    });
    
    this.eventBus.on(EventType.VERIFICATION_FAIL, (event: LedgerEvent) => {
      this.broadcast({
        type: 'verification',
        taskId: event.taskId,
        data: {
          passed: false,
          verification: event.verification
        },
        timestamp: event.timestamp
      });
    });
  }
  
  /**
   * Handle messages from clients
   * From docs: "User Action: The user types a command... WebSocket Message: { 'type': 'intervene', 'taskId': 'xyz', 'prompt': '...' }"
   */
  private handleClientMessage(clientId: string, message: any): void {
    switch (message.type) {
      case 'intervene':
        // From docs: "This is the reverse of the output stream and is enabled by node-pty and WebSockets"
        const intervention = message as InterventionMessage;
        this.emit('intervention', {
          taskId: intervention.taskId,
          prompt: intervention.prompt,
          clientId
        });
        
        // Log intervention to event bus
        this.eventBus.logEvent({
          taskId: intervention.taskId,
          workerId: 'websocket',
          event: EventType.INTERVENTION,
          payload: {
            prompt: intervention.prompt,
            clientId
          }
        });
        break;
        
      case 'subscribe':
        // Allow clients to subscribe to specific task IDs
        // TODO: Implement filtered subscriptions
        break;
        
      case 'ping':
        // Heartbeat
        this.sendToClient(this.clients.get(clientId)!, {
          type: 'system',
          data: { message: 'pong' },
          timestamp: new Date().toISOString()
        });
        break;
        
      default:
        console.error(`[WebSocketServer] Unknown message type: ${message.type}`);
    }
  }
  
  /**
   * Broadcast message to all connected clients
   * From docs: "ws.send(JSON.stringify({ taskId: 'xyz', data: '...' }))"
   */
  private broadcast(message: WebSocketMessage): void {
    const json = JSON.stringify(message);
    
    for (const [clientId, ws] of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(json);
      }
    }
  }
  
  /**
   * Send message to specific client
   */
  private sendToClient(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
  
  /**
   * Send message to specific task subscribers
   */
  broadcastToTask(taskId: string, message: Omit<WebSocketMessage, 'taskId'>): void {
    this.broadcast({
      ...message,
      taskId
    });
  }
  
  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Get server status
   */
  getStatus(): {
    port: number;
    clients: number;
    uptime: number;
  } {
    return {
      port: this.port,
      clients: this.clients.size,
      uptime: process.uptime()
    };
  }
  
  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.error('[WebSocketServer] Shutting down...');
    
    // Close all client connections
    for (const [clientId, ws] of this.clients) {
      ws.close(1000, 'Server shutting down');
    }
    
    // Close server
    return new Promise((resolve) => {
      this.wss.close(() => {
        console.error('[WebSocketServer] Shutdown complete');
        resolve();
      });
    });
  }
}

/**
 * Create WebSocket intervention API
 * From docs: "Intervention API (WebSocket)... can POST /tasks/:id/inject"
 */
export class InterventionAPI {
  constructor(
    private wsServer: MonitoringWebSocketServer,
    private masterController: any // Circular import fix
  ) {
    // Listen for intervention requests from WebSocket
    this.wsServer.on('intervention', async (data: {
      taskId: string;
      prompt: string;
      clientId: string;
    }) => {
      try {
        // Forward to Master Controller
        await this.masterController.intervene(data.taskId, data.prompt);
        
        // Confirm to client
        this.wsServer.broadcastToTask(data.taskId, {
          type: 'system',
          data: {
            message: 'Intervention sent',
            prompt: data.prompt
          },
          timestamp: new Date().toISOString()
        });
      } catch (error: any) {
        // Send error back
        this.wsServer.broadcastToTask(data.taskId, {
          type: 'error',
          data: {
            message: 'Intervention failed',
            error: error.message
          },
          timestamp: new Date().toISOString()
        });
      }
    });
  }
}