import { handleAxiomMcpSpawn } from './src-v3/tools/axiom-mcp-spawn.js';
import { StatusManager } from './src-v3/managers/status-manager.js';
import { ConversationDB } from './src-v3/database/conversation-db.js';

async function testVerboseMode() {
  console.log('Testing Verbose Master Mode...\n');
  
  // Create instances
  const statusManager = new StatusManager();
  const conversationDB = new ConversationDB('./test-v3.db');
  
  try {
    // Initialize DB
    await conversationDB.initialize();
    
    // Test verbose mode
    const result = await handleAxiomMcpSpawn({
      parentPrompt: "Create a simple function that adds two numbers in Python and JavaScript",
      spawnPattern: "parallel",
      spawnCount: 2,
      maxDepth: 3,
      autoExecute: true,
      verboseMasterMode: true,
      streamingOptions: {
        outputMode: 'console',
        colorize: true,
        bufferSize: 1000,
        flushInterval: 100,
        includeTimestamps: false,
        prefixLength: 8
      }
    }, statusManager, conversationDB);
    
    console.log('\n\nResult:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await conversationDB.close();
  }
}

// Run test
testVerboseMode().catch(console.error);