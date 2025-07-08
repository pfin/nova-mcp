/**
 * Claude Session Manager - Manages interactive Claude sessions
 * The entire point: bidirectional communication with running Claude
 */

import { EventEmitter } from 'events';
import * as pty from 'node-pty';
import { Logger } from '../core/logger.js';
import { logDebug } from '../core/simple-logger.js';

export interface ClaudeSession {
  id: string;
  pty: pty.IPty;
  output: string;
  ready: boolean;
  busy: boolean;
  created: Date;
}

export class ClaudeSessionManager extends EventEmitter {
  private sessions: Map<string, ClaudeSession> = new Map();
  private logger: Logger;
  
  constructor() {
    super();
    this.logger = Logger.getInstance();
  }
  
  /**
   * Create a new Claude session
   */
  async createSession(sessionId: string): Promise<ClaudeSession> {
    logDebug('SESSION', `Creating new Claude session: ${sessionId}`);
    
    // Spawn PTY with Claude
    const ptyProcess = pty.spawn('claude', [], {
      name: 'xterm-color',
      cols: 120,
      rows: 30,
      cwd: process.cwd(),
      env: process.env as any
    });
    
    const session: ClaudeSession = {
      id: sessionId,
      pty: ptyProcess,
      output: '',
      ready: false,
      busy: false,
      created: new Date()
    };
    
    // Handle output
    ptyProcess.onData((data: string) => {
      session.output += data;
      logDebug('SESSION', `Data received (${data.length} bytes): ${data.slice(0, 50).replace(/\n/g, '\\n')}`);
      
      // Detect when Claude is ready for input
      // Look for Claude's actual interactive prompt
      // Claude shows "To test the Axiom MCP" or similar introductory text
      // followed by blank lines when ready
      if (!session.ready) {
        // Check for common Claude interactive mode patterns
        const lowerData = data.toLowerCase();
        if (lowerData.includes('would you like') || 
            lowerData.includes('how can i help') ||
            lowerData.includes('to test') ||
            lowerData.includes('grant') ||
            data.includes('```') ||
            (session.output.length > 100 && data.trim() === '')) {
          session.ready = true;
          session.busy = false;
          logDebug('SESSION', `Session ${sessionId} is ready (detected interactive prompt)`);
          this.emit('ready', sessionId);
        }
      }
      
      // Detect when Claude is working
      // Look for common working indicators
      if (data.includes('Thinking') || 
          data.includes('Working') ||
          data.includes('Creating') ||
          data.includes('Writing') ||
          data.includes('Implementing') ||
          data.includes('...')) {
        session.busy = true;
        logDebug('SESSION', `Session ${sessionId} is busy`);
      }
      
      // Detect when Claude finishes
      // Look for completion patterns
      if (session.busy && (
          data.includes('Created') ||
          data.includes('Finished') ||
          data.includes('Complete') ||
          data.includes('Done') ||
          (data.trim() === '' && session.output.includes('\n\n')))) {
        session.busy = false;
        logDebug('SESSION', `Session ${sessionId} finished work`);
      }
      
      // Emit data for streaming
      this.emit('data', sessionId, data);
    });
    
    // Handle exit
    ptyProcess.onExit((exitCode) => {
      logDebug('SESSION', `Session ${sessionId} exited with code ${exitCode.exitCode}`);
      this.sessions.delete(sessionId);
      this.emit('exit', sessionId, exitCode.exitCode);
    });
    
    this.sessions.set(sessionId, session);
    
    // Wait for ready
    await this.waitForReady(sessionId);
    
    return session;
  }
  
  /**
   * Send a message to a session
   */
  async sendMessage(sessionId: string, message: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    if (!session.ready) {
      throw new Error(`Session ${sessionId} not ready`);
    }
    
    logDebug('SESSION', `Sending message to ${sessionId}: ${message}`);
    
    // In Claude's UI, we type the message and press Enter
    session.pty.write(message + '\n');
    
    // If Claude is already working, this becomes an interruption
    if (session.busy) {
      logDebug('SESSION', `Message sent while Claude is busy - this is an intervention!`);
      this.emit('intervention', sessionId, message);
    }
  }
  
  /**
   * Wait for session to be ready
   */
  private waitForReady(sessionId: string, timeout = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
      const session = this.sessions.get(sessionId);
      if (!session) {
        reject(new Error(`Session ${sessionId} not found`));
        return;
      }
      
      if (session.ready) {
        resolve();
        return;
      }
      
      const timer = setTimeout(() => {
        reject(new Error(`Session ${sessionId} ready timeout`));
      }, timeout);
      
      const readyHandler = (readyId: string) => {
        if (readyId === sessionId) {
          clearTimeout(timer);
          this.removeListener('ready', readyHandler);
          resolve();
        }
      };
      
      this.on('ready', readyHandler);
    });
  }
  
  /**
   * Get session output
   */
  getOutput(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    return session ? session.output : '';
  }
  
  /**
   * Kill a session
   */
  killSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      logDebug('SESSION', `Killing session ${sessionId}`);
      session.pty.kill();
      this.sessions.delete(sessionId);
    }
  }
  
  /**
   * Get all active sessions
   */
  getActiveSessions(): string[] {
    return Array.from(this.sessions.keys());
  }
}