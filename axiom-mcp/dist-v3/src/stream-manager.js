import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
export class StreamManager extends EventEmitter {
    channels = new Map();
    streamFile;
    websocketServer;
    sseConnections = new Set();
    constructor() {
        super();
        this.streamFile = path.join(process.cwd(), 'streams', 'live-updates.jsonl');
        this.ensureDirectories();
        // Set up file stream for persistence
        this.setupFileStream();
        // Emit updates to console without blocking
        this.on('update', (update) => {
            this.broadcastUpdate(update);
        });
    }
    ensureDirectories() {
        const streamsDir = path.join(process.cwd(), 'streams');
        if (!fs.existsSync(streamsDir)) {
            fs.mkdirSync(streamsDir, { recursive: true });
        }
    }
    setupFileStream() {
        // Create write stream for append-only log
        const writeStream = fs.createWriteStream(this.streamFile, { flags: 'a' });
        this.on('update', (update) => {
            writeStream.write(JSON.stringify(update) + '\n');
        });
    }
    // Create a new streaming channel
    createChannel(name, maxBufferSize = 1000) {
        const id = uuidv4();
        const channel = {
            id,
            name,
            created: new Date(),
            subscribers: new Set(),
            buffer: [],
            maxBufferSize
        };
        this.channels.set(id, channel);
        return id;
    }
    // Subscribe to a channel
    subscribe(channelId, subscriberId) {
        const channel = this.channels.get(channelId);
        if (channel) {
            channel.subscribers.add(subscriberId);
        }
    }
    // Stream an update through the hierarchy
    streamUpdate(update) {
        // Add to channel buffer if exists
        const channel = this.channels.get(update.taskId);
        if (channel) {
            channel.buffer.push(update);
            if (channel.buffer.length > channel.maxBufferSize) {
                channel.buffer.shift(); // Remove oldest
            }
        }
        // Emit the update
        this.emit('update', update);
        // Propagate to parent if exists
        if (update.parentTaskId) {
            const parentUpdate = {
                ...update,
                taskId: update.parentTaskId,
                level: update.level - 1,
                path: [...update.path, update.taskId]
            };
            // Emit parent update with slight delay to prevent blocking
            setImmediate(() => {
                this.streamUpdate(parentUpdate);
            });
        }
    }
    // Broadcast update to all connections without blocking
    broadcastUpdate(update) {
        // Format for console output
        const indent = '  '.repeat(update.level);
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        let message = '';
        switch (update.type) {
            case 'status':
                message = `${indent}[${timestamp}] 📊 ${update.source}: ${update.data.status}`;
                break;
            case 'progress':
                message = `${indent}[${timestamp}] ⏳ ${update.source}: ${update.data.percent}% - ${update.data.message}`;
                break;
            case 'output':
                message = `${indent}[${timestamp}] 📝 ${update.source}: ${update.data.preview}`;
                break;
            case 'error':
                message = `${indent}[${timestamp}] ❌ ${update.source}: ${update.data.error}`;
                break;
            case 'complete':
                message = `${indent}[${timestamp}] ✅ ${update.source}: Completed in ${update.data.duration}ms`;
                break;
        }
        // Non-blocking console output
        if (message) {
            process.stderr.write(message + '\n');
        }
        // Send to websocket clients if server exists
        if (this.websocketServer) {
            this.websocketServer.broadcast(JSON.stringify(update));
        }
        // Send to SSE connections
        for (const connection of this.sseConnections) {
            connection.write(`data: ${JSON.stringify(update)}\n\n`);
        }
    }
    // Get recent updates from a channel
    getChannelUpdates(channelId, limit = 100) {
        const channel = this.channels.get(channelId);
        if (!channel)
            return [];
        return channel.buffer.slice(-limit);
    }
    // Create a real-time dashboard endpoint
    createDashboardEndpoint(port = 3456) {
        const express = require('express');
        const app = express();
        // SSE endpoint for real-time updates
        app.get('/stream', (req, res) => {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            this.sseConnections.add(res);
            // Send initial data
            res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
            // Clean up on disconnect
            req.on('close', () => {
                this.sseConnections.delete(res);
            });
        });
        // Dashboard HTML
        app.get('/', (req, res) => {
            res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Axiom MCP Live Stream</title>
          <style>
            body { 
              font-family: monospace; 
              background: #1e1e1e; 
              color: #d4d4d4; 
              padding: 20px;
            }
            #updates { 
              background: #2d2d2d; 
              padding: 15px; 
              border-radius: 5px; 
              height: 80vh; 
              overflow-y: auto;
            }
            .update { 
              margin: 5px 0; 
              padding: 5px; 
              border-left: 3px solid #569cd6;
            }
            .status { border-left-color: #569cd6; }
            .progress { border-left-color: #ce9178; }
            .output { border-left-color: #608b4e; }
            .error { border-left-color: #f44747; }
            .complete { border-left-color: #4ec9b0; }
          </style>
        </head>
        <body>
          <h1>Axiom MCP Live Stream Dashboard</h1>
          <div id="updates"></div>
          <script>
            const updates = document.getElementById('updates');
            const eventSource = new EventSource('/stream');
            
            eventSource.onmessage = (event) => {
              const data = JSON.parse(event.data);
              if (data.type === 'connected') return;
              
              const div = document.createElement('div');
              div.className = 'update ' + data.type;
              div.innerHTML = \`
                <strong>[\${new Date(data.timestamp).toLocaleTimeString()}]</strong>
                \${' '.repeat(data.level * 2)}
                <span class="type">\${data.type.toUpperCase()}</span>
                <span class="source">\${data.source}</span>:
                \${JSON.stringify(data.data)}
              \`;
              
              updates.appendChild(div);
              updates.scrollTop = updates.scrollHeight;
              
              // Keep only last 1000 updates
              while (updates.children.length > 1000) {
                updates.removeChild(updates.firstChild);
              }
            };
          </script>
        </body>
        </html>
      `);
        });
        app.listen(port, () => {
            console.error(`🌐 Axiom MCP Live Dashboard: http://localhost:${port}`);
        });
    }
    // Get aggregated statistics
    getStatistics() {
        const stats = {
            totalUpdates: 0,
            updatesByType: {},
            activeChannels: this.channels.size,
            totalSubscribers: 0,
            recentErrors: []
        };
        for (const channel of this.channels.values()) {
            stats.totalUpdates += channel.buffer.length;
            stats.totalSubscribers += channel.subscribers.size;
            for (const update of channel.buffer) {
                stats.updatesByType[update.type] = (stats.updatesByType[update.type] || 0) + 1;
                if (update.type === 'error' && stats.recentErrors.length < 10) {
                    stats.recentErrors.push(update);
                }
            }
        }
        return stats;
    }
}
// Singleton instance
export const streamManager = new StreamManager();
//# sourceMappingURL=stream-manager.js.map