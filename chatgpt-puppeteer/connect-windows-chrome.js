#!/usr/bin/env node

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function connectToWindowsChrome() {
  console.log('🔌 Connect to Windows Chrome from WSL2');
  console.log('=====================================\n');
  
  console.log('📝 STEP 1: Start Chrome on Windows with debugging enabled\n');
  console.log('Open PowerShell or Command Prompt on Windows and run ONE of these:\n');
  
  console.log('For Chrome:');
  console.log('  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222\n');
  
  console.log('For Chrome (x86):');
  console.log('  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222\n');
  
  console.log('For Chromium:');
  console.log('  "C:\\Program Files\\Chromium\\Application\\chrome.exe" --remote-debugging-port=9222\n');
  
  console.log('For Edge (also works):');
  console.log('  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --remote-debugging-port=9222\n');
  
  console.log('⚠️  Make sure to close all Chrome windows first!\n');
  
  console.log('Press Enter after starting Chrome with debugging enabled...');
  await new Promise((resolve) => {
    process.stdin.once('data', resolve);
  });
  
  console.log('\n🔍 Attempting to connect...\n');
  
  // Get WSL network info
  let connectUrl = 'http://localhost:9222';
  
  // Try different connection methods
  const urls = [
    'http://localhost:9222',
    'http://127.0.0.1:9222',
  ];
  
  // If using older WSL without mirrored networking, try to get Windows host IP
  try {
    const { stdout } = await execAsync('cat /etc/resolv.conf | grep nameserver | awk \'{print $2}\'');
    const windowsIP = stdout.trim();
    if (windowsIP && windowsIP !== '127.0.0.1') {
      urls.push(`http://${windowsIP}:9222`);
      console.log(`📡 Found Windows host IP: ${windowsIP}`);
    }
  } catch (e) {
    // Ignore
  }
  
  let browser = null;
  let connectedUrl = null;
  
  for (const url of urls) {
    try {
      console.log(`🔗 Trying ${url}...`);
      
      // First check if the debug port is accessible
      const response = await fetch(`${url}/json/version`);
      if (response.ok) {
        const versionInfo = await response.json();
        console.log(`✅ Found Chrome: ${versionInfo.Browser}`);
        console.log(`   WebSocket: ${versionInfo.webSocketDebuggerUrl}`);
        
        // Connect using browserWSEndpoint
        browser = await puppeteer.connect({
          browserWSEndpoint: versionInfo.webSocketDebuggerUrl,
          defaultViewport: null,
        });
        
        connectedUrl = url;
        break;
      }
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
  }
  
  if (!browser) {
    console.log('\n❌ Could not connect to Chrome!');
    console.log('\n💡 Troubleshooting:');
    console.log('1. Make sure Chrome is running with --remote-debugging-port=9222');
    console.log('2. Check Windows Firewall - allow port 9222');
    console.log('3. If using WSL2 without mirrored mode:');
    console.log('   - Run in Windows: netsh interface portproxy add v4tov4 listenport=9222 listenaddress=0.0.0.0 connectport=9222 connectaddress=127.0.0.1');
    console.log('4. Try disabling Windows Defender temporarily');
    return;
  }
  
  console.log(`\n✅ Connected successfully via ${connectedUrl}!\n`);
  
  // Get existing pages or create new one
  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('chat.openai.com')) || pages[0];
  
  if (!page) {
    page = await browser.newPage();
  }
  
  // Navigate to ChatGPT
  if (!page.url().includes('chat.openai.com')) {
    console.log('📍 Navigating to ChatGPT...');
    await page.goto('https://chat.openai.com', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
  } else {
    console.log('✅ Already on ChatGPT!');
  }
  
  console.log('\n⚠️  INSTRUCTIONS:');
  console.log('1. Log in to ChatGPT in the Chrome window');
  console.log('2. Complete any verification if needed');
  console.log('3. Once logged in, press Enter here to extract tokens\n');
  
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
    
    envLines.push(`# Extracted from Windows Chrome`);
    envLines.push(`# Connection URL: ${connectedUrl}`);
    envLines.push(`# Date: ${new Date().toISOString()}`);
    
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
    
    // Test the session
    console.log('\n🧪 Testing authentication...');
    try {
      const isLoggedIn = await page.evaluate(() => {
        const chatInput = document.querySelector('textarea[placeholder*="Message"], textarea#prompt-textarea');
        const loginButton = document.querySelector('button[data-testid*="login"], a[href*="/auth/login"]');
        return !!chatInput && !loginButton;
      });
      
      if (isLoggedIn) {
        console.log('✅ Verified: You are logged in!');
        
        // Try typing
        const textarea = await page.$('textarea[placeholder*="Message"], textarea#prompt-textarea');
        if (textarea) {
          await textarea.click();
          await textarea.type('Hello ChatGPT! Testing connection from WSL.', { delay: 50 });
          console.log('✅ Successfully typed test message!');
          
          // Clear it
          await page.keyboard.down('Control');
          await page.keyboard.press('A');
          await page.keyboard.up('Control');
          await page.keyboard.press('Backspace');
          console.log('✅ Cleared test message');
        }
      } else {
        console.log('⚠️  Not fully logged in yet');
      }
    } catch (e) {
      console.log('⚠️  Could not verify login status');
    }
    
    console.log('\n✅ Success! You can now use the ChatGPT MCP server.');
    console.log('\n📝 The .env file has been created with your tokens.');
    console.log('You can now use: mcp__chatgpt__chatgpt_ask');
    
  } else {
    console.log('❌ No session token found.');
    console.log('Make sure you are logged in to ChatGPT.');
  }
  
  // Disconnect but don't close browser
  browser.disconnect();
  console.log('\n✅ Disconnected from browser (Chrome remains open)');
}

process.on('SIGINT', () => {
  console.log('\n\n👋 Exiting...');
  process.exit(0);
});

connectToWindowsChrome().catch(console.error);