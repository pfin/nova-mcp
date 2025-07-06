#!/usr/bin/env node

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔌 Simple Token Extractor for Windows Chrome');
console.log('==========================================\n');

console.log('📝 Make sure Chrome is running with:');
console.log('"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222\n');

console.log('Press Enter to connect and extract tokens...');
await new Promise((resolve) => process.stdin.once('data', resolve));

try {
  // Try to connect
  const response = await fetch('http://localhost:9222/json/version');
  const versionInfo = await response.json();
  
  console.log(`\n✅ Found Chrome: ${versionInfo.Browser}`);
  
  const browser = await puppeteer.connect({
    browserWSEndpoint: versionInfo.webSocketDebuggerUrl,
    defaultViewport: null,
  });
  
  console.log('✅ Connected!\n');
  
  // Get all pages
  const pages = await browser.pages();
  
  // Find ChatGPT page or any page with cookies
  let targetPage = pages.find(p => p.url().includes('openai.com')) || pages[0];
  
  if (!targetPage) {
    console.log('❌ No pages found');
    browser.disconnect();
    process.exit(1);
  }
  
  console.log(`📄 Checking page: ${await targetPage.title()}`);
  console.log(`🔗 URL: ${targetPage.url()}\n`);
  
  // Get all cookies
  const cookies = await targetPage.cookies();
  console.log(`🍪 Found ${cookies.length} cookies\n`);
  
  // Look for ChatGPT tokens
  const sessionToken = cookies.find(c => c.name === '__Secure-next-auth.session-token');
  const cfClearance = cookies.find(c => c.name === 'cf_clearance');
  
  if (sessionToken) {
    console.log('✅ Found ChatGPT session token!');
    
    const envContent = [`CHATGPT_SESSION_TOKEN=${sessionToken.value}`];
    
    if (cfClearance) {
      console.log('✅ Found Cloudflare token!');
      envContent.push(`CHATGPT_CF_CLEARANCE=${cfClearance.value}`);
    }
    
    // Save to .env
    const envPath = path.join(__dirname, '.env');
    await fs.writeFile(envPath, envContent.join('\n') + '\n');
    
    console.log(`\n📁 Saved to ${envPath}`);
    console.log('\n✅ Success! You can now use the ChatGPT MCP server.');
    
    // Also show the tokens
    console.log('\n📋 Your tokens:');
    console.log('================');
    envContent.forEach(line => console.log(line));
    console.log('================\n');
    
  } else {
    console.log('❌ No ChatGPT session token found.\n');
    console.log('Available cookies:');
    cookies.forEach(c => {
      if (c.domain.includes('openai')) {
        console.log(`  - ${c.name} (${c.domain})`);
      }
    });
  }
  
  browser.disconnect();
  
} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.log('\nMake sure:');
  console.log('1. Chrome is running with --remote-debugging-port=9222');
  console.log('2. You are on a ChatGPT or OpenAI page');
  console.log('3. Windows Firewall allows port 9222');
}

process.exit(0);