/**
 * SDK Executor for Claude Code
 * 
 * Based on expert recommendations from GoodIdeasFromChatGPTo3.txt:
 * - Uses @anthropic-ai/claude-code SDK for streaming
 * - Handles non-interactive tasks efficiently
 * - Provides structured event output
 */

import { query, type SDKMessage } from '@anthropic-ai/claude-code';
import { EventEmitter } from 'events';
import { ExecutorEvent } from './pty-executor.js';

export interface SdkExecutorOptions {
  cwd?: string;
  maxTurns?: number;
  systemPrompt?: string;
}

export class SdkExecutor extends EventEmitter {
  private isRunning: boolean = false;
  private messages: SDKMessage[] = [];
  
  constructor(private options: SdkExecutorOptions = {}) {
    super();
  }
  
  async execute(prompt: string, taskId: string): Promise<void> {
    if (this.isRunning) {
      throw new Error('Executor already running');
    }
    
    this.isRunning = true;
    this.messages = [];
    
    try {
      // Use streaming as shown in GoodIdeas
      const queryOptions = {
        cwd: this.options.cwd || process.cwd(),
        maxTurns: this.options.maxTurns || 10,
        customSystemPrompt: this.options.systemPrompt
      };
      
      // Stream responses
      for await (const message of query({ prompt, options: queryOptions })) {
        this.messages.push(message);
        
        // Emit structured event
        this.emit('delta', {
          taskId,
          timestamp: Date.now(),
          type: 'data',
          payload: {
            messageType: message.type,
            content: message
          }
        } as ExecutorEvent);
        
        // Check for tool calls in assistant messages
        if (message.type === 'assistant' && message.message) {
          // The APIAssistantMessage might contain tool use blocks
          // For now, we'll emit the entire assistant message
          // In production, parse the content blocks for tool calls
          this.emit('assistant_message', {
            taskId,
            timestamp: Date.now(),
            type: 'data',
            payload: message.message
          } as ExecutorEvent);
        }
      }
      
      // Execution complete
      this.isRunning = false;
      this.emit('complete', {
        taskId,
        timestamp: Date.now(),
        type: 'exit',
        payload: {
          messageCount: this.messages.length,
          success: true
        }
      } as ExecutorEvent);
      
    } catch (error) {
      this.isRunning = false;
      this.emit('error', {
        taskId,
        timestamp: Date.now(),
        type: 'error',
        payload: error
      } as ExecutorEvent);
      throw error;
    }
  }
  
  /**
   * Get all messages from the conversation
   */
  getMessages(): SDKMessage[] {
    return [...this.messages];
  }
  
  /**
   * Get the final response
   */
  getFinalResponse(): string {
    // Extract text from assistant messages
    const assistantMessages = this.messages
      .filter(m => m.type === 'assistant')
      .map(m => {
        if (m.type === 'assistant' && m.message) {
          // The actual content is in the message.content array
          // This is an Anthropic API type, we'll need to handle it properly
          return JSON.stringify(m.message);
        }
        return '';
      })
      .filter(Boolean);
    
    return assistantMessages.join('\n');
  }
  
  /**
   * Check if executor is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
  
  /**
   * Get result summary
   */
  getResultSummary(): any {
    const resultMessage = this.messages.find(m => m.type === 'result');
    return resultMessage || null;
  }
}