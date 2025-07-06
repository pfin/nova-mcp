#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { NovaBrowser } from "./nova-browser.js";
import { NovaTools } from "./nova-tools.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// Initialize Nova Browser instance
const novaBrowser = new NovaBrowser({
  headless: process.env.NOVA_HEADLESS !== "false",
  stealth: process.env.NOVA_STEALTH !== "false",
  userDataDir: process.env.NOVA_USER_DATA_DIR,
  proxy: process.env.NOVA_PROXY,
  slowMo: process.env.NOVA_SLOW_MO ? parseInt(process.env.NOVA_SLOW_MO) : undefined,
});

// Initialize tools
const novaTools = new NovaTools(novaBrowser);

// Define available tools with all recommended improvements
const TOOLS: Tool[] = [
  {
    name: "nova_navigate",
    description: "Navigate to a URL with optional stealth mode",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to navigate to" },
        waitUntil: {
          type: "string",
          enum: ["load", "domcontentloaded", "networkidle", "commit"],
          description: "Wait condition (default: networkidle)"
        },
        timeout: { type: "number", description: "Navigation timeout in ms (default: 30000)" },
      },
      required: ["url"],
    },
  },
  {
    name: "nova_wait_for_element",
    description: "Wait for an element to appear and optionally be visible",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for element" },
        state: {
          type: "string",
          enum: ["attached", "detached", "visible", "hidden"],
          description: "Element state to wait for (default: visible)"
        },
        timeout: { type: "number", description: "Timeout in ms (default: 30000)" },
      },
      required: ["selector"],
    },
  },
  {
    name: "nova_wait_for_text",
    description: "Wait for specific text to appear on the page",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to wait for" },
        selector: { type: "string", description: "Optional selector to search within" },
        timeout: { type: "number", description: "Timeout in ms (default: 30000)" },
      },
      required: ["text"],
    },
  },
  {
    name: "nova_wait_until_loaded",
    description: "Wait until page is fully loaded with multiple checks",
    inputSchema: {
      type: "object",
      properties: {
        timeout: { type: "number", description: "Timeout in ms (default: 30000)" },
        checkNetworkIdle: { type: "boolean", description: "Wait for network idle (default: true)" },
      },
    },
  },
  {
    name: "nova_element_exists",
    description: "Check if an element exists on the page",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for element" },
      },
      required: ["selector"],
    },
  },
  {
    name: "nova_element_visible",
    description: "Check if an element is visible on the page",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for element" },
      },
      required: ["selector"],
    },
  },
  {
    name: "nova_element_count",
    description: "Count how many elements match a selector",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for elements" },
      },
      required: ["selector"],
    },
  },
  {
    name: "nova_get_page_errors",
    description: "Get all console errors from the page",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "nova_get_network_status",
    description: "Get failed network requests and status",
    inputSchema: {
      type: "object",
      properties: {
        includeAll: { type: "boolean", description: "Include all requests, not just failed (default: false)" },
      },
    },
  },
  {
    name: "nova_get_page_state",
    description: "Get current page state including URL, title, ready state",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "nova_click",
    description: "Click an element with optional human-like behavior",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for element to click" },
        humanize: { type: "boolean", description: "Use human-like movement (default: true)" },
        button: { type: "string", enum: ["left", "right", "middle"], description: "Mouse button" },
        clickCount: { type: "number", description: "Number of clicks (default: 1)" },
      },
      required: ["selector"],
    },
  },
  {
    name: "nova_type",
    description: "Type text with realistic human typing patterns",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for input field" },
        text: { type: "string", description: "Text to type" },
        delay: { type: "number", description: "Delay between keystrokes in ms (default: 100)" },
        clearFirst: { type: "boolean", description: "Clear field before typing (default: true)" },
        pressEnter: { type: "boolean", description: "Press Enter after typing (default: false)" },
      },
      required: ["selector", "text"],
    },
  },
  {
    name: "nova_screenshot",
    description: "Take a screenshot of the page or element",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name for the screenshot" },
        selector: { type: "string", description: "CSS selector for element to screenshot" },
        fullPage: { type: "boolean", description: "Capture full page (default: false)" },
      },
      required: ["name"],
    },
  },
  {
    name: "nova_evaluate",
    description: "Execute JavaScript in the page context",
    inputSchema: {
      type: "object",
      properties: {
        script: { type: "string", description: "JavaScript code to execute (supports return statements)" },
        arg: { description: "Optional argument to pass to the script" },
      },
      required: ["script"],
    },
  },
  {
    name: "nova_extract",
    description: "Extract data from the current page",
    inputSchema: {
      type: "object",
      properties: {
        selectors: { 
          type: "object", 
          description: "Object mapping keys to CSS selectors",
          additionalProperties: { type: "string" }
        },
        multiple: { type: "boolean", description: "Extract multiple elements per selector" },
        attributes: { 
          type: "array", 
          items: { type: "string" },
          description: "Attributes to extract (default: text content)" 
        },
      },
      required: ["selectors"],
    },
  },
  {
    name: "nova_hover",
    description: "Hover over an element",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for element to hover" },
        duration: { type: "number", description: "Hover duration in ms (default: 1000)" },
      },
      required: ["selector"],
    },
  },
  {
    name: "nova_scroll",
    description: "Scroll the page",
    inputSchema: {
      type: "object",
      properties: {
        direction: { type: "string", enum: ["down", "up", "to"], description: "Scroll direction" },
        amount: { type: "number", description: "Pixels to scroll or target position" },
      },
      required: ["direction"],
    },
  },
  {
    name: "nova_select",
    description: "Select dropdown option",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for select element" },
        value: { type: "string", description: "Option value or text to select" },
        byLabel: { type: "boolean", description: "Select by visible label (default: false)" },
      },
      required: ["selector", "value"],
    },
  },
  {
    name: "nova_fill",
    description: "Fill a form field (clears and types)",
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
    name: "nova_press",
    description: "Press keyboard keys",
    inputSchema: {
      type: "object",
      properties: {
        key: { type: "string", description: "Key to press (e.g., 'Enter', 'Tab', 'Control+A')" },
      },
      required: ["key"],
    },
  },
  {
    name: "nova_go_back",
    description: "Navigate back in browser history",
    inputSchema: {
      type: "object",
      properties: {
        waitUntil: {
          type: "string",
          enum: ["load", "domcontentloaded", "networkidle", "commit"],
          description: "Wait condition (default: networkidle)"
        },
      },
    },
  },
  {
    name: "nova_go_forward",
    description: "Navigate forward in browser history",
    inputSchema: {
      type: "object",
      properties: {
        waitUntil: {
          type: "string",
          enum: ["load", "domcontentloaded", "networkidle", "commit"],
          description: "Wait condition (default: networkidle)"
        },
      },
    },
  },
  {
    name: "nova_reload",
    description: "Reload the current page",
    inputSchema: {
      type: "object",
      properties: {
        waitUntil: {
          type: "string",
          enum: ["load", "domcontentloaded", "networkidle", "commit"],
          description: "Wait condition (default: networkidle)"
        },
      },
    },
  },
  {
    name: "nova_set_viewport",
    description: "Set browser viewport size",
    inputSchema: {
      type: "object",
      properties: {
        width: { type: "number", description: "Viewport width" },
        height: { type: "number", description: "Viewport height" },
      },
      required: ["width", "height"],
    },
  },
  {
    name: "nova_get_cookies",
    description: "Get browser cookies",
    inputSchema: {
      type: "object",
      properties: {
        urls: { 
          type: "array",
          items: { type: "string" },
          description: "Filter cookies by URLs"
        },
      },
    },
  },
  {
    name: "nova_set_cookie",
    description: "Set a browser cookie",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Cookie name" },
        value: { type: "string", description: "Cookie value" },
        domain: { type: "string", description: "Cookie domain" },
        path: { type: "string", description: "Cookie path (default: '/')" },
        expires: { type: "number", description: "Expiration timestamp" },
        httpOnly: { type: "boolean", description: "HTTP only cookie" },
        secure: { type: "boolean", description: "Secure cookie" },
        sameSite: { type: "string", enum: ["Strict", "Lax", "None"], description: "Same site policy" },
      },
      required: ["name", "value"],
    },
  },
  {
    name: "nova_clear_cookies",
    description: "Clear browser cookies",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

// Create MCP server
const server = new Server(
  {
    name: "nova-playwright",
    version: "0.1.0",
    description: "Playwright-based browser automation with stealth capabilities",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// Handle resource listing
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: "playwright://console",
      mimeType: "text/plain",
      name: "Browser console logs",
      description: "All console output from the browser",
    },
    {
      uri: "playwright://errors",
      mimeType: "text/plain",
      name: "Page errors",
      description: "JavaScript errors from the page",
    },
    {
      uri: "playwright://network",
      mimeType: "application/json",
      name: "Network requests",
      description: "Network request log",
    },
    ...novaBrowser.getScreenshots().map(name => ({
      uri: `playwright://screenshot/${name}`,
      mimeType: "image/png",
      name: `Screenshot: ${name}`,
      description: `Screenshot captured as ${name}`,
    })),
  ],
}));

// Handle resource reading
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri.toString();

  if (uri === "playwright://console") {
    return {
      contents: [{
        uri,
        mimeType: "text/plain",
        text: novaBrowser.getConsoleLogs().join("\n"),
      }],
    };
  }

  if (uri === "playwright://errors") {
    return {
      contents: [{
        uri,
        mimeType: "text/plain",
        text: novaBrowser.getPageErrors().join("\n"),
      }],
    };
  }

  if (uri === "playwright://network") {
    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify(novaBrowser.getNetworkLog(), null, 2),
      }],
    };
  }

  if (uri.startsWith("playwright://screenshot/")) {
    const name = uri.split("/")[3];
    const screenshot = novaBrowser.getScreenshot(name);
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

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    const result = await novaTools.execute(name, args || {});
    return result;
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
});

// Server lifecycle
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("🎭 Nova Playwright MCP Server started");
  console.error("🔧 Powered by Playwright for superior automation");
}

// Cleanup on exit
process.on("SIGINT", async () => {
  console.error("\n🎭 Shutting down Nova Playwright...");
  await novaBrowser.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await novaBrowser.close();
  process.exit(0);
});

// Start server
runServer().catch(console.error);