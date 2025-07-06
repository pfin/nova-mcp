#!/usr/bin/env node

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use stealth plugin
puppeteer.use(StealthPlugin());

async function launchForWSL() {
  console.log('🚀 Launching ChatGPT Browser for WSL Mirrored Networking');
  console.log('======================================================\n');
  
  // Check for DISPLAY variable
  if (!process.env.DISPLAY) {
    console.log('⚠️  DISPLAY not set. Setting to :0');
    process.env.DISPLAY = ':0';
  }
  
  console.log(`📺 Using DISPLAY=${process.env.DISPLAY}`);
  console.log('🌐 WSL Mirrored networking mode detected\n');
  
  // Find Chrome/Chromium executable
  let executablePath = null;
  const possiblePaths = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
    process.env.PUPPETEER_EXECUTABLE_PATH,
  ];
  
  for (const path of possiblePaths) {
    try {
      if (path && await fs.access(path).then(() => true).catch(() => false)) {
        executablePath = path;
        console.log(`✅ Found Chrome/Chromium at: ${path}`);
        break;
      }
    } catch (e) {
      // Continue searching
    }
  }
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    executablePath: executablePath || undefined,
    args: [
      '--remote-debugging-port=9222',
      '--remote-debugging-address=0.0.0.0', // Allow connections from any address
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-gpu', // Important for WSL
      '--disable-software-rasterizer',
      '--disable-features=IsolateOrigins,site-per-process',
      '--window-size=1920,1080',
      '--start-maximized',
      '--force-device-scale-factor=1',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
    env: {
      ...process.env,
      DISPLAY: process.env.DISPLAY || ':0',
    },
  });

  console.log('\n✅ Browser launched successfully!');
  console.log('🔗 Remote debugging available at:');
  console.log('   - http://localhost:9222');
  console.log('   - http://0.0.0.0:9222');
  
  // Get WSL IP address
  try {
    const { stdout } = await execAsync('hostname -I');
    const wslIP = stdout.trim().split(' ')[0];
    console.log(`   - http://${wslIP}:9222`);
  } catch (e) {
    // Ignore if can't get IP
  }
  
  console.log('\n🔌 WebSocket endpoint: ' + browser.wsEndpoint());
  
  const page = await browser.newPage();
  
  // Enhanced anti-detection
  await page.evaluateOnNewDocument(() => {
    // Remove webdriver property
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined
    });
    
    // Add chrome object
    if (!window.chrome) {
      window.chrome = {
        runtime: {},
        loadTimes: () => {},
        csi: () => {},
      };
    }
    
    // Fix permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );
  });
  
  // Set realistic user agent
  await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
  
  // Set headers
  await page.setExtraHTTPHeaders({
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
  });
  
  console.log('\n📍 Navigating to ChatGPT...');
  
  try {
    await page.goto('https://chat.openai.com', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    console.log('✅ Navigated successfully!\n');
  } catch (error) {
    console.log('⚠️  Navigation timeout, but page may have loaded\n');
  }
  
  console.log('⚠️  INSTRUCTIONS:');
  console.log('1. The browser window should be visible on your Windows display');
  console.log('2. Complete any Cloudflare verification if needed');
  console.log('3. Log in to ChatGPT with your credentials');
  console.log('4. Once logged in, press Enter here to extract tokens\n');
  
  console.log('💡 TROUBLESHOOTING:');
  console.log('- If window is black/opaque, try moving or resizing it');
  console.log('- If no window appears, check your X server (VcXsrv/X410/WSLg)');
  console.log('- Make sure Windows firewall allows X11 connections\n');
  
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
      console.log('✅ Found CF clearance token!');
    }
    
    // Add browser info
    envLines.push(`# Browser executable: ${executablePath || 'default'}`);
    envLines.push(`# Extracted at: ${new Date().toISOString()}`);
    
    await fs.writeFile(envPath, envLines.join('\n') + '\n');
    console.log(`\n📁 Tokens saved to ${envPath}`);
    
    // Save full session
    const sessionDir = path.join(__dirname, 'chatgpt-session');
    await fs.mkdir(sessionDir, { recursive: true });
    await fs.writeFile(
      path.join(sessionDir, 'cookies.json'),
      JSON.stringify(cookies, null, 2)
    );
    
    console.log('📁 Full session saved to chatgpt-session/');
    console.log('\n✅ Success! You can now use the ChatGPT MCP server.');
    
    // Test the session
    console.log('\n🧪 Testing authentication...');
    try {
      const textarea = await page.$('textarea[placeholder*="Message"], textarea#prompt-textarea');
      if (textarea) {
        await textarea.click();
        await textarea.type('Test: Hello ChatGPT!', { delay: 100 });
        console.log('✅ Successfully typed in chat input!');
      }
    } catch (e) {
      console.log('⚠️  Could not test typing');
    }
    
  } else {
    console.log('❌ No session token found. Make sure you are logged in.');
  }
  
  console.log('\n💡 Browser will remain open. Press Ctrl+C when done.');
  
  // Keep running
  await new Promise(() => {});
}

process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down...');
  process.exit(0);
});

// Set up better error handling
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Error:', error);
  if (error.message?.includes('cannot open display')) {
    console.log('\n💡 Display error detected. Try:');
    console.log('1. Make sure X server is running on Windows');
    console.log('2. Set DISPLAY correctly: export DISPLAY=:0');
    console.log('3. Allow connections: xhost +local:');
  }
  process.exit(1);
});

launchForWSL().catch(console.error);