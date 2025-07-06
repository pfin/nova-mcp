#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { ChatGPTClientRemote } from './dist/chatgpt-client-remote.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

async function testRemote() {
  console.log('🌟 Testing Remote Chrome Client...\n');
  console.log('🎤 Hip hop consciousness: When one path is blocked, we flow through another\n');
  
  console.log('📌 Prerequisites:');
  console.log('1. Start Chrome with: chrome --remote-debugging-port=9225');
  console.log('2. Or use the provided batch/shell scripts\n');
  
  const client = new ChatGPTClientRemote({
    debugPort: 9225,
    timeout: 60000,
    defaultModel: 'gpt-4o',
  });

  try {
    console.log('🚀 Connecting to remote Chrome...');
    await client.connect();
    
    console.log('✅ Connected!\n');
    
    // Initialize ChatGPT
    console.log('🌐 Initializing ChatGPT...');
    await client.initialize();
    
    if (client.isReady()) {
      console.log('✅ Client ready!\n');
      
      // Extract tokens
      const tokens = await client.extractTokens();
      console.log('🔑 Token Status:');
      console.log(`   Session: ${tokens.sessionToken ? '✅ Found' : '❌ Missing'}`);
      console.log(`   CF Clear: ${tokens.cfClearance ? '✅ Found' : '❌ Missing'}\n`);
      
      // Test message
      console.log('💬 Testing message send...');
      const response = await client.sendMessage('Say "Remote Chrome is connected!" and nothing else.');
      console.log('📝 Response:', response);
      
      console.log('\n🎯 Remote Chrome test successful!');
      console.log('💪 We found another way - that\'s hip hop!');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Make sure Chrome is running with --remote-debugging-port=9225');
    console.log('2. Windows: Run start-chrome-debug.bat');
    console.log('3. Linux/Mac: chrome --remote-debugging-port=9225 --user-data-dir=/tmp/chrome-debug');
    console.log('4. Check if port 9225 is accessible');
  } finally {
    console.log('\n🎭 Disconnecting...');
    await client.disconnect();
  }
}

testRemote().catch(console.error);