#!/usr/bin/env node

// Test script for nova-playwright with swap-pulse-sdr.vercel.app

async function testNovaBrowser() {
  console.log('Testing Nova Playwright with swap-pulse-sdr.vercel.app...\n');

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
    console.log('Test 1: Navigating to https://swap-pulse-sdr.vercel.app...');
    const navResult = await tools.execute('nova_navigate', {
      url: 'https://swap-pulse-sdr.vercel.app',
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

    // Test 5: Check network status
    console.log('\nTest 5: Checking network status...');
    const networkResult = await tools.execute('nova_get_network_status', {
      includeAll: false // Only show failed requests
    });
    console.log(networkResult.content[0].text);

    // Test 6: Wait for specific text
    console.log('\nTest 6: Waiting for "Block Trade" text...');
    try {
      const textResult = await tools.execute('nova_wait_for_text', {
        text: 'Block Trade',
        timeout: 10000
      });
      console.log(textResult.content[0].text);
    } catch (e) {
      console.log('Text "Block Trade" not found - page might be blank or different');
    }

    // Test 7: Count table elements
    console.log('\nTest 7: Counting table elements...');
    const countResult = await tools.execute('nova_element_count', {
      selector: 'table'
    });
    console.log(countResult.content[0].text);

    // Test 8: Check if any content exists
    console.log('\nTest 8: Evaluating page content...');
    const evalResult = await tools.execute('nova_evaluate', {
      script: `
        const hasContent = document.body.innerHTML.length > 100;
        const hasText = document.body.innerText.trim().length > 0;
        const title = document.title;
        const url = window.location.href;
        
        return {
          hasContent,
          hasText,
          title,
          url,
          bodyLength: document.body.innerHTML.length,
          textLength: document.body.innerText.length
        };
      `
    });
    console.log(evalResult.content[0].text);

    // Test 9: Take a screenshot
    console.log('\nTest 9: Taking screenshot...');
    const screenshotResult = await tools.execute('nova_screenshot', {
      name: 'swap-pulse-test',
      fullPage: true
    });
    console.log(screenshotResult.content[0].text);

    // Test 10: Extract any visible elements
    console.log('\nTest 10: Extracting visible elements...');
    const extractResult = await tools.execute('nova_extract', {
      selectors: {
        headings: 'h1, h2, h3',
        buttons: 'button',
        links: 'a',
        tables: 'table'
      },
      multiple: true,
      attributes: ['href', 'class', 'id']
    });
    console.log(extractResult.content[0].text);

    console.log('\n✅ All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    // Clean up
    await browser.close();
    console.log('\n🎭 Browser closed.');
  }
}

// Run the test
testNovaBrowser().catch(console.error);