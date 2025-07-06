import puppeteer, { Browser, Page } from "puppeteer";
import * as cheerio from "cheerio";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import TurndownService from "turndown";
import { convert as htmlToText } from "html-to-text";
import sanitizeHtml from "sanitize-html";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export class NovaScraperEngine {
  private browser?: Browser;
  private turndownService: TurndownService;
  private monitors = new Map<string, any>();

  constructor() {
    this.turndownService = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
    });
  }

  async ensureBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    }
    return this.browser;
  }

  async scrape(args: any): Promise<CallToolResult> {
    const { url, strategy = "auto", selectors, options = {} } = args;
    
    try {
      const browser = await this.ensureBrowser();
      const page = await browser.newPage();
      
      // Set user agent
      await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
      
      // Navigate
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
      
      // Wait if specified
      if (options.waitFor) {
        if (typeof options.waitFor === "string" && !isNaN(Number(options.waitFor))) {
          await page.waitForTimeout(Number(options.waitFor));
        } else {
          await page.waitForSelector(options.waitFor, { timeout: 10000 });
        }
      }
      
      // Take screenshot if requested
      let screenshot;
      if (options.screenshot) {
        screenshot = await page.screenshot({ encoding: "base64" });
      }
      
      // Get page content
      const html = await page.content();
      const $ = cheerio.load(html);
      
      let result: any = {};
      
      // Apply strategy
      switch (strategy) {
        case "auto":
          result = await this.autoExtract($, html, page);
          break;
        case "article":
          result = await this.extractArticleContent(html, url);
          break;
        case "data":
          result = await this.extractDataContent($);
          break;
        case "full":
          result = { html, text: htmlToText(html) };
          break;
      }
      
      // Apply custom selectors
      if (selectors) {
        result.custom = {};
        for (const [key, selector] of Object.entries(selectors)) {
          const elements = $(selector as string);
          if (elements.length === 1) {
            result.custom[key] = elements.text().trim();
          } else if (elements.length > 1) {
            result.custom[key] = elements.map((_, el) => $(el).text().trim()).get();
          }
        }
      }
      
      // Add metadata if requested
      if (options.includeMeta) {
        result.metadata = await this.extractBasicMetadata($);
      }
      
      // Add screenshot
      if (screenshot) {
        result.screenshot = `data:image/png;base64,${screenshot}`;
      }
      
      await page.close();
      
      return {
        content: [{
          type: "text",
          text: `✅ Scraped ${url}\n\n${JSON.stringify(result, null, 2)}`,
        }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Scraping failed: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  async extractArticle(args: any): Promise<CallToolResult> {
    const { url, includeMetadata = true, format = "markdown" } = args;
    
    try {
      const browser = await this.ensureBrowser();
      const page = await browser.newPage();
      
      await page.goto(url, { waitUntil: "networkidle2" });
      const html = await page.content();
      
      const article = await this.extractArticleContent(html, url);
      
      if (includeMetadata) {
        const $ = cheerio.load(html);
        article.metadata = await this.extractBasicMetadata($);
      }
      
      let output;
      switch (format) {
        case "markdown":
          output = `# ${article.title}\n\n${article.content}`;
          break;
        case "text":
          output = `${article.title}\n\n${article.textContent}`;
          break;
        case "json":
          output = JSON.stringify(article, null, 2);
          break;
      }
      
      await page.close();
      
      return {
        content: [{
          type: "text",
          text: `✅ Article extracted from ${url}\n\n${output}`,
        }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Article extraction failed: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  async extractStructured(args: any): Promise<CallToolResult> {
    const { url, types = ["table", "list"], format = "json" } = args;
    
    try {
      const browser = await this.ensureBrowser();
      const page = await browser.newPage();
      
      await page.goto(url, { waitUntil: "networkidle2" });
      const html = await page.content();
      const $ = cheerio.load(html);
      
      const structured: any = {};
      
      // Extract tables
      if (types.includes("table")) {
        structured.tables = [];
        $("table").each((_, table) => {
          const headers: string[] = [];
          const rows: string[][] = [];
          
          $(table).find("thead th, thead td").each((_, th) => {
            headers.push($(th).text().trim());
          });
          
          $(table).find("tbody tr").each((_, tr) => {
            const row: string[] = [];
            $(tr).find("td").each((_, td) => {
              row.push($(td).text().trim());
            });
            if (row.length > 0) rows.push(row);
          });
          
          if (headers.length > 0 || rows.length > 0) {
            structured.tables.push({ headers, rows });
          }
        });
      }
      
      // Extract lists
      if (types.includes("list")) {
        structured.lists = [];
        $("ul, ol").each((_, list) => {
          const items: string[] = [];
          $(list).find("> li").each((_, li) => {
            items.push($(li).text().trim());
          });
          if (items.length > 0) {
            structured.lists.push({
              type: list.tagName === "ol" ? "ordered" : "unordered",
              items,
            });
          }
        });
      }
      
      // Extract definition lists
      if (types.includes("dl")) {
        structured.definitions = [];
        $("dl").each((_, dl) => {
          const defs: Array<{ term: string; definition: string }> = [];
          $(dl).find("dt").each((i, dt) => {
            const dd = $(dt).next("dd");
            defs.push({
              term: $(dt).text().trim(),
              definition: dd.text().trim(),
            });
          });
          if (defs.length > 0) structured.definitions.push(defs);
        });
      }
      
      await page.close();
      
      let output;
      switch (format) {
        case "json":
          output = JSON.stringify(structured, null, 2);
          break;
        case "csv":
          // Convert first table to CSV
          if (structured.tables && structured.tables[0]) {
            const table = structured.tables[0];
            output = [table.headers.join(",")]
              .concat(table.rows.map((row: string[]) => row.join(",")))
              .join("\n");
          }
          break;
        case "markdown":
          output = this.structuredToMarkdown(structured);
          break;
      }
      
      return {
        content: [{
          type: "text",
          text: `✅ Structured data extracted\n\n${output}`,
        }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Structured extraction failed: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  async extractMetadata(args: any): Promise<CallToolResult> {
    const { url, types = ["schema", "opengraph", "meta"] } = args;
    
    try {
      const browser = await this.ensureBrowser();
      const page = await browser.newPage();
      
      await page.goto(url, { waitUntil: "networkidle2" });
      const html = await page.content();
      const $ = cheerio.load(html);
      
      const metadata: any = {};
      
      // Basic meta tags
      if (types.includes("meta")) {
        metadata.meta = await this.extractBasicMetadata($);
      }
      
      // OpenGraph
      if (types.includes("opengraph")) {
        metadata.opengraph = {};
        $('meta[property^="og:"]').each((_, meta) => {
          const property = $(meta).attr("property")?.replace("og:", "");
          const content = $(meta).attr("content");
          if (property && content) {
            metadata.opengraph[property] = content;
          }
        });
      }
      
      // Twitter Cards
      if (types.includes("twitter")) {
        metadata.twitter = {};
        $('meta[name^="twitter:"]').each((_, meta) => {
          const name = $(meta).attr("name")?.replace("twitter:", "");
          const content = $(meta).attr("content");
          if (name && content) {
            metadata.twitter[name] = content;
          }
        });
      }
      
      // JSON-LD
      if (types.includes("jsonld")) {
        metadata.jsonld = [];
        $('script[type="application/ld+json"]').each((_, script) => {
          try {
            const data = JSON.parse($(script).html() || "");
            metadata.jsonld.push(data);
          } catch (e) {
            // Invalid JSON-LD
          }
        });
      }
      
      // Schema.org microdata
      if (types.includes("schema")) {
        metadata.schema = await page.evaluate(() => {
          const items: any[] = [];
          document.querySelectorAll("[itemscope]").forEach(el => {
            const item: any = {
              type: el.getAttribute("itemtype"),
              properties: {},
            };
            el.querySelectorAll("[itemprop]").forEach(prop => {
              const name = prop.getAttribute("itemprop");
              const content = prop.getAttribute("content") || prop.textContent;
              if (name) item.properties[name] = content;
            });
            items.push(item);
          });
          return items;
        });
      }
      
      await page.close();
      
      return {
        content: [{
          type: "text",
          text: `✅ Metadata extracted\n\n${JSON.stringify(metadata, null, 2)}`,
        }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Metadata extraction failed: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  async extractLinks(args: any): Promise<CallToolResult> {
    const { url, options = {} } = args;
    const { internal = true, external = true, categorize = true } = options;
    
    try {
      const browser = await this.ensureBrowser();
      const page = await browser.newPage();
      
      await page.goto(url, { waitUntil: "networkidle2" });
      
      const links = await page.evaluate((pageUrl) => {
        const results: any[] = [];
        const seen = new Set<string>();
        const urlObj = new URL(pageUrl);
        
        document.querySelectorAll("a[href]").forEach(link => {
          const href = link.getAttribute("href");
          if (!href || seen.has(href)) return;
          
          try {
            const linkUrl = new URL(href, pageUrl);
            seen.add(linkUrl.href);
            
            results.push({
              url: linkUrl.href,
              text: link.textContent?.trim() || "",
              title: link.getAttribute("title") || "",
              rel: link.getAttribute("rel") || "",
              isInternal: linkUrl.hostname === urlObj.hostname,
              isExternal: linkUrl.hostname !== urlObj.hostname,
              protocol: linkUrl.protocol,
              pathname: linkUrl.pathname,
              hostname: linkUrl.hostname,
            });
          } catch (e) {
            // Invalid URL
          }
        });
        
        return results;
      }, url);
      
      let filtered = links;
      if (!internal) filtered = filtered.filter(l => !l.isInternal);
      if (!external) filtered = filtered.filter(l => !l.isExternal);
      
      let result: any = { total: filtered.length, links: filtered };
      
      if (categorize) {
        result.categories = {
          navigation: filtered.filter(l => l.rel.includes("nav") || l.text.toLowerCase().includes("menu")),
          social: filtered.filter(l => ["facebook", "twitter", "linkedin", "instagram"].some(s => l.hostname.includes(s))),
          downloads: filtered.filter(l => [".pdf", ".doc", ".zip", ".csv"].some(ext => l.pathname.endsWith(ext))),
          email: filtered.filter(l => l.protocol === "mailto:"),
          tel: filtered.filter(l => l.protocol === "tel:"),
        };
      }
      
      await page.close();
      
      return {
        content: [{
          type: "text",
          text: `✅ Found ${result.total} links\n\n${JSON.stringify(result, null, 2)}`,
        }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Link extraction failed: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  async extractImages(args: any): Promise<CallToolResult> {
    const { url, options = {} } = args;
    const { includeBase64 = false, minSize = 0, analyze = false } = options;
    
    try {
      const browser = await this.ensureBrowser();
      const page = await browser.newPage();
      
      await page.goto(url, { waitUntil: "networkidle2" });
      
      const images = await page.evaluate((pageUrl, minSizeParam) => {
        const results: any[] = [];
        const seen = new Set<string>();
        
        document.querySelectorAll("img").forEach(img => {
          const src = img.src || img.getAttribute("data-src");
          if (!src || seen.has(src)) return;
          
          seen.add(src);
          
          const width = img.naturalWidth || img.width;
          const height = img.naturalHeight || img.height;
          
          if (width >= minSizeParam && height >= minSizeParam) {
            results.push({
              src,
              alt: img.alt || "",
              title: img.title || "",
              width,
              height,
              loading: img.loading || "auto",
              srcset: img.srcset || "",
              sizes: img.sizes || "",
            });
          }
        });
        
        return results;
      }, url, minSize);
      
      // Include base64 if requested
      if (includeBase64) {
        for (const img of images) {
          try {
            const response = await page.goto(img.src);
            if (response) {
              const buffer = await response.buffer();
              img.base64 = `data:${response.headers()["content-type"]};base64,${buffer.toString("base64")}`;
            }
          } catch (e) {
            // Failed to load image
          }
        }
      }
      
      await page.close();
      
      return {
        content: [{
          type: "text",
          text: `✅ Found ${images.length} images\n\n${JSON.stringify(images, null, 2)}`,
        }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Image extraction failed: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  async monitor(args: any): Promise<CallToolResult> {
    const { url, selector, action, options = {} } = args;
    
    try {
      const monitorId = `${url}:${selector || "page"}`;
      
      switch (action) {
        case "start":
          if (this.monitors.has(monitorId)) {
            return {
              content: [{
                type: "text",
                text: `⚠️ Monitor already exists for ${monitorId}`,
              }],
              isError: false,
            };
          }
          
          const monitor = {
            url,
            selector,
            options,
            lastContent: null,
            lastCheck: null,
            changes: [],
          };
          
          this.monitors.set(monitorId, monitor);
          
          return {
            content: [{
              type: "text",
              text: `✅ Started monitoring ${monitorId}`,
            }],
            isError: false,
          };
          
        case "check":
          const mon = this.monitors.get(monitorId);
          if (!mon) {
            return {
              content: [{
                type: "text",
                text: `❌ No monitor found for ${monitorId}`,
              }],
              isError: true,
            };
          }
          
          const browser = await this.ensureBrowser();
          const page = await browser.newPage();
          await page.goto(url, { waitUntil: "networkidle2" });
          
          let currentContent;
          if (selector) {
            currentContent = await page.$eval(selector, el => el.textContent?.trim() || "");
          } else {
            currentContent = await page.content();
          }
          
          const hasChanged = mon.lastContent && mon.lastContent !== currentContent;
          
          if (hasChanged) {
            mon.changes.push({
              timestamp: new Date(),
              previousContent: mon.lastContent,
              currentContent,
            });
          }
          
          mon.lastContent = currentContent;
          mon.lastCheck = new Date();
          
          await page.close();
          
          return {
            content: [{
              type: "text",
              text: `✅ Checked ${monitorId}\nChanged: ${hasChanged}\nLast check: ${mon.lastCheck}`,
            }],
            isError: false,
          };
          
        case "stop":
          this.monitors.delete(monitorId);
          return {
            content: [{
              type: "text",
              text: `✅ Stopped monitoring ${monitorId}`,
            }],
            isError: false,
          };
          
        case "list":
          const list = Array.from(this.monitors.entries()).map(([id, mon]) => ({
            id,
            ...mon,
          }));
          
          return {
            content: [{
              type: "text",
              text: `✅ Active monitors:\n${JSON.stringify(list, null, 2)}`,
            }],
            isError: false,
          };
          
        default:
          throw new Error(`Unknown monitor action: ${action}`);
      }
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Monitor operation failed: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  async batchScrape(args: any): Promise<CallToolResult> {
    const { urls, pattern = "auto-detect", options = {} } = args;
    const { concurrent = 3, merge = false, dedup = true } = options;
    
    try {
      const results = [];
      
      // Process in batches
      for (let i = 0; i < urls.length; i += concurrent) {
        const batch = urls.slice(i, i + concurrent);
        const batchResults = await Promise.all(
          batch.map(url => this.scrape({ url, strategy: "auto" }))
        );
        results.push(...batchResults);
      }
      
      let finalResult: any = { urls: urls.length, results };
      
      if (merge) {
        // Merge results into single structure
        finalResult.merged = this.mergeResults(results);
      }
      
      if (dedup && merge) {
        // Remove duplicate entries
        finalResult.merged = this.deduplicateResults(finalResult.merged);
      }
      
      return {
        content: [{
          type: "text",
          text: `✅ Batch scraping completed\n\n${JSON.stringify(finalResult, null, 2)}`,
        }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Batch scraping failed: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  // Helper methods
  private async autoExtract($: cheerio.CheerioAPI, html: string, page: Page): Promise<any> {
    const result: any = {};
    
    // Try article extraction first
    const article = await this.extractArticleContent(html, page.url());
    if (article && article.content) {
      result.article = article;
    }
    
    // Extract structured data
    const tables = [];
    $("table").each((_, table) => {
      const headers: string[] = [];
      $(table).find("th").each((_, th) => {
        headers.push($(th).text().trim());
      });
      if (headers.length > 0) tables.push({ headers });
    });
    
    if (tables.length > 0) {
      result.tables = tables;
    }
    
    // Extract main content areas
    const mainContent = $("main, article, [role='main']").first().text().trim();
    if (mainContent) {
      result.mainContent = mainContent.substring(0, 1000) + "...";
    }
    
    return result;
  }

  private async extractArticleContent(html: string, url: string): Promise<any> {
    try {
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();
      
      if (article) {
        return {
          title: article.title,
          content: this.turndownService.turndown(article.content),
          textContent: article.textContent,
          length: article.length,
          excerpt: article.excerpt,
          byline: article.byline,
          siteName: article.siteName,
        };
      }
    } catch (e) {
      // Readability failed
    }
    
    return null;
  }

  private async extractDataContent($: cheerio.CheerioAPI): Promise<any> {
    const data: any = {};
    
    // Extract all tables
    data.tables = [];
    $("table").each((_, table) => {
      const tableData: any = { headers: [], rows: [] };
      
      $(table).find("thead th, thead td, tbody:first-child th").each((_, th) => {
        tableData.headers.push($(th).text().trim());
      });
      
      $(table).find("tbody tr").each((_, tr) => {
        const row: string[] = [];
        $(tr).find("td").each((_, td) => {
          row.push($(td).text().trim());
        });
        if (row.length > 0) tableData.rows.push(row);
      });
      
      if (tableData.headers.length > 0 || tableData.rows.length > 0) {
        data.tables.push(tableData);
      }
    });
    
    // Extract forms
    data.forms = [];
    $("form").each((_, form) => {
      const formData: any = {
        action: $(form).attr("action") || "",
        method: $(form).attr("method") || "get",
        fields: [],
      };
      
      $(form).find("input, select, textarea").each((_, field) => {
        formData.fields.push({
          name: $(field).attr("name") || "",
          type: $(field).attr("type") || field.tagName.toLowerCase(),
          required: $(field).attr("required") !== undefined,
        });
      });
      
      data.forms.push(formData);
    });
    
    return data;
  }

  private async extractBasicMetadata($: cheerio.CheerioAPI): Promise<any> {
    return {
      title: $("title").text() || $('meta[property="og:title"]').attr("content") || "",
      description: $('meta[name="description"]').attr("content") || 
                   $('meta[property="og:description"]').attr("content") || "",
      keywords: $('meta[name="keywords"]').attr("content") || "",
      author: $('meta[name="author"]').attr("content") || "",
      canonical: $('link[rel="canonical"]').attr("href") || "",
      robots: $('meta[name="robots"]').attr("content") || "",
    };
  }

  private structuredToMarkdown(structured: any): string {
    let markdown = "";
    
    if (structured.tables) {
      structured.tables.forEach((table: any, i: number) => {
        markdown += `\n## Table ${i + 1}\n\n`;
        if (table.headers.length > 0) {
          markdown += `| ${table.headers.join(" | ")} |\n`;
          markdown += `| ${table.headers.map(() => "---").join(" | ")} |\n`;
        }
        table.rows.forEach((row: string[]) => {
          markdown += `| ${row.join(" | ")} |\n`;
        });
      });
    }
    
    if (structured.lists) {
      structured.lists.forEach((list: any, i: number) => {
        markdown += `\n## List ${i + 1}\n\n`;
        list.items.forEach((item: string, j: number) => {
          const prefix = list.type === "ordered" ? `${j + 1}.` : "-";
          markdown += `${prefix} ${item}\n`;
        });
      });
    }
    
    return markdown;
  }

  private mergeResults(results: any[]): any {
    // Simple merge strategy - combine all extracted data
    const merged: any = {
      articles: [],
      tables: [],
      links: [],
      images: [],
    };
    
    results.forEach(result => {
      if (result.content?.[0]?.text) {
        try {
          const data = JSON.parse(result.content[0].text.split("\n\n")[1]);
          if (data.article) merged.articles.push(data.article);
          if (data.tables) merged.tables.push(...data.tables);
          if (data.links) merged.links.push(...data.links);
          if (data.images) merged.images.push(...data.images);
        } catch (e) {
          // Parse error
        }
      }
    });
    
    return merged;
  }

  private deduplicateResults(data: any): any {
    // Remove duplicate entries based on content
    if (data.articles) {
      const seen = new Set();
      data.articles = data.articles.filter((article: any) => {
        const key = article.title;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    
    return data;
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }
}