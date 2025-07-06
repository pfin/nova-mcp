#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { NovaScraperEngine } from "./scraper-engine.js";
import { ContentAnalyzer } from "./content-analyzer.js";
import { DataStructurer } from "./data-structurer.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// Initialize components
const scraperEngine = new NovaScraperEngine();
const contentAnalyzer = new ContentAnalyzer();
const dataStructurer = new DataStructurer();

// Define available tools
const TOOLS: Tool[] = [
  {
    name: "nova_scrape",
    description: "Smart web scraping with auto-detection and multiple strategies",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to scrape" },
        strategy: { 
          type: "string",
          enum: ["auto", "article", "data", "full"],
          description: "Extraction strategy (default: auto)"
        },
        selectors: {
          type: "object",
          description: "CSS selectors for specific elements",
          additionalProperties: { type: "string" }
        },
        options: {
          type: "object",
          properties: {
            waitFor: { type: "string", description: "Wait for selector or time" },
            screenshot: { type: "boolean", description: "Take screenshot" },
            includeMeta: { type: "boolean", description: "Include metadata" },
          }
        }
      },
      required: ["url"],
    },
  },
  {
    name: "nova_extract_article",
    description: "Extract clean article content using Readability",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Article URL" },
        includeMetadata: { type: "boolean", description: "Include article metadata" },
        format: { 
          type: "string",
          enum: ["markdown", "text", "json"],
          description: "Output format (default: markdown)"
        },
      },
      required: ["url"],
    },
  },
  {
    name: "nova_extract_structured",
    description: "Extract tables, lists, and other structured data",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to extract from" },
        types: {
          type: "array",
          items: { 
            type: "string",
            enum: ["table", "list", "dl", "form", "nav"]
          },
          description: "Types of structures to extract"
        },
        format: {
          type: "string",
          enum: ["json", "csv", "markdown"],
          description: "Output format (default: json)"
        },
      },
      required: ["url"],
    },
  },
  {
    name: "nova_extract_metadata",
    description: "Extract Schema.org, OpenGraph, and other metadata",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to analyze" },
        types: {
          type: "array",
          items: {
            type: "string",
            enum: ["schema", "opengraph", "twitter", "meta", "jsonld"]
          },
          description: "Metadata types to extract"
        },
      },
      required: ["url"],
    },
  },
  {
    name: "nova_extract_links",
    description: "Smart link extraction with categorization",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to extract links from" },
        options: {
          type: "object",
          properties: {
            internal: { type: "boolean", description: "Include internal links" },
            external: { type: "boolean", description: "Include external links" },
            categorize: { type: "boolean", description: "Categorize links by type" },
            followRedirects: { type: "boolean", description: "Follow redirects" },
          }
        },
      },
      required: ["url"],
    },
  },
  {
    name: "nova_extract_images",
    description: "Extract images with context and metadata",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to extract images from" },
        options: {
          type: "object",
          properties: {
            includeBase64: { type: "boolean", description: "Include base64 data" },
            minSize: { type: "number", description: "Minimum size in pixels" },
            analyze: { type: "boolean", description: "Analyze image content" },
          }
        },
      },
      required: ["url"],
    },
  },
  {
    name: "nova_convert",
    description: "Convert scraped content to different formats",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "HTML content to convert" },
        from: { 
          type: "string",
          enum: ["html", "markdown", "text"],
          description: "Input format"
        },
        to: {
          type: "string",
          enum: ["markdown", "text", "json", "pdf"],
          description: "Output format"
        },
        options: {
          type: "object",
          properties: {
            preserveLinks: { type: "boolean" },
            includeImages: { type: "boolean" },
            clean: { type: "boolean" },
          }
        },
      },
      required: ["content", "from", "to"],
    },
  },
  {
    name: "nova_analyze",
    description: "AI-powered content analysis",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to analyze" },
        content: { type: "string", description: "Or provide content directly" },
        aspects: {
          type: "array",
          items: {
            type: "string",
            enum: ["sentiment", "topics", "entities", "summary", "keywords", "categories"]
          },
          description: "Analysis aspects"
        },
      },
      required: [],
    },
  },
  {
    name: "nova_monitor",
    description: "Monitor web pages for changes",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to monitor" },
        selector: { type: "string", description: "CSS selector to watch" },
        action: {
          type: "string",
          enum: ["start", "check", "stop", "list"],
          description: "Monitor action"
        },
        options: {
          type: "object",
          properties: {
            interval: { type: "string", description: "Check interval (e.g., '1h', '30m')" },
            notify: { type: "boolean", description: "Send notifications" },
            threshold: { type: "number", description: "Change threshold percentage" },
          }
        },
      },
      required: ["url", "action"],
    },
  },
  {
    name: "nova_batch",
    description: "Batch scraping with pattern detection",
    inputSchema: {
      type: "object",
      properties: {
        urls: {
          type: "array",
          items: { type: "string" },
          description: "URLs to scrape"
        },
        pattern: {
          type: "string",
          enum: ["auto-detect", "same-structure", "custom"],
          description: "Pattern detection mode"
        },
        options: {
          type: "object",
          properties: {
            concurrent: { type: "number", description: "Concurrent requests" },
            merge: { type: "boolean", description: "Merge results" },
            dedup: { type: "boolean", description: "Remove duplicates" },
          }
        },
      },
      required: ["urls"],
    },
  },
];

// Create MCP server
const server = new Server(
  {
    name: "nova-scraper",
    version: "0.1.0",
    description: "AI-powered web scraping with intelligent extraction",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "nova_scrape":
        return await scraperEngine.scrape(args);
      
      case "nova_extract_article":
        return await scraperEngine.extractArticle(args);
      
      case "nova_extract_structured":
        return await scraperEngine.extractStructured(args);
      
      case "nova_extract_metadata":
        return await scraperEngine.extractMetadata(args);
      
      case "nova_extract_links":
        return await scraperEngine.extractLinks(args);
      
      case "nova_extract_images":
        return await scraperEngine.extractImages(args);
      
      case "nova_convert":
        return await dataStructurer.convert(args);
      
      case "nova_analyze":
        return await contentAnalyzer.analyze(args);
      
      case "nova_monitor":
        return await scraperEngine.monitor(args);
      
      case "nova_batch":
        return await scraperEngine.batchScrape(args);
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
});

// Server lifecycle
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("🎯 Nova Scraper MCP Server started");
  console.error("🧠 AI-powered extraction ready");
  console.error("💡 Extract meaning, not just data");
}

// Cleanup on exit
process.on("SIGINT", async () => {
  console.error("\n🎯 Shutting down Nova Scraper...");
  await scraperEngine.cleanup();
  process.exit(0);
});

process.stdin.on("close", async () => {
  await scraperEngine.cleanup();
  server.close();
});

// Start server
runServer().catch(console.error);