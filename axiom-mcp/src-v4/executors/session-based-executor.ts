/**
 * Session-Based Executor - Uses Claude Session Manager
 * This is what makes bidirectional communication possible
 */

import { EventEmitter } from 'events';
import { Logger } from '../core/logger.js';
import { ClaudeSessionManager } from './claude-session-manager.js';
import { HookOrchestrator } from '../core/hook-orchestrator.js';

export class SessionBasedExecutor extends EventEmitter {
  private sessionManager: ClaudeSessionManager;
  private hookOrchestrator?: HookOrchestrator;
  private logger: Logger;
  private currentTaskId?: string;
  
  constructor(options: { hookOrchestrator?: HookOrchestrator } = {}) {
    super();
    this.sessionManager = new ClaudeSessionManager();
    this.hookOrchestrator = options.hookOrchestrator;
    this.logger = Logger.getInstance();
  }
  
  async execute(
    prompt: string,
    systemPrompt: string,
    taskId: string,
    streamHandler?: (data: string) => void
  ): Promise<string> {
    
    this.logger.info('SessionBasedExecutor', 'execute', 'Starting execution', { taskId, prompt });
    
    // Track current task
    this.currentTaskId = taskId;
    
    // Create a session for this task
    const session = await this.sessionManager.createSession(taskId);
    
    // Set up streaming
    this.sessionManager.on('data', (sessionId, data) => {
      if (sessionId === taskId) {
        if (streamHandler) streamHandler(data);
        this.emit('data', data);
      }
    });
    
    // Send the initial prompt
    await this.sessionManager.sendMessage(taskId, prompt);
    
    // In verbose mode, we return immediately
    // The session continues running and can receive more messages
    return new Promise((resolve) => {
      // For now, just track that we started
      // Real implementation would track completion
      this.sessionManager.on('exit', (sessionId, code) => {
        if (sessionId === taskId) {
          resolve(this.sessionManager.getOutput(taskId));
        }
      });
    });
  }
  
  /**
   * Send a message to the running session
   * THIS is the key - we can send messages while Claude is working!
   */
  async write(message: string): Promise<void> {
    // Use the current task ID if available
    const taskId = this.currentTaskId || this.sessionManager.getActiveSessions()[0];
    
    if (!taskId) {
      this.logger.warn('SessionBasedExecutor', 'write', 'No active session to write to');
      return;
    }
    
    try {
      await this.sessionManager.sendMessage(taskId, message);
      this.logger.info('SessionBasedExecutor', 'write', 'Sent intervention', { taskId, message });
    } catch (error) {
      this.logger.error('SessionBasedExecutor', 'write', 'Failed to send message', { error });
    }
  }
  
  interrupt(): void {
    // With sessions, interrupt is just sending a message!
    this.write('[INTERRUPT] Stop and listen to new instructions');
  }
  
  kill(): void {
    // Kill all sessions
    const sessions = this.sessionManager.getActiveSessions();
    sessions.forEach(id => this.sessionManager.killSession(id));
  }
}