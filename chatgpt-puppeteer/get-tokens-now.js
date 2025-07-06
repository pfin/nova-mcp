#!/usr/bin/env node

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function getTokens() {
  console.log('🔌 Extracting ChatGPT Tokens');
  console.log('============================\n');

  try {
    // Try to connect to Chrome on port 9222
    console.log('🔍 Connecting to Chrome on port 9222...');
    
    const response = await fetch('http://localhost:9222/json/version');
    const versionInfo = await response.json();
    
    console.log(`✅ Found: ${versionInfo.Browser}\n`);
    
    const browser = await puppeteer.connect({
      browserWSEndpoint: versionInfo.webSocketDebuggerUrl,
      defaultViewport: null,
    });
    
    // Get all pages
    const pages = await browser.pages();
    console.log(`📄 Found ${pages.length} open tab(s)\n`);
    
    // Look for ChatGPT page
    let chatGPTPage = null;
    for (const page of pages) {
      const url = page.url();
      if (url.includes('chat.openai.com') || url.includes('chatgpt.com')) {
        chatGPTPage = page;
        console.log(`✅ Found ChatGPT tab: ${url}`);
        break;
      }
    }
    
    if (!chatGPTPage) {
      console.log('❌ No ChatGPT tab found!\n');
      console.log('Open tabs:');
      for (const page of pages) {
        console.log(`  - ${page.url()}`);
      }
      browser.disconnect();
      return;
    }
    
    // Get cookies
    const cookies = await chatGPTPage.cookies();
    const sessionToken = cookies.find(c => c.name === '__Secure-next-auth.session-token');
    const cfClearance = cookies.find(c => c.name === 'cf_clearance');
    
    if (sessionToken) {
      console.log('\n✅ SUCCESS! Found session token!\n');
      
      const envContent = [`CHATGPT_SESSION_TOKEN=${sessionToken.value}`];
      
      if (cfClearance) {
        console.log('✅ Also found Cloudflare token!');
        envContent.push(`CHATGPT_CF_CLEARANCE=${cfClearance.value}`);
      }
      
      // Save to .env
      const envPath = path.join(__dirname, '.env');
      await fs.writeFile(envPath, envContent.join('\n') + '\n');
      
      console.log(`\n📁 Saved to: ${envPath}`);
      
      // Also save full cookies
      const sessionDir = path.join(__dirname, 'chatgpt-session');
      await fs.mkdir(sessionDir, { recursive: true });
      await fs.writeFile(
        path.join(sessionDir, 'cookies.json'),
        JSON.stringify(cookies, null, 2)
      );
      
      console.log(`📁 Full cookies saved to: ${sessionDir}/cookies.json`);
      
      console.log('\n✅ Done! You can now use the ChatGPT MCP server.');
      console.log('\nTest with: mcp__chatgpt__chatgpt_ask query="Hello"');
      
    } else {
      console.log('\n❌ No session token found!');
      console.log('\nMake sure you are logged in to ChatGPT.');
      console.log('\nFound these cookies:');
      cookies.forEach(c => {
        if (c.domain.includes('openai') || c.domain.includes('chatgpt')) {
          console.log(`  - ${c.name}`);
        }
      });
    }
    
    browser.disconnect();
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\nMake sure Chrome is running with:');
    console.log('"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222');
  }
}

// Run immediately
getTokens().catch(console.error);