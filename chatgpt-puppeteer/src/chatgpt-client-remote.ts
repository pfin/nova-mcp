import puppeteer from 'puppeteer';
import type { Browser, Page, ElementHandle } from 'puppeteer';
import { EventEmitter } from 'events';
import fetch from 'node-fetch';
import type { ChatGPTClientWithSession } from './chatgpt-client-interface.js';

export interface RemoteChromeConfig {
  debugPort?: number;
  host?: string;
  timeout?: number;
  defaultModel?: string;
}

/**
 * ChatGPT client that connects to an existing Chrome instance
 * This bypasses all Cloudflare detection by using a real browser
 */
export class ChatGPTClientRemote extends EventEmitter implements ChatGPTClientWithSession {
  private browser?: Browser;
  private page?: Page;
  private config: RemoteChromeConfig;
  private isConnected: boolean = false;

  constructor(config: RemoteChromeConfig = {}) {
    super();
    this.config = {
      debugPort: config.debugPort ?? parseInt(process.env.CHROME_DEBUG_PORT ?? '9225'),
      host: config.host ?? 'localhost',
      timeout: config.timeout ?? 30000,
      defaultModel: config.defaultModel ?? process.env.CHATGPT_MODEL ?? 'gpt-4o',
    };
  }

  async connect(): Promise<void> {
    const debugUrl = `http://${this.config.host}:${this.config.debugPort}`;
    
    try {
      // Get browser version info
      const versionResponse = await fetch(`${debugUrl}/json/version`);
      if (!versionResponse.ok) {
        throw new Error(`Chrome not reachable at ${debugUrl}`);
      }
      
      const versionInfo = await versionResponse.json() as any;
      console.log(`Connecting to Chrome ${versionInfo.Browser}...`);
      
      // Connect to browser
      this.browser = await puppeteer.connect({
        browserWSEndpoint: versionInfo.webSocketDebuggerUrl,
        defaultViewport: null,
      });

      // Get or create page
      const pages = await this.browser.pages();
      if (pages.length > 0) {
        // Find ChatGPT tab if exists
        for (const page of pages) {
          const url = page.url();
          if (url.includes('chatgpt.com')) {
            this.page = page;
            console.log('Found existing ChatGPT tab');
            break;
          }
        }
        
        // Use first page if no ChatGPT tab
        if (!this.page) {
          this.page = pages[0];
        }
      } else {
        this.page = await this.browser.newPage();
      }

      // Navigate to ChatGPT if not there
      const currentUrl = this.page.url();
      if (!currentUrl.includes('chatgpt.com')) {
        await this.page.goto('https://chatgpt.com', { 
          waitUntil: 'domcontentloaded',
          timeout: this.config.timeout 
        });
      }

      // Check auth status
      const isAuthenticated = await this.checkAuthStatus();
      if (!isAuthenticated) {
        this.emit('auth-required');
        console.log('⚠️  Not authenticated. Please log in manually in the Chrome window.');
      } else {
        console.log('✅ Connected and authenticated');
      }

      this.isConnected = true;
      this.emit('connected');
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Connection failed:', message);
      
      if (message.includes('not reachable')) {
        console.log('\n💡 Make sure Chrome is running with remote debugging:');
        console.log('   Windows: chrome.exe --remote-debugging-port=9225');
        console.log('   Mac: /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9225');
        console.log('   Linux: google-chrome --remote-debugging-port=9225');
      }
      
      throw error;
    }
  }

  private async checkAuthStatus(): Promise<boolean> {
    if (!this.page) return false;
    
    try {
      await this.page.waitForFunction(
        () => {
          const chatInput = document.querySelector('textarea[placeholder*="Message"], textarea#prompt-textarea, [contenteditable="true"]');
          const loginButton = document.querySelector('button[data-testid*="login"], a[href*="/auth/login"]');
          return !!chatInput && !loginButton;
        },
        { timeout: 5000 }
      );
      return true;
    } catch {
      return false;
    }
  }

  async sendMessage(message: string, waitForResponse: boolean = true): Promise<string> {
    if (!this.isConnected || !this.page) {
      throw new Error('Not connected to Chrome');
    }

    // Find and clear chat input
    const chatInput = await this.page.$('textarea[placeholder*="Message"], textarea#prompt-textarea');
    if (!chatInput) {
      throw new Error('Chat input not found - ensure you are logged in');
    }

    // Clear and type message
    await chatInput.click({ clickCount: 3 });
    await this.page.keyboard.type(message);
    
    // Submit
    await this.page.keyboard.press('Enter');
    
    if (!waitForResponse) {
      return '';
    }

    // Wait for response
    return await this.waitForResponse();
  }

  private async waitForResponse(): Promise<string> {
    if (!this.page) throw new Error('No page available');

    // Wait for response to appear
    await this.page.waitForFunction(
      () => {
        const articles = document.querySelectorAll('article');
        if (articles.length < 2) return false;
        
        const lastArticle = articles[articles.length - 1];
        const isAssistant = lastArticle.querySelector('[data-message-author-role="assistant"]') || 
                            lastArticle.textContent?.includes('ChatGPT');
        
        return isAssistant && lastArticle.textContent && lastArticle.textContent.trim().length > 0;
      },
      { timeout: this.config.timeout }
    );

    // Wait for streaming to complete
    await this.page.waitForFunction(
      () => {
        return document.querySelector('button[aria-label*="Stop"], button[aria-label*="Regenerate"]');
      },
      { timeout: this.config.timeout }
    );

    // Extract response
    const response = await this.page.evaluate(() => {
      const articles = document.querySelectorAll('article');
      const lastArticle = articles[articles.length - 1];
      
      const messageContent = lastArticle.querySelector('.markdown, [data-message-content]');
      if (messageContent) {
        return messageContent.textContent?.trim() || '';
      }
      
      return lastArticle.textContent?.trim() || '';
    });

    return response;
  }

  async selectModel(model: string): Promise<void> {
    if (!this.isConnected || !this.page) {
      throw new Error('Not connected to Chrome');
    }

    // Implementation similar to other clients
    const modelSelector = await this.page.$('[data-testid="model-selector"], button[aria-haspopup="listbox"]');
    if (!modelSelector) {
      throw new Error('Model selector not found');
    }

    await modelSelector.click();
    await new Promise(resolve => setTimeout(resolve, 1000));

    const modelOption = await this.page.evaluateHandle((modelName) => {
      const options = Array.from(document.querySelectorAll('[role="option"], [data-testid*="model-option"]'));
      return options.find(el => el.textContent?.includes(modelName));
    }, model);

    if (modelOption && 'click' in modelOption) {
      await (modelOption as ElementHandle).click();
      this.emit('model-selected', model);
    } else {
      await this.page.keyboard.press('Escape');
      throw new Error(`Model ${model} not found`);
    }
  }

  async extractTokens(): Promise<{ sessionToken?: string; cfClearance?: string }> {
    if (!this.page) throw new Error('Not connected');

    const cookies = await this.page.cookies();
    const tokens: { sessionToken?: string; cfClearance?: string } = {};

    for (const cookie of cookies) {
      if (cookie.name === '__Secure-next-auth.session-token') {
        tokens.sessionToken = cookie.value;
      } else if (cookie.name === 'cf_clearance') {
        tokens.cfClearance = cookie.value;
      }
    }

    return tokens;
  }

  async clearConversation(): Promise<void> {
    if (!this.isConnected || !this.page) {
      throw new Error('Not connected to Chrome');
    }

    const newChatButton = await this.page.$('a[href="/"], button[aria-label*="New chat"]');
    if (newChatButton) {
      await newChatButton.click();
      await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
    } else {
      await this.page.goto('https://chatgpt.com/', { waitUntil: 'networkidle2' });
    }

    this.emit('conversation-cleared');
  }

  async disconnect(): Promise<void> {
    if (this.browser) {
      // Don't close the browser, just disconnect
      await this.browser.disconnect();
      this.browser = undefined;
      this.page = undefined;
      this.isConnected = false;
      this.emit('disconnected');
    }
  }

  async close(): Promise<void> {
    // Alias for disconnect
    await this.disconnect();
  }

  isReady(): boolean {
    return this.isConnected && !!this.page;
  }

  getDebugUrl(): string {
    return `http://${this.config.host}:${this.config.debugPort}`;
  }

  // Implement required interface methods
  async initialize(): Promise<void> {
    await this.connect();
  }

  async getAvailableModels(): Promise<string[]> {
    if (!this.isConnected || !this.page) {
      throw new Error('Not connected to Chrome');
    }

    // Click model selector to open dropdown
    const modelSelector = await this.page.$('[data-testid="model-selector"], button[aria-haspopup="listbox"]');
    if (!modelSelector) {
      return [];
    }

    await modelSelector.click();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Extract model names
    const models = await this.page.evaluate(() => {
      const options = Array.from(document.querySelectorAll('[role="option"], [data-testid*="model-option"]'));
      return options.map(el => el.textContent?.trim() || '').filter(text => text.length > 0);
    });

    // Close the dropdown
    await this.page.keyboard.press('Escape');

    return models;
  }

  async compareModels(query: string, models: string[]): Promise<Record<string, string>> {
    const results: Record<string, string> = {};

    for (const model of models) {
      try {
        await this.clearConversation();
        await this.selectModel(model);
        const response = await this.sendMessage(query);
        results[model] = response;
      } catch (error) {
        results[model] = `Error: ${error instanceof Error ? error.message : String(error)}`;
      }
    }

    return results;
  }
}