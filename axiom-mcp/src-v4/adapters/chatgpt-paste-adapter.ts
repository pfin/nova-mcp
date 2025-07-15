/**
 * ChatGPT Paste Adapter - Thin layer for delivering context to ChatGPT
 * 
 * This adapter handles the mechanics of pasting/uploading context to ChatGPT's
 * web interface. It contains NO business logic - all context preparation is
 * done by the ContextBuilder.
 */

import type { Page } from 'puppeteer';
import { TaskContext } from '../core/context-builder.js';
import { logDebug } from '../core/simple-logger.js';

export interface PasteOptions {
  method: 'paste' | 'file' | 'auto';
  delayBetweenChunks: number;
  humanizeTyping: boolean;
}

export interface PasteResult {
  method: 'paste' | 'file';
  chunksDelivered: number;
  totalSize: number;
  duration: number;
  success: boolean;
  error?: string;
}

export class ChatGPTPasteAdapter {
  private page: Page;
  private options: PasteOptions;

  constructor(page: Page, options: Partial<PasteOptions> = {}) {
    this.page = page;
    this.options = {
      method: 'auto',
      delayBetweenChunks: 2000,
      humanizeTyping: true,
      ...options
    };
  }

  /**
   * Deliver context to ChatGPT
   */
  async deliverContext(context: TaskContext): Promise<PasteResult> {
    const startTime = Date.now();
    logDebug('PASTE', `Delivering context for task ${context.taskId}`);

    try {
      // Determine delivery method
      const method = this.determineMethod(context);

      if (method === 'file') {
        return await this.deliverViaFile(context, startTime);
      } else {
        return await this.deliverViaPaste(context, startTime);
      }
    } catch (error: any) {
      return {
        method: 'paste',
        chunksDelivered: 0,
        totalSize: context.tokenCount * 4, // Rough estimate
        duration: Date.now() - startTime,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Determine best delivery method
   */
  private determineMethod(context: TaskContext): 'paste' | 'file' {
    if (this.options.method !== 'auto') {
      return this.options.method;
    }

    // Use file upload for very large contexts or many chunks
    if (context.chunks.length > 3 || context.tokenCount > 25000) {
      return 'file';
    }

    return 'paste';
  }

  /**
   * Deliver via paste
   */
  private async deliverViaPaste(context: TaskContext, startTime: number): Promise<PasteResult> {
    let chunksDelivered = 0;
    let totalSize = 0;

    for (let i = 0; i < context.chunks.length; i++) {
      const chunk = context.chunks[i];
      
      // Paste chunk
      await this.pasteText(chunk);
      chunksDelivered++;
      totalSize += chunk.length;

      // If not last chunk, send and wait
      if (i < context.chunks.length - 1) {
        await this.submitMessage();
        await this.waitForResponse();
        
        // Send continuation message
        if (this.options.humanizeTyping) {
          await this.typeMessage("Continue reading the context...");
        } else {
          await this.pasteText("Continue reading the context...");
        }
        
        await new Promise(r => setTimeout(r, this.options.delayBetweenChunks));
      }
    }

    return {
      method: 'paste',
      chunksDelivered,
      totalSize,
      duration: Date.now() - startTime,
      success: true
    };
  }

  /**
   * Deliver via file upload
   */
  private async deliverViaFile(context: TaskContext, startTime: number): Promise<PasteResult> {
    // Create a temporary file with full context
    const fullContext = context.chunks.join('\n\n');
    
    // Find file input
    const fileInput = await this.page.$('input[type="file"]');
    if (!fileInput) {
      throw new Error('File upload not available');
    }

    // For now, log that file upload would happen
    // In production, this would use a proper file upload mechanism
    logDebug('PASTE', `Would upload file: context-${context.taskId}.txt (${fullContext.length} bytes)`);
    
    // Fall back to paste for now
    throw new Error('File upload not implemented - falling back to paste');
  }

  /**
   * Paste text into ChatGPT
   */
  private async pasteText(text: string): Promise<void> {
    const textarea = await this.page.$('textarea#prompt-textarea');
    if (!textarea) {
      throw new Error('Chat input not found');
    }

    // Click to focus
    await textarea.click();
    await new Promise(r => setTimeout(r, 100));

    // Clear existing content
    await this.page.keyboard.down('Control');
    await this.page.keyboard.press('a');
    await this.page.keyboard.up('Control');
    await new Promise(r => setTimeout(r, 50));

    // Use direct value setting approach
    await this.page.evaluate(`
      (function(content) {
        const textarea = document.querySelector('textarea#prompt-textarea');
        if (textarea) {
          textarea.value = content;
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })(${JSON.stringify(text)})
    `);

    await new Promise(r => setTimeout(r, 100));
  }

  /**
   * Type message with human-like speed
   */
  private async typeMessage(text: string): Promise<void> {
    const textarea = await this.page.$('textarea#prompt-textarea');
    if (!textarea) {
      throw new Error('Chat input not found');
    }

    await textarea.click();
    
    // Clear first
    await this.page.keyboard.down('Control');
    await this.page.keyboard.press('a');
    await this.page.keyboard.up('Control');

    // Type character by character
    for (const char of text) {
      await this.page.keyboard.type(char);
      await new Promise(r => setTimeout(r, 50 + Math.random() * 100));
    }
  }

  /**
   * Submit the current message
   */
  private async submitMessage(): Promise<void> {
    // Try submit button first
    const submitButton = await this.page.$('button[data-testid="send-button"], button[aria-label="Send prompt"]');
    if (submitButton) {
      await submitButton.click();
    } else {
      // Fallback to Enter key
      await this.page.keyboard.press('Enter');
    }
  }

  /**
   * Wait for ChatGPT to finish responding
   */
  private async waitForResponse(): Promise<void> {
    // Wait for stop button to appear (indicates streaming)
    await this.page.waitForSelector(
      'button[aria-label*="Stop"], button[aria-label*="Regenerate"]',
      { timeout: 60000 }
    );

    // Wait for stop button to disappear (indicates completion)
    await this.page.waitForFunction(
      `() => {
        const stopButton = document.querySelector('button[aria-label*="Stop"]');
        return !stopButton;
      }`,
      { timeout: 300000 } // 5 minutes max
    );

    // Additional wait for UI to stabilize
    await new Promise(r => setTimeout(r, 1000));
  }

  /**
   * Check if ChatGPT is ready for input
   */
  async isReady(): Promise<boolean> {
    try {
      const textarea = await this.page.$('textarea#prompt-textarea');
      const isDisabled = await this.page.evaluate(
        el => el?.hasAttribute('disabled') || false,
        textarea
      );
      
      return !!textarea && !isDisabled;
    } catch {
      return false;
    }
  }

  /**
   * Get current conversation state
   */
  async getConversationState(): Promise<{
    messageCount: number;
    isStreaming: boolean;
    hasError: boolean;
  }> {
    return await this.page.evaluate(`
      (() => {
        const messages = document.querySelectorAll('article[data-message-author-role]');
        const stopButton = document.querySelector('button[aria-label*="Stop"]');
        const errorMessage = document.querySelector('[class*="error"], [class*="Error"]');
        
        return {
          messageCount: messages.length,
          isStreaming: !!stopButton,
          hasError: !!errorMessage
        };
      })()
    `) as { messageCount: number; isStreaming: boolean; hasError: boolean; };
  }
}