#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

/**
 * Fetches articles about specific topics using Puppeteer
 * Supports multiple search engines and article extraction
 */
class ArticleFetcher {
  constructor(options = {}) {
    this.headless = options.headless ?? 'new';
    this.timeout = options.timeout ?? 30000;
    this.outputDir = options.outputDir ?? './fetched-articles';
    this.browser = null;
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: this.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Ensure output directory exists
    await fs.mkdir(this.outputDir, { recursive: true });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  /**
   * Search for articles on Google
   */
  async searchGoogle(query, maxResults = 10) {
    const page = await this.browser.newPage();
    const results = [];

    try {
      await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`, {
        waitUntil: 'networkidle2',
        timeout: this.timeout
      });

      // Extract search results
      const searchResults = await page.evaluate((max) => {
        const results = [];
        const items = document.querySelectorAll('div.g');
        
        for (let i = 0; i < Math.min(items.length, max); i++) {
          const item = items[i];
          const linkEl = item.querySelector('a');
          const titleEl = item.querySelector('h3');
          const snippetEl = item.querySelector('span.VwiC3b');
          
          if (linkEl && titleEl) {
            results.push({
              title: titleEl.innerText,
              url: linkEl.href,
              snippet: snippetEl ? snippetEl.innerText : ''
            });
          }
        }
        
        return results;
      }, maxResults);

      results.push(...searchResults);
    } catch (error) {
      console.error('Error searching Google:', error.message);
    } finally {
      await page.close();
    }

    return results;
  }

  /**
   * Extract article content from a URL
   */
  async extractArticle(url) {
    const page = await this.browser.newPage();
    let article = null;

    try {
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: this.timeout
      });

      // Wait for content to load
      await page.waitForSelector('body', { timeout: 5000 });

      // Extract article content
      article = await page.evaluate(() => {
        // Try to find main content areas
        const contentSelectors = [
          'article', 
          'main', 
          '[role="main"]',
          '.post-content',
          '.article-content',
          '.entry-content',
          '#content',
          '.content'
        ];

        let content = '';
        let title = document.title;

        // Try to find title
        const titleSelectors = ['h1', 'h2', '.title', '.post-title', '.article-title'];
        for (const selector of titleSelectors) {
          const el = document.querySelector(selector);
          if (el && el.innerText) {
            title = el.innerText;
            break;
          }
        }

        // Try to find content
        for (const selector of contentSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            content = el.innerText;
            break;
          }
        }

        // Fallback to body if no content found
        if (!content) {
          content = document.body.innerText;
        }

        // Extract metadata
        const meta = {
          description: document.querySelector('meta[name="description"]')?.content || '',
          author: document.querySelector('meta[name="author"]')?.content || '',
          datePublished: document.querySelector('meta[property="article:published_time"]')?.content || 
                        document.querySelector('time')?.getAttribute('datetime') || '',
          keywords: document.querySelector('meta[name="keywords"]')?.content || ''
        };

        return {
          url: window.location.href,
          title,
          content: content.substring(0, 10000), // Limit content length
          meta,
          extractedAt: new Date().toISOString()
        };
      });

    } catch (error) {
      console.error(`Error extracting article from ${url}:`, error.message);
      article = {
        url,
        error: error.message,
        extractedAt: new Date().toISOString()
      };
    } finally {
      await page.close();
    }

    return article;
  }

  /**
   * Fetch articles about a specific topic
   */
  async fetchArticlesAboutTopic(topic, options = {}) {
    const {
      searchQuery = topic,
      maxSearchResults = 10,
      maxArticles = 5,
      saveToFile = true
    } = options;

    console.log(`Searching for articles about: ${searchQuery}`);
    const searchResults = await this.searchGoogle(searchQuery, maxSearchResults);
    
    console.log(`Found ${searchResults.length} search results`);
    
    const articles = [];
    for (let i = 0; i < Math.min(searchResults.length, maxArticles); i++) {
      const result = searchResults[i];
      console.log(`Extracting article ${i + 1}/${maxArticles}: ${result.title}`);
      
      const article = await this.extractArticle(result.url);
      if (article && !article.error) {
        articles.push(article);
      }
      
      // Be nice to servers
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (saveToFile) {
      const filename = `${topic.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.json`;
      const filepath = path.join(this.outputDir, filename);
      await fs.writeFile(filepath, JSON.stringify(articles, null, 2));
      console.log(`Saved ${articles.length} articles to ${filepath}`);
    }

    return articles;
  }

  /**
   * Fetch articles about multiple topics
   */
  async fetchMultipleTopics(topics) {
    const allArticles = {};
    
    for (const topic of topics) {
      console.log(`\n--- Fetching articles about ${topic.name} ---`);
      const articles = await this.fetchArticlesAboutTopic(topic.name, topic.options);
      allArticles[topic.name] = articles;
    }

    return allArticles;
  }
}

// CLI usage
async function main() {
  const fetcher = new ArticleFetcher({
    headless: 'new',
    outputDir: './fetched-articles'
  });

  try {
    await fetcher.initialize();

    // Define topics to research
    const topics = [
      {
        name: 'React Hooks 2025',
        options: {
          searchQuery: 'React hooks best practices 2025 new features',
          maxSearchResults: 15,
          maxArticles: 5
        }
      },
      {
        name: 'Vue 3 Composition API 2025',
        options: {
          searchQuery: 'Vue 3 composition API patterns 2025',
          maxSearchResults: 15,
          maxArticles: 5
        }
      },
      {
        name: 'Angular Signals 2025',
        options: {
          searchQuery: 'Angular signals hooks patterns 2025',
          maxSearchResults: 15,
          maxArticles: 5
        }
      },
      {
        name: 'LangChain Framework 2025',
        options: {
          searchQuery: 'LangChain multi-agent patterns 2025',
          maxSearchResults: 15,
          maxArticles: 5
        }
      },
      {
        name: 'AutoGen Microsoft 2025',
        options: {
          searchQuery: 'AutoGen Microsoft multi-agent framework 2025',
          maxSearchResults: 15,
          maxArticles: 5
        }
      },
      {
        name: 'CrewAI Framework 2025',
        options: {
          searchQuery: 'CrewAI multi-agent orchestration 2025',
          maxSearchResults: 15,
          maxArticles: 5
        }
      }
    ];

    const results = await fetcher.fetchMultipleTopics(topics);
    
    // Save summary
    const summaryPath = path.join(fetcher.outputDir, 'fetch-summary.json');
    await fs.writeFile(summaryPath, JSON.stringify({
      fetchedAt: new Date().toISOString(),
      topics: Object.keys(results).map(topic => ({
        topic,
        articleCount: results[topic].length
      })),
      totalArticles: Object.values(results).reduce((sum, articles) => sum + articles.length, 0)
    }, null, 2));

    console.log('\nFetch complete! Check the fetched-articles directory for results.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await fetcher.close();
  }
}

// Export for use as module
module.exports = ArticleFetcher;

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}