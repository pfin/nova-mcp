import { CallToolResult, TextContent, ImageContent } from "@modelcontextprotocol/sdk/types.js";
import { NovaBrowser } from "./nova-browser.js";
import { Page, ElementHandle } from "playwright";

export class NovaTools {
  private browser: NovaBrowser;

  constructor(browser: NovaBrowser) {
    this.browser = browser;
  }

  async execute(toolName: string, args: any): Promise<CallToolResult> {
    await this.browser.ensureInitialized();

    switch (toolName) {
      // Navigation
      case "nova_navigate":
        return this.navigate(args);
      case "nova_go_back":
        return this.goBack(args);
      case "nova_go_forward":
        return this.goForward(args);
      case "nova_reload":
        return this.reload(args);
        
      // Waiting
      case "nova_wait_for_element":
        return this.waitForElement(args);
      case "nova_wait_for_text":
        return this.waitForText(args);
      case "nova_wait_until_loaded":
        return this.waitUntilLoaded(args);
        
      // Element state checking
      case "nova_element_exists":
        return this.elementExists(args);
      case "nova_element_visible":
        return this.elementVisible(args);
      case "nova_element_count":
        return this.elementCount(args);
        
      // Debugging
      case "nova_get_page_errors":
        return this.getPageErrors();
      case "nova_get_network_status":
        return this.getNetworkStatus(args);
      case "nova_get_page_state":
        return this.getPageState();
        
      // Interaction
      case "nova_click":
        return this.click(args);
      case "nova_type":
        return this.type(args);
      case "nova_fill":
        return this.fill(args);
      case "nova_press":
        return this.press(args);
      case "nova_hover":
        return this.hover(args);
      case "nova_scroll":
        return this.scroll(args);
      case "nova_select":
        return this.select(args);
        
      // Data extraction
      case "nova_screenshot":
        return this.screenshot(args);
      case "nova_evaluate":
        return this.evaluate(args);
      case "nova_extract":
        return this.extract(args);
        
      // Browser control
      case "nova_set_viewport":
        return this.setViewport(args);
      case "nova_get_cookies":
        return this.getCookies(args);
      case "nova_set_cookie":
        return this.setCookie(args);
      case "nova_clear_cookies":
        return this.clearCookies();
        
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  // Navigation tools
  private async navigate(args: any): Promise<CallToolResult> {
    const page = this.browser.getPage();
    if (!page) throw new Error("Browser not initialized");

    const { url, waitUntil = "networkidle", timeout = 30000 } = args;

    try {
      const response = await page.goto(url, { waitUntil, timeout });
      const status = response ? response.status() : 'unknown';
      
      return {
        content: [{
          type: "text",
          text: `✅ Navigated to ${url} (status: ${status})`,
        }],
        isError: false,
      };
    } catch (error) {
      return this.errorResult(`Navigation failed`, error);
    }
  }

  private async goBack(args: any): Promise<CallToolResult> {
    const page = this.browser.getPage();
    if (!page) throw new Error("Browser not initialized");

    const { waitUntil = "networkidle" } = args;

    try {
      await page.goBack({ waitUntil });
      return {
        content: [{
          type: "text",
          text: `✅ Navigated back to ${page.url()}`,
        }],
        isError: false,
      };
    } catch (error) {
      return this.errorResult(`Go back failed`, error);
    }
  }

  private async goForward(args: any): Promise<CallToolResult> {
    const page = this.browser.getPage();
    if (!page) throw new Error("Browser not initialized");

    const { waitUntil = "networkidle" } = args;

    try {
      await page.goForward({ waitUntil });
      return {
        content: [{
          type: "text",
          text: `✅ Navigated forward to ${page.url()}`,
        }],
        isError: false,
      };
    } catch (error) {
      return this.errorResult(`Go forward failed`, error);
    }
  }

  private async reload(args: any): Promise<CallToolResult> {
    const page = this.browser.getPage();
    if (!page) throw new Error("Browser not initialized");

    const { waitUntil = "networkidle" } = args;

    try {
      await page.reload({ waitUntil });
      return {
        content: [{
          type: "text",
          text: `✅ Page reloaded`,
        }],
        isError: false,
      };
    } catch (error) {
      return this.errorResult(`Reload failed`, error);
    }
  }

  // Waiting tools
  private async waitForElement(args: any): Promise<CallToolResult> {
    const page = this.browser.getPage();
    if (!page) throw new Error("Browser not initialized");

    const { selector, state = "visible", timeout = 30000 } = args;

    try {
      await page.waitForSelector(selector, { state, timeout });
      return {
        content: [{
          type: "text",
          text: `✅ Element "${selector}" is ${state}`,
        }],
        isError: false,
      };
    } catch (error) {
      return this.errorResult(`Wait for element failed`, error);
    }
  }

  private async waitForText(args: any): Promise<CallToolResult> {
    const page = this.browser.getPage();
    if (!page) throw new Error("Browser not initialized");

    const { text, selector, timeout = 30000 } = args;

    try {
      if (selector) {
        await page.waitForSelector(`${selector}:has-text("${text}")`, { timeout });
      } else {
        await page.waitForSelector(`text=${text}`, { timeout });
      }
      return {
        content: [{
          type: "text",
          text: `✅ Text "${text}" found on page`,
        }],
        isError: false,
      };
    } catch (error) {
      return this.errorResult(`Wait for text failed`, error);
    }
  }

  private async waitUntilLoaded(args: any): Promise<CallToolResult> {
    const page = this.browser.getPage();
    if (!page) throw new Error("Browser not initialized");

    const { timeout = 30000, checkNetworkIdle = true } = args;

    try {
      // Wait for DOM to be ready
      await page.waitForLoadState('domcontentloaded', { timeout: timeout / 2 });
      
      // Wait for network to be idle if requested
      if (checkNetworkIdle) {
        await page.waitForLoadState('networkidle', { timeout: timeout / 2 });
      }
      
      // Additional check for common loading indicators
      try {
        await page.waitForSelector('[class*="loading"], [class*="spinner"], [class*="loader"]', {
          state: 'hidden',
          timeout: 5000
        });
      } catch {
        // Ignore if no loading indicators found
      }
      
      return {
        content: [{
          type: "text",
          text: `✅ Page fully loaded`,
        }],
        isError: false,
      };
    } catch (error) {
      return this.errorResult(`Wait until loaded failed`, error);
    }
  }

  // Element state checking
  private async elementExists(args: any): Promise<CallToolResult> {
    const page = this.browser.getPage();
    if (!page) throw new Error("Browser not initialized");

    const { selector } = args;

    try {
      const exists = await page.$(selector) !== null;
      return {
        content: [{
          type: "text",
          text: exists ? `✅ Element "${selector}" exists` : `❌ Element "${selector}" does not exist`,
        }],
        isError: false,
      };
    } catch (error) {
      return this.errorResult(`Element exists check failed`, error);
    }
  }

  private async elementVisible(args: any): Promise<CallToolResult> {
    const page = this.browser.getPage();
    if (!page) throw new Error("Browser not initialized");

    const { selector } = args;

    try {
      const element = await page.$(selector);
      if (!element) {
        return {
          content: [{
            type: "text",
            text: `❌ Element "${selector}" does not exist`,
          }],
          isError: false,
        };
      }
      
      const isVisible = await element.isVisible();
      return {
        content: [{
          type: "text",
          text: isVisible ? `✅ Element "${selector}" is visible` : `❌ Element "${selector}" is not visible`,
        }],
        isError: false,
      };
    } catch (error) {
      return this.errorResult(`Element visible check failed`, error);
    }
  }

  private async elementCount(args: any): Promise<CallToolResult> {
    const page = this.browser.getPage();
    if (!page) throw new Error("Browser not initialized");

    const { selector } = args;

    try {
      const elements = await page.$$(selector);
      const count = elements.length;
      return {
        content: [{
          type: "text",
          text: `📊 Found ${count} element${count !== 1 ? 's' : ''} matching "${selector}"`,
        }],
        isError: false,
      };
    } catch (error) {
      return this.errorResult(`Element count failed`, error);
    }
  }

  // Debugging tools
  private async getPageErrors(): Promise<CallToolResult> {
    const errors = this.browser.getPageErrors();
    return {
      content: [{
        type: "text",
        text: errors.length > 0 
          ? `❌ Page errors:\n${errors.join('\n')}`
          : `✅ No page errors`,
      }],
      isError: false,
    };
  }

  private async getNetworkStatus(args: any): Promise<CallToolResult> {
    const { includeAll = false } = args;
    const networkLog = this.browser.getNetworkLog();
    
    const failedRequests = networkLog.filter(entry => 
      entry.type === 'failed' || (entry.type === 'response' && entry.status >= 400)
    );
    
    const logsToShow = includeAll ? networkLog : failedRequests;
    
    return {
      content: [{
        type: "text",
        text: logsToShow.length > 0
          ? `📊 Network requests:\n${JSON.stringify(logsToShow, null, 2)}`
          : `✅ No ${includeAll ? '' : 'failed '}network requests`,
      }],
      isError: false,
    };
  }

  private async getPageState(): Promise<CallToolResult> {
    const page = this.browser.getPage();
    if (!page) throw new Error("Browser not initialized");

    try {
      const [url, title, readyState] = await Promise.all([
        page.url(),
        page.title(),
        page.evaluate(() => document.readyState),
      ]);
      
      const viewport = page.viewportSize();
      
      return {
        content: [{
          type: "text",
          text: `📊 Page State:
URL: ${url}
Title: ${title}
Ready State: ${readyState}
Viewport: ${viewport ? `${viewport.width}x${viewport.height}` : 'default'}`,
        }],
        isError: false,
      };
    } catch (error) {
      return this.errorResult(`Get page state failed`, error);
    }
  }

  // Interaction tools
  private async click(args: any): Promise<CallToolResult> {
    const page = this.browser.getPage();
    if (!page) throw new Error("Browser not initialized");

    const { selector, humanize = true, button = "left", clickCount = 1 } = args;

    try {
      const element = await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }

      if (humanize) {
        // Move mouse to element with human-like curve
        const box = await element.boundingBox();
        if (box) {
          const x = box.x + box.width / 2;
          const y = box.y + box.height / 2;
          
          // Human-like movement
          await page.mouse.move(x, y, { steps: 10 });
          await this.randomDelay(100, 300);
        }
      }

      await element.click({ button, clickCount, delay: humanize ? 50 : 0 });
      
      return {
        content: [{
          type: "text",
          text: `✅ Clicked ${selector}`,
        }],
        isError: false,
      };
    } catch (error) {
      return this.errorResult(`Click failed`, error);
    }
  }

  private async type(args: any): Promise<CallToolResult> {
    const page = this.browser.getPage();
    if (!page) throw new Error("Browser not initialized");

    const { selector, text, delay = 100, clearFirst = true, pressEnter = false } = args;

    try {
      const element = await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }

      if (clearFirst) {
        await element.click({ clickCount: 3 }); // Triple click to select all
        await page.keyboard.press('Delete');
      }

      await element.type(text, { delay });

      if (pressEnter) {
        await this.randomDelay(300, 500);
        await page.keyboard.press('Enter');
      }

      return {
        content: [{
          type: "text",
          text: `✅ Typed "${text}" into ${selector}`,
        }],
        isError: false,
      };
    } catch (error) {
      return this.errorResult(`Type failed`, error);
    }
  }

  private async fill(args: any): Promise<CallToolResult> {
    const page = this.browser.getPage();
    if (!page) throw new Error("Browser not initialized");

    const { selector, value } = args;

    try {
      await page.fill(selector, value);
      return {
        content: [{
          type: "text",
          text: `✅ Filled ${selector} with "${value}"`,
        }],
        isError: false,
      };
    } catch (error) {
      return this.errorResult(`Fill failed`, error);
    }
  }

  private async press(args: any): Promise<CallToolResult> {
    const page = this.browser.getPage();
    if (!page) throw new Error("Browser not initialized");

    const { key } = args;

    try {
      await page.keyboard.press(key);
      return {
        content: [{
          type: "text",
          text: `✅ Pressed ${key}`,
        }],
        isError: false,
      };
    } catch (error) {
      return this.errorResult(`Press key failed`, error);
    }
  }

  private async hover(args: any): Promise<CallToolResult> {
    const page = this.browser.getPage();
    if (!page) throw new Error("Browser not initialized");

    const { selector, duration = 1000 } = args;

    try {
      await page.hover(selector);
      await this.randomDelay(duration * 0.8, duration * 1.2);
      
      return {
        content: [{
          type: "text",
          text: `✅ Hovered over ${selector}`,
        }],
        isError: false,
      };
    } catch (error) {
      return this.errorResult(`Hover failed`, error);
    }
  }

  private async scroll(args: any): Promise<CallToolResult> {
    const page = this.browser.getPage();
    if (!page) throw new Error("Browser not initialized");

    const { direction, amount = 300 } = args;

    try {
      if (direction === "down") {
        await page.mouse.wheel(0, amount);
      } else if (direction === "up") {
        await page.mouse.wheel(0, -amount);
      } else if (direction === "to") {
        await page.evaluate((y) => window.scrollTo(0, y), amount);
      }

      return {
        content: [{
          type: "text",
          text: `✅ Scrolled ${direction} ${amount}px`,
        }],
        isError: false,
      };
    } catch (error) {
      return this.errorResult(`Scroll failed`, error);
    }
  }

  private async select(args: any): Promise<CallToolResult> {
    const page = this.browser.getPage();
    if (!page) throw new Error("Browser not initialized");

    const { selector, value, byLabel = false } = args;

    try {
      if (byLabel) {
        await page.selectOption(selector, { label: value });
      } else {
        await page.selectOption(selector, value);
      }
      
      return {
        content: [{
          type: "text",
          text: `✅ Selected "${value}" in ${selector}`,
        }],
        isError: false,
      };
    } catch (error) {
      return this.errorResult(`Select failed`, error);
    }
  }

  // Data extraction
  private async screenshot(args: any): Promise<CallToolResult> {
    const page = this.browser.getPage();
    if (!page) throw new Error("Browser not initialized");

    const { name, selector, fullPage = false } = args;

    try {
      let screenshot: Buffer;
      
      if (selector) {
        const element = await page.$(selector);
        if (!element) {
          throw new Error(`Element not found: ${selector}`);
        }
        screenshot = await element.screenshot();
      } else {
        screenshot = await page.screenshot({ fullPage });
      }

      const base64 = screenshot.toString('base64');
      this.browser.addScreenshot(name, base64);

      return {
        content: [
          {
            type: "text",
            text: `✅ Screenshot saved as "${name}"`,
          } as TextContent,
          {
            type: "image",
            data: base64,
            mimeType: "image/png",
          } as ImageContent,
        ],
        isError: false,
      };
    } catch (error) {
      return this.errorResult(`Screenshot failed`, error);
    }
  }

  private async evaluate(args: any): Promise<CallToolResult> {
    const page = this.browser.getPage();
    if (!page) throw new Error("Browser not initialized");

    const { script, arg } = args;

    try {
      // Wrap the script to support return statements
      const wrappedScript = `
        (${arg !== undefined ? 'arg' : ''}) => {
          ${script}
        }
      `;
      
      const result = arg !== undefined 
        ? await page.evaluate(wrappedScript, arg)
        : await page.evaluate(wrappedScript);

      return {
        content: [{
          type: "text",
          text: `✅ Script executed:\n${JSON.stringify(result, null, 2)}`,
        }],
        isError: false,
      };
    } catch (error) {
      // Provide better error messages
      let errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('SyntaxError')) {
        errorMessage += '\n\nTip: Make sure your JavaScript syntax is valid. Use return statements to return values.';
      } else if (errorMessage.includes('ReferenceError')) {
        errorMessage += '\n\nTip: Make sure all variables are defined. Browser context variables are accessible.';
      }
      
      return this.errorResult(`Evaluate failed`, new Error(errorMessage));
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
          const elements = await page.$$(selector);
          results[key] = await Promise.all(
            elements.map(el => this.extractElementData(el, attributes))
          );
        } else {
          const element = await page.$(selector);
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
      return this.errorResult(`Extract failed`, error);
    }
  }

  // Browser control
  private async setViewport(args: any): Promise<CallToolResult> {
    const page = this.browser.getPage();
    if (!page) throw new Error("Browser not initialized");

    const { width, height } = args;

    try {
      await page.setViewportSize({ width, height });
      return {
        content: [{
          type: "text",
          text: `✅ Viewport set to ${width}x${height}`,
        }],
        isError: false,
      };
    } catch (error) {
      return this.errorResult(`Set viewport failed`, error);
    }
  }

  private async getCookies(args: any): Promise<CallToolResult> {
    const context = this.browser.getContext();
    if (!context) throw new Error("Browser not initialized");

    const { urls } = args;

    try {
      const cookies = await context.cookies(urls);
      return {
        content: [{
          type: "text",
          text: `✅ Retrieved ${cookies.length} cookies:\n${JSON.stringify(cookies, null, 2)}`,
        }],
        isError: false,
      };
    } catch (error) {
      return this.errorResult(`Get cookies failed`, error);
    }
  }

  private async setCookie(args: any): Promise<CallToolResult> {
    const context = this.browser.getContext();
    if (!context) throw new Error("Browser not initialized");

    try {
      await context.addCookies([args]);
      return {
        content: [{
          type: "text",
          text: `✅ Cookie "${args.name}" set`,
        }],
        isError: false,
      };
    } catch (error) {
      return this.errorResult(`Set cookie failed`, error);
    }
  }

  private async clearCookies(): Promise<CallToolResult> {
    const context = this.browser.getContext();
    if (!context) throw new Error("Browser not initialized");

    try {
      await context.clearCookies();
      return {
        content: [{
          type: "text",
          text: `✅ All cookies cleared`,
        }],
        isError: false,
      };
    } catch (error) {
      return this.errorResult(`Clear cookies failed`, error);
    }
  }

  // Helper methods
  private async randomDelay(min: number, max: number): Promise<void> {
    const delay = min + Math.random() * (max - min);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private async extractElementData(element: ElementHandle, attributes: string[]): Promise<any> {
    return element.evaluate((el, attrs) => {
      const elem = el as Element;
      const data: any = {
        text: elem.textContent?.trim() || "",
      };
      
      if (elem.tagName === 'A') {
        data.href = (elem as HTMLAnchorElement).href;
      }
      
      attrs.forEach(attr => {
        data[attr] = elem.getAttribute(attr);
      });
      
      return data;
    }, attributes);
  }

  private errorResult(context: string, error: unknown): CallToolResult {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: "text",
        text: `❌ ${context}: ${message}`,
      }],
      isError: true,
    };
  }
}