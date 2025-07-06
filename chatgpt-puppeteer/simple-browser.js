#!/usr/bin/env node

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🌐 Opening ChatGPT in a simple browser...\n');
console.log('This uses minimal automation to avoid detection.\n');

const browser = await puppeteer.launch({
  headless: false,
  defaultViewport: null,
  args: [
    '--start-maximized',
    '--disable-blink-features=AutomationControlled',
  ],
  ignoreDefaultArgs: ['--enable-automation'],
});

const page = await browser.newPage();

// Only set user agent, nothing else
await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

console.log('📍 Opening ChatGPT...\n');
await page.goto('https://chat.openai.com');

console.log('⚠️  MANUAL STEPS:');
console.log('1. Complete any verification if needed');
console.log('2. Log in to ChatGPT');
console.log('3. Once logged in, press Enter here\n');

await new Promise((resolve) => {
  process.stdin.once('data', resolve);
});

console.log('\n🔍 Getting cookies...');

const cookies = await page.cookies();
const sessionToken = cookies.find(c => c.name === '__Secure-next-auth.session-token');

if (sessionToken) {
  console.log('✅ Found session token!');
  
  const envContent = `CHATGPT_SESSION_TOKEN=${sessionToken.value}\n`;
  await fs.writeFile(path.join(__dirname, '.env'), envContent);
  
  console.log('📁 Saved to .env file');
  console.log('\n✅ Success! You can now use: mcp__chatgpt__chatgpt_ask');
} else {
  console.log('❌ No session token found');
}

console.log('\n⏳ Closing in 10 seconds...');
await new Promise(resolve => setTimeout(resolve, 10000));

await browser.close();