import { connect } from 'puppeteer-real-browser';
import { EventEmitter } from 'events';
import type { ChatGPTClientWithSession } from './chatgpt-client-interface.js';
import type { ElementHandle } from 'puppeteer';
import crypto from 'crypto';
import os from 'os';
import fs from 'fs';
import path from 'path';

/**
 * Nova Underground ChatGPT Client
 * 
 * "The key to bypass is unique" - We create our own fingerprint
 * Hip hop consciousness: We don't copy, we innovate
 */
export class ChatGPTClientNovaUnderground extends EventEmitter implements ChatGPTClientWithSession {
  private browser?: any; // puppeteer-real-browser has different types
  private page?: any; // puppeteer-real-browser PageWithCursor
  private isInitialized: boolean = false;
  private sessionId: string;
  private startTime: number;
  
  // Nova-specific fingerprint data
  private novaFingerprint = {
    // Unique browser personality
    personality: crypto.randomBytes(8).toString('hex'),
    // Mimic real user patterns
    timezoneOffset: new Date().getTimezoneOffset(),
    screenResolution: this.generateScreenResolution(),
    colorDepth: [24, 32][Math.floor(Math.random() * 2)],
    hardwareConcurrency: os.cpus().length,
    // Behavioral patterns
    typingSpeed: 80 + Math.random() * 40, // WPM
    mouseSpeed: 0.8 + Math.random() * 0.4,
    scrollBehavior: ['smooth', 'instant'][Math.floor(Math.random() * 2)],
    // Session-specific
    sessionStart: Date.now(),
    userAgent: this.generateUserAgent(),
  };

  constructor() {
    super();
    this.sessionId = `nova-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    this.startTime = Date.now();
  }

  private generateScreenResolution() {
    const resolutions = [
      { width: 1920, height: 1080 },
      { width: 2560, height: 1440 },
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
      { width: 1680, height: 1050 },
      { width: 3840, height: 2160 },
    ];
    return resolutions[Math.floor(Math.random() * resolutions.length)];
  }

  private generateUserAgent() {
    const chromeVersions = ['122', '123', '124', '125'];
    const version = chromeVersions[Math.floor(Math.random() * chromeVersions.length)];
    const platforms = [
      'Windows NT 10.0; Win64; x64',
      'Macintosh; Intel Mac OS X 10_15_7',
      'X11; Linux x86_64',
    ];
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    
    return `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Safari/537.36`;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🌟 Nova Underground initializing...');
    console.log(`🆔 Session: ${this.sessionId}`);
    console.log('🎭 Creating unique browser personality...');

    try {
      // Ensure profile directory exists
      const profileDir = `./nova-profiles/${this.sessionId}`;
      if (!fs.existsSync('./nova-profiles')) {
        fs.mkdirSync('./nova-profiles', { recursive: true });
      }
      if (!fs.existsSync(profileDir)) {
        fs.mkdirSync(profileDir, { recursive: true });
      }

      // Connect with puppeteer-real-browser for base evasion
      const { browser, page } = await connect({
        headless: false,
        turnstile: true, // Auto-solve Cloudflare challenges
        
        args: [
          // Window size based on our fingerprint
          `--window-size=${this.novaFingerprint.screenResolution.width},${this.novaFingerprint.screenResolution.height}`,
          // Advanced fingerprint evasion
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
          // Nova-specific args
          `--user-agent=${this.novaFingerprint.userAgent}`,
          // Randomize renderer
          `--disable-accelerated-2d-canvas=${Math.random() > 0.5 ? 'true' : 'false'}`,
          // Vary GPU settings
          Math.random() > 0.5 ? '--disable-gpu' : '--enable-gpu',
          // Random WebGL vendor
          '--enable-webgl',
          '--webgl-vendor="Nova Systems"',
          '--webgl-renderer="Nova Renderer"',
        ],
        
        customConfig: {
          userDataDir: `./nova-profiles/${this.sessionId}`,
        },
      });

      this.browser = browser;
      this.page = page;

      // Apply Nova-specific evasions
      await this.applyNovaEvasions();

      // Simulate human initialization behavior
      await this.simulateHumanInit();

      // Navigate to ChatGPT
      await this.navigateWithHumanBehavior('https://chatgpt.com');

      // Check authentication
      const isAuthenticated = await this.checkAuthStatus();
      if (!isAuthenticated) {
        this.emit('auth-required');
        console.log('🔐 Manual authentication required');
        await this.waitForAuthentication();
      }

      this.isInitialized = true;
      this.emit('initialized');
      console.log('✨ Nova Underground ready!');
      
    } catch (error) {
      console.error('❌ Nova initialization failed:', error);
      throw error;
    }
  }

  private async applyNovaEvasions(): Promise<void> {
    if (!this.page) return;

    // Inject Nova-specific evasions
    await this.page.evaluateOnNewDocument((fingerprint: any) => {
      // Create Nova namespace
      (window as any).__nova = {
        sessionId: fingerprint.personality,
        startTime: fingerprint.sessionStart,
      };

      // Override timezone
      const originalDateTimeFormat = Intl.DateTimeFormat;
      Intl.DateTimeFormat = new Proxy(originalDateTimeFormat, {
        construct(target, args) {
          if (args.length > 1 && args[1] && typeof args[1] === 'object') {
            args[1].timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          }
          return new target(...args);
        }
      });

      // Canvas fingerprint randomization with Nova signature
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(...args) {
        const context = this.getContext('2d');
        if (context) {
          // Add invisible Nova watermark
          const imageData = context.getImageData(0, 0, this.width, this.height);
          const data = imageData.data;
          
          // Modify random pixels based on session
          const seed = fingerprint.personality.charCodeAt(0);
          for (let i = 0; i < 10; i++) {
            const idx = ((seed * (i + 1)) % (data.length / 4)) * 4;
            data[idx] = (data[idx] + 1) % 256;
          }
          
          context.putImageData(imageData, 0, 0);
        }
        return originalToDataURL.apply(this, args);
      };

      // WebGL fingerprint with Nova signature
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(param) {
        if (param === 37445) { // UNMASKED_VENDOR_WEBGL
          return 'Nova Graphics Inc.';
        }
        if (param === 37446) { // UNMASKED_RENDERER_WEBGL
          return `Nova Renderer ${fingerprint.personality.substring(0, 4)}`;
        }
        return getParameter.apply(this, [param]);
      };

      // Audio fingerprint variation
      const originalCreateOscillator = AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator = function() {
        const oscillator = originalCreateOscillator.apply(this, []);
        const originalConnect = oscillator.connect;
        const newConnect = function(this: OscillatorNode, destination: any) {
          // Add micro-variation based on session
          this.detune.value = parseFloat(fingerprint.personality.substring(0, 2)) / 100;
          return originalConnect.apply(this, [destination]);
        };
        oscillator.connect = newConnect as any;
        return oscillator;
      };

      // Battery API with realistic values
      if ('getBattery' in navigator) {
        (navigator as any).getBattery = async () => ({
          charging: Math.random() > 0.3,
          chargingTime: Math.random() > 0.5 ? Infinity : Math.floor(Math.random() * 3600),
          dischargingTime: Math.floor(3600 + Math.random() * 7200),
          level: 0.3 + Math.random() * 0.7,
          addEventListener: () => {},
          removeEventListener: () => {},
        });
      }

      // Realistic screen properties
      Object.defineProperty(screen, 'availWidth', {
        get: () => fingerprint.screenResolution.width - Math.floor(Math.random() * 10),
      });
      Object.defineProperty(screen, 'availHeight', {
        get: () => fingerprint.screenResolution.height - 50 - Math.floor(Math.random() * 30),
      });

      // Hardware concurrency with variation
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => fingerprint.hardwareConcurrency + (Math.random() > 0.5 ? 0 : [-2, 2][Math.floor(Math.random() * 2)]),
      });

      // Device memory with realistic values
      if ('deviceMemory' in navigator) {
        Object.defineProperty(navigator, 'deviceMemory', {
          get: () => [4, 8, 16, 32][Math.floor(Math.random() * 4)],
        });
      }

      // Connection API with realistic network
      if ('connection' in navigator) {
        Object.defineProperty(navigator, 'connection', {
          get: () => ({
            effectiveType: ['4g', '3g'][Math.random() > 0.8 ? 1 : 0],
            rtt: 50 + Math.floor(Math.random() * 100),
            downlink: 1.5 + Math.random() * 10,
            saveData: false,
          }),
        });
      }

    }, this.novaFingerprint);
  }

  private async simulateHumanInit(): Promise<void> {
    if (!this.page) return;

    // Simulate human mouse movement on page load
    const { width, height } = this.novaFingerprint.screenResolution;
    
    // Move mouse in natural arc
    await this.humanMouseMove(
      width / 2 + Math.random() * 100 - 50,
      height / 2 + Math.random() * 100 - 50
    );

    // Random micro-scrolls like a human checking the page
    for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
      await this.humanDelay(300, 800);
      await this.page.mouse.wheel({ deltaY: 50 + Math.random() * 100 });
    }
  }

  private async navigateWithHumanBehavior(url: string): Promise<void> {
    if (!this.page) return;

    // Add pre-navigation delay
    await this.humanDelay(500, 2000);

    // Navigate
    await this.page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    // Post-navigation human behavior
    await this.humanDelay(1000, 3000);
    
    // Small mouse movement like checking page loaded
    await this.humanMouseMove(
      100 + Math.random() * 200,
      100 + Math.random() * 200
    );
  }

  private async humanDelay(min: number, max: number): Promise<void> {
    // Add natural variation to delays
    const baseDelay = min + Math.random() * (max - min);
    const variation = (Math.random() - 0.5) * 0.2; // ±10% variation
    const finalDelay = baseDelay * (1 + variation);
    
    await new Promise(resolve => setTimeout(resolve, finalDelay));
  }

  private async humanMouseMove(x: number, y: number): Promise<void> {
    if (!this.page) return;

    const steps = 10 + Math.floor(Math.random() * 10);
    await this.page.mouse.move(x, y, { steps });
  }

  private async humanType(text: string): Promise<void> {
    if (!this.page) return;

    for (const char of text) {
      await this.page.keyboard.type(char);
      
      // Variable typing speed
      const baseDelay = 60000 / this.novaFingerprint.typingSpeed / 5; // Convert WPM to delay
      const variation = (Math.random() - 0.5) * 0.4;
      const delay = baseDelay * (1 + variation);
      
      await this.humanDelay(delay, delay * 1.5);
      
      // Occasional longer pauses (thinking)
      if (Math.random() < 0.1) {
        await this.humanDelay(200, 500);
      }
    }
  }

  private async checkAuthStatus(): Promise<boolean> {
    if (!this.page) return false;

    try {
      return await this.page.evaluate(() => {
        const chatInput = document.querySelector('textarea[placeholder*="Message"], textarea#prompt-textarea, [contenteditable="true"]');
        const loginButton = document.querySelector('button[data-testid*="login"], a[href*="/auth/login"]');
        return !!chatInput && !loginButton;
      });
    } catch {
      return false;
    }
  }

  private async waitForAuthentication(): Promise<void> {
    if (!this.page) return;

    await this.page.waitForFunction(
      () => {
        const chatInput = document.querySelector('textarea[placeholder*="Message"], textarea#prompt-textarea');
        return !!chatInput;
      },
      { timeout: 300000 }
    );
  }

  async sendMessage(message: string, waitForResponse: boolean = true): Promise<string> {
    if (!this.isInitialized || !this.page) {
      throw new Error('Client not initialized');
    }

    // Pre-message human behavior
    await this.humanDelay(1000, 3000);
    
    // Move mouse naturally to input area
    const chatInput = await this.page.$('textarea[placeholder*="Message"], textarea#prompt-textarea');
    if (!chatInput) {
      throw new Error('Chat input not found');
    }

    const box = await chatInput.boundingBox();
    if (box) {
      await this.humanMouseMove(
        box.x + box.width / 2 + (Math.random() - 0.5) * 50,
        box.y + box.height / 2 + (Math.random() - 0.5) * 20
      );
    }

    // Click with human-like behavior
    await this.humanDelay(100, 300);
    await chatInput.click();
    
    // Clear existing text naturally
    await this.page.keyboard.down('Control');
    await this.humanDelay(50, 150);
    await this.page.keyboard.press('a');
    await this.humanDelay(50, 150);
    await this.page.keyboard.up('Control');
    
    // Type message with human-like speed
    await this.humanType(message);

    // Natural pause before sending
    await this.humanDelay(300, 1000);
    await this.page.keyboard.press('Enter');

    if (!waitForResponse) {
      return '';
    }

    return await this.waitForResponse();
  }

  private async waitForResponse(): Promise<string> {
    if (!this.page) throw new Error('No page available');

    // Wait for response with patience
    await this.page.waitForFunction(
      () => {
        const articles = document.querySelectorAll('article');
        if (articles.length < 2) return false;
        
        const lastArticle = articles[articles.length - 1];
        const isAssistant = lastArticle.querySelector('[data-message-author-role="assistant"]') || 
                            lastArticle.textContent?.includes('ChatGPT');
        
        return isAssistant && lastArticle.textContent && lastArticle.textContent.trim().length > 0;
      },
      { timeout: 60000 }
    );

    // Wait for streaming to complete
    await this.page.waitForFunction(
      () => {
        return document.querySelector('button[aria-label*="Stop"], button[aria-label*="Regenerate"]');
      },
      { timeout: 60000 }
    );

    // Human-like reading delay
    await this.humanDelay(500, 1500);

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
    if (!this.isInitialized || !this.page) {
      throw new Error('Client not initialized');
    }

    await this.humanDelay(1000, 2000);
    
    const modelSelector = await this.page.$('[data-testid="model-selector"], button[aria-haspopup="listbox"]');
    if (!modelSelector) {
      throw new Error('Model selector not found');
    }

    // Move mouse naturally to selector
    const box = await modelSelector.boundingBox();
    if (box) {
      await this.humanMouseMove(
        box.x + box.width / 2,
        box.y + box.height / 2
      );
    }

    await this.humanDelay(100, 300);
    await modelSelector.click();
    await this.humanDelay(500, 1500);

    // Find and click model option
    const modelOption = await this.page.evaluateHandle((modelName: string) => {
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
    if (!this.page) throw new Error('Not initialized');

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
    if (!this.isInitialized || !this.page) {
      throw new Error('Client not initialized');
    }

    await this.humanDelay(500, 1500);
    
    const newChatButton = await this.page.$('a[href="/"], button[aria-label*="New chat"]');
    if (newChatButton) {
      await newChatButton.click();
      await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
    } else {
      await this.page.goto('https://chatgpt.com/', { waitUntil: 'networkidle2' });
    }

    this.emit('conversation-cleared');
  }

  async getAvailableModels(): Promise<string[]> {
    if (!this.isInitialized || !this.page) {
      throw new Error('Client not initialized');
    }

    await this.humanDelay(1000, 2000);
    
    const modelSelector = await this.page.$('[data-testid="model-selector"], button[aria-haspopup="listbox"]');
    if (!modelSelector) {
      return [];
    }

    await modelSelector.click();
    await this.humanDelay(500, 1500);

    const models = await this.page.evaluate(() => {
      const options = Array.from(document.querySelectorAll('[role="option"], [data-testid*="model-option"]'));
      return options.map(el => el.textContent?.trim() || '').filter(text => text.length > 0);
    });

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

  async close(): Promise<void> {
    if (this.browser) {
      // Log session stats
      const sessionTime = Date.now() - this.startTime;
      console.log(`🎭 Nova session ${this.sessionId} ended after ${Math.round(sessionTime / 1000)}s`);
      
      await this.browser.close();
      this.browser = undefined;
      this.page = undefined;
      this.isInitialized = false;
    }
  }

  isReady(): boolean {
    return this.isInitialized && !!this.page;
  }

  // Nova-specific method to get session info
  getSessionInfo() {
    return {
      sessionId: this.sessionId,
      uptime: Date.now() - this.startTime,
      fingerprint: this.novaFingerprint.personality,
    };
  }
}