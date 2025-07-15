/**
 * ChatGPT Paste Adapter - Thin layer for delivering context to ChatGPT
 *
 * This adapter handles the mechanics of pasting/uploading context to ChatGPT's
 * web interface. It contains NO business logic - all context preparation is
 * done by the ContextBuilder.
 */
import type { Page } from 'puppeteer';
import { TaskContext } from '../core/context-builder.js';
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
export declare class ChatGPTPasteAdapter {
    private page;
    private options;
    constructor(page: Page, options?: Partial<PasteOptions>);
    /**
     * Deliver context to ChatGPT
     */
    deliverContext(context: TaskContext): Promise<PasteResult>;
    /**
     * Determine best delivery method
     */
    private determineMethod;
    /**
     * Deliver via paste
     */
    private deliverViaPaste;
    /**
     * Deliver via file upload
     */
    private deliverViaFile;
    /**
     * Paste text into ChatGPT
     */
    private pasteText;
    /**
     * Type message with human-like speed
     */
    private typeMessage;
    /**
     * Submit the current message
     */
    private submitMessage;
    /**
     * Wait for ChatGPT to finish responding
     */
    private waitForResponse;
    /**
     * Check if ChatGPT is ready for input
     */
    isReady(): Promise<boolean>;
    /**
     * Get current conversation state
     */
    getConversationState(): Promise<{
        messageCount: number;
        isStreaming: boolean;
        hasError: boolean;
    }>;
}
//# sourceMappingURL=chatgpt-paste-adapter.d.ts.map