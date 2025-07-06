import { CallToolResult, TextContent, ImageContent } from "@modelcontextprotocol/sdk/types.js";
import { NovaBrowser } from "./nova-browser.js";
import { createCursor } from "ghost-cursor";

export class NovaTools {
  private browser: NovaBrowser;
  private typingSpeed = 80; // WPM

  constructor(browser: NovaBrowser) {
    this.browser = browser;
  }

  async execute(toolName: string, args: any): Promise<CallToolResult> {
    await this.browser.ensureInitialized();

    switch (toolName) {
      case "nova_navigate":
        return this.navigate(args);
      case "nova_click":
        return this.click(args);
      case "nova_type":
        return this.type(args);
      case "nova_screenshot":
        return this.screenshot(args);
      case "nova_search":
        return this.search(args);
      case "nova_extract":
        return this.extract(args);
      case "nova_wait_smart":
        return this.waitSmart(args);
      case "nova_session":
        return this.session(args);
      case "nova_evaluate":
        return this.evaluate(args);
      case "nova_hover":
        return this.hover(args);
      case "nova_scroll":
        return this.scroll(args);
      case "nova_select":
        return this.select(args);
      case "nova_biometrics":
        return this.biometrics(args);
      case "nova_persona":
        return this.persona(args);
      case "nova_simulate_fatigue":
        return this.simulateFatigue(args);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  private async navigate(args: any): Promise<CallToolResult> {
    const page = this.browser.getPage();
    if (!page) throw new Error("Browser not initialized");

    const { url, mode = "stealth", waitUntil = "networkidle2", humanDelay = true } = args;

    try {
      // Add human-like pre-navigation delay
      if (humanDelay) {
        await this.humanDelay(500, 2000);
      }

      // Navigate
      await page.goto(url, { waitUntil });

      // Post-navigation behavior
      if (humanDelay) {
        await this.humanDelay(1000, 3000);
        // Small mouse movement like checking page loaded
        await this.naturalMouseMovement(page, 
          100 + Math.random() * 200,
          100 + Math.random() * 200
        );
      }

      return {
        content: [{
          type: "text",
          text: `✅ Navigated to ${url} in ${mode} mode`,
        }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Navigation failed: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  private async click(args: any): Promise<CallToolResult> {
    const page = this.browser.getPage();
    if (!page) throw new Error("Browser not initialized");

    const { selector, humanize = true, button = "left", clickCount = 1 } = args;

    try {
      const element = await page.$(selector);
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }

      if (humanize) {
        // Use ghost cursor for natural movement
        const cursor = createCursor(page);
        await cursor.click(selector, {
          waitForClick: this.randomDelay(100, 300),
          moveSpeed: this.randomDelay(800, 1200),
        });
      } else {
        await element.click({ button, clickCount });
      }

      return {
        content: [{
          type: "text",
          text: `✅ Clicked ${selector}${humanize ? " with human-like movement" : ""}`,
        }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Click failed: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  private async type(args: any): Promise<CallToolResult> {
    const page = this.browser.getPage();
    if (!page) throw new Error("Browser not initialized");

    const { selector, text, wpm = 80, clearFirst = true, pressEnter = false } = args;

    try {
      const element = await page.$(selector);
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }

      // Click to focus
      await element.click();
      await this.humanDelay(100, 300);

      // Clear if requested
      if (clearFirst) {
        await page.keyboard.down("Control");
        await this.humanDelay(50, 150);
        await page.keyboard.press("a");
        await this.humanDelay(50, 150);
        await page.keyboard.up("Control");
        await this.humanDelay(100, 200);
      }

      // Type with human-like speed
      await this.humanType(page, text, wpm);

      // Press Enter if requested
      if (pressEnter) {
        await this.humanDelay(300, 800);
        await page.keyboard.press("Enter");
      }

      return {
        content: [{
          type: "text",
          text: `✅ Typed "${text}" at ~${wpm} WPM`,
        }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Type failed: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  private async screenshot(args: any): Promise<CallToolResult> {
    const page = this.browser.getPage();
    if (!page) throw new Error("Browser not initialized");

    const { name, selector, fullPage = false, quality } = args;

    try {
      let screenshot: string;
      const options: any = { encoding: "base64" };
      
      if (quality !== undefined) {
        options.type = "jpeg";
        options.quality = quality;
      }

      if (selector) {
        const element = await page.$(selector);
        if (!element) {
          throw new Error(`Element not found: ${selector}`);
        }
        screenshot = await element.screenshot(options);
      } else {
        options.fullPage = fullPage;
        screenshot = await page.screenshot(options);
      }

      this.browser.addScreenshot(name, screenshot);

      return {
        content: [
          {
            type: "text",
            text: `✅ Screenshot saved as "${name}"`,
          } as TextContent,
          {
            type: "image",
            data: screenshot,
            mimeType: quality !== undefined ? "image/jpeg" : "image/png",
          } as ImageContent,
        ],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Screenshot failed: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  private async search(args: any): Promise<CallToolResult> {
    const page = this.browser.getPage();
    if (!page) throw new Error("Browser not initialized");

    const { query, engine = "google", limit = 10 } = args;

    try {
      const searchUrl = engine === "google" 
        ? "https://www.google.com" 
        : "https://www.bing.com";

      // Navigate to search engine
      await page.goto(searchUrl, { waitUntil: "domcontentloaded" });
      await this.humanDelay(1000, 2000);

      // Find search box
      const searchBoxSelector = engine === "google"
        ? 'textarea[name="q"], input[name="q"]'
        : 'input[name="q"]';

      const searchBox = await page.$(searchBoxSelector);
      if (!searchBox) {
        throw new Error("Search box not found");
      }

      // Click and type query
      await searchBox.click();
      await this.humanDelay(300, 800);
      await this.humanType(page, query, this.typingSpeed);
      await this.humanDelay(300, 800);
      await page.keyboard.press("Enter");

      // Wait for results
      await page.waitForNavigation({ waitUntil: "domcontentloaded" });
      await this.humanDelay(1000, 2000);

      // Extract results
      const results = await this.extractSearchResults(page, engine, limit);

      return {
        content: [{
          type: "text",
          text: `✅ Found ${results.length} results for "${query}":\n\n${
            results.map((r, i) => 
              `${i + 1}. **${r.title}**\n   URL: ${r.url}\n   ${r.description}`
            ).join("\n\n")
          }`,
        }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Search failed: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  private async extract(args: any): Promise<CallToolResult> {
    const page = this.browser.getPage();
    if (!page) throw new Error("Browser not initialized");

    const { selectors, multiple = false, attributes = [] } = args;

    try {
      const results: Record<string, any> = {};

      for (const [key, selector] of Object.entries(selectors as Record<string, string>)) {
        if (multiple) {
          const elements = await page.$$(selector as string);
          results[key] = await Promise.all(
            elements.map((el: any) => this.extractElementData(el, attributes))
          );
        } else {
          const element = await page.$(selector as string);
          results[key] = element ? await this.extractElementData(element, attributes) : null;
        }
      }

      return {
        content: [{
          type: "text",
          text: `✅ Extracted data:\n${JSON.stringify(results, null, 2)}`,
        }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Extract failed: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  private async waitSmart(args: any): Promise<CallToolResult> {
    const page = this.browser.getPage();
    if (!page) throw new Error("Browser not initialized");

    const { condition, value, maxWait = 30000 } = args;

    try {
      switch (condition) {
        case "networkIdle":
          await page.waitForNavigation({ waitUntil: "networkidle0", timeout: maxWait });
          break;
        case "selector":
          await page.waitForSelector(value, { timeout: maxWait, visible: true });
          break;
        case "function":
          await page.waitForFunction(value, { timeout: maxWait });
          break;
        case "time":
          await this.humanDelay(parseInt(value), parseInt(value));
          break;
      }

      return {
        content: [{
          type: "text",
          text: `✅ Wait condition "${condition}" satisfied`,
        }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Wait failed: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  private async session(args: any): Promise<CallToolResult> {
    const { action, name } = args;

    try {
      switch (action) {
        case "save":
          const cookies = await this.browser.getPage()?.cookies();
          const localStorage = await this.browser.getPage()?.evaluate(() => 
            Object.entries(localStorage)
          );
          this.browser.saveSession(name, { cookies, localStorage });
          return {
            content: [{
              type: "text",
              text: `✅ Session "${name}" saved`,
            }],
            isError: false,
          };

        case "load":
          const session = this.browser.loadSession(name);
          if (!session) {
            throw new Error(`Session "${name}" not found`);
          }
          await this.browser.getPage()?.setCookie(...session.data.cookies);
          await this.browser.getPage()?.evaluate((items: any) => {
            items.forEach(([key, value]: [string, string]) => {
              localStorage.setItem(key, value);
            });
          }, session.data.localStorage);
          return {
            content: [{
              type: "text",
              text: `✅ Session "${name}" loaded`,
            }],
            isError: false,
          };

        case "clear":
          const client = await this.browser.getPage()?.target().createCDPSession();
          await client?.send("Network.clearBrowserCookies");
          await client?.send("Network.clearBrowserCache");
          return {
            content: [{
              type: "text",
              text: `✅ Session cleared`,
            }],
            isError: false,
          };

        case "info":
          const fingerprint = this.browser.getFingerprint();
          return {
            content: [{
              type: "text",
              text: `📊 Session Info:\n${JSON.stringify(fingerprint, null, 2)}`,
            }],
            isError: false,
          };

        default:
          throw new Error(`Unknown session action: ${action}`);
      }
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Session operation failed: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  private async evaluate(args: any): Promise<CallToolResult> {
    const page = this.browser.getPage();
    if (!page) throw new Error("Browser not initialized");

    const { script, returnConsole = true } = args;

    try {
      // Set up console capture in isolated context
      if (returnConsole) {
        await page.evaluateOnNewDocument(() => {
          (window as any).__novaConsole = [];
          const methods = ["log", "info", "warn", "error"];
          methods.forEach(method => {
            const original = (console as any)[method];
            (console as any)[method] = (...args: any[]) => {
              (window as any).__novaConsole.push(`[${method}] ${args.join(" ")}`);
              original.apply(console, args);
            };
          });
        });
      }

      // Wrap script to support return statements
      const wrappedScript = `
        (() => {
          ${script}
        })()
      `;

      // Execute script
      const result = await page.evaluate(wrappedScript);

      // Get console output
      let consoleLogs = "";
      if (returnConsole) {
        const logs = await page.evaluate(() => (window as any).__novaConsole || []);
        consoleLogs = logs.length > 0 ? `\n\nConsole output:\n${logs.join("\n")}` : "";
      }

      return {
        content: [{
          type: "text",
          text: `✅ Script executed:\n${JSON.stringify(result, null, 2)}${consoleLogs}`,
        }],
        isError: false,
      };
    } catch (error) {
      // Provide better error messages
      let errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("SyntaxError")) {
        errorMessage += "\n\nTip: Make sure your JavaScript syntax is valid. If using 'return', ensure it's inside a function.";
      }
      return {
        content: [{
          type: "text",
          text: `❌ Evaluate failed: ${errorMessage}`,
        }],
        isError: true,
      };
    }
  }

  private async hover(args: any): Promise<CallToolResult> {
    const page = this.browser.getPage();
    if (!page) throw new Error("Browser not initialized");

    const { selector, duration = 1000 } = args;

    try {
      const element = await page.$(selector);
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }

      const cursor = createCursor(page);
      await cursor.move(selector);
      await this.humanDelay(duration * 0.8, duration * 1.2);

      return {
        content: [{
          type: "text",
          text: `✅ Hovered over ${selector} for ~${duration}ms`,
        }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Hover failed: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  private async scroll(args: any): Promise<CallToolResult> {
    const page = this.browser.getPage();
    if (!page) throw new Error("Browser not initialized");

    const { direction, amount = 300, smooth = true, humanize = true } = args;

    try {
      if (humanize) {
        // Scroll in small increments with delays
        const steps = 5 + Math.floor(Math.random() * 5);
        const stepSize = amount / steps;

        for (let i = 0; i < steps; i++) {
          await page.evaluate((dir: string, size: number, isSmooth: boolean) => {
            const scrollOptions: ScrollToOptions = {
              behavior: isSmooth ? "smooth" : "instant",
            };

            if (dir === "down") {
              window.scrollBy({ top: size, ...scrollOptions });
            } else if (dir === "up") {
              window.scrollBy({ top: -size, ...scrollOptions });
            } else if (dir === "to") {
              window.scrollTo({ top: size, ...scrollOptions });
            }
          }, direction, stepSize, smooth);

          await this.humanDelay(50, 200);
        }
      } else {
        await page.evaluate((dir: string, amt: number, isSmooth: boolean) => {
          const scrollOptions: ScrollToOptions = {
            behavior: isSmooth ? "smooth" : "instant",
          };

          if (dir === "down") {
            window.scrollBy({ top: amt, ...scrollOptions });
          } else if (dir === "up") {
            window.scrollBy({ top: -amt, ...scrollOptions });
          } else if (dir === "to") {
            window.scrollTo({ top: amt, ...scrollOptions });
          }
        }, direction, amount, smooth);
      }

      return {
        content: [{
          type: "text",
          text: `✅ Scrolled ${direction} ${amount}px${humanize ? " with human-like pattern" : ""}`,
        }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Scroll failed: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  private async select(args: any): Promise<CallToolResult> {
    const page = this.browser.getPage();
    if (!page) throw new Error("Browser not initialized");

    const { selector, value, byText = false } = args;

    try {
      const element = await page.$(selector);
      if (!element) {
        throw new Error(`Select element not found: ${selector}`);
      }

      // Click to open dropdown
      await element.click();
      await this.humanDelay(200, 500);

      if (byText) {
        // Select by visible text
        await page.evaluate((sel: string, text: string) => {
          const select = document.querySelector(sel) as HTMLSelectElement;
          const option = Array.from(select.options).find(opt => opt.text === text);
          if (option) {
            select.value = option.value;
            select.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }, selector, value);
      } else {
        // Select by value
        await page.select(selector, value);
      }

      return {
        content: [{
          type: "text",
          text: `✅ Selected "${value}" in ${selector}`,
        }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Select failed: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  // Helper methods
  private async humanDelay(min: number, max: number): Promise<void> {
    const delay = min + Math.random() * (max - min);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private randomDelay(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  private async humanType(page: any, text: string, wpm: number): Promise<void> {
    for (const char of text) {
      await page.keyboard.type(char);
      
      // Calculate delay based on WPM
      const baseDelay = 60000 / wpm / 5;
      const variation = (Math.random() - 0.5) * 0.4;
      const delay = baseDelay * (1 + variation);
      
      await this.humanDelay(delay, delay * 1.5);
      
      // Occasional longer pauses
      if (Math.random() < 0.1) {
        await this.humanDelay(200, 500);
      }
    }
  }

  private async naturalMouseMovement(page: any, x: number, y: number): Promise<void> {
    const steps = 10 + Math.floor(Math.random() * 10);
    await page.mouse.move(x, y, { steps });
  }

  private async extractSearchResults(page: any, engine: string, limit: number): Promise<any[]> {
    if (engine === "google") {
      return page.evaluate((maxResults: number) => {
        const results = [];
        const elements = document.querySelectorAll("div.g");
        
        for (let i = 0; i < Math.min(elements.length, maxResults); i++) {
          const element = elements[i];
          const titleEl = element.querySelector("h3");
          const linkEl = element.querySelector("a");
          const descEl = element.querySelector(".VwiC3b, .yXK7lf");
          
          if (titleEl && linkEl) {
            results.push({
              title: titleEl.textContent || "",
              url: linkEl.getAttribute("href") || "",
              description: descEl?.textContent || "",
            });
          }
        }
        
        return results;
      }, limit);
    } else {
      // Bing
      return page.evaluate((maxResults: number) => {
        const results = [];
        const elements = document.querySelectorAll("li.b_algo");
        
        for (let i = 0; i < Math.min(elements.length, maxResults); i++) {
          const element = elements[i];
          const titleEl = element.querySelector("h2 a");
          const descEl = element.querySelector(".b_caption p");
          
          if (titleEl) {
            results.push({
              title: titleEl.textContent || "",
              url: titleEl.getAttribute("href") || "",
              description: descEl?.textContent || "",
            });
          }
        }
        
        return results;
      }, limit);
    }
  }

  private async extractElementData(element: any, attributes: string[]): Promise<any> {
    return element.evaluate((el: Element, attrs: string[]) => {
      const data: any = {
        text: el.textContent?.trim() || "",
      };
      
      attrs.forEach(attr => {
        data[attr] = el.getAttribute(attr);
      });
      
      return data;
    }, attributes);
  }

  private async biometrics(args: any): Promise<CallToolResult> {
    const { action, updates, duration } = args;

    try {
      switch (action) {
        case "get":
          const currentBiometrics = this.browser.getBiometrics();
          return {
            content: [{
              type: "text",
              text: `📊 Current biometrics:\n${JSON.stringify(currentBiometrics, null, 2)}`,
            }],
            isError: false,
          };

        case "update":
          if (!updates) {
            throw new Error("Updates required for update action");
          }
          this.browser.updateBiometrics(updates);
          return {
            content: [{
              type: "text",
              text: `✅ Biometrics updated:\n${JSON.stringify(updates, null, 2)}`,
            }],
            isError: false,
          };

        case "simulate":
          // Simulate biometric changes over time
          const startBiometrics = this.browser.getBiometrics();
          if (!startBiometrics) {
            throw new Error("Biometric mode not active");
          }

          // Simulate stress response
          const stressLevel = startBiometrics.stress;
          const newHeartRate = startBiometrics.heartRate + (stressLevel * 20);
          
          this.browser.updateBiometrics({
            heartRate: newHeartRate,
            stress: Math.min(1, stressLevel + 0.1)
          });

          if (duration) {
            setTimeout(() => {
              // Return to baseline
              this.browser.updateBiometrics(startBiometrics);
            }, duration);
          }

          return {
            content: [{
              type: "text",
              text: `✅ Simulating stress response for ${duration || 5000}ms`,
            }],
            isError: false,
          };

        default:
          throw new Error(`Unknown biometric action: ${action}`);
      }
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Biometric operation failed: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  private async persona(args: any): Promise<CallToolResult> {
    const { action, name, config } = args;

    try {
      switch (action) {
        case "list":
          // List available personas
          const personas = ["focused-scholar", "casual-browser", "stressed-worker", "night-owl", "speed-reader"];
          return {
            content: [{
              type: "text",
              text: `📋 Available personas:\n${personas.map(p => `- ${p}`).join("\n")}`,
            }],
            isError: false,
          };

        case "switch":
          if (!name) {
            throw new Error("Persona name required");
          }
          this.browser.switchPersona(name);
          return {
            content: [{
              type: "text",
              text: `✅ Switched to persona: ${name}`,
            }],
            isError: false,
          };

        case "info":
          return {
            content: [{
              type: "text",
              text: `📊 Current persona info:\n${JSON.stringify({
                mode: "consciousness",
                features: ["Multiple personas", "Hip hop consciousness", "Flow mathematics"]
              }, null, 2)}`,
            }],
            isError: false,
          };

        default:
          throw new Error(`Unknown persona action: ${action}`);
      }
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Persona operation failed: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  private async simulateFatigue(args: any): Promise<CallToolResult> {
    const { duration = 30, startFatigue = 0, endFatigue = 0.8 } = args;

    try {
      const biometrics = this.browser.getBiometrics();
      if (!biometrics) {
        throw new Error("Biometric mode required for fatigue simulation");
      }

      const steps = 10;
      const stepDuration = (duration * 60000) / steps;
      const fatigueIncrement = (endFatigue - startFatigue) / steps;

      let currentFatigue = startFatigue;

      // Simulate gradual fatigue buildup
      const interval = setInterval(() => {
        currentFatigue += fatigueIncrement;
        
        // Fatigue affects multiple biometrics
        this.browser.updateBiometrics({
          fatigueFactor: currentFatigue,
          attention: Math.max(0.3, 1 - currentFatigue),
          stress: Math.min(0.9, biometrics.stress + currentFatigue * 0.3),
          // Typing speed decreases with fatigue
          typingSpeed: Math.max(40, 80 - currentFatigue * 40)
        });

        if (currentFatigue >= endFatigue) {
          clearInterval(interval);
        }
      }, stepDuration);

      return {
        content: [{
          type: "text",
          text: `✅ Simulating fatigue over ${duration} minutes\nStart: ${startFatigue}\nEnd: ${endFatigue}`,
        }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Fatigue simulation failed: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }
}