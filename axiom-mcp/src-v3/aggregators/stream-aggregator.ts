import { EventEmitter } from 'events';
import type { PtyExecutor } from '../executors/pty-executor.js';
import type { SdkExecutor } from '../executors/sdk-executor.js';
import type { StreamParser } from '../parsers/stream-parser.js';
import type { RuleVerifier } from '../verifiers/rule-verifier.js';
import type { ConversationDB } from '../database/conversation-db.js';
import { v4 as uuidv4 } from 'uuid';

interface StreamMetadata {
  taskId: string;
  shortId: string;
  executor: PtyExecutor | SdkExecutor;
  startTime: number;
  lineBuffer: string;
  byteCount: number;
  lineCount: number;
  lastActivity: number;
  interventionCount: number;
}

interface StreamChunk {
  taskId: string;
  data: string;
  timestamp: number;
  type: 'output' | 'error' | 'intervention' | 'progress';
}

export class StreamAggregator extends EventEmitter {
  private activeStreams: Map<string, StreamMetadata> = new Map();
  private outputStream: NodeJS.WritableStream;
  private colorMap: Map<string, string> = new Map();
  private colors = ['cyan', 'green', 'yellow', 'blue', 'magenta'];
  private colorIndex = 0;
  
  constructor(
    private streamParser: StreamParser | null,
    private ruleVerifier: RuleVerifier | null,
    private conversationDB: ConversationDB | null,
    outputStream: NodeJS.WritableStream = process.stderr
  ) {
    super();
    this.outputStream = outputStream;
  }
  
  private getTaskColor(taskId: string): string {
    if (!this.colorMap.has(taskId)) {
      this.colorMap.set(taskId, this.colors[this.colorIndex % this.colors.length]);
      this.colorIndex++;
    }
    return this.colorMap.get(taskId)!;
  }
  
  attachChild(taskId: string, executor: PtyExecutor | SdkExecutor): void {
    const shortId = taskId.slice(0, 8);
    const prefix = `[${shortId}]`;
    
    const metadata: StreamMetadata = {
      taskId,
      shortId,
      executor,
      startTime: Date.now(),
      lineBuffer: '',
      byteCount: 0,
      lineCount: 0,
      lastActivity: Date.now(),
      interventionCount: 0
    };
    
    this.activeStreams.set(taskId, metadata);
    this.outputLine(prefix, 'Starting execution...', 'cyan');
    
    if ('pty' in executor) {
      this.attachPtyExecutor(taskId, executor as PtyExecutor, prefix);
    } else {
      this.attachSdkExecutor(taskId, executor as SdkExecutor, prefix);
    }
  }
  
  private attachPtyExecutor(taskId: string, executor: PtyExecutor, prefix: string): void {
    const metadata = this.activeStreams.get(taskId)!;
    
    executor.on('data', async (event) => {
      if (event.type === 'data') {
        metadata.lastActivity = Date.now();
        metadata.byteCount += event.payload.length;
        
        // Buffer lines for clean output
        metadata.lineBuffer += event.payload;
        const lines = metadata.lineBuffer.split('\n');
        metadata.lineBuffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim()) {
            metadata.lineCount++;
            this.outputLine(prefix, line);
            
            // Check for interventions
            if (line.includes('[INTERVENTION]')) {
              metadata.interventionCount++;
              this.emit('intervention', { taskId, line });
            }
          }
        }
        
        // Still parse and store in DB
        if (this.streamParser) {
          const events = this.streamParser.parse(event.payload);
          if (events.length > 0 && this.conversationDB) {
            await this.storeEvents(taskId, events);
          }
        }
        
        // Emit periodic stats
        if (metadata.lineCount % 10 === 0) {
          this.emit('stats', {
            taskId,
            lines: metadata.lineCount,
            bytes: metadata.byteCount,
            interventions: metadata.interventionCount
          });
        }
      }
    });
    
    executor.on('exit', () => this.handleChildExit(taskId));
    executor.on('error', (event) => {
      this.outputLine(prefix, `ERROR: ${event.payload}`, 'red');
    });
  }
  
  private attachSdkExecutor(taskId: string, executor: SdkExecutor, prefix: string): void {
    const metadata = this.activeStreams.get(taskId)!;
    
    executor.on('delta', (event) => {
      metadata.lastActivity = Date.now();
      metadata.lineCount++;
      
      if (event.payload?.messageType === 'assistant') {
        this.outputLine(prefix, '[SDK] Assistant message received', 'green');
        // Parse assistant message content for better display
        if (event.payload.content) {
          const content = JSON.stringify(event.payload.content);
          this.outputLine(prefix, content.slice(0, 200) + '...', 'gray');
        }
      } else {
        this.outputLine(prefix, `[SDK] ${event.payload?.messageType || 'unknown'}`, 'gray');
      }
      
      // Emit stats periodically
      if (metadata.lineCount % 5 === 0) {
        this.emit('stats', {
          taskId,
          lines: metadata.lineCount,
          bytes: metadata.byteCount,
          interventions: metadata.interventionCount
        });
      }
    });
    
    executor.on('complete', (event) => {
      this.outputLine(prefix, `[SDK] Complete. Messages: ${event.payload?.messageCount}`, 'green');
      this.handleChildExit(taskId);
    });
    
    executor.on('error', (event) => {
      this.outputLine(prefix, `[SDK] ERROR: ${event.payload}`, 'red');
      this.handleChildExit(taskId);
    });
  }
  
  private async storeEvents(taskId: string, events: any[]): Promise<void> {
    if (!this.conversationDB) return;
    
    try {
      for (const event of events) {
        await this.conversationDB.createStream({
          id: uuidv4(),
          conversation_id: taskId,
          chunk: JSON.stringify(event),
          parsed_data: event,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(`[StreamAggregator] Failed to store events:`, err);
    }
  }
  
  private handleChildExit(taskId: string): void {
    const metadata = this.activeStreams.get(taskId);
    if (!metadata) return;
    
    const prefix = `[${metadata.shortId}]`;
    
    // Flush any remaining buffer
    if (metadata.lineBuffer) {
      this.outputLine(prefix, metadata.lineBuffer);
    }
    
    const duration = Date.now() - metadata.startTime;
    this.outputLine(prefix, `Execution completed in ${(duration/1000).toFixed(1)}s`, 'cyan');
    
    this.emit('child-complete', { 
      taskId, 
      duration,
      lines: metadata.lineCount,
      interventions: metadata.interventionCount
    });
    
    this.activeStreams.delete(taskId);
    this.colorMap.delete(taskId);
  }
  
  private outputLine(prefix: string, line: string, color?: string): void {
    const timestamp = new Date().toISOString().split('T')[1].replace('Z', '');
    let output = prefix;
    
    // Add color if terminal supports it
    if (color && this.outputStream === process.stderr && process.stderr.isTTY) {
      const colorCode = this.getAnsiColor(color);
      output = `\x1b[${colorCode}m${prefix}\x1b[0m`;
    }
    
    this.outputStream.write(`${output} ${line}\n`);
    
    // Emit for other consumers
    this.emit('line', { prefix, line, timestamp });
  }
  
  private getAnsiColor(color: string): string {
    const colors: Record<string, string> = {
      'red': '31',
      'green': '32', 
      'yellow': '33',
      'blue': '34',
      'magenta': '35',
      'cyan': '36',
      'gray': '90'
    };
    return colors[color] || '37';
  }
  
  getActiveCount(): number {
    return this.activeStreams.size;
  }
  
  getStats(): {
    activeCount: number;
    totalLines: number;
    totalBytes: number;
    totalInterventions: number;
    streams: Array<{
      taskId: string;
      uptime: number;
      lines: number;
      bytes: number;
      interventions: number;
    }>;
  } {
    const streams = Array.from(this.activeStreams.values()).map(s => ({
      taskId: s.taskId,
      uptime: Date.now() - s.startTime,
      lines: s.lineCount,
      bytes: s.byteCount,
      interventions: s.interventionCount
    }));
    
    return {
      activeCount: this.activeStreams.size,
      totalLines: streams.reduce((sum, s) => sum + s.lines, 0),
      totalBytes: streams.reduce((sum, s) => sum + s.bytes, 0),
      totalInterventions: streams.reduce((sum, s) => sum + s.interventions, 0),
      streams
    };
  }
}