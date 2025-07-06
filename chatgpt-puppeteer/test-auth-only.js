#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { ChatGPTClientHybrid } from './dist/chatgpt-client-hybrid.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

async function testAuthOnly() {
  console.log('🧪 Testing ChatGPT Authentication Only...\n');
  
  const client = new ChatGPTClientHybrid({
    headless: false, // Let's see what's happening
    timeout: 60000
  });

  try {
    console.log('🚀 Initializing client (non-headless mode)...');
    await client.initialize();
    console.log('✅ Client initialized successfully!\n');

    // Just check if we're authenticated
    if (client.isReady()) {
      console.log('✅ Client is ready and authenticated!');
      
      // Extract current tokens
      const tokens = await client.extractTokens();
      console.log('\n🔑 Current tokens:');
      console.log(`   Session Token: ${tokens.sessionToken ? '✅ Present' : '❌ Missing'}`);
      console.log(`   CF Clearance: ${tokens.cfClearance ? '✅ Present' : '❌ Missing'}`);
      
      console.log('\n⏳ Waiting 10 seconds to observe the browser...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    console.log('\n🧹 Closing client...');
    await client.close();
  }
}

testAuthOnly().catch(console.error);