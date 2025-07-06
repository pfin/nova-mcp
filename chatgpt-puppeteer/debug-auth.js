#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Configure stealth
puppeteer.use(StealthPlugin());

async function debugAuth() {
  console.log('🔍 Debug Authentication Test\n');
  
  // Show tokens (partial)
  const sessionToken = process.env.CHATGPT_SESSION_TOKEN;
  const cfClearance = process.env.CHATGPT_CF_CLEARANCE;
  
  console.log('📋 Token Check:');
  console.log(`   Session Token: ${sessionToken ? sessionToken.substring(0, 50) + '...' : 'MISSING'}`);
  console.log(`   CF Clearance: ${cfClearance ? cfClearance.substring(0, 30) + '...' : 'MISSING'}\n`);

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ]
  });

  const page = await browser.newPage();
  
  // Set cookies BEFORE navigation
  console.log('🍪 Setting cookies...');
  const cookies = [];
  
  if (sessionToken) {
    cookies.push({
      name: '__Secure-next-auth.session-token',
      value: sessionToken,
      domain: '.chatgpt.com',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    });
  }

  if (cfClearance) {
    cookies.push({
      name: 'cf_clearance',
      value: cfClearance,
      domain: '.chatgpt.com',
      path: '/',
      httpOnly: true,
      secure: true,
    });
  }

  await page.setCookie(...cookies);
  console.log(`✅ Set ${cookies.length} cookies\n`);

  // Navigate
  console.log('🌐 Navigating to ChatGPT...');
  const response = await page.goto('https://chatgpt.com', { 
    waitUntil: 'domcontentloaded',
    timeout: 30000 
  });
  
  console.log(`📡 Response status: ${response.status()}`);
  console.log(`📍 Final URL: ${page.url()}\n`);

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Check all cookies
  console.log('🍪 All cookies after navigation:');
  const allCookies = await page.cookies();
  for (const cookie of allCookies) {
    if (cookie.name.includes('auth') || cookie.name.includes('cf_')) {
      console.log(`   ${cookie.name}: ${cookie.value.substring(0, 30)}...`);
    }
  }
  console.log('');

  // Check auth status
  console.log('🔐 Checking authentication status...');
  const authStatus = await page.evaluate(() => {
    const chatInput = document.querySelector('textarea[placeholder*="Message"], textarea#prompt-textarea, [contenteditable="true"]');
    const loginButton = document.querySelector('button[data-testid*="login"], a[href*="/auth/login"]');
    const challengeElement = document.querySelector('.cf-challenge-running, .cf-turnstile');
    
    return {
      hasChatInput: !!chatInput,
      hasLoginButton: !!loginButton,
      hasChallenge: !!challengeElement,
      url: window.location.href,
      title: document.title
    };
  });
  
  console.log('📊 Auth Status:');
  console.log(`   Chat Input Found: ${authStatus.hasChatInput ? '✅' : '❌'}`);
  console.log(`   Login Button Found: ${authStatus.hasLoginButton ? '✅' : '❌'}`);
  console.log(`   Challenge Found: ${authStatus.hasChallenge ? '✅' : '❌'}`);
  console.log(`   Current URL: ${authStatus.url}`);
  console.log(`   Page Title: ${authStatus.title}`);
  
  if (authStatus.hasChatInput && !authStatus.hasLoginButton) {
    console.log('\n✅ Successfully authenticated!');
  } else if (authStatus.hasChallenge) {
    console.log('\n⚠️  Cloudflare challenge detected');
  } else {
    console.log('\n❌ Not authenticated');
  }

  console.log('\n⏳ Keeping browser open for 20 seconds for inspection...');
  await new Promise(resolve => setTimeout(resolve, 20000));

  await browser.close();
}

debugAuth().catch(console.error);