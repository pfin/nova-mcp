#!/usr/bin/env node

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function forceConnect() {
  console.log('🔌 Force Connect to Chrome on 9222');
  console.log('==================================\n');
  
  console.log('Trying multiple connection methods...\n');
  
  // Method 1: Direct HTTP request
  try {
    console.log('Method 1: Direct HTTP request to localhost:9222...');
    const versionInfo = await httpGet('http://localhost:9222/json/version');
    console.log('✅ SUCCESS! Chrome found via HTTP');
    console.log(`Browser: ${versionInfo.Browser}`);
    console.log(`WebSocket: ${versionInfo.webSocketDebuggerUrl}\n`);
    
    // Now connect with Puppeteer
    console.log('Connecting Puppeteer...');
    const browser = await puppeteer.connect({
      browserWSEndpoint: versionInfo.webSocketDebuggerUrl,
      defaultViewport: null,
    });
    
    console.log('✅ Connected!\n');
    
    // Get pages
    const pages = await browser.pages();
    console.log(`Found ${pages.length} tab(s):\n`);
    
    let chatGPTPage = null;
    for (const page of pages) {
      const url = page.url();
      const title = await page.title().catch(() => 'Untitled');
      console.log(`  - ${title}`);
      console.log(`    ${url}`);
      if (url.includes('chat.openai.com') || url.includes('chatgpt.com')) {
        chatGPTPage = page;
        console.log('    ↑ This is ChatGPT!\n');
      }
    }
    
    if (!chatGPTPage) {
      console.log('\n❌ No ChatGPT tab found!');
      console.log('Please navigate to https://chat.openai.com in one of the tabs.');
      browser.disconnect();
      return;
    }
    
    // Get cookies
    console.log('Extracting cookies...');
    const cookies = await chatGPTPage.cookies();
    const sessionToken = cookies.find(c => c.name === '__Secure-next-auth.session-token');
    const cfClearance = cookies.find(c => c.name === 'cf_clearance');
    
    if (sessionToken) {
      console.log('\n🎉 SUCCESS! Found session token!\n');
      
      const envContent = [`CHATGPT_SESSION_TOKEN=${sessionToken.value}`];
      if (cfClearance) {
        envContent.push(`CHATGPT_CF_CLEARANCE=${cfClearance.value}`);
      }
      
      const envPath = path.join(__dirname, '.env');
      await fs.writeFile(envPath, envContent.join('\n') + '\n');
      
      console.log(`📁 Saved to: ${envPath}`);
      console.log('\n✅ You can now use the ChatGPT MCP server!');
      
    } else {
      console.log('\n❌ No session token found.');
      console.log('Make sure you are logged in to ChatGPT.');
    }
    
    browser.disconnect();
    return;
    
  } catch (e) {
    console.log(`❌ HTTP failed: ${e.message}\n`);
  }
  
  // Method 2: Try 127.0.0.1 directly
  try {
    console.log('Method 2: Trying 127.0.0.1:9222...');
    const versionInfo = await httpGet('http://127.0.0.1:9222/json/version');
    console.log('✅ Found via 127.0.0.1');
    // ... rest of connection logic
  } catch (e) {
    console.log(`❌ 127.0.0.1 failed: ${e.message}\n`);
  }
  
  // Method 3: Try browserURL
  try {
    console.log('Method 3: Direct browserURL connection...');
    const browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: null,
    });
    console.log('✅ Connected via browserURL');
    // ... rest of logic
  } catch (e) {
    console.log(`❌ browserURL failed: ${e.message}\n`);
  }
  
  console.log('❌ All connection methods failed.\n');
  console.log('Please verify:');
  console.log('1. Chrome is running with --remote-debugging-port=9222');
  console.log('2. No firewall is blocking port 9222');
  console.log('3. Try running: curl http://localhost:9222/json/version');
}

forceConnect().catch(console.error);