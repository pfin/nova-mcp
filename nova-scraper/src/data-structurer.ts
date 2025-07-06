import TurndownService from "turndown";
import { convert as htmlToText } from "html-to-text";
import sanitizeHtml from "sanitize-html";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { parse as csvParse } from "csv-parse/sync";
import { parseString as parseXML } from "xml2js";
import { promisify } from "util";

const parseXMLAsync = promisify(parseXML);

export class DataStructurer {
  private turndownService: TurndownService;

  constructor() {
    this.turndownService = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      bulletListMarker: "-",
    });

    // Add custom rules
    this.turndownService.addRule("strikethrough", {
      filter: ["del", "s", "strike"],
      replacement: (content) => `~~${content}~~`,
    });
  }

  async convert(args: any): Promise<CallToolResult> {
    const { content, from, to, options = {} } = args;
    
    try {
      let result: string;
      
      switch (from) {
        case "html":
          result = await this.convertFromHTML(content, to, options);
          break;
        case "markdown":
          result = await this.convertFromMarkdown(content, to, options);
          break;
        case "text":
          result = await this.convertFromText(content, to, options);
          break;
        default:
          throw new Error(`Unsupported input format: ${from}`);
      }
      
      return {
        content: [{
          type: "text",
          text: `✅ Converted ${from} to ${to}\n\n${result}`,
        }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Conversion failed: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  private async convertFromHTML(html: string, to: string, options: any): Promise<string> {
    // Clean HTML first
    const cleanHtml = sanitizeHtml(html, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2", "h3", "h4", "h5", "h6"]),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        img: ["src", "alt", "title", "width", "height"],
      },
    });
    
    switch (to) {
      case "markdown":
        return this.turndownService.turndown(cleanHtml);
        
      case "text":
        return htmlToText(cleanHtml, {
          wordwrap: 80,
          preserveNewlines: options.preserveNewlines,
          formatters: {
            "heading": (elem, walk, builder, formatOptions) => {
              builder.openBlock({ leadingLineBreaks: 2 });
              walk(elem.children, builder);
              builder.closeBlock({ trailingLineBreaks: 2 });
            },
          },
        });
        
      case "json":
        return JSON.stringify(this.htmlToJson(cleanHtml), null, 2);
        
      default:
        throw new Error(`Cannot convert HTML to ${to}`);
    }
  }

  private async convertFromMarkdown(markdown: string, to: string, options: any): Promise<string> {
    switch (to) {
      case "html":
        // Simple markdown to HTML conversion
        // In production, would use a proper markdown parser
        let html = markdown
          .replace(/^### (.*$)/gim, "<h3>$1</h3>")
          .replace(/^## (.*$)/gim, "<h2>$1</h2>")
          .replace(/^# (.*$)/gim, "<h1>$1</h1>")
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.+?)\*/g, "<em>$1</em>")
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
          .replace(/\n/g, "<br>\n");
        
        return html;
        
      case "text":
        return markdown
          .replace(/^#+ /gm, "")
          .replace(/\*\*(.+?)\*\*/g, "$1")
          .replace(/\*(.+?)\*/g, "$1")
          .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
          .replace(/`(.+?)`/g, "$1");
        
      case "json":
        return JSON.stringify({
          content: markdown,
          lines: markdown.split("\n"),
          metadata: {
            headings: this.extractHeadings(markdown),
            links: this.extractLinks(markdown),
            codeBlocks: this.extractCodeBlocks(markdown),
          },
        }, null, 2);
        
      default:
        throw new Error(`Cannot convert Markdown to ${to}`);
    }
  }

  private async convertFromText(text: string, to: string, options: any): Promise<string> {
    switch (to) {
      case "markdown":
        // Simple text to markdown
        const lines = text.split("\n");
        let markdown = "";
        
        lines.forEach(line => {
          const trimmed = line.trim();
          if (trimmed) {
            // Detect potential headings (all caps or ending with colon)
            if (trimmed === trimmed.toUpperCase() && trimmed.length < 50) {
              markdown += `## ${trimmed}\n\n`;
            } else if (trimmed.endsWith(":") && trimmed.length < 50) {
              markdown += `### ${trimmed}\n\n`;
            } else {
              markdown += `${line}\n\n`;
            }
          }
        });
        
        return markdown.trim();
        
      case "html":
        return `<p>${text.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")}</p>`;
        
      case "json":
        return JSON.stringify({
          content: text,
          lines: text.split("\n"),
          paragraphs: text.split("\n\n").filter(p => p.trim()),
          statistics: {
            characters: text.length,
            words: text.split(/\s+/).length,
            lines: text.split("\n").length,
            paragraphs: text.split("\n\n").filter(p => p.trim()).length,
          },
        }, null, 2);
        
      default:
        throw new Error(`Cannot convert text to ${to}`);
    }
  }

  private htmlToJson(html: string): any {
    const cheerio = require("cheerio");
    const $ = cheerio.load(html);
    
    const result: any = {
      title: $("title").text() || $("h1").first().text(),
      headings: [],
      paragraphs: [],
      lists: [],
      links: [],
      images: [],
    };
    
    // Extract headings
    $("h1, h2, h3, h4, h5, h6").each((_, heading) => {
      result.headings.push({
        level: parseInt(heading.tagName.substring(1)),
        text: $(heading).text().trim(),
      });
    });
    
    // Extract paragraphs
    $("p").each((_, p) => {
      const text = $(p).text().trim();
      if (text) result.paragraphs.push(text);
    });
    
    // Extract lists
    $("ul, ol").each((_, list) => {
      const items: string[] = [];
      $(list).find("li").each((_, li) => {
        items.push($(li).text().trim());
      });
      result.lists.push({
        type: list.tagName === "ol" ? "ordered" : "unordered",
        items,
      });
    });
    
    // Extract links
    $("a[href]").each((_, link) => {
      result.links.push({
        text: $(link).text().trim(),
        href: $(link).attr("href"),
      });
    });
    
    // Extract images
    $("img[src]").each((_, img) => {
      result.images.push({
        src: $(img).attr("src"),
        alt: $(img).attr("alt") || "",
        title: $(img).attr("title") || "",
      });
    });
    
    return result;
  }

  private extractHeadings(markdown: string): any[] {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const headings = [];
    let match;
    
    while ((match = headingRegex.exec(markdown)) !== null) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
      });
    }
    
    return headings;
  }

  private extractLinks(markdown: string): any[] {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const links = [];
    let match;
    
    while ((match = linkRegex.exec(markdown)) !== null) {
      links.push({
        text: match[1],
        href: match[2],
      });
    }
    
    return links;
  }

  private extractCodeBlocks(markdown: string): any[] {
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    const codeBlocks = [];
    let match;
    
    while ((match = codeBlockRegex.exec(markdown)) !== null) {
      codeBlocks.push({
        language: match[1] || "plain",
        code: match[2].trim(),
      });
    }
    
    return codeBlocks;
  }

  async structureData(data: any, schema?: any): Promise<any> {
    // AI-powered data structuring
    // This would use ML models to understand and structure data
    
    if (!schema) {
      // Auto-detect schema
      schema = this.inferSchema(data);
    }
    
    // Apply schema to structure data
    return this.applySchema(data, schema);
  }

  private inferSchema(data: any): any {
    const schema: any = {
      type: typeof data,
      properties: {},
    };
    
    if (Array.isArray(data)) {
      schema.type = "array";
      if (data.length > 0) {
        schema.items = this.inferSchema(data[0]);
      }
    } else if (typeof data === "object" && data !== null) {
      schema.type = "object";
      for (const key in data) {
        schema.properties[key] = this.inferSchema(data[key]);
      }
    }
    
    return schema;
  }

  private applySchema(data: any, schema: any): any {
    if (schema.type === "array" && Array.isArray(data)) {
      return data.map(item => this.applySchema(item, schema.items));
    } else if (schema.type === "object" && typeof data === "object") {
      const result: any = {};
      for (const key in schema.properties) {
        if (key in data) {
          result[key] = this.applySchema(data[key], schema.properties[key]);
        }
      }
      return result;
    }
    
    return data;
  }

  async parseStructuredData(content: string, format: string): Promise<any> {
    switch (format) {
      case "csv":
        return csvParse(content, {
          columns: true,
          skip_empty_lines: true,
        });
        
      case "xml":
        return await parseXMLAsync(content);
        
      case "json":
        return JSON.parse(content);
        
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }
}