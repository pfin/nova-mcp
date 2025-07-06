#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { ChatGPTClientHybrid } from './dist/chatgpt-client-hybrid.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

async function testAuthentication() {
  console.log('🧪 Testing ChatGPT Hybrid Authentication...\n');
  
  // Check environment variables
  console.log('📋 Environment Check:');
  console.log(`   SESSION_TOKEN: ${process.env.CHATGPT_SESSION_TOKEN ? '✅ Present' : '❌ Missing'}`);
  console.log(`   CF_CLEARANCE: ${process.env.CHATGPT_CF_CLEARANCE ? '✅ Present' : '❌ Missing'}`);
  console.log(`   HEADLESS: ${process.env.CHATGPT_HEADLESS || 'not set'}`);
  console.log(`   USE_HYBRID: ${process.env.CHATGPT_USE_HYBRID || 'not set'}\n`);

  const client = new ChatGPTClientHybrid({
    headless: process.env.CHATGPT_HEADLESS === 'true',
    timeout: 30000
  });

  try {
    console.log('🚀 Initializing client...');
    await client.initialize();
    console.log('✅ Client initialized successfully!\n');

    // Test sending a simple message
    console.log('💬 Sending test message...');
    const response = await client.sendMessage('Say "Hello from ChatGPT!" and nothing else.');
    console.log('📝 Response:', response);
    console.log('\n✅ Authentication and messaging test successful!');

    // Extract and display current tokens
    const tokens = await client.extractTokens();
    console.log('\n🔑 Current tokens:');
    console.log(`   Session Token: ${tokens.sessionToken ? tokens.sessionToken.substring(0, 50) + '...' : 'Not found'}`);
    console.log(`   CF Clearance: ${tokens.cfClearance ? tokens.cfClearance.substring(0, 30) + '...' : 'Not found'}`);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    console.log('\n🧹 Closing client...');
    await client.close();
    console.log('✅ Client closed.');
  }
}

testAuthentication().catch(console.error);