#!/usr/bin/env node

import { connect } from 'puppeteer-real-browser';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function realBrowserLogin() {
  console.log('🔐 ChatGPT Real Browser Login');
  console.log('=============================\n');
  console.log('Using puppeteer-real-browser for maximum stealth\n');
  
  try {
    // Connect with real browser settings
    const { browser, page } = await connect({
      headless: false,
      args: ['--window-size=1920,1080'],
      customConfig: {},
      skipTarget: [],
      fingerprint: {
        devices: ['desktop'],
        screens: ['1920x1080'],
        operatingSystems: ['windows'],
        browsers: ['chrome'],
      },
      turnstile: true, // Auto-solve Cloudflare Turnstile
    });

    console.log('✅ Real browser launched with anti-detection measures');
    console.log('📍 Navigating to ChatGPT...\n');
    
    // Navigate to ChatGPT
    await page.goto('https://chat.openai.com', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });

    // Wait a bit for page to settle
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('⚠️  INSTRUCTIONS:');
    console.log('1. If you see Cloudflare verification, it should auto-solve');
    console.log('2. Log in to ChatGPT with your credentials');
    console.log('3. Once logged in and you see the chat interface, press Enter here\n');

    // Monitor for successful navigation
    const checkInterval = setInterval(async () => {
      try {
        const url = page.url();
        if (url.includes('chat.openai.com') && !url.includes('auth')) {
          const hasChat = await page.evaluate(() => {
            return !!document.querySelector('textarea[placeholder*="Message"], textarea#prompt-textarea');
          });
          if (hasChat) {
            console.log('✅ Chat interface detected!');
          }
        }
      } catch (e) {
        // Ignore check errors
      }
    }, 3000);

    // Wait for user input
    await new Promise((resolve) => {
      process.stdin.once('data', () => {
        clearInterval(checkInterval);
        resolve();
      });
    });

    console.log('\n🔍 Extracting authentication data...');
    
    // Get cookies
    const cookies = await page.cookies();
    const sessionToken = cookies.find(c => c.name === '__Secure-next-auth.session-token');
    const cfClearance = cookies.find(c => c.name === 'cf_clearance');
    
    if (sessionToken || cfClearance) {
      console.log('✅ Found authentication tokens!');
      
      // Save to .env
      const envPath = path.join(__dirname, '.env');
      const envLines = [];
      
      if (sessionToken) {
        envLines.push(`CHATGPT_SESSION_TOKEN=${sessionToken.value}`);
        console.log('✅ Session token saved');
      }
      
      if (cfClearance) {
        envLines.push(`CHATGPT_CF_CLEARANCE=${cfClearance.value}`);
        console.log('✅ Cloudflare token saved');
      }
      
      // Also save user agent
      const userAgent = await page.evaluate(() => navigator.userAgent);
      envLines.push(`CHATGPT_USER_AGENT=${userAgent}`);
      
      await fs.writeFile(envPath, envLines.join('\n') + '\n');
      console.log(`\n📁 Configuration saved to ${envPath}`);
      
      // Save full cookies
      const sessionDir = path.join(__dirname, 'chatgpt-session');
      await fs.mkdir(sessionDir, { recursive: true });
      await fs.writeFile(
        path.join(sessionDir, 'cookies.json'),
        JSON.stringify(cookies, null, 2)
      );
      
      console.log('📁 Full cookies saved to chatgpt-session/');
      
      // Test authentication
      console.log('\n🧪 Testing authentication...');
      try {
        // Type a test message
        const textarea = await page.$('textarea[placeholder*="Message"], textarea#prompt-textarea');
        if (textarea) {
          await textarea.click();
          await page.keyboard.type('Test message: 2+2=', { delay: 100 });
          console.log('✅ Successfully typed in chat!');
          
          // Clear the message
          await page.keyboard.down('Control');
          await page.keyboard.press('A');
          await page.keyboard.up('Control');
          await page.keyboard.press('Backspace');
        }
      } catch (e) {
        console.log('⚠️  Could not test typing');
      }
      
      console.log('\n✅ Success! Authentication complete.');
      console.log('\n📝 You can now use the ChatGPT MCP server with these tokens.');
      
    } else {
      console.log('❌ No authentication tokens found.');
      console.log('Please make sure you are fully logged in.');
    }
    
    console.log('\n⏳ Browser will remain open for 20 seconds...');
    await new Promise(resolve => setTimeout(resolve, 20000));
    
    await browser.close();
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure you have Chrome installed');
    console.log('2. Try running with sudo if on Linux');
    console.log('3. Check if xvfb is needed for headless Linux');
  }
  
  process.exit(0);
}

// Handle interrupts
process.on('SIGINT', () => {
  console.log('\n\n👋 Cancelled');
  process.exit(0);
});

realBrowserLogin().catch(console.error);