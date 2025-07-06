#!/usr/bin/env node

// Test script to find and read articles on actrixft.substack.com

async function testActrixArticles() {
  console.log('Finding and reading articles on actrixft.substack.com...\n');

  const { NovaBrowser } = await import('./dist/nova-browser.js');
  const { NovaTools } = await import('./dist/nova-tools.js');

  const browser = new NovaBrowser({
    headless: true,
    stealth: true,
  });

  const tools = new NovaTools(browser);

  try {
    // Navigate to the site
    console.log('Navigating to ActrixFT Substack...');
    await tools.execute('nova_navigate', {
      url: 'https://actrixft.substack.com/',
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for content to load
    await tools.execute('nova_wait_until_loaded', {
      timeout: 30000,
      checkNetworkIdle: true
    });

    // Find all article-like elements
    console.log('\nSearching for articles using various selectors...');
    const articleSearch = await tools.execute('nova_evaluate', {
      script: `
        // Try multiple selectors to find articles
        const selectors = [
          'div[class*="post-preview"]',
          'div[class*="post_preview"]',
          'a[class*="post-preview"]',
          'div.post',
          'article',
          'div[data-testid*="post"]',
          'div[class*="feed-item"]',
          'div[class*="portable-archive-list"] a',
          'a[href*="/p/"]'
        ];
        
        let articles = [];
        
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            console.log('Found elements with selector:', selector, 'count:', elements.length);
            
            elements.forEach(el => {
              // Extract article info
              const titleEl = el.querySelector('h2, h3, .post-title, [class*="title"]') || el;
              const title = titleEl.textContent?.trim();
              
              const link = el.href || el.querySelector('a')?.href || el.closest('a')?.href;
              
              const subtitleEl = el.querySelector('[class*="subtitle"], .post-subtitle, p');
              const subtitle = subtitleEl?.textContent?.trim();
              
              const dateEl = el.querySelector('time, [class*="date"], [class*="time"]');
              const date = dateEl?.textContent?.trim() || dateEl?.getAttribute('datetime');
              
              if (title && link) {
                articles.push({
                  title,
                  link,
                  subtitle: subtitle || '',
                  date: date || '',
                  selector: selector
                });
              }
            });
          }
        }
        
        // Remove duplicates based on link
        const uniqueArticles = articles.filter((article, index, self) =>
          index === self.findIndex(a => a.link === article.link)
        );
        
        return {
          totalFound: uniqueArticles.length,
          articles: uniqueArticles,
          pageTitle: document.title,
          hasMoreContent: !!document.querySelector('[class*="load-more"], [class*="show-more"]')
        };
      `
    });
    
    console.log(articleSearch.content[0].text);

    // Try to find articles with a more specific approach
    console.log('\nTrying alternative article detection...');
    const linkSearch = await tools.execute('nova_evaluate', {
      script: `
        // Get all links that might be articles
        const links = Array.from(document.querySelectorAll('a[href*="/p/"]'));
        
        return links.map(link => {
          const container = link.closest('div');
          return {
            title: link.textContent?.trim() || container?.querySelector('h2, h3')?.textContent?.trim(),
            url: link.href,
            // Look for any text content near the link
            preview: container?.textContent?.slice(0, 200)?.trim()
          };
        }).filter(item => item.title && item.url);
      `
    });
    
    console.log('Article links found:', linkSearch.content[0].text);

    // Look for the AI article specifically
    console.log('\nSearching for AI-related articles...');
    const aiSearch = await tools.execute('nova_evaluate', {
      script: `
        // Search all text content for AI-related articles
        const allText = document.body.innerText.toLowerCase();
        const hasAI = allText.includes('artificial intelligence') || 
                      allText.includes(' ai ') || 
                      allText.includes('machine learning') ||
                      allText.includes('neural network');
        
        // Find links containing AI-related keywords
        const aiLinks = Array.from(document.querySelectorAll('a')).filter(link => {
          const text = link.textContent?.toLowerCase() || '';
          const href = link.href?.toLowerCase() || '';
          return text.includes('ai') || 
                 text.includes('artificial') || 
                 text.includes('intelligence') ||
                 href.includes('ai') ||
                 href.includes('artificial');
        });
        
        return {
          hasAIContent: hasAI,
          aiLinksFound: aiLinks.length,
          aiLinks: aiLinks.slice(0, 5).map(link => ({
            text: link.textContent?.trim(),
            url: link.href
          }))
        };
      `
    });
    
    console.log('AI content search:', aiSearch.content[0].text);

    // Try scrolling and waiting for lazy-loaded content
    console.log('\nScrolling to load more content...');
    for (let i = 0; i < 3; i++) {
      await tools.execute('nova_scroll', {
        direction: 'down',
        amount: 800
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Check again after scrolling
    console.log('\nChecking for articles after scrolling...');
    const afterScroll = await tools.execute('nova_evaluate', {
      script: `
        // Count all links and potential article containers
        const stats = {
          totalLinks: document.querySelectorAll('a').length,
          substackLinks: document.querySelectorAll('a[href*="substack.com"]').length,
          postLinks: document.querySelectorAll('a[href*="/p/"]').length,
          divCount: document.querySelectorAll('div').length,
          h2Count: document.querySelectorAll('h2').length,
          h3Count: document.querySelectorAll('h3').length
        };
        
        // Get page structure
        const mainContainers = Array.from(document.querySelectorAll('main, [role="main"], #main, .main-content, div[class*="container"]'));
        const structure = mainContainers.map(container => ({
          tag: container.tagName,
          className: container.className,
          childCount: container.children.length,
          hasLinks: container.querySelectorAll('a').length
        }));
        
        return {
          stats,
          structure,
          bodyClasses: document.body.className,
          isSubstack: window.location.hostname.includes('substack')
        };
      `
    });
    
    console.log('Page structure after scroll:', afterScroll.content[0].text);

    // Take a full page screenshot to see what's there
    console.log('\nTaking full page screenshot...');
    const screenshot = await tools.execute('nova_screenshot', {
      name: 'actrix-full-page',
      fullPage: true
    });
    console.log(screenshot.content[0].text);

    // Try direct navigation to archive
    console.log('\nTrying to navigate to archive page...');
    const archiveNav = await tools.execute('nova_navigate', {
      url: 'https://actrixft.substack.com/archive',
      waitUntil: 'networkidle',
      timeout: 30000
    });
    console.log(archiveNav.content[0].text);

    // Check archive page for articles
    await tools.execute('nova_wait_until_loaded', { timeout: 10000 });
    
    const archiveArticles = await tools.execute('nova_evaluate', {
      script: `
        // On archive page, find all articles
        const articles = [];
        
        // Common archive selectors
        const selectors = [
          '.portable-archive-list a',
          '.archive-list a',
          'a[href*="/p/"]',
          '.post-preview',
          'div[class*="post"] a'
        ];
        
        selectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => {
            const href = el.href || el.querySelector('a')?.href;
            const title = el.textContent?.trim();
            
            if (href && title && href.includes('/p/')) {
              articles.push({
                title: title,
                url: href,
                isAI: title.toLowerCase().includes('ai') || 
                      title.toLowerCase().includes('artificial') ||
                      title.toLowerCase().includes('intelligence')
              });
            }
          });
        });
        
        // Remove duplicates
        const unique = articles.filter((article, index, self) =>
          index === self.findIndex(a => a.url === article.url)
        );
        
        return {
          pageUrl: window.location.href,
          articleCount: unique.length,
          articles: unique,
          aiArticles: unique.filter(a => a.isAI)
        };
      `
    });
    
    console.log('\nArchive page results:', archiveArticles.content[0].text);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
    console.log('\n🎭 Browser closed.');
  }
}

// Run the test
testActrixArticles().catch(console.error);