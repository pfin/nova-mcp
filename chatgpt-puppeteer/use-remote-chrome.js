#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

async function connectToRemoteChrome() {
  console.log('🔌 Connecting to Remote Chrome Instance\n');
  
  const debugPort = process.env.CHROME_DEBUG_PORT || '9225';
  const debugUrl = `http://localhost:${debugPort}`;
  
  console.log(`📡 Attempting to connect to Chrome at ${debugUrl}...\n`);

  try {
    // Get browser info
    const response = await fetch(`${debugUrl}/json/version`);
    const versionInfo = await response.json();
    
    console.log('✅ Found Chrome instance:');
    console.log(`   Browser: ${versionInfo.Browser}`);
    console.log(`   Protocol: ${versionInfo['Protocol-Version']}`);
    console.log(`   WebSocket: ${versionInfo.webSocketDebuggerUrl}\n`);

    // Connect to browser
    const browser = await puppeteer.connect({
      browserWSEndpoint: versionInfo.webSocketDebuggerUrl,
      defaultViewport: null,
    });

    console.log('✅ Connected to browser\n');

    // Get or create page
    const pages = await browser.pages();
    let page;
    
    if (pages.length > 0) {
      page = pages[0];
      console.log('📄 Using existing page');
    } else {
      page = await browser.newPage();
      console.log('📄 Created new page');
    }

    // Navigate to ChatGPT
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}\n`);
    
    if (!currentUrl.includes('chatgpt.com')) {
      console.log('🌐 Navigating to ChatGPT...');
      await page.goto('https://chatgpt.com', { waitUntil: 'domcontentloaded' });
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Check auth status
    console.log('🔐 Checking authentication status...');
    const authStatus = await page.evaluate(() => {
      const chatInput = document.querySelector('textarea[placeholder*="Message"], textarea#prompt-textarea, [contenteditable="true"]');
      const loginButton = document.querySelector('button[data-testid*="login"], a[href*="/auth/login"]');
      
      return {
        hasChatInput: !!chatInput,
        hasLoginButton: !!loginButton,
        url: window.location.href,
        title: document.title
      };
    });
    
    console.log('📊 Status:');
    console.log(`   Authenticated: ${authStatus.hasChatInput && !authStatus.hasLoginButton ? '✅' : '❌'}`);
    console.log(`   URL: ${authStatus.url}`);
    console.log(`   Title: ${authStatus.title}\n`);

    if (authStatus.hasChatInput && !authStatus.hasLoginButton) {
      // Extract tokens
      console.log('🔑 Extracting session tokens...');
      const cookies = await page.cookies();
      const sessionToken = cookies.find(c => c.name === '__Secure-next-auth.session-token');
      const cfClearance = cookies.find(c => c.name === 'cf_clearance');
      
      if (sessionToken || cfClearance) {
        console.log('\n📝 Save these tokens to your .env file:\n');
        if (sessionToken) {
          console.log(`CHATGPT_SESSION_TOKEN=${sessionToken.value}`);
        }
        if (cfClearance) {
          console.log(`CHATGPT_CF_CLEARANCE=${cfClearance.value}`);
        }
        console.log('\n✅ Tokens extracted successfully!');
      }

      // Test sending a message
      console.log('\n💬 Testing message sending...');
      await page.focus('textarea[placeholder*="Message"], textarea#prompt-textarea');
      await page.keyboard.type('Test message - please respond with "Hello!"');
      await page.keyboard.press('Enter');
      
      console.log('✅ Message sent! Check the browser to see the response.');
    } else {
      console.log('⚠️  Not authenticated. Please log in manually in the Chrome window.');
    }

    // Don't close - let user interact
    console.log('\n🔄 Keeping connection open. Press Ctrl+C to exit.');
    
    // Keep alive
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure Chrome is running with remote debugging:');
    console.log('   Windows: chrome.exe --remote-debugging-port=9225');
    console.log('   Mac: /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9225');
    console.log('   Linux: google-chrome --remote-debugging-port=9225');
  }
}

connectToRemoteChrome().catch(console.error);