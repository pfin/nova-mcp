#!/usr/bin/env node

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function connectToMCPBrowser() {
  console.log('🔌 Connecting to MCP Puppeteer Browser');
  console.log('=====================================\n');
  
  // The Puppeteer MCP server needs to be modified to expose the debugging port
  // For now, let's launch our own browser with debugging enabled
  
  console.log('📍 Launching browser with remote debugging enabled...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      '--remote-debugging-port=9222',
      '--remote-debugging-address=0.0.0.0',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--start-maximized',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  console.log('✅ Browser launched with debugging on port 9222');
  console.log('🔗 Debug URL: http://localhost:9222\n');
  
  // Get the WebSocket endpoint
  const wsEndpoint = browser.wsEndpoint();
  console.log('🔌 WebSocket endpoint:', wsEndpoint);
  
  // Save the endpoint for later use
  await fs.writeFile(
    path.join(__dirname, 'browser-endpoint.txt'),
    wsEndpoint
  );
  
  const page = await browser.newPage();
  
  // Set user agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
  
  console.log('📍 Navigating to ChatGPT...\n');
  await page.goto('https://chat.openai.com', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  
  console.log('⚠️  INSTRUCTIONS:');
  console.log('1. Complete any verification if needed');
  console.log('2. Log in to ChatGPT');
  console.log('3. Once logged in, press Enter here');
  console.log('\n💡 TIP: You can also connect to this browser from another script using:');
  console.log(`   puppeteer.connect({ browserWSEndpoint: '${wsEndpoint}' })\n`);

  // Wait for user
  await new Promise((resolve) => {
    process.stdin.once('data', resolve);
  });

  console.log('\n🔍 Extracting session tokens...');
  
  const cookies = await page.cookies();
  const sessionToken = cookies.find(c => c.name === '__Secure-next-auth.session-token');
  const cfClearance = cookies.find(c => c.name === 'cf_clearance');
  
  if (sessionToken) {
    console.log('✅ Found session token!');
    
    const envPath = path.join(__dirname, '.env');
    const envLines = [];
    
    envLines.push(`CHATGPT_SESSION_TOKEN=${sessionToken.value}`);
    
    if (cfClearance) {
      envLines.push(`CHATGPT_CF_CLEARANCE=${cfClearance.value}`);
      console.log('✅ Found CF clearance!');
    }
    
    await fs.writeFile(envPath, envLines.join('\n') + '\n');
    console.log(`\n📁 Tokens saved to ${envPath}`);
    
    // Test the session
    console.log('\n🧪 Testing authentication...');
    const textarea = await page.$('textarea[placeholder*="Message"], textarea#prompt-textarea');
    if (textarea) {
      await textarea.click();
      await textarea.type('Test: What is 2+2?', { delay: 50 });
      console.log('✅ Successfully typed in chat!');
      
      // Send message
      await page.keyboard.press('Enter');
      console.log('📤 Test message sent!');
      
      // Wait for response
      console.log('⏳ Waiting for response...');
      await page.waitForSelector('[data-message-author-role="assistant"]', { timeout: 30000 });
      console.log('✅ Got response from ChatGPT!');
    }
    
    console.log('\n✅ Authentication successful!');
    console.log('\n📝 Browser will remain open. You can:');
    console.log('1. Continue using ChatGPT manually');
    console.log('2. Close it when done');
    console.log('3. Connect to it from other scripts using the WebSocket endpoint');
    
  } else {
    console.log('❌ No session token found.');
  }
  
  // Don't close the browser - let user decide
  console.log('\n💡 Browser is still running. Press Ctrl+C to exit this script.');
  
  // Keep the script running
  await new Promise(() => {});
}

process.on('SIGINT', () => {
  console.log('\n\n👋 Script terminated. Browser may still be running.');
  process.exit(0);
});

connectToMCPBrowser().catch(console.error);