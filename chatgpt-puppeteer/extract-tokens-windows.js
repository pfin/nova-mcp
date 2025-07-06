// Windows script to extract tokens
// Run this in Windows with: node extract-tokens-windows.js

const puppeteer = require('puppeteer');
const fs = require('fs');

async function extractTokens() {
  console.log('Extracting tokens from Chrome on Windows...\n');
  
  try {
    // Connect to Chrome on port 9225
    const browser = await puppeteer.connect({
      browserURL: 'http://localhost:9225',
      defaultViewport: null
    });
    
    console.log('Connected to Chrome!\n');
    
    const pages = await browser.pages();
    console.log(`Found ${pages.length} tabs\n`);
    
    // Find ChatGPT tab
    let chatGPTPage = null;
    for (const page of pages) {
      const url = page.url();
      if (url.includes('chat.openai.com') || url.includes('chatgpt.com')) {
        chatGPTPage = page;
        console.log(`Found ChatGPT: ${url}\n`);
        break;
      }
    }
    
    if (!chatGPTPage) {
      console.log('No ChatGPT tab found!');
      browser.disconnect();
      return;
    }
    
    // Get cookies
    const cookies = await chatGPTPage.cookies();
    const sessionToken = cookies.find(c => c.name === '__Secure-next-auth.session-token');
    const cfClearance = cookies.find(c => c.name === 'cf_clearance');
    
    if (sessionToken) {
      console.log('SUCCESS! Found tokens:\n');
      console.log('CHATGPT_SESSION_TOKEN=' + sessionToken.value);
      if (cfClearance) {
        console.log('CHATGPT_CF_CLEARANCE=' + cfClearance.value);
      }
      
      // Save to file
      const content = `CHATGPT_SESSION_TOKEN=${sessionToken.value}\n` + 
                     (cfClearance ? `CHATGPT_CF_CLEARANCE=${cfClearance.value}\n` : '');
      
      fs.writeFileSync('tokens.env', content);
      console.log('\nSaved to tokens.env');
      
    } else {
      console.log('No session token found!');
    }
    
    browser.disconnect();
    
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\nMake sure Chrome is running with:');
    console.log('chrome.exe --remote-debugging-port=9225');
  }
}

extractTokens();