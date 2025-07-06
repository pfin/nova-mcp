#!/usr/bin/env node

import http from 'http';
import puppeteer from 'puppeteer';

async function findChromeDebugPort() {
  console.log('🔍 Searching for Chrome instances with debugging enabled...\n');
  
  // Common debugging ports
  const ports = [9222, 9223, 9224, 9225, 9226, 9227, 9228, 9229, 21222];
  const foundInstances = [];
  
  for (const port of ports) {
    try {
      const response = await fetch(`http://localhost:${port}/json/version`);
      if (response.ok) {
        const data = await response.json();
        foundInstances.push({
          port,
          ...data
        });
        console.log(`✅ Found Chrome on port ${port}`);
        console.log(`   Browser: ${data.Browser}`);
        console.log(`   WebSocket: ${data.webSocketDebuggerUrl}\n`);
      }
    } catch (e) {
      // Port not available, continue
    }
  }
  
  if (foundInstances.length === 0) {
    console.log('❌ No Chrome instances found with debugging enabled.\n');
    console.log('To enable debugging, start Chrome with:');
    console.log('  chrome --remote-debugging-port=9222\n');
    return;
  }
  
  console.log(`Found ${foundInstances.length} Chrome instance(s) with debugging enabled.\n`);
  
  // Try to connect to the first one
  const instance = foundInstances[0];
  console.log(`🔌 Connecting to Chrome on port ${instance.port}...`);
  
  try {
    const browser = await puppeteer.connect({
      browserWSEndpoint: instance.webSocketDebuggerUrl,
      defaultViewport: null
    });
    
    console.log('✅ Connected successfully!\n');
    
    // Get all pages
    const pages = await browser.pages();
    console.log(`📄 Found ${pages.length} open page(s):`);
    
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const url = page.url();
      const title = await page.title();
      console.log(`   ${i + 1}. ${title || 'Untitled'} - ${url}`);
    }
    
    // Find ChatGPT page
    const chatGPTPage = pages.find(p => p.url().includes('chat.openai.com'));
    
    if (chatGPTPage) {
      console.log('\n✅ Found ChatGPT page!');
      
      // Extract tokens
      const cookies = await chatGPTPage.cookies();
      const sessionToken = cookies.find(c => c.name === '__Secure-next-auth.session-token');
      
      if (sessionToken) {
        console.log('✅ Found session token!');
        console.log('\nAdd to your .env file:');
        console.log(`CHATGPT_SESSION_TOKEN=${sessionToken.value}`);
      }
    } else {
      console.log('\n⚠️  No ChatGPT page found. Navigate to https://chat.openai.com');
    }
    
    // Don't close - just disconnect
    browser.disconnect();
    console.log('\n✅ Disconnected. Browser remains open.');
    
  } catch (error) {
    console.error('❌ Failed to connect:', error.message);
  }
}

findChromeDebugPort().catch(console.error);