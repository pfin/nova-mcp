import puppeteer from 'puppeteer-extra';
import { Browser, Page, ElementHandle } from 'puppeteer';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import { AuthHelper, LoginCredentials } from './auth-helper.js';

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

export interface ChatGPTConfig {
  headless?: boolean;
  sessionPath?: string;
  timeout?: number;
  defaultModel?: string;
  userDataDir?: string;
}

export interface ChatGPTAuthCookies {
  sessionToken?: string; // __Secure-next-auth.session-token
  cfClearance?: string;  // cf_clearance
  userAgent?: string;
}

export class ChatGPTClientEnhanced extends EventEmitter {
  private browser?: Browser;
  private page?: Page;
  private config: ChatGPTConfig;
  private currentModel?: string;
  private isInitialized: boolean = false;

  constructor(config: ChatGPTConfig = {}) {
    super();
    this.config = {
      headless: config.headless ?? (process.env.CHATGPT_HEADLESS === 'true'),
      sessionPath: config.sessionPath ?? process.env.CHATGPT_SESSION_PATH ?? './chatgpt-session',
      timeout: config.timeout ?? parseInt(process.env.CHATGPT_TIMEOUT ?? '60000'),
      defaultModel: config.defaultModel ?? process.env.CHATGPT_MODEL ?? 'gpt-4',
      userDataDir: config.userDataDir ?? './chatgpt-user-data',
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Launch browser with stealth plugin and user data directory for persistence
    // Enhanced configuration based on 2025 Cloudflare bypass research
    this.browser = await puppeteer.launch({
      headless: this.config.headless ?? false, // Use config, default false for ChatGPT
      defaultViewport: null, // Use natural viewport instead of fixed size
      userDataDir: this.config.userDataDir, // Persist session data
      args: [
        '--start-maximized',
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
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=CrossSiteDocumentBlockingIfIsolating',
        '--disable-site-isolation-for-policy',
        '--disable-features=BlockInsecurePrivateNetworkRequests',
        '--disable-notifications',
        '--disable-popup-blocking',
        '--disable-translate',
        '--disable-features=TranslateUI',
        '--disable-features=BlinkGenPropertyTrees',
        '--disable-ipc-flooding-protection',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
      ],
      executablePath: process.env.PUPPETEER_EXEC_PATH, // Allow custom Chrome path
      ignoreDefaultArgs: ['--enable-automation', '--enable-blink-features=IdleDetection'],
    });

    this.page = await this.browser.newPage();
    
    // Set more realistic headers first
    await this.page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
    });
    
    // Set user agent to match latest Chrome
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Skip setting viewport since we use defaultViewport: null for natural sizing

    // Override timezone, locale, and other detectable properties
    await this.page.evaluateOnNewDocument(() => {
      // Timezone
      Object.defineProperty(Intl.DateTimeFormat.prototype, 'resolvedOptions', {
        value: function() {
          return {
            ...this.resolvedOptions.call(this),
            timeZone: 'America/New_York'
          };
        }
      });
      
      // Languages
      Object.defineProperty(navigator, 'language', {
        get: () => 'en-US',
      });
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
      
      // Platform
      Object.defineProperty(navigator, 'platform', {
        get: () => 'Win32',
      });
      
      // Hardware concurrency
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 8,
      });
      
      // Memory (deviceMemory is not standard, so we check first)
      if ('deviceMemory' in navigator) {
        Object.defineProperty(navigator, 'deviceMemory', {
          get: () => 8,
        });
      }
    });

    // Load saved auth cookies if they exist
    await this.loadAuthCookies();

    // Add random delay before navigation (2-4 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));

    // Navigate to ChatGPT with more natural behavior
    await this.page.goto('https://chatgpt.com', { 
      waitUntil: 'domcontentloaded', // Don't wait for all network activity
      timeout: this.config.timeout,
    });
    
    // Wait a bit more after initial load
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    // Check authentication status
    let isAuthenticated = await this.checkAuthStatus();
    
    if (!isAuthenticated) {
      this.emit('auth-required');
      
      // Try environment credentials
      const envCredentials = AuthHelper.getCredentialsFromEnv();
      if (envCredentials.sessionToken || envCredentials.cfClearance || (envCredentials.email && envCredentials.password)) {
        console.log('Attempting authentication with environment credentials...');
        isAuthenticated = await AuthHelper.attemptLogin(this.page, envCredentials);
      }
      
      if (!isAuthenticated) {
        // Try to extract auth info if available
        const authInfo = await this.extractAuthInfo();
        if (authInfo.sessionToken || authInfo.cfClearance) {
          await this.saveAuthCookies(authInfo);
        }
        
        throw new Error('Authentication required. Please set CHATGPT_SESSION_TOKEN and CHATGPT_CF_CLEARANCE environment variables, or log in manually.');
      }
    }

    // Save cookies after successful auth check
    await this.saveCurrentCookies();

    this.isInitialized = true;
    this.emit('initialized');
  }

  private async checkAuthStatus(): Promise<boolean> {
    try {
      // Wait for page to stabilize
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check for various auth indicators
      const isLoggedIn = await this.page!.evaluate(() => {
        // Check for chat interface elements
        const chatInput = document.querySelector('textarea[placeholder*="Message"], textarea#prompt-textarea, [contenteditable="true"]');
        const newChatButton = document.querySelector('a[href="/"], button[aria-label*="New chat"]');
        const modelSelector = document.querySelector('[data-testid="model-selector"], button[aria-haspopup="listbox"]');
        
        // Check if we're on login page
        const loginButton = document.querySelector('button[data-testid*="login"], a[href*="/auth/login"]');
        const signupButton = document.querySelector('button[data-testid*="signup"], a[href*="/auth/signup"]');
        
        return !!(chatInput || newChatButton || modelSelector) && !loginButton && !signupButton;
      });

      return isLoggedIn;
    } catch (error) {
      console.error('Error checking auth status:', error);
      return false;
    }
  }

  private async loadAuthCookies(): Promise<void> {
    try {
      const cookiesPath = path.join(this.config.sessionPath!, 'auth-cookies.json');
      const cookiesData = await fs.readFile(cookiesPath, 'utf8');
      const authData: ChatGPTAuthCookies = JSON.parse(cookiesData);

      if (authData.sessionToken || authData.cfClearance) {
        // Set cookies
        const cookies = [];
        
        if (authData.sessionToken) {
          cookies.push({
            name: '__Secure-next-auth.session-token',
            value: authData.sessionToken,
            domain: '.chatgpt.com',
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'Lax' as const,
          });
        }

        if (authData.cfClearance) {
          cookies.push({
            name: 'cf_clearance',
            value: authData.cfClearance,
            domain: '.chatgpt.com',
            path: '/',
            httpOnly: true,
            secure: true,
          });
        }

        await this.page!.setCookie(...cookies);

        // Set user agent if provided
        if (authData.userAgent) {
          await this.page!.setUserAgent(authData.userAgent);
        }
      }
    } catch (error) {
      // No saved cookies or error loading them
      this.emit('no-saved-auth');
    }
  }

  private async extractAuthInfo(): Promise<ChatGPTAuthCookies> {
    const cookies = await this.page!.cookies();
    const authInfo: ChatGPTAuthCookies = {};

    for (const cookie of cookies) {
      if (cookie.name === '__Secure-next-auth.session-token') {
        authInfo.sessionToken = cookie.value;
      } else if (cookie.name === 'cf_clearance') {
        authInfo.cfClearance = cookie.value;
      }
    }

    authInfo.userAgent = await this.page!.evaluate(() => navigator.userAgent);

    return authInfo;
  }

  private async saveAuthCookies(authInfo: ChatGPTAuthCookies): Promise<void> {
    try {
      await fs.mkdir(this.config.sessionPath!, { recursive: true });
      const cookiesPath = path.join(this.config.sessionPath!, 'auth-cookies.json');
      await fs.writeFile(cookiesPath, JSON.stringify(authInfo, null, 2));
      this.emit('auth-saved');
    } catch (error) {
      this.emit('auth-save-error', error);
    }
  }

  private async saveCurrentCookies(): Promise<void> {
    const authInfo = await this.extractAuthInfo();
    if (authInfo.sessionToken || authInfo.cfClearance) {
      await this.saveAuthCookies(authInfo);
    }
  }

  async sendMessage(message: string, waitForResponse: boolean = true): Promise<string> {
    if (!this.isInitialized) throw new Error('Client not initialized');

    // Find and focus the chat input
    await this.page!.waitForSelector('textarea[placeholder*="Message"], textarea#prompt-textarea', {
      timeout: this.config.timeout,
    });

    const chatInput = await this.page!.$('textarea[placeholder*="Message"], textarea#prompt-textarea');
    if (!chatInput) throw new Error('Chat input not found');

    // Clear existing text and type new message
    await chatInput.click({ clickCount: 3 });
    await this.page!.keyboard.type(message);

    // Submit the message
    await this.page!.keyboard.press('Enter');

    if (!waitForResponse) {
      return '';
    }

    // Wait for and extract response
    return await this.waitForResponse();
  }

  private async waitForResponse(): Promise<string> {
    // Wait for response to appear
    await this.page!.waitForFunction(
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
    await this.page!.waitForFunction(
      () => {
        // Check if there's a stop/regenerate button (indicates response is complete)
        return document.querySelector('button[aria-label*="Stop"], button[aria-label*="Regenerate"]');
      },
      { timeout: this.config.timeout }
    );

    // Extract the response
    const response = await this.page!.evaluate(() => {
      const articles = document.querySelectorAll('article');
      const lastArticle = articles[articles.length - 1];
      
      // Try to find the message content
      const messageContent = lastArticle.querySelector('.markdown, [data-message-content]');
      if (messageContent) {
        return messageContent.textContent?.trim() || '';
      }
      
      // Fallback to article text
      return lastArticle.textContent?.trim() || '';
    });

    return response;
  }

  async selectModel(model: string): Promise<void> {
    if (!this.isInitialized) throw new Error('Client not initialized');

    // Find model selector
    const modelSelector = await this.page!.$('[data-testid="model-selector"], button[aria-haspopup="listbox"]');
    if (!modelSelector) {
      throw new Error('Model selector not found');
    }

    await modelSelector.click();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Click on the specific model
    const modelOption = await this.page!.evaluateHandle((modelName) => {
      const options = Array.from(document.querySelectorAll('[role="option"], [data-testid*="model-option"]'));
      return options.find(el => el.textContent?.includes(modelName));
    }, model);

    if (modelOption && 'click' in modelOption) {
      await (modelOption as ElementHandle).click();
      this.currentModel = model;
      this.emit('model-selected', model);
    } else {
      // Close the dropdown
      await this.page!.keyboard.press('Escape');
      throw new Error(`Model ${model} not found`);
    }
  }

  async clearConversation(): Promise<void> {
    if (!this.isInitialized) throw new Error('Client not initialized');

    // Click new chat button
    const newChatButton = await this.page!.$('a[href="/"], button[aria-label*="New chat"]');
    if (newChatButton) {
      await newChatButton.click();
      await this.page!.waitForNavigation({ waitUntil: 'networkidle2' });
    } else {
      // Fallback: navigate directly
      await this.page!.goto('https://chatgpt.com/', { waitUntil: 'networkidle2' });
    }

    this.emit('conversation-cleared');
  }

  async close(): Promise<void> {
    if (this.browser) {
      // Save cookies before closing
      await this.saveCurrentCookies();
      
      await this.browser.close();
      this.browser = undefined;
      this.page = undefined;
      this.isInitialized = false;
    }
  }

  isReady(): boolean {
    return this.isInitialized && !!this.page;
  }

  getCurrentModel(): string | undefined {
    return this.currentModel;
  }

  async saveSession(): Promise<void> {
    await this.saveCurrentCookies();
  }

  async getAvailableModels(): Promise<string[]> {
    if (!this.isInitialized) throw new Error('Client not initialized');

    // Click model selector to open dropdown
    const modelSelector = await this.page!.$('[data-testid="model-selector"], button[aria-haspopup="listbox"]');
    if (!modelSelector) {
      return [];
    }

    await modelSelector.click();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Extract model names
    const models = await this.page!.evaluate(() => {
      const options = Array.from(document.querySelectorAll('[role="option"], [data-testid*="model-option"]'));
      return options.map(el => el.textContent?.trim() || '').filter(text => text.length > 0);
    });

    // Close the dropdown
    await this.page!.keyboard.press('Escape');

    return models;
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