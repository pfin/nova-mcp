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
  mode: (process.env.NOVA_MODE as any) || "stealth",
  headless: process.env.NOVA_HEADLESS === "true",
  remotePort: parseInt(process.env.NOVA_REMOTE_PORT || "9225"),
  userDataDir: process.env.NOVA_USER_DATA_DIR,
  proxy: process.env.NOVA_PROXY,
  biometrics: process.env.NOVA_BIOMETRICS ? JSON.parse(process.env.NOVA_BIOMETRICS) : undefined,
  persona: process.env.NOVA_PERSONA,
});

// Initialize tools
const novaTools = new NovaTools(novaBrowser);

// Define available tools
const TOOLS: Tool[] = [
  {
    name: "nova_navigate",
    description: "Navigate to a URL with stealth mode and human-like behavior",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to navigate to" },
        mode: { 
          type: "string", 
          enum: ["stealth", "performance", "debug", "biometric", "consciousness"],
          description: "Navigation mode (default: stealth)" 
        },
        waitUntil: {
          type: "string",
          enum: ["load", "domcontentloaded", "networkidle0", "networkidle2"],
          description: "Wait condition (default: networkidle2)"
        },
        humanDelay: { type: "boolean", description: "Add human-like delays (default: true)" },
      },
      required: ["url"],
    },
  },
  {
    name: "nova_click",
    description: "Click an element with human-like mouse movement",
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
        wpm: { type: "number", description: "Words per minute (default: 80)" },
        clearFirst: { type: "boolean", description: "Clear field before typing (default: true)" },
        pressEnter: { type: "boolean", description: "Press Enter after typing (default: false)" },
      },
      required: ["selector", "text"],
    },
  },
  {
    name: "nova_screenshot",
    description: "Take a screenshot without triggering detection",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name for the screenshot" },
        selector: { type: "string", description: "CSS selector for element to screenshot" },
        fullPage: { type: "boolean", description: "Capture full page (default: false)" },
        quality: { type: "number", description: "JPEG quality 0-100 (PNG if not specified)" },
      },
      required: ["name"],
    },
  },
  {
    name: "nova_search",
    description: "Search on Google/Bing without triggering anti-bot measures",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        engine: { type: "string", enum: ["google", "bing"], description: "Search engine" },
        limit: { type: "number", description: "Max results to return (default: 10)" },
      },
      required: ["query"],
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
    name: "nova_wait_smart",
    description: "Intelligent waiting with multiple strategies",
    inputSchema: {
      type: "object",
      properties: {
        condition: { 
          type: "string",
          enum: ["networkIdle", "selector", "function", "time"],
          description: "Wait condition type"
        },
        value: { type: "string", description: "Selector, function body, or time in ms" },
        maxWait: { type: "number", description: "Maximum wait time in ms (default: 30000)" },
      },
      required: ["condition"],
    },
  },
  {
    name: "nova_session",
    description: "Manage browser sessions and fingerprints",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["save", "load", "clear", "info"],
          description: "Session action"
        },
        name: { type: "string", description: "Session name (for save/load)" },
      },
      required: ["action"],
    },
  },
  {
    name: "nova_evaluate",
    description: "Execute JavaScript in page context with evasion",
    inputSchema: {
      type: "object",
      properties: {
        script: { type: "string", description: "JavaScript code to execute" },
        returnConsole: { type: "boolean", description: "Return console output (default: true)" },
      },
      required: ["script"],
    },
  },
  {
    name: "nova_hover",
    description: "Hover over an element with natural mouse movement",
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
    description: "Scroll page with human-like patterns",
    inputSchema: {
      type: "object",
      properties: {
        direction: { type: "string", enum: ["down", "up", "to"], description: "Scroll direction" },
        amount: { type: "number", description: "Pixels to scroll or target position" },
        smooth: { type: "boolean", description: "Use smooth scrolling (default: true)" },
        humanize: { type: "boolean", description: "Add human-like variations (default: true)" },
      },
      required: ["direction"],
    },
  },
  {
    name: "nova_select",
    description: "Select dropdown option with stealth",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for select element" },
        value: { type: "string", description: "Option value or text to select" },
        byText: { type: "boolean", description: "Select by visible text (default: false)" },
      },
      required: ["selector", "value"],
    },
  },
  {
    name: "nova_biometrics",
    description: "Control browser biometric patterns (heartbeat, breathing, fatigue)",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["get", "update", "simulate"],
          description: "Biometric action"
        },
        updates: {
          type: "object",
          properties: {
            heartRate: { type: "number", description: "BPM (60-100)" },
            breathingRate: { type: "number", description: "Per minute (12-20)" },
            stress: { type: "number", description: "Stress level (0-1)" },
            fatigue: { type: "number", description: "Fatigue level (0-1)" },
            caffeineLevel: { type: "number", description: "Caffeine effect (0-1)" },
          }
        },
        duration: { type: "number", description: "Simulation duration in ms" },
      },
      required: ["action"],
    },
  },
  {
    name: "nova_persona",
    description: "Switch between different browsing personas (consciousness mode)",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["list", "switch", "create", "info"],
          description: "Persona action"
        },
        name: { type: "string", description: "Persona name" },
        config: {
          type: "object",
          description: "Persona configuration for create action"
        },
      },
      required: ["action"],
    },
  },
  {
    name: "nova_simulate_fatigue",
    description: "Simulate gradual fatigue over browsing session",
    inputSchema: {
      type: "object",
      properties: {
        duration: { type: "number", description: "Session duration in minutes" },
        startFatigue: { type: "number", description: "Starting fatigue (0-1)" },
        endFatigue: { type: "number", description: "Ending fatigue (0-1)" },
      },
      required: ["duration"],
    },
  },
];

// Create MCP server
const server = new Server(
  {
    name: "nova-browser",
    version: "0.1.0",
    description: "Stealth browser automation with underground techniques",
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
      uri: "nova://console",
      mimeType: "text/plain",
      name: "Browser console logs",
      description: "All console output from the browser",
    },
    {
      uri: "nova://fingerprint",
      mimeType: "application/json",
      name: "Current browser fingerprint",
      description: "Active browser fingerprint configuration",
    },
    {
      uri: "nova://sessions",
      mimeType: "application/json", 
      name: "Saved sessions",
      description: "List of saved browser sessions",
    },
    ...novaBrowser.getScreenshots().map(name => ({
      uri: `nova://screenshot/${name}`,
      mimeType: "image/png",
      name: `Screenshot: ${name}`,
      description: `Screenshot captured as ${name}`,
    })),
  ],
}));

// Handle resource reading
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri.toString();

  if (uri === "nova://console") {
    return {
      contents: [{
        uri,
        mimeType: "text/plain",
        text: novaBrowser.getConsoleLogs().join("\n"),
      }],
    };
  }

  if (uri === "nova://fingerprint") {
    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify(novaBrowser.getFingerprint(), null, 2),
      }],
    };
  }

  if (uri === "nova://sessions") {
    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify(novaBrowser.getSessions(), null, 2),
      }],
    };
  }

  if (uri.startsWith("nova://screenshot/")) {
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
  
  console.error("🌟 Nova Browser MCP Server started");
  console.error("🎭 Mode:", process.env.NOVA_MODE || "stealth");
  console.error("💪 Hip hop consciousness: We innovate, we don't imitate");
}

// Cleanup on exit
process.on("SIGINT", async () => {
  console.error("\n🎭 Shutting down Nova Browser...");
  await novaBrowser.close();
  process.exit(0);
});

process.stdin.on("close", async () => {
  console.error("\n🎭 Nova Browser MCP Server closed");
  await novaBrowser.close();
  server.close();
});

// Start server
runServer().catch(console.error);