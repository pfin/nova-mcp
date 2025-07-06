import { EventEmitter } from 'events';

/**
 * Common interface for ChatGPT clients
 */
export interface ChatGPTClient extends EventEmitter {
  initialize(): Promise<void>;
  sendMessage(message: string): Promise<string>;
  selectModel(model: string): Promise<void>;
  clearConversation(): Promise<void>;
  getAvailableModels(): Promise<string[]>;
  compareModels(query: string, models: string[]): Promise<Record<string, string>>;
  isReady(): boolean;
  close(): Promise<void>;
  disconnect?(): Promise<void>;
}

/**
 * Extended interface for clients with session management
 */
export interface ChatGPTClientWithSession extends ChatGPTClient {
  saveSession?(): Promise<void>;
  extractTokens?(): Promise<{ sessionToken?: string; cfClearance?: string }>;
}