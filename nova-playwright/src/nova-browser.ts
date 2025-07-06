import { chromium, Browser, BrowserContext, Page, BrowserContextOptions } from "playwright";

export interface NovaBrowserOptions {
  headless?: boolean;
  stealth?: boolean;
  userDataDir?: string;
  proxy?: string;
  slowMo?: number;
}

export class NovaBrowser {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private options: NovaBrowserOptions;
  private screenshots: Map<string, string> = new Map();
  private consoleLogs: string[] = [];
  private pageErrors: string[] = [];
  private networkLog: any[] = [];

  constructor(options: NovaBrowserOptions = {}) {
    this.options = {
      headless: options.headless ?? true,
      stealth: options.stealth ?? true,
      userDataDir: options.userDataDir,
      proxy: options.proxy,
      slowMo: options.slowMo,
    };
  }

  async ensureInitialized(): Promise<void> {
    if (!this.browser || !this.context || !this.page) {
      await this.initialize();
    }
  }

  private async initialize(): Promise<void> {
    // Close existing browser if any
    if (this.browser) {
      await this.browser.close();
    }

    // Configure browser args for stealth
    const args = [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials',
      '--disable-features=BlockInsecurePrivateNetworkRequests',
      '--disable-features=ImprovedCookieControls',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--window-position=0,0',
      '--ignore-certificate-errors',
      '--ignore-certificate-errors-spki-list',
      '--allow-running-insecure-content',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--disable-features=ChromeWhatsNewUI',
      '--disable-features=AudioServiceOutOfProcess',
      '--disable-features=CalculateNativeWinOcclusion',
      '--disable-features=OptimizationHints',
      '--disable-features=HeavyAdIntervention',
      '--disable-features=BackForwardCache',
      '--disable-features=GlobalMediaControls',
      '--disable-features=DestroyProfileOnBrowserClose',
      '--disable-features=MediaRouter',
      '--disable-features=DialMediaRouteProvider',
      '--metrics-recording-only',
      '--disable-sync',
      '--disable-plugins',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-breakpad',
      '--disable-client-side-phishing-detection',
      '--disable-component-extensions-with-background-pages',
      '--disable-default-apps',
      '--disable-features=TranslateUI',
      '--disable-hang-monitor',
      '--disable-prompt-on-repost',
      '--disable-renderer-backgrounding',
      '--force-color-profile=srgb',
      '--disable-features=RendererCodeIntegrity',
      '--disable-features=AvoidUnnecessaryBeforeUnloadCheckSync',
      '--disable-popup-blocking',
    ];

    const contextOptions: BrowserContextOptions = {
      ignoreHTTPSErrors: true,
      bypassCSP: true,
      javaScriptEnabled: true,
      userAgent: this.generateUserAgent(),
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      timezoneId: 'America/New_York',
      permissions: ['geolocation', 'notifications'],
      colorScheme: 'light',
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    };

    // Add proxy if configured
    if (this.options.proxy) {
      contextOptions.proxy = {
        server: this.options.proxy,
      };
    }

    // Add persistent storage if configured
    if (this.options.userDataDir) {
      contextOptions.storageState = {
        cookies: [],
        origins: [],
      };
    }

    // Launch browser with stealth args
    this.browser = await chromium.launch({
      headless: this.options.headless,
      args,
      slowMo: this.options.slowMo,
    });

    this.context = await this.browser.newContext(contextOptions);

    // Apply additional stealth modifications
    if (this.options.stealth) {
      await this.applyStealthModifications();
    }

    this.page = await this.context.newPage();
    if (!this.page) throw new Error("Failed to create page");

    // Set up event listeners
    this.setupEventListeners();

    // Apply runtime stealth modifications
    if (this.options.stealth && this.page) {
      await this.applyPageStealthModifications();
    }
  }

  private async applyStealthModifications(): Promise<void> {
    // Override CDP detection
    if (!this.context) return;
    await this.context.addInitScript(() => {
      // Override navigator.webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Override navigator.plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          {
            0: {
              type: 'application/x-google-chrome-pdf',
              suffixes: 'pdf',
              description: 'Portable Document Format',
              enabledPlugin: true,
            },
            description: 'Portable Document Format', 
            filename: 'internal-pdf-viewer',
            length: 1,
            name: 'Chrome PDF Plugin',
          },
          {
            0: {
              type: 'application/pdf',
              suffixes: 'pdf',
              description: '',
              enabledPlugin: true,
            },
            description: '',
            filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
            length: 1,
            name: 'Chrome PDF Viewer',
          },
        ],
      });

      // Override navigator.languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      // Override navigator.permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) => (
        parameters.name === 'notifications' 
          ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
          : originalQuery(parameters)
      );

      // Remove automation indicators
      const newProto = Object.getPrototypeOf(navigator);
      delete (newProto as any).webdriver;
      Object.setPrototypeOf(navigator, newProto);

      // Override chrome object
      if (!(window as any).chrome) {
        (window as any).chrome = {
          runtime: {},
          loadTimes: function() {},
          csi: function() {},
          app: {},
        };
      }

      // Fix missing window.chrome in headless
      if (!(window as any).chrome.runtime) {
        (window as any).chrome.runtime = {};
      }

      // WebGL vendor spoofing
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) {
          return 'Intel Inc.';
        }
        if (parameter === 37446) {
          return 'Intel Iris OpenGL Engine';
        }
        return getParameter.apply(this, [parameter]);
      };

      // Hide automation-related properties
      const hideProperty = (obj: any, prop: string) => {
        Object.defineProperty(obj, prop, {
          enumerable: false,
          configurable: false,
          writable: false,
          value: undefined,
        });
      };

      hideProperty(window, 'cdc_adoQpoasnfa76pfcZLmcfl_Array');
      hideProperty(window, 'cdc_adoQpoasnfa76pfcZLmcfl_Promise');
      hideProperty(window, 'cdc_adoQpoasnfa76pfcZLmcfl_Symbol');

      // Override CDP detection
      const originalCall = Function.prototype.call;
      Function.prototype.call = function(...args) {
        if (args[1] && args[1].toString && args[1].toString().includes('Detect CDP')) {
          return undefined;
        }
        return originalCall.apply(this, args);
      };

      // Mock battery API
      if ('getBattery' in navigator) {
        (navigator as any).getBattery = () => Promise.resolve({
          charging: true,
          chargingTime: 0,
          dischargingTime: Infinity,
          level: 0.99,
          addEventListener: () => {},
          removeEventListener: () => {},
        });
      }

      // Override connection API
      Object.defineProperty(navigator, 'connection', {
        get: () => ({
          rtt: 100,
          downlink: 10,
          effectiveType: '4g',
          saveData: false,
        }),
      });

      // Fix Notification API in headless
      if (!window.Notification) {
        (window as any).Notification = {
          permission: 'default',
          requestPermission: () => Promise.resolve('default'),
        };
      }
    });
  }

  private async applyPageStealthModifications(): Promise<void> {
    if (!this.page) return;
    
    // Remove HeadlessChrome from user agent
    await this.page.addInitScript(() => {
      const originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        get: () => originalUserAgent.replace('HeadlessChrome', 'Chrome'),
      });
    });

    // Override CDP detection on Runtime.enable
    const client = await this.context!.newCDPSession(this.page);
    await client.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        // Disable Runtime.enable detection
        const originalSend = WebSocket.prototype.send;
        WebSocket.prototype.send = function(data) {
          if (typeof data === 'string' && data.includes('Runtime.enable')) {
            return;
          }
          return originalSend.call(this, data);
        };
      `,
    });
  }

  private generateUserAgent(): string {
    const versions = ['129.0.0.0', '128.0.0.0', '127.0.0.0'];
    const version = versions[Math.floor(Math.random() * versions.length)];
    return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Safari/537.36`;
  }

  private setupEventListeners(): void {
    if (!this.page) return;

    // Console log capture
    this.page.on('console', (msg) => {
      const logEntry = `[${msg.type()}] ${msg.text()}`;
      this.consoleLogs.push(logEntry);
      // Keep only last 1000 logs
      if (this.consoleLogs.length > 1000) {
        this.consoleLogs.shift();
      }
    });

    // Page error capture
    this.page.on('pageerror', (error) => {
      this.pageErrors.push(error.toString());
      // Keep only last 100 errors
      if (this.pageErrors.length > 100) {
        this.pageErrors.shift();
      }
    });

    // Network request logging
    this.page.on('request', (request) => {
      this.networkLog.push({
        type: 'request',
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        timestamp: new Date().toISOString(),
      });
    });

    this.page.on('response', (response) => {
      this.networkLog.push({
        type: 'response',
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        headers: response.headers(),
        timestamp: new Date().toISOString(),
      });
    });

    this.page.on('requestfailed', (request) => {
      this.networkLog.push({
        type: 'failed',
        url: request.url(),
        failure: request.failure(),
        timestamp: new Date().toISOString(),
      });
    });

    // Keep only last 500 network entries
    setInterval(() => {
      if (this.networkLog.length > 500) {
        this.networkLog = this.networkLog.slice(-500);
      }
    }, 60000);
  }

  getPage(): Page | null {
    return this.page;
  }

  getContext(): BrowserContext | null {
    return this.context;
  }

  getBrowser(): Browser | null {
    return this.browser;
  }

  addScreenshot(name: string, data: string): void {
    this.screenshots.set(name, data);
  }

  getScreenshot(name: string): string | undefined {
    return this.screenshots.get(name);
  }

  getScreenshots(): string[] {
    return Array.from(this.screenshots.keys());
  }

  getConsoleLogs(): string[] {
    return [...this.consoleLogs];
  }

  getPageErrors(): string[] {
    return [...this.pageErrors];
  }

  getNetworkLog(): any[] {
    return [...this.networkLog];
  }

  clearLogs(): void {
    this.consoleLogs = [];
    this.pageErrors = [];
    this.networkLog = [];
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }
  }
}