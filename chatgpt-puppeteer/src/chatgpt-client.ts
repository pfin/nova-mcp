import puppeteer, { Browser, Page } from 'puppeteer';
import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';

export interface ChatGPTConfig {
  headless?: boolean;
  sessionPath?: string;
  timeout?: number;
  defaultModel?: string;
}

export interface ChatGPTMessage {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  timestamp: Date;
}

export class ChatGPTClient extends EventEmitter {
  private browser?: Browser;
  private page?: Page;
  private config: ChatGPTConfig;
  private currentModel?: string;
  private isInitialized: boolean = false;

  constructor(config: ChatGPTConfig = {}) {
    super();
    this.config = {
      headless: config.headless ?? (process.env.CHATGPT_HEADLESS !== 'false'),
      sessionPath: config.sessionPath ?? process.env.CHATGPT_SESSION_PATH ?? './chatgpt-session',
      timeout: config.timeout ?? parseInt(process.env.CHATGPT_TIMEOUT ?? '60000'),
      defaultModel: config.defaultModel ?? process.env.CHATGPT_MODEL ?? 'gpt-4',
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    this.page = await this.browser.newPage();
    
    // Set viewport and user agent
    await this.page.setViewport({ width: 1280, height: 800 });
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Load saved session if exists
    await this.loadSession();

    // Navigate to ChatGPT
    await this.page.goto('https://chat.openai.com', { waitUntil: 'networkidle2' });

    // Check if we're logged in
    const isLoggedIn = await this.checkLoginStatus();
    if (!isLoggedIn) {
      this.emit('auth-required');
      throw new Error('Authentication required. Please log in manually in the browser window.');
    }

    this.isInitialized = true;
    this.emit('initialized');
  }

  private async checkLoginStatus(): Promise<boolean> {
    try {
      // Wait for either login button or chat interface
      await this.page!.waitForSelector('textarea, button[aria-label="Log in"], .btn-primary', { timeout: 10000 });
      
      // Check if chat textarea exists (logged in)
      const chatInput = await this.page!.$('textarea[placeholder*="Message"], textarea#prompt-textarea');
      return !!chatInput;
    } catch {
      return false;
    }
  }

  private async loadSession(): Promise<void> {
    try {
      const sessionFile = path.join(this.config.sessionPath!, 'cookies.json');
      const cookiesString = await fs.readFile(sessionFile, 'utf8');
      const cookies = JSON.parse(cookiesString);
      await this.page!.setCookie(...cookies);
    } catch (error) {
      // Session doesn't exist or is invalid
      this.emit('session-load-failed', error);
    }
  }

  async saveSession(): Promise<void> {
    try {
      const cookies = await this.page!.cookies();
      const sessionDir = path.dirname(this.config.sessionPath!);
      await fs.mkdir(sessionDir, { recursive: true });
      await fs.writeFile(
        path.join(this.config.sessionPath!, 'cookies.json'),
        JSON.stringify(cookies, null, 2)
      );
      this.emit('session-saved');
    } catch (error) {
      this.emit('session-save-failed', error);
    }
  }

  async selectModel(model: string): Promise<void> {
    if (!this.isInitialized) throw new Error('Client not initialized');

    // Click on model selector
    const modelSelector = await this.page!.$('[data-testid="model-selector"]');
    if (modelSelector) {
      await modelSelector.click();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Find and click the specific model
      const modelOption = await this.page!.$(`text="${model}"`);
      if (modelOption) {
        await modelOption.click();
        this.currentModel = model;
        this.emit('model-selected', model);
      } else {
        throw new Error(`Model ${model} not found`);
      }
    }
  }

  async sendMessage(message: string, waitForResponse: boolean = true): Promise<string> {
    if (!this.isInitialized) throw new Error('Client not initialized');

    // Find the chat input
    const chatInput = await this.page!.waitForSelector('textarea[placeholder*="Message"], textarea#prompt-textarea');
    if (!chatInput) throw new Error('Chat input not found');

    // Clear and type the message
    await chatInput.click({ clickCount: 3 }); // Select all
    await chatInput.type(message);
    
    // Send the message
    await this.page!.keyboard.press('Enter');

    if (!waitForResponse) {
      return '';
    }

    // Wait for response
    return await this.waitForResponse();
  }

  private async waitForResponse(): Promise<string> {
    // Wait for the response to start appearing
    await this.page!.waitForFunction(
      () => {
        const messages = document.querySelectorAll('[data-message-author-role="assistant"]');
        const lastMessage = messages[messages.length - 1];
        return lastMessage && lastMessage.textContent && lastMessage.textContent.length > 0;
      },
      { timeout: this.config.timeout }
    );

    // Wait a bit more for the response to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Extract the response
    const response = await this.page!.evaluate(() => {
      const messages = document.querySelectorAll('[data-message-author-role="assistant"]');
      const lastMessage = messages[messages.length - 1];
      return lastMessage ? lastMessage.textContent || '' : '';
    });

    return response;
  }

  async getAvailableModels(): Promise<string[]> {
    if (!this.isInitialized) throw new Error('Client not initialized');

    // Click on model selector to see available models
    const modelSelector = await this.page!.$('[data-testid="model-selector"]');
    if (!modelSelector) return [];

    await modelSelector.click();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Extract model names
    const models = await this.page!.evaluate(() => {
      const modelElements = document.querySelectorAll('[role="option"]');
      return Array.from(modelElements).map(el => el.textContent || '').filter(Boolean);
    });

    // Close the dropdown
    await this.page!.keyboard.press('Escape');

    return models;
  }

  async clearConversation(): Promise<void> {
    if (!this.isInitialized) throw new Error('Client not initialized');

    // Navigate to new chat
    await this.page!.goto('https://chat.openai.com/chat', { waitUntil: 'networkidle2' });
    this.emit('conversation-cleared');
  }

  async compareModels(query: string, models: string[]): Promise<Map<string, string>> {
    const responses = new Map<string, string>();

    for (const model of models) {
      // Start new conversation for each model
      await this.clearConversation();
      
      // Select the model
      await this.selectModel(model);
      
      // Send the query
      const response = await this.sendMessage(query);
      responses.set(model, response);
      
      this.emit('model-response', { model, query, response });
    }

    return responses;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = undefined;
      this.page = undefined;
      this.isInitialized = false;
    }
  }

  isReady(): boolean {
    return this.isInitialized && !!this.page;
  }
}