#!/usr/bin/env node

// Simple test for nova-playwright
async function testNovaPlaywright() {
  console.log('Testing Nova Playwright...\n');

  const { NovaBrowser } = await import('./dist/nova-browser.js');
  const { NovaTools } = await import('./dist/nova-tools.js');

  const browser = new NovaBrowser({
    headless: true,
    stealth: true,
  });

  const tools = new NovaTools(browser);

  try {
    console.log('1. Navigating to example.com...');
    const navResult = await tools.execute('nova_navigate', {
      url: 'https://example.com',
      waitUntil: 'networkidle'
    });
    console.log(navResult.content[0].text);

    console.log('\n2. Taking screenshot...');
    const screenshotResult = await tools.execute('nova_screenshot', {
      name: 'example-test',
      fullPage: true
    });
    console.log(screenshotResult.content[0].text);

    console.log('\n3. Extracting page title...');
    const evalResult = await tools.execute('nova_evaluate', {
      script: `document.title`
    });
    console.log('Page title:', evalResult.content[0].text);

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
    console.log('\n🎭 Browser closed.');
  }
}

testNovaPlaywright().catch(console.error);