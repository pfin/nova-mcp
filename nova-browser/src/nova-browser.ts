import { EventEmitter } from "events";
import puppeteer, { Browser, Page } from "puppeteer";
import { connect } from "puppeteer-real-browser";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import puppeteerExtra from "puppeteer-extra";
import UserAgent from "user-agents";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import os from "os";

// Configure puppeteer-extra
puppeteerExtra.use(StealthPlugin());

export interface NovaBrowserConfig {
  mode: "stealth" | "performance" | "debug" | "remote" | "biometric" | "consciousness";
  headless?: boolean;
  remotePort?: number;
  userDataDir?: string;
  proxy?: string;
  biometrics?: any;
  persona?: string;
}

export interface NovaFingerprint {
  sessionId: string;
  personality: string;
  userAgent: string;
  viewport: { width: number; height: number };
  timezoneOffset: number;
  locale: string;
  colorDepth: number;
  hardwareConcurrency: number;
  deviceMemory: number;
  screenResolution: { width: number; height: number };
  platform: string;
  vendor: string;
  webglVendor: string;
  webglRenderer: string;
  createdAt: number;
}

export class NovaBrowser extends EventEmitter {
  private browser?: Browser | any;
  private page?: Page | any;
  private config: NovaBrowserConfig;
  private fingerprint: NovaFingerprint;
  private consoleLogs: string[] = [];
  private screenshots = new Map<string, string>();
  private sessions = new Map<string, any>();
  private isInitialized = false;
  private advancedBrowser?: any;
  private consciousnessBrowser?: any;

  constructor(config: NovaBrowserConfig) {
    super();
    this.config = config;
    this.fingerprint = this.generateFingerprint();
  }

  private generateFingerprint(): NovaFingerprint {
    const userAgentInstance = new UserAgent({ deviceCategory: "desktop" });
    const ua = userAgentInstance.random();
    
    const resolutions = [
      { width: 1920, height: 1080 },
      { width: 2560, height: 1440 },
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
      { width: 1680, height: 1050 },
      { width: 3840, height: 2160 },
    ];
    
    const screenRes = resolutions[Math.floor(Math.random() * resolutions.length)];
    
    return {
      sessionId: `nova-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
      personality: crypto.randomBytes(8).toString("hex"),
      userAgent: ua.toString(),
      viewport: {
        width: screenRes.width - Math.floor(Math.random() * 200),
        height: screenRes.height - Math.floor(Math.random() * 200),
      },
      timezoneOffset: new Date().getTimezoneOffset(),
      locale: ["en-US", "en-GB", "en-CA"][Math.floor(Math.random() * 3)],
      colorDepth: [24, 32][Math.floor(Math.random() * 2)],
      hardwareConcurrency: Math.min(os.cpus().length, 2 + Math.floor(Math.random() * 6)),
      deviceMemory: [4, 8, 16, 32][Math.floor(Math.random() * 4)],
      screenResolution: screenRes,
      platform: (ua as any).os?.name || "Windows",
      vendor: "Google Inc.",
      webglVendor: "Nova Graphics Inc.",
      webglRenderer: `Nova Renderer ${crypto.randomBytes(2).toString("hex")}`,
      createdAt: Date.now(),
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    this.emit("initializing", { mode: this.config.mode });

    try {
      switch (this.config.mode) {
        case "stealth":
          await this.initializeStealth();
          break;
        case "performance":
          await this.initializePerformance();
          break;
        case "debug":
          await this.initializeDebug();
          break;
        case "remote":
          await this.initializeRemote();
          break;
        case "biometric":
          await this.initializeBiometric();
          break;
        case "consciousness":
          await this.initializeConsciousness();
          break;
      }

      this.isInitialized = true;
      this.emit("initialized", { fingerprint: this.fingerprint });
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }

  private async initializeStealth(): Promise<void> {
    // Create profile directory
    const profileDir = path.join(
      os.tmpdir(),
      "nova-browser-profiles",
      this.fingerprint.sessionId
    );
    
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }

    try {
      // Try puppeteer-real-browser first
      const { browser, page } = await connect({
        headless: this.config.headless || false,
        turnstile: true,
        
        args: [
          `--user-agent=${this.fingerprint.userAgent}`,
          `--window-size=${this.fingerprint.viewport.width},${this.fingerprint.viewport.height}`,
          "--disable-blink-features=AutomationControlled",
          "--disable-features=IsolateOrigins,site-per-process",
          "--enable-features=NetworkService",
          `--lang=${this.fingerprint.locale}`,
          "--no-sandbox",
          "--disable-setuid-sandbox",
        ],
        
        customConfig: {
          userDataDir: this.config.userDataDir || profileDir,
        },
      });

      this.browser = browser;
      this.page = page;
    } catch (error) {
      console.error("Failed to use puppeteer-real-browser, falling back to puppeteer-extra:", error instanceof Error ? error.message : String(error));
      
      // Fallback to puppeteer-extra with stealth plugin
      this.browser = await puppeteerExtra.launch({
        headless: this.config.headless !== false,
        args: [
          `--user-agent=${this.fingerprint.userAgent}`,
          `--window-size=${this.fingerprint.viewport.width},${this.fingerprint.viewport.height}`,
          "--disable-blink-features=AutomationControlled",
          "--disable-features=IsolateOrigins,site-per-process",
          "--enable-features=NetworkService",
          `--lang=${this.fingerprint.locale}`,
          "--no-sandbox",
          "--disable-setuid-sandbox",
          `--user-data-dir=${this.config.userDataDir || profileDir}`,
        ],
        defaultViewport: null,
      });

      const pages = await this.browser.pages();
      this.page = pages[0] || await this.browser.newPage();
    }

    // Apply Nova fingerprint
    await this.applyFingerprint();
    await this.setupPageListeners();
  }

  private async initializePerformance(): Promise<void> {
    // Use puppeteer-extra with stealth plugin for balanced approach
    this.browser = await puppeteerExtra.launch({
      headless: this.config.headless !== false,
      args: [
        `--user-agent=${this.fingerprint.userAgent}`,
        `--window-size=${this.fingerprint.viewport.width},${this.fingerprint.viewport.height}`,
        "--disable-blink-features=AutomationControlled",
      ],
    });

    const pages = await this.browser.pages();
    this.page = pages[0] || await this.browser.newPage();
    
    await this.applyBasicFingerprint();
    await this.setupPageListeners();
  }

  private async initializeDebug(): Promise<void> {
    // Standard puppeteer with visible browser for debugging
    this.browser = await puppeteer.launch({
      headless: false,
      devtools: true,
      args: [
        `--window-size=${this.fingerprint.viewport.width},${this.fingerprint.viewport.height}`,
      ],
    });

    const pages = await this.browser.pages();
    this.page = pages[0] || await this.browser.newPage();
    
    await this.setupPageListeners();
  }

  private async initializeRemote(): Promise<void> {
    // Connect to existing Chrome instance
    const debugUrl = `http://localhost:${this.config.remotePort || 9222}`;
    
    try {
      const response = await fetch(`${debugUrl}/json/version`);
      const versionInfo = await response.json();
      
      this.browser = await puppeteer.connect({
        browserWSEndpoint: versionInfo.webSocketDebuggerUrl,
        defaultViewport: null,
      });

      const pages = await this.browser.pages();
      this.page = pages[0] || await this.browser.newPage();
      
      await this.setupPageListeners();
      this.emit("connected", { debugUrl });
    } catch (error) {
      throw new Error(`Failed to connect to remote Chrome at ${debugUrl}`);
    }
  }

  private async applyFingerprint(): Promise<void> {
    if (!this.page) return;

    // Inject Nova fingerprint into page context
    await this.page.evaluateOnNewDocument((fingerprint: NovaFingerprint) => {
      // Store fingerprint
      (window as any).__novaFingerprint = fingerprint;

      // Override navigator properties
      Object.defineProperty(navigator, "userAgent", {
        get: () => fingerprint.userAgent,
      });

      Object.defineProperty(navigator, "platform", {
        get: () => fingerprint.platform,
      });

      Object.defineProperty(navigator, "vendor", {
        get: () => fingerprint.vendor,
      });

      Object.defineProperty(navigator, "hardwareConcurrency", {
        get: () => fingerprint.hardwareConcurrency,
      });

      Object.defineProperty(navigator, "deviceMemory", {
        get: () => fingerprint.deviceMemory,
      });

      Object.defineProperty(navigator, "language", {
        get: () => fingerprint.locale,
      });

      Object.defineProperty(navigator, "languages", {
        get: () => [fingerprint.locale],
      });

      // Override screen properties
      Object.defineProperty(screen, "width", {
        get: () => fingerprint.screenResolution.width,
      });

      Object.defineProperty(screen, "height", {
        get: () => fingerprint.screenResolution.height,
      });

      Object.defineProperty(screen, "colorDepth", {
        get: () => fingerprint.colorDepth,
      });

      // Canvas fingerprinting protection
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function (...args) {
        const context = this.getContext("2d");
        if (context) {
          const imageData = context.getImageData(0, 0, this.width, this.height);
          const data = imageData.data;
          
          // Add unique noise based on personality
          const seed = fingerprint.personality.charCodeAt(0);
          for (let i = 0; i < 20; i++) {
            const idx = ((seed * (i + 1)) % (data.length / 4)) * 4;
            data[idx] = (data[idx] + i) % 256;
          }
          
          context.putImageData(imageData, 0, 0);
        }
        return originalToDataURL.apply(this, args);
      };

      // WebGL fingerprinting protection
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function (param) {
        if (param === 37445) return fingerprint.webglVendor;
        if (param === 37446) return fingerprint.webglRenderer;
        return getParameter.apply(this, [param]);
      };

      // Audio fingerprinting protection
      const audioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (audioContext) {
        const original = audioContext.prototype.createOscillator;
        audioContext.prototype.createOscillator = function () {
          const osc = original.apply(this);
          const originalConnect = osc.connect.bind(osc);
          osc.connect = function (dest: any) {
            osc.detune.value = parseFloat(fingerprint.personality.substring(0, 2)) / 10;
            return originalConnect(dest);
          };
          return osc;
        };
      }

      // Remove automation indicators
      delete (window as any).navigator.webdriver;
      delete (window as any).__nightmare;
      delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Array;
      delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Promise;
      delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
    }, this.fingerprint);

    // Set viewport
    await this.page.setViewport({
      width: this.fingerprint.viewport.width,
      height: this.fingerprint.viewport.height,
    });
  }

  private async applyBasicFingerprint(): Promise<void> {
    if (!this.page) return;

    // Basic fingerprinting for performance mode
    await this.page.setUserAgent(this.fingerprint.userAgent);
    await this.page.setViewport({
      width: this.fingerprint.viewport.width,
      height: this.fingerprint.viewport.height,
    });
  }

  private async setupPageListeners(): Promise<void> {
    if (!this.page) return;

    // Capture console logs
    this.page.on("console", (msg: any) => {
      const logEntry = `[${new Date().toISOString()}] [${msg.type()}] ${msg.text()}`;
      this.consoleLogs.push(logEntry);
      this.emit("console", logEntry);
    });

    // Capture errors
    this.page.on("error", (error: Error) => {
      const errorEntry = `[${new Date().toISOString()}] [ERROR] ${error.message}`;
      this.consoleLogs.push(errorEntry);
      this.emit("pageError", error);
    });

    // Capture dialogs
    this.page.on("dialog", async (dialog: any) => {
      this.emit("dialog", { type: dialog.type(), message: dialog.message() });
      await dialog.accept();
    });
  }

  async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  getPage(): Page | any {
    return this.page;
  }

  getBrowser(): Browser | any {
    return this.browser;
  }

  getFingerprint(): NovaFingerprint {
    return this.fingerprint;
  }

  getConsoleLogs(): string[] {
    return this.consoleLogs;
  }

  clearConsoleLogs(): void {
    this.consoleLogs = [];
  }

  addScreenshot(name: string, data: string): void {
    this.screenshots.set(name, data);
    this.emit("screenshotAdded", name);
  }

  getScreenshot(name: string): string | undefined {
    return this.screenshots.get(name);
  }

  getScreenshots(): string[] {
    return Array.from(this.screenshots.keys());
  }

  saveSession(name: string, data: any): void {
    this.sessions.set(name, {
      fingerprint: this.fingerprint,
      data,
      savedAt: Date.now(),
    });
    this.emit("sessionSaved", name);
  }

  loadSession(name: string): any {
    return this.sessions.get(name);
  }

  getSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  private async initializeBiometric(): Promise<void> {
    // For now, use stealth mode with biometric simulation
    // The advanced-human-browser.js needs more implementation
    await this.initializeStealth();
    
    // Import biometric patterns from advanced-human-browser
    const AdvancedHumanBrowser = (await import("./advanced-human-browser.js")).default || (await import("./advanced-human-browser.js"));
    this.advancedBrowser = new AdvancedHumanBrowser({
      headless: this.config.headless,
      defaultProfile: this.fingerprint.sessionId,
      viewport: this.fingerprint.viewport,
      biometrics: this.config.biometrics
    });
    
    // Copy biometric patterns
    (this as any).biometrics = this.advancedBrowser.biometrics;
    
    this.emit("biometric-initialized", this.advancedBrowser.biometrics);
  }

  private async initializeConsciousness(): Promise<void> {
    // For now, use stealth mode with consciousness simulation
    // The consciousness-browser.js needs more implementation
    await this.initializeStealth();
    
    // Import consciousness patterns
    const ConsciousnessBrowser = (await import("./consciousness-browser.js")).default || (await import("./consciousness-browser.js"));
    this.consciousnessBrowser = new ConsciousnessBrowser({
      headless: this.config.headless,
      defaultProfile: this.fingerprint.sessionId,
      viewport: this.fingerprint.viewport,
      persona: this.config.persona || "default"
    });
    
    // Copy consciousness patterns
    (this as any).consciousness = this.consciousnessBrowser.consciousness;
    
    this.emit("consciousness-initialized", {
      persona: this.consciousnessBrowser.consciousness.currentPersona,
      flowState: this.consciousnessBrowser.consciousness.flowState
    });
  }

  getBiometrics(): any {
    if (this.advancedBrowser) {
      return this.advancedBrowser.biometrics;
    }
    return null;
  }

  updateBiometrics(updates: any): void {
    if (this.advancedBrowser) {
      this.advancedBrowser.updateBiometrics(updates);
      this.emit("biometrics-updated", this.advancedBrowser.biometrics);
    }
  }

  switchPersona(persona: string): void {
    if (this.consciousnessBrowser) {
      this.consciousnessBrowser.switchPersona(persona);
      this.emit("persona-switched", persona);
    }
  }

  async close(): Promise<void> {
    if (this.advancedBrowser) {
      await this.advancedBrowser.close();
    }
    if (this.consciousnessBrowser) {
      await this.consciousnessBrowser.close();
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = undefined;
      this.page = undefined;
      this.isInitialized = false;
      this.emit("closed");
    }
  }
}