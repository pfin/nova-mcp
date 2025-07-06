#!/usr/bin/env node

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function useExistingProfile() {
  console.log('🔐 ChatGPT Login with Chrome Profile');
  console.log('====================================\n');
  
  // Try to find Chrome user data directory
  let userDataDir;
  const platform = os.platform();
  
  if (platform === 'win32') {
    userDataDir = path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data');
  } else if (platform === 'darwin') {
    userDataDir = path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome');
  } else {
    userDataDir = path.join(os.homedir(), '.config', 'google-chrome');
  }
  
  console.log(`📁 Looking for Chrome profile at: ${userDataDir}`);
  
  try {
    await fs.access(userDataDir);
    console.log('✅ Found Chrome profile directory\n');
  } catch {
    console.log('❌ Chrome profile not found. Using new profile.\n');
    userDataDir = path.join(__dirname, 'chrome-profile');
  }

  console.log('🚀 Launching Chrome with existing profile...\n');
  console.log('NOTE: If you have Chrome open, please close it first!\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: userDataDir,
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--start-maximized',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();
  
  console.log('📍 Navigating to ChatGPT...\n');
  
  await page.goto('https://chat.openai.com', { 
    waitUntil: 'domcontentloaded',
    timeout: 60000 
  });

  // Check if already logged in
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const isLoggedIn = await page.evaluate(() => {
    const chatInput = document.querySelector('textarea[placeholder*="Message"], textarea#prompt-textarea');
    const loginButton = document.querySelector('button[data-testid*="login"], a[href*="/auth/login"]');
    return !!chatInput && !loginButton;
  });

  if (isLoggedIn) {
    console.log('✅ You are already logged in!\n');
  } else {
    console.log('⚠️  Not logged in. Please log in manually.');
    console.log('Once logged in, press Enter here...\n');
    
    await new Promise((resolve) => {
      process.stdin.once('data', resolve);
    });
  }

  console.log('🔍 Extracting session tokens...\n');
  
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
    
    // Test by sending a message
    console.log('\n🧪 Testing chat functionality...');
    try {
      const textarea = await page.$('textarea[placeholder*="Message"], textarea#prompt-textarea');
      if (textarea) {
        await textarea.click();
        await textarea.type('Hello! Testing: what is 2+2?', { delay: 50 });
        console.log('✅ Successfully typed test message!');
        
        // Send the message
        await page.keyboard.press('Enter');
        console.log('📤 Message sent!');
        
        // Wait for response
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check if we got a response
        const messages = await page.$$('[data-message-author-role="assistant"]');
        if (messages.length > 0) {
          console.log('✅ Got response from ChatGPT!');
        }
      }
    } catch (e) {
      console.log('⚠️  Could not test chat:', e.message);
    }
    
    console.log('\n✅ Authentication successful!');
    console.log('You can now use the ChatGPT MCP server.\n');
    
  } else {
    console.log('❌ No session token found.');
  }
  
  console.log('⏳ Browser will close in 15 seconds...');
  await new Promise(resolve => setTimeout(resolve, 15000));
  
  await browser.close();
  process.exit(0);
}

process.on('SIGINT', () => {
  console.log('\n\n👋 Cancelled');
  process.exit(0);
});

useExistingProfile().catch(console.error);