#!/usr/bin/env node

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function getTokens() {
  console.log('🔌 Extracting ChatGPT Tokens (Port 9225)');
  console.log('========================================\n');

  try {
    console.log('🔍 Connecting to Chrome on port 9225...');
    
    const response = await fetch('http://localhost:9225/json/version');
    const versionInfo = await response.json();
    
    console.log(`✅ Found: ${versionInfo.Browser}\n`);
    
    const browser = await puppeteer.connect({
      browserWSEndpoint: versionInfo.webSocketDebuggerUrl,
      defaultViewport: null,
    });
    
    const pages = await browser.pages();
    console.log(`📄 Found ${pages.length} open tab(s)\n`);
    
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
      console.log('❌ No ChatGPT tab found!');
      browser.disconnect();
      return;
    }
    
    const cookies = await chatGPTPage.cookies();
    const sessionToken = cookies.find(c => c.name === '__Secure-next-auth.session-token');
    const cfClearance = cookies.find(c => c.name === 'cf_clearance');
    
    if (sessionToken) {
      console.log('\n✅ SUCCESS! Found session token!\n');
      
      const envContent = [`CHATGPT_SESSION_TOKEN=${sessionToken.value}`];
      if (cfClearance) {
        envContent.push(`CHATGPT_CF_CLEARANCE=${cfClearance.value}`);
      }
      
      const envPath = path.join(__dirname, '.env');
      await fs.writeFile(envPath, envContent.join('\n') + '\n');
      
      console.log(`📁 Saved to: ${envPath}`);
      console.log('\n✅ You can now use the ChatGPT MCP server!');
      
      // Also display tokens
      console.log('\n📋 Your tokens:');
      console.log('=' .repeat(50));
      envContent.forEach(line => console.log(line));
      console.log('=' .repeat(50));
      
    } else {
      console.log('\n❌ No session token found!');
    }
    
    browser.disconnect();
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\nMake sure Chrome is running with:');
    console.log('"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9225');
  }
}

getTokens().catch(console.error);