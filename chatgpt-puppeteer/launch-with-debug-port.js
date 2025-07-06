#!/usr/bin/env node

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use stealth plugin
puppeteer.use(StealthPlugin());

async function launchWithDebugPort() {
  console.log('🚀 Launching ChatGPT Browser with Debug Port');
  console.log('==========================================\n');
  
  // Kill any existing browsers on port 9222
  try {
    await fetch('http://localhost:9222/json/close');
  } catch (e) {
    // Port not in use, good
  }
  
  console.log('📍 Starting browser on port 9222...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      '--remote-debugging-port=9222',
      '--remote-debugging-address=0.0.0.0', // Allow external connections
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--start-maximized',
      '--disable-features=IsolateOrigins,site-per-process',
      '--window-size=1920,1080',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  console.log('✅ Browser launched successfully!');
  console.log('🔗 Debug URL: http://localhost:9222');
  console.log('🔗 WebSocket: ' + browser.wsEndpoint() + '\n');
  
  // Save the endpoint
  await fs.writeFile(
    path.join(__dirname, 'browser-debug-info.json'),
    JSON.stringify({
      debugUrl: 'http://localhost:9222',
      wsEndpoint: browser.wsEndpoint(),
      port: 9222
    }, null, 2)
  );
  
  const page = await browser.newPage();
  
  // Override webdriver detection
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });
  
  // Set user agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
  
  console.log('📍 Navigating to ChatGPT...\n');
  await page.goto('https://chat.openai.com', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  
  console.log('⚠️  INSTRUCTIONS:');
  console.log('1. Complete any verification in the browser');
  console.log('2. Log in to ChatGPT');
  console.log('3. Once logged in, you can:');
  console.log('   - Press Enter here to extract tokens');
  console.log('   - Use another script to connect via port 9222');
  console.log('   - Access debug tools at http://localhost:9222\n');
  
  // Wait for user
  await new Promise((resolve) => {
    process.stdin.once('data', resolve);
  });

  console.log('\n🔍 Extracting session data...');
  
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
    
    console.log('\n✅ Success!');
    console.log('\n📝 The browser will stay open on port 9222.');
    console.log('You can connect to it from other scripts or close it manually.\n');
    
  } else {
    console.log('❌ No session token found.');
  }
  
  // Keep running but release stdin
  process.stdin.unref();
  console.log('💡 Browser is running. Press Ctrl+C to stop.\n');
  
  // Keep the process alive
  setInterval(() => {}, 1000);
}

process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down...');
  process.exit(0);
});

launchWithDebugPort().catch(console.error);