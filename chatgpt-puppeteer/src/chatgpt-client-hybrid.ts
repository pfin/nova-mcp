import puppeteer from 'puppeteer-extra';
import type { Browser, Page } from 'puppeteer';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { EventEmitter } from 'events';
import {
  AuthenticationManager,
  ManualAuthStrategy,
  TokenAuthStrategy,
  ProfileAuthStrategy,
  BehaviorSimulator,
  SessionManager
} from './auth-strategies.js';

// Configure stealth plugin
puppeteer.use(StealthPlugin());

export interface ChatGPTHybridConfig {
  headless?: boolean;
  sessionPath?: string;
  timeout?: number;
  defaultModel?: string;
  userDataDir?: string;
  debugPort?: number;
  useExistingBrowser?: boolean;
}

export class ChatGPTClientHybrid extends EventEmitter {
  private browser?: Browser;
  private page?: Page;
  private config: ChatGPTHybridConfig;
  private authManager: AuthenticationManager;
  private sessionManager: SessionManager;
  private currentModel?: string;
  private isInitialized: boolean = false;
  private lastActivity: number = Date.now();
  private activityInterval?: ReturnType<typeof setInterval>;

  constructor(config: ChatGPTHybridConfig = {}) {
    super();
    this.config = {
      headless: config.headless ?? (process.env.CHATGPT_HEADLESS === 'true'),
      sessionPath: config.sessionPath ?? process.env.CHATGPT_SESSION_PATH ?? './chatgpt-session',
      timeout: config.timeout ?? parseInt(process.env.CHATGPT_TIMEOUT ?? '60000'),
      defaultModel: config.defaultModel ?? process.env.CHATGPT_MODEL ?? 'gpt-4o',
      userDataDir: config.userDataDir ?? './chatgpt-user-data',
      debugPort: config.debugPort ?? 9222,
      useExistingBrowser: config.useExistingBrowser ?? false,
    };

    this.sessionManager = new SessionManager(this.config.sessionPath);
    this.authManager = new AuthenticationManager(this.config.sessionPath);
    this.setupAuthStrategies();
  }

  private setupAuthStrategies(): void {
    // Priority 1: Try token auth first (fastest)
    const sessionToken = process.env.CHATGPT_SESSION_TOKEN;
    const cfClearance = process.env.CHATGPT_CF_CLEARANCE;
    if (sessionToken) {
      this.authManager.addStrategy(new TokenAuthStrategy(sessionToken, cfClearance));
    }

    // Priority 2: Try profile auth (persistent)
    if (this.config.userDataDir) {
      this.authManager.addStrategy(new ProfileAuthStrategy(this.config.userDataDir));
    }

    // Priority 3: Manual auth (always works)
    this.authManager.addStrategy(new ManualAuthStrategy());
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Try to connect to existing browser first
      if (this.config.useExistingBrowser) {
        try {
          const response = await fetch(`http://localhost:${this.config.debugPort}/json/version`);
          const versionInfo = await response.json();
          this.browser = await puppeteer.connect({
            browserWSEndpoint: versionInfo.webSocketDebuggerUrl,
            defaultViewport: null,
          });
          console.log('✅ Connected to existing browser');
        } catch (error) {
          console.log('No existing browser found, launching new one...');
        }
      }

      // Launch new browser if needed
      if (!this.browser) {
        this.browser = await puppeteer.launch({
          headless: this.config.headless,
          defaultViewport: null,
          userDataDir: this.config.userDataDir,
          args: this.getBrowserArgs(),
          executablePath: process.env.PUPPETEER_EXEC_PATH,
          ignoreDefaultArgs: ['--enable-automation', '--enable-blink-features=IdleDetection'],
        });
      }

      // Create page with optimal settings
      this.page = await this.browser.newPage();
      await this.configurePage();

      // Authenticate
      const authenticated = await this.authManager.authenticate(this.page);
      if (!authenticated) {
        throw new Error('All authentication strategies failed');
      }

      // Start activity simulation
      this.startActivitySimulation();

      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private getBrowserArgs(): string[] {
    const args = [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--flag-switches-begin',
      '--disable-site-isolation-trials',
      '--flag-switches-end',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--disable-gpu',
      '--disable-features=TranslateUI',
      '--disable-features=BlinkGenPropertyTrees',
      '--disable-ipc-flooding-protection',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
    ];

    if (!this.config.headless) {
      args.push('--start-maximized');
    }

    return args;
  }

  private async configurePage(): Promise<void> {
    if (!this.page) return;

    // Set realistic headers
    await this.page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
    });

    // Set user agent
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    );

    // Override automation detection
    await this.page.evaluateOnNewDocument(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Add plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // Fix permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) => {
        if (parameters.name === 'notifications') {
          return Promise.resolve({ state: 'prompt' } as PermissionStatus);
        }
        return originalQuery(parameters);
      };

      // Add chrome object
      if (!(window as any).chrome) {
        (window as any).chrome = {
          runtime: {},
          loadTimes: () => {},
          csi: () => {},
        };
      }
    });
  }

  private startActivitySimulation(): void {
    // Simulate random activity every 5-10 minutes
    this.activityInterval = setInterval(async () => {
      if (this.page && Date.now() - this.lastActivity > 300000) {
        try {
          await BehaviorSimulator.performRandomAction(this.page);
        } catch (error) {
          console.error('Activity simulation error:', error);
        }
      }
    }, BehaviorSimulator.humanDelay(300000, 600000));
  }

  async sendMessage(message: string): Promise<string> {
    if (!this.page) throw new Error('Client not initialized');

    try {
      this.lastActivity = Date.now();

      // Find and focus the input
      const inputSelector = 'textarea[placeholder*="Message"], textarea#prompt-textarea, [contenteditable="true"]';
      await this.page.waitForSelector(inputSelector, { timeout: 10000 });
      
      // Clear existing text
      await this.page.click(inputSelector, { clickCount: 3 });
      await this.page.keyboard.press('Backspace');

      // Type message with human-like speed
      await BehaviorSimulator.typeHumanLike(this.page, inputSelector, message);

      // Add random delay before sending
      await new Promise(resolve => setTimeout(resolve, BehaviorSimulator.humanDelay(500, 1500)));

      // Send message
      await this.page.keyboard.press('Enter');

      // Wait for response
      return await this.waitForResponse();
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private async waitForResponse(timeout: number = 60000): Promise<string> {
    if (!this.page) throw new Error('Page not initialized');

    const startTime = Date.now();

    // Wait for response to start
    await this.page.waitForFunction(
      () => {
        const messages = document.querySelectorAll('[data-message-author-role="assistant"]');
        const lastMessage = messages[messages.length - 1];
        return lastMessage && lastMessage.textContent && lastMessage.textContent.length > 0;
      },
      { timeout }
    );

    // Wait for response to complete
    let lastLength = 0;
    let stableCount = 0;

    while (Date.now() - startTime < timeout) {
      const currentLength = await this.page.evaluate(() => {
        const messages = document.querySelectorAll('[data-message-author-role="assistant"]');
        const lastMessage = messages[messages.length - 1];
        return lastMessage?.textContent?.length || 0;
      });

      if (currentLength === lastLength) {
        stableCount++;
        if (stableCount >= 3) break; // Response stable for 3 checks
      } else {
        stableCount = 0;
        lastLength = currentLength;
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Extract final response
    const response = await this.page.evaluate(() => {
      const messages = document.querySelectorAll('[data-message-author-role="assistant"]');
      const lastMessage = messages[messages.length - 1];
      return lastMessage?.textContent || '';
    });

    return response.trim();
  }

  async selectModel(model: string): Promise<void> {
    if (!this.page) throw new Error('Client not initialized');

    try {
      // Find model selector
      const modelSelector = '[data-testid="model-selector"], button[aria-haspopup="listbox"]';
      await this.page.waitForSelector(modelSelector, { timeout: 5000 });
      
      // Click to open dropdown
      await this.page.click(modelSelector);
      await new Promise(resolve => setTimeout(resolve, BehaviorSimulator.humanDelay(500, 1000)));

      // Select model
      const modelOption = await this.page.$(`[role="option"][data-value="${model}"], [role="option"]:has-text("${model}")`);
      if (modelOption) {
        await modelOption.click();
        this.currentModel = model;
        this.emit('model-selected', model);
      } else {
        throw new Error(`Model ${model} not found`);
      }
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async clearConversation(): Promise<void> {
    if (!this.page) throw new Error('Client not initialized');

    try {
      // Find new chat button
      const newChatSelector = 'a[href="/"], button[aria-label*="New chat"]';
      await this.page.waitForSelector(newChatSelector, { timeout: 5000 });
      
      // Click with human-like delay
      await new Promise(resolve => setTimeout(resolve, BehaviorSimulator.humanDelay(300, 800)));
      await this.page.click(newChatSelector);
      
      await new Promise(resolve => setTimeout(resolve, BehaviorSimulator.humanDelay(1000, 2000)));
      this.emit('conversation-cleared');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    if (!this.page) throw new Error('Client not initialized');

    try {
      // Open model selector
      const modelSelector = '[data-testid="model-selector"], button[aria-haspopup="listbox"]';
      await this.page.click(modelSelector);
      await new Promise(resolve => setTimeout(resolve, BehaviorSimulator.humanDelay(500, 1000)));

      // Extract models
      const models = await this.page.evaluate(() => {
        const options = document.querySelectorAll('[role="option"]');
        return Array.from(options)
          .map(opt => opt.getAttribute('data-value') || opt.textContent)
          .filter(Boolean) as string[];
      });

      // Close dropdown
      await this.page.keyboard.press('Escape');

      return models;
    } catch (error) {
      this.emit('error', error);
      return ['gpt-4o', 'gpt-4', 'gpt-3.5-turbo']; // Fallback
    }
  }

  async extractTokens(): Promise<{ sessionToken?: string; cfClearance?: string }> {
    if (!this.page) throw new Error('Client not initialized');
    return await this.authManager.extractAndSaveTokens(this.page);
  }

  isReady(): boolean {
    return this.isInitialized && !!this.page && !!this.browser;
  }

  async close(): Promise<void> {
    if (this.activityInterval) {
      clearInterval(this.activityInterval);
    }

    if (this.browser) {
      await this.browser.close();
    }

    this.isInitialized = false;
    this.emit('closed');
  }

  async compareModels(query: string, models: string[]): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    
    for (const model of models) {
      try {
        // Clear conversation for each model
        await this.clearConversation();
        
        // Select the model
        await this.selectModel(model);
        
        // Send the query
        const response = await this.sendMessage(query);
        results[model] = response;
      } catch (error) {
        results[model] = `Error: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
    
    return results;
  }
}