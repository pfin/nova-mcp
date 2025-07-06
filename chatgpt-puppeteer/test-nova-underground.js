#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { ChatGPTClientNovaUnderground } from './dist/chatgpt-client-nova-underground.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

async function testNovaUnderground() {
  console.log('🌟 Testing Nova Underground Client...\n');
  console.log('🎤 Hip hop consciousness: We innovate, we don\'t imitate\n');
  
  const client = new ChatGPTClientNovaUnderground();

  try {
    console.log('🚀 Initializing Nova Underground...');
    await client.initialize();
    
    if (client.isReady()) {
      console.log('✅ Client ready!\n');
      
      // Get session info
      const sessionInfo = client.getSessionInfo();
      console.log('📊 Session Info:');
      console.log(`   ID: ${sessionInfo.sessionId}`);
      console.log(`   Fingerprint: ${sessionInfo.fingerprint}`);
      console.log(`   Uptime: ${Math.round(sessionInfo.uptime / 1000)}s\n`);
      
      // Extract tokens
      const tokens = await client.extractTokens();
      console.log('🔑 Token Status:');
      console.log(`   Session: ${tokens.sessionToken ? '✅ Found' : '❌ Missing'}`);
      console.log(`   CF Clear: ${tokens.cfClearance ? '✅ Found' : '❌ Missing'}\n`);
      
      // Test message
      console.log('💬 Testing message send...');
      const response = await client.sendMessage('Say "Nova Underground is live!" and nothing else.');
      console.log('📝 Response:', response);
      
      console.log('\n🎯 Nova Underground test successful!');
      console.log('💪 The key to bypass is unique - and we found it!');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Make sure puppeteer-real-browser is properly installed');
    console.log('2. Check that xvfb is installed on Linux: sudo apt-get install xvfb');
    console.log('3. The browser will open in visible mode - complete any manual auth if needed');
  } finally {
    console.log('\n🎭 Closing Nova Underground...');
    await client.close();
  }
}

testNovaUnderground().catch(console.error);