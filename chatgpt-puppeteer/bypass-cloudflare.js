#!/usr/bin/env node

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure stealth plugin with all evasions
const stealth = StealthPlugin();
stealth.enabledEvasions.delete('iframe.contentWindow');
stealth.enabledEvasions.delete('media.codecs');
puppeteer.use(stealth);

async function bypassCloudflare() {
  console.log('🔐 ChatGPT Cloudflare Bypass Login');
  console.log('==================================\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--exclude-switches=enable-automation',
      '--disable-features=site-per-process',
      '--window-size=1920,1080',
      '--start-maximized',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-infobars',
      '--disable-web-security',
      '--disable-features=IsolateOrigins',
      '--disable-site-isolation-trials',
      '--disable-features=BlockInsecurePrivateNetworkRequests',
      '--allow-running-insecure-content',
      '--disable-features=OutOfBlinkCors',
      '--disable-blink-features=AutomationControlled',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    ],
    ignoreDefaultArgs: ['--enable-automation', '--enable-blink-features=IdleDetection'],
  });

  const page = await browser.newPage();
  
  // Delete webdriver property
  await page.evaluateOnNewDocument(() => {
    const newProto = navigator.__proto__;
    delete newProto.webdriver;
    navigator.__proto__ = newProto;
  });

  // Override permissions
  await page.evaluateOnNewDocument(() => {
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' 
        ? Promise.resolve({ state: Notification.permission }) 
        : originalQuery(parameters)
    );
  });

  // Add Chrome runtime
  await page.evaluateOnNewDocument(() => {
    window.chrome = {
      runtime: {
        connect: () => {},
        sendMessage: () => {},
        onMessage: { addListener: () => {} }
      }
    };
  });

  // Override plugins
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'plugins', {
      get: () => {
        const arr = [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
          { name: 'Native Client', filename: 'internal-nacl-plugin' }
        ];
        arr.item = i => arr[i];
        arr.namedItem = name => arr.find(p => p.name === name);
        arr.refresh = () => {};
        return arr;
      },
    });
  });

  // Set realistic viewport
  await page.setViewport({
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  });

  // Set headers
  await page.setExtraHTTPHeaders({
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  });

  console.log('📍 Attempting to navigate to ChatGPT...\n');
  
  try {
    // First go to OpenAI main page
    await page.goto('https://openai.com', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    console.log('✅ Reached OpenAI.com');
    
    // Random delay
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
    
    // Now navigate to ChatGPT
    await page.goto('https://chat.openai.com', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    
    console.log('📍 Navigated to ChatGPT\n');
    
  } catch (error) {
    console.log('⚠️  Navigation error:', error.message);
  }

  console.log('⚠️  INSTRUCTIONS:');
  console.log('1. Complete any Cloudflare challenges if they appear');
  console.log('2. Log in to ChatGPT');
  console.log('3. Once logged in, press Enter here\n');

  // Wait for user
  await new Promise((resolve) => {
    process.stdin.once('data', resolve);
  });

  console.log('\n🔍 Extracting session data...');
  
  const cookies = await page.cookies();
  const sessionToken = cookies.find(c => c.name === '__Secure-next-auth.session-token');
  const cfClearance = cookies.find(c => c.name === 'cf_clearance');
  
  // Also get localStorage and sessionStorage
  const localStorage = await page.evaluate(() => {
    const items = {};
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      items[key] = window.localStorage.getItem(key);
    }
    return items;
  });
  
  if (sessionToken) {
    console.log('✅ Found session token!');
    
    // Save to .env
    const envPath = path.join(__dirname, '.env');
    const envLines = [];
    
    envLines.push(`CHATGPT_SESSION_TOKEN=${sessionToken.value}`);
    
    if (cfClearance) {
      envLines.push(`CHATGPT_CF_CLEARANCE=${cfClearance.value}`);
      console.log('✅ Found CF clearance token!');
    }
    
    // Save the exact user agent that worked
    const userAgent = await page.evaluate(() => navigator.userAgent);
    envLines.push(`CHATGPT_USER_AGENT=${userAgent}`);
    
    await fs.writeFile(envPath, envLines.join('\n') + '\n');
    console.log(`\n📁 Tokens saved to ${envPath}`);
    
    // Save all session data
    const sessionDir = path.join(__dirname, 'chatgpt-session');
    await fs.mkdir(sessionDir, { recursive: true });
    
    await fs.writeFile(
      path.join(sessionDir, 'cookies.json'),
      JSON.stringify(cookies, null, 2)
    );
    
    await fs.writeFile(
      path.join(sessionDir, 'localStorage.json'),
      JSON.stringify(localStorage, null, 2)
    );
    
    console.log('📁 Full session saved to chatgpt-session/');
    console.log('\n✅ Success! You can now use the ChatGPT MCP server.');
    
  } else {
    console.log('❌ No session token found. Make sure you are logged in.');
  }
  
  console.log('\n⏳ Keeping browser open for 20 seconds...');
  await new Promise(resolve => setTimeout(resolve, 20000));
  
  await browser.close();
  process.exit(0);
}

process.on('SIGINT', () => {
  console.log('\n\n👋 Cancelled');
  process.exit(0);
});

bypassCloudflare().catch(console.error);