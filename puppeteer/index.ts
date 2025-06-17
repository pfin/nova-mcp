#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  CallToolResult,
  TextContent,
  ImageContent,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import puppeteer, { Browser, Page } from "puppeteer";

// Define the tools once to avoid repetition
const TOOLS: Tool[] = [
  {
    name: "puppeteer_navigate",
    description: "Navigate to a URL",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to navigate to" },
        launchOptions: { type: "object", description: "PuppeteerJS LaunchOptions. Default null. If changed and not null, browser restarts. Example: { headless: true, args: ['--no-sandbox'] }" },
        allowDangerous: { type: "boolean", description: "Allow dangerous LaunchOptions that reduce security. When false, dangerous args like --no-sandbox will throw errors. Default true." },
      },
      required: ["url"],
    },
  },
  {
    name: "puppeteer_screenshot",
    description: "Take a screenshot of the current page or a specific element",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name for the screenshot" },
        selector: { type: "string", description: "CSS selector for element to screenshot" },
        width: { type: "number", description: "Width in pixels (default: 800)" },
        height: { type: "number", description: "Height in pixels (default: 600)" },
        encoded: { type: "boolean", description: "If true, capture the screenshot as a base64-encoded data URI (as text) instead of binary image content. Default false." },
      },
      required: ["name"],
    },
  },
  {
    name: "puppeteer_click",
    description: "Click an element on the page",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for element to click" },
      },
      required: ["selector"],
    },
  },
  {
    name: "puppeteer_fill",
    description: "Fill out an input field",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for input field" },
        value: { type: "string", description: "Value to fill" },
      },
      required: ["selector", "value"],
    },
  },
  {
    name: "puppeteer_select",
    description: "Select an element on the page with Select tag",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for element to select" },
        value: { type: "string", description: "Value to select" },
      },
      required: ["selector", "value"],
    },
  },
  {
    name: "puppeteer_hover",
    description: "Hover an element on the page",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for element to hover" },
      },
      required: ["selector"],
    },
  },
  {
    name: "puppeteer_evaluate",
    description: "Execute JavaScript in the browser console",
    inputSchema: {
      type: "object",
      properties: {
        script: { type: "string", description: "JavaScript code to execute" },
      },
      required: ["script"],
    },
  },
  {
    name: "puppeteer_google_search",
    description: "Search Google and return top 10 results with URLs and descriptions",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        limit: { type: "number", description: "Number of results to return (default: 10, max: 10)" },
      },
      required: ["query"],
    },
  },
];

// Global state
let browser: Browser | null;
let page: Page | null;
const consoleLogs: string[] = [];
const screenshots = new Map<string, string>();
let previousLaunchOptions: any = null;

async function ensureBrowser({ launchOptions, allowDangerous }: any) {

  const DANGEROUS_ARGS = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--single-process',
    '--disable-web-security',
    '--ignore-certificate-errors',
    '--disable-features=IsolateOrigins',
    '--disable-site-isolation-trials',
    '--allow-running-insecure-content'
  ];

  // Parse environment config safely
  let envConfig = {};
  try {
    envConfig = JSON.parse(process.env.PUPPETEER_LAUNCH_OPTIONS || '{}');
  } catch (error: any) {
    console.warn('Failed to parse PUPPETEER_LAUNCH_OPTIONS:', error?.message || error);
  }

  // Deep merge environment config with user-provided options
  const mergedConfig = deepMerge(envConfig, launchOptions || {});

  // Security validation for merged config
  if (mergedConfig?.args) {
    const dangerousArgs = mergedConfig.args?.filter?.((arg: string) => DANGEROUS_ARGS.some((dangerousArg: string) => arg.startsWith(dangerousArg)));
    // Default allowDangerous to true if not explicitly set to false
    const isDangerousAllowed = allowDangerous !== false && process.env.ALLOW_DANGEROUS !== 'false';
    if (dangerousArgs?.length > 0 && !isDangerousAllowed) {
      throw new Error(`Dangerous browser arguments detected: ${dangerousArgs.join(', ')}. Found from environment variable and tool call argument. ` +
        'Set allowDangerous: false explicitly to enforce security restrictions.');
    }
  }

  try {
    if ((browser && !browser.connected) ||
      (launchOptions && (JSON.stringify(launchOptions) != JSON.stringify(previousLaunchOptions)))) {
      await browser?.close();
      browser = null;
    }
  }
  catch (error) {
    browser = null;
  }

  previousLaunchOptions = launchOptions;

  if (!browser) {
    const npx_args = { headless: true, args: ["--no-sandbox"] }
    const docker_args = { headless: true, args: ["--no-sandbox", "--single-process", "--no-zygote"] }
    browser = await puppeteer.launch(deepMerge(
      process.env.DOCKER_CONTAINER ? docker_args : npx_args,
      mergedConfig
    ));
    const pages = await browser.pages();
    page = pages[0];

    page.on("console", (msg) => {
      const logEntry = `[${msg.type()}] ${msg.text()}`;
      consoleLogs.push(logEntry);
      server.notification({
        method: "notifications/resources/updated",
        params: { uri: "console://logs" },
      });
    });
  }
  return page!;
}

// Deep merge utility function
function deepMerge(target: any, source: any): any {
  const output = Object.assign({}, target);
  if (typeof target !== 'object' || typeof source !== 'object') return source;

  for (const key of Object.keys(source)) {
    const targetVal = target[key];
    const sourceVal = source[key];
    if (Array.isArray(targetVal) && Array.isArray(sourceVal)) {
      // Deduplicate args/ignoreDefaultArgs, prefer source values
      output[key] = [...new Set([
        ...(key === 'args' || key === 'ignoreDefaultArgs' ?
          targetVal.filter((arg: string) => !sourceVal.some((launchArg: string) => arg.startsWith('--') && launchArg.startsWith(arg.split('=')[0]))) :
          targetVal),
        ...sourceVal
      ])];
    } else if (sourceVal instanceof Object && key in target) {
      output[key] = deepMerge(targetVal, sourceVal);
    } else {
      output[key] = sourceVal;
    }
  }
  return output;
}

// Remove the global declaration since we're using 'as any'

async function handleToolCall(name: string, args: any): Promise<CallToolResult> {
  const page = await ensureBrowser(args);

  switch (name) {
    case "puppeteer_navigate":
      await page.goto(args.url);
      return {
        content: [{
          type: "text",
          text: `Navigated to ${args.url}`,
        }],
        isError: false,
      };

    case "puppeteer_screenshot": {
      const width = args.width ?? 800;
      const height = args.height ?? 600;
      const encoded = args.encoded ?? false;
      await page.setViewport({ width, height });

      const screenshot = await (args.selector ?
        (await page.$(args.selector))?.screenshot({ encoding: "base64" }) :
        page.screenshot({ encoding: "base64", fullPage: false }));

      if (!screenshot) {
        return {
          content: [{
            type: "text",
            text: args.selector ? `Element not found: ${args.selector}` : "Screenshot failed",
          }],
          isError: true,
        };
      }

      screenshots.set(args.name, screenshot as string);
      server.notification({
        method: "notifications/resources/list_changed",
      });

      return {
        content: [
          {
            type: "text",
            text: `Screenshot '${args.name}' taken at ${width}x${height}`,
          } as TextContent,
          encoded ? ({
            type: "text",
            text: `data:image/png;base64,${screenshot}`,
          } as TextContent) : ({
            type: "image",
            data: screenshot,
            mimeType: "image/png",
          } as ImageContent),
        ],
        isError: false,
      };
    }

    case "puppeteer_click":
      try {
        await page.click(args.selector);
        return {
          content: [{
            type: "text",
            text: `Clicked: ${args.selector}`,
          }],
          isError: false,
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to click ${args.selector}: ${(error as Error).message}`,
          }],
          isError: true,
        };
      }

    case "puppeteer_fill":
      try {
        await page.waitForSelector(args.selector);
        await page.type(args.selector, args.value);
        return {
          content: [{
            type: "text",
            text: `Filled ${args.selector} with: ${args.value}`,
          }],
          isError: false,
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to fill ${args.selector}: ${(error as Error).message}`,
          }],
          isError: true,
        };
      }

    case "puppeteer_select":
      try {
        await page.waitForSelector(args.selector);
        await page.select(args.selector, args.value);
        return {
          content: [{
            type: "text",
            text: `Selected ${args.selector} with: ${args.value}`,
          }],
          isError: false,
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to select ${args.selector}: ${(error as Error).message}`,
          }],
          isError: true,
        };
      }

    case "puppeteer_hover":
      try {
        await page.waitForSelector(args.selector);
        await page.hover(args.selector);
        return {
          content: [{
            type: "text",
            text: `Hovered ${args.selector}`,
          }],
          isError: false,
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to hover ${args.selector}: ${(error as Error).message}`,
          }],
          isError: true,
        };
      }

    case "puppeteer_evaluate":
      try {
        // Set up console capture in browser context
        await page.evaluate(() => {
          const w = globalThis as any;
          w.mcpHelper = {
            logs: [],
            originalConsole: { ...console },
          };

          ['log', 'info', 'warn', 'error'].forEach(method => {
            (console as any)[method] = (...args: any[]) => {
              w.mcpHelper.logs.push(`[${method}] ${args.join(' ')}`);
              (w.mcpHelper.originalConsole as any)[method](...args);
            };
          });
        });

        const result = await page.evaluate(args.script);

        // Restore console and get logs
        const logs = await page.evaluate(() => {
          const w = globalThis as any;
          Object.assign(console, w.mcpHelper.originalConsole);
          const logs = w.mcpHelper.logs;
          delete w.mcpHelper;
          return logs;
        });

        return {
          content: [
            {
              type: "text",
              text: `Execution result:\n${JSON.stringify(result, null, 2)}\n\nConsole output:\n${logs.join('\n')}`,
            },
          ],
          isError: false,
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Script execution failed: ${(error as Error).message}`,
          }],
          isError: true,
        };
      }

    case "puppeteer_google_search":
      try {
        // Navigate to Google with a more human-like approach
        await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded' });
        
        // Wait a bit to appear more human-like
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if we hit a CAPTCHA
        const hasCaptcha = await page.$('iframe[src*="recaptcha"]') !== null;
        if (hasCaptcha) {
          return {
            content: [{
              type: "text",
              text: `Google is showing a CAPTCHA. This often happens with automated browsers. Try using a different search approach or navigate manually first.`,
            }],
            isError: true,
          };
        }
        
        // Find search box - try multiple selectors
        const searchBox = await page.$('textarea[name="q"], input[name="q"]');
        if (!searchBox) {
          return {
            content: [{
              type: "text",
              text: `Could not find Google search box. The page structure may have changed.`,
            }],
            isError: true,
          };
        }
        
        // Click on the search box first
        await searchBox.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Type slowly to appear more human-like
        await page.type('textarea[name="q"], input[name="q"]', args.query, { delay: 100 });
        
        // Wait a moment before submitting
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Submit search
        await page.keyboard.press('Enter');
        
        // Wait for navigation and results with multiple possible selectors
        await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check again for CAPTCHA after navigation
        const postSearchCaptcha = await page.$('iframe[src*="recaptcha"]') !== null;
        if (postSearchCaptcha) {
          return {
            content: [{
              type: "text",
              text: `Google showed a CAPTCHA after search. This is common with automated browsers. Consider using the regular navigation tools to browse Google manually.`,
            }],
            isError: true,
          };
        }
        
        // Try to wait for search results with a more flexible approach
        try {
          await page.waitForSelector('#search, #rso, [data-async-context]', { timeout: 5000 });
        } catch (e) {
          // If selectors fail, continue anyway and try to extract what we can
        }
        
        // Scroll to load more results
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Extract search results with more flexible selectors
        const results = await page.evaluate((limitParam) => {
          const limit = Math.min(limitParam || 10, 10);
          const searchResults = [];
          const seenUrls = new Set(); // To avoid duplicates
          
          // First, try to get regular search results
          const regularResults = document.querySelectorAll('div.g:not(.related-question-pair)');
          
          for (let i = 0; i < regularResults.length; i++) {
            const element = regularResults[i];
            if (searchResults.length >= limit) break;
            
            // Skip if this is a "People also ask" section
            if (element.closest('.related-question-pair')) continue;
            
            const titleElement = element.querySelector('h3');
            const linkElement = element.querySelector('a[href^="http"]:not([href*="google.com"])') as HTMLAnchorElement;
            
            if (titleElement && linkElement && !seenUrls.has(linkElement.href)) {
              seenUrls.add(linkElement.href);
              
              // Try multiple selectors for description
              const descriptionElement = element.querySelector('.VwiC3b, .yXK7lf, .IsZvec, .aCOpRe span, .lEBKkf, span[style*="-webkit-line-clamp"]');
              
              searchResults.push({
                title: titleElement.textContent?.trim() || '',
                url: linkElement.href || '',
                description: descriptionElement?.textContent?.trim() || '',
                position: searchResults.length + 1
              });
            }
          }
          
          // If we didn't get enough results, try alternative selectors
          if (searchResults.length < limit) {
            const alternativeContainers = document.querySelectorAll('[data-hveid]:has(h3):has(a[href^="http"])');
            
            for (let i = 0; i < alternativeContainers.length; i++) {
              const element = alternativeContainers[i];
              if (searchResults.length >= limit) break;
              
              const titleElement = element.querySelector('h3');
              const linkElement = element.querySelector('a[href^="http"]:not([href*="google.com"])') as HTMLAnchorElement;
              
              if (titleElement && linkElement && !seenUrls.has(linkElement.href)) {
                seenUrls.add(linkElement.href);
                
                const descriptionElement = element.querySelector('.VwiC3b, .yXK7lf, span[style*="-webkit-line-clamp"]');
                
                searchResults.push({
                  title: titleElement.textContent?.trim() || '',
                  url: linkElement.href || '',
                  description: descriptionElement?.textContent?.trim() || '',
                  position: searchResults.length + 1
                });
              }
            }
          }
          
          return searchResults;
        }, args.limit);
        
        if (results.length === 0) {
          return {
            content: [{
              type: "text",
              text: `No search results found for "${args.query}". This could be due to:\n- Google blocking automated searches\n- Page structure changes\n- CAPTCHA interference\n\nTry using the navigate, fill, and click tools manually for more control.`,
            }],
            isError: false,
          };
        }
        
        return {
          content: [{
            type: "text",
            text: `Google search for "${args.query}" returned ${results.length} results:\n\n${
              results.map(r => 
                `${r.position}. **${r.title}**\n   URL: ${r.url}\n   ${r.description ? `Description: ${r.description}\n` : ''}`
              ).join('\n')
            }`,
          }],
          isError: false,
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Google search failed: ${(error as Error).message}\n\nThis often happens due to anti-automation measures. Consider using the manual navigation tools instead.`,
          }],
          isError: true,
        };
      }

    default:
      return {
        content: [{
          type: "text",
          text: `Unknown tool: ${name}`,
        }],
        isError: true,
      };
  }
}

const server = new Server(
  {
    name: "example-servers/puppeteer",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  },
);


// Setup request handlers
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: "console://logs",
      mimeType: "text/plain",
      name: "Browser console logs",
    },
    ...Array.from(screenshots.keys()).map(name => ({
      uri: `screenshot://${name}`,
      mimeType: "image/png",
      name: `Screenshot: ${name}`,
    })),
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri.toString();

  if (uri === "console://logs") {
    return {
      contents: [{
        uri,
        mimeType: "text/plain",
        text: consoleLogs.join("\n"),
      }],
    };
  }

  if (uri.startsWith("screenshot://")) {
    const name = uri.split("://")[1];
    const screenshot = screenshots.get(name);
    if (screenshot) {
      return {
        contents: [{
          uri,
          mimeType: "image/png",
          blob: screenshot,
        }],
      };
    }
  }

  throw new Error(`Resource not found: ${uri}`);
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) =>
  handleToolCall(request.params.name, request.params.arguments ?? {})
);

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

runServer().catch(console.error);

process.stdin.on("close", () => {
  console.error("Puppeteer MCP Server closed");
  server.close();
});