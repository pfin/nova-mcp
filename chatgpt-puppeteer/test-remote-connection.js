#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { ChatGPTClientRemote } from './dist/chatgpt-client-remote.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

async function testRemoteConnection() {
  console.log('🔌 Testing Remote Chrome Connection...\n');
  
  const client = new ChatGPTClientRemote({
    debugPort: parseInt(process.env.CHROME_DEBUG_PORT || '9225'),
    timeout: 30000
  });

  try {
    console.log('📡 Connecting to Chrome on port', client.getDebugUrl());
    await client.initialize();
    
    if (client.isReady()) {
      console.log('✅ Connected and ready!\n');
      
      // Extract tokens
      const tokens = await client.extractTokens();
      if (tokens.sessionToken || tokens.cfClearance) {
        console.log('🔑 Found tokens:');
        console.log(`   Session: ${tokens.sessionToken ? '✅' : '❌'}`);
        console.log(`   CF Clear: ${tokens.cfClearance ? '✅' : '❌'}\n`);
      }
      
      // Test sending a message
      console.log('💬 Testing message send...');
      const response = await client.sendMessage('Say "Hello from remote Chrome!" and nothing else.');
      console.log('📝 Response:', response);
      
      console.log('\n✅ All tests passed!');
    } else {
      console.log('❌ Client not ready - check authentication');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    console.log('\n💡 Troubleshooting:');
    console.log('1. Make sure Chrome is running with:');
    console.log('   chrome.exe --remote-debugging-port=9225');
    console.log('2. Log into ChatGPT in the Chrome window');
    console.log('3. Check that port 9225 is not blocked');
  } finally {
    await client.disconnect();
    console.log('\n🔌 Disconnected');
  }
}

testRemoteConnection().catch(console.error);