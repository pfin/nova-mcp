#!/usr/bin/env node

// Test script for nova-playwright with actrixft.substack.com

async function testActrixSubstack() {
  console.log('Testing Nova Playwright with actrixft.substack.com...\n');

  // Import the browser
  const { NovaBrowser } = await import('./dist/nova-browser.js');
  const { NovaTools } = await import('./dist/nova-tools.js');

  // Initialize browser
  const browser = new NovaBrowser({
    headless: true, // Run in headless mode
    stealth: true,
  });

  const tools = new NovaTools(browser);

  try {
    // Test 1: Navigate to the site
    console.log('Test 1: Navigating to https://actrixft.substack.com/...');
    const navResult = await tools.execute('nova_navigate', {
      url: 'https://actrixft.substack.com/',
      waitUntil: 'networkidle',
      timeout: 30000
    });
    console.log(navResult.content[0].text);

    // Test 2: Wait until fully loaded
    console.log('\nTest 2: Waiting for page to fully load...');
    const loadResult = await tools.execute('nova_wait_until_loaded', {
      timeout: 30000,
      checkNetworkIdle: true
    });
    console.log(loadResult.content[0].text);

    // Test 3: Check page state
    console.log('\nTest 3: Getting page state...');
    const stateResult = await tools.execute('nova_get_page_state', {});
    console.log(stateResult.content[0].text);

    // Test 4: Check for errors
    console.log('\nTest 4: Checking for page errors...');
    const errorsResult = await tools.execute('nova_get_page_errors', {});
    console.log(errorsResult.content[0].text);

    // Test 5: Wait for Substack-specific elements
    console.log('\nTest 5: Waiting for Substack header...');
    try {
      const headerResult = await tools.execute('nova_wait_for_element', {
        selector: 'header',
        timeout: 10000
      });
      console.log(headerResult.content[0].text);
    } catch (e) {
      console.log('Header element not found');
    }

    // Test 6: Check for publication name
    console.log('\nTest 6: Looking for publication name...');
    try {
      const titleResult = await tools.execute('nova_wait_for_text', {
        text: 'Actrix',
        timeout: 10000
      });
      console.log(titleResult.content[0].text);
    } catch (e) {
      console.log('Publication name not found');
    }

    // Test 7: Extract page content structure
    console.log('\nTest 7: Extracting page structure...');
    const extractResult = await tools.execute('nova_extract', {
      selectors: {
        title: 'h1',
        subtitle: 'h2',
        articleLinks: 'article a',
        navigationLinks: 'nav a',
        mainContent: 'main',
        subscribeButton: 'button[class*="subscribe"], a[href*="subscribe"]'
      },
      multiple: true,
      attributes: ['href', 'class', 'id']
    });
    console.log('Page structure:', JSON.stringify(extractResult.content[0].text, null, 2));

    // Test 8: Evaluate page details
    console.log('\nTest 8: Evaluating page details...');
    const evalResult = await tools.execute('nova_evaluate', {
      script: `
        // Get publication info
        const publicationName = document.querySelector('h1')?.innerText || 'Not found';
        const description = document.querySelector('meta[name="description"]')?.content || 'No description';
        
        // Count articles
        const articles = document.querySelectorAll('article').length;
        const links = document.querySelectorAll('a').length;
        
        // Check for Substack elements
        const hasSubscribeButton = !!document.querySelector('[class*="subscribe"]');
        const hasComments = !!document.querySelector('[class*="comment"]');
        
        // Get page metrics
        const pageLength = document.body.innerHTML.length;
        const hasImages = document.querySelectorAll('img').length > 0;
        
        return {
          publicationName,
          description,
          articles,
          links,
          hasSubscribeButton,
          hasComments,
          pageLength,
          hasImages,
          url: window.location.href,
          title: document.title
        };
      `
    });
    console.log(evalResult.content[0].text);

    // Test 9: Check network status for failed requests
    console.log('\nTest 9: Checking for failed network requests...');
    const networkResult = await tools.execute('nova_get_network_status', {
      includeAll: false
    });
    console.log(networkResult.content[0].text);

    // Test 10: Take a screenshot
    console.log('\nTest 10: Taking screenshot...');
    const screenshotResult = await tools.execute('nova_screenshot', {
      name: 'actrix-substack',
      fullPage: false // Just viewport for Substack
    });
    console.log(screenshotResult.content[0].text);

    // Test 11: Scroll down to load more content
    console.log('\nTest 11: Scrolling to load more content...');
    const scrollResult = await tools.execute('nova_scroll', {
      direction: 'down',
      amount: 1000
    });
    console.log(scrollResult.content[0].text);

    // Wait a bit for lazy-loaded content
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 12: Count articles after scroll
    console.log('\nTest 12: Counting articles after scroll...');
    const articleCountResult = await tools.execute('nova_element_count', {
      selector: 'article'
    });
    console.log(articleCountResult.content[0].text);

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error details:', error);
  } finally {
    // Clean up
    await browser.close();
    console.log('\n🎭 Browser closed.');
  }
}

// Run the test
testActrixSubstack().catch(console.error);