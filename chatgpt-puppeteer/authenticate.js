#!/usr/bin/env node

import { ChatGPTClientHybrid } from './dist/chatgpt-client-hybrid.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  console.log('🔐 ChatGPT Authentication Helper');
  console.log('================================\n');

  // Check for existing Chrome instance
  const useExisting = await new Promise((resolve) => {
    rl.question('Connect to existing Chrome browser? (y/n): ', (answer) => {
      resolve(answer.toLowerCase() === 'y');
    });
  });

  const config = {
    headless: false,
    useExistingBrowser: useExisting,
    debugPort: 9222
  };

  if (useExisting) {
    console.log('\n📌 Instructions:');
    console.log('1. Launch Chrome with: chrome.exe --remote-debugging-port=9222');
    console.log('2. Press Enter when ready...');
    await new Promise(resolve => rl.once('line', resolve));
  }

  const client = new ChatGPTClientHybrid(config);

  client.on('initialized', () => {
    console.log('✅ Client initialized successfully');
  });

  client.on('error', (error) => {
    console.error('❌ Error:', error.message);
  });

  try {
    console.log('\n🚀 Initializing ChatGPT client...');
    await client.initialize();

    console.log('\n🔑 Extracting authentication tokens...');
    const tokens = await client.extractTokens();

    if (tokens.sessionToken) {
      console.log('\n✅ Authentication successful!');
      console.log('\n📝 Tokens have been saved to .env file');
      console.log('\nYou can now use the ChatGPT MCP server.');
      
      // Test the connection
      const testMessage = await new Promise((resolve) => {
        rl.question('\nTest message (or press Enter to skip): ', resolve);
      });

      if (testMessage) {
        console.log('\n💬 Sending test message...');
        const response = await client.sendMessage(testMessage);
        console.log('\n🤖 Response:', response);
      }
    } else {
      console.log('\n⚠️ No session token found. Please make sure you are logged in.');
    }

  } catch (error) {
    console.error('\n❌ Authentication failed:', error);
  } finally {
    rl.close();
    
    const keepOpen = await new Promise((resolve) => {
      const rl2 = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      rl2.question('\nKeep browser open? (y/n): ', (answer) => {
        rl2.close();
        resolve(answer.toLowerCase() === 'y');
      });
    });

    if (!keepOpen) {
      await client.close();
    }
  }
}

main().catch(console.error);