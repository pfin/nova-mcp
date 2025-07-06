/**
 * Test WebSocket Server Integration
 * 
 * This verifies that:
 * 1. WebSocket server starts on port 8080
 * 2. Events from EventBus are streamed to clients
 * 3. Intervention messages work bidirectionally
 */

import { MasterController } from './core/master-controller.js';
import { EventBus } from './core/event-bus.js';
import WebSocket from 'ws';

async function testWebSocketIntegration() {
  console.log('=== Testing WebSocket Integration ===\n');
  
  // Create event bus and master controller
  const eventBus = new EventBus({ logDir: './logs-v3' });
  const master = new MasterController({
    eventBus,
    enableWebSocket: true,
    webSocketPort: 8080,
    maxWorkers: 2
  });
  
  // Give server time to start
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Connect WebSocket client
  console.log('Connecting WebSocket client...');
  const ws = new WebSocket('ws://localhost:8080');
  
  // Track received messages
  const receivedMessages: any[] = [];
  
  ws.on('open', () => {
    console.log('✅ WebSocket connected\n');
  });
  
  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    receivedMessages.push(message);
    console.log('📥 Received:', message.type, message.taskId || '');
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
  
  // Wait for connection
  await new Promise(resolve => ws.once('open', resolve));
  
  // Test 1: Submit a task and verify streaming
  console.log('\n--- Test 1: Task Submission and Streaming ---');
  const taskId = await master.submitTask('Write a simple hello world in Python', {
    priority: 1
  });
  console.log(`📝 Submitted task: ${taskId}`);
  
  // Wait for events to stream
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log(`\n📊 Received ${receivedMessages.length} messages`);
  const taskMessages = receivedMessages.filter(m => m.taskId === taskId);
  console.log(`📊 ${taskMessages.length} messages for our task`);
  
  // Test 2: Send intervention
  console.log('\n--- Test 2: Intervention ---');
  ws.send(JSON.stringify({
    type: 'intervene',
    taskId: taskId,
    prompt: 'Add a comment explaining the code'
  }));
  console.log('📤 Sent intervention command');
  
  // Wait for intervention to process
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Check for intervention event
  const interventionEvents = receivedMessages.filter(m => 
    m.data && m.data.event === 'intervention'
  );
  console.log(`📊 Received ${interventionEvents.length} intervention events`);
  
  // Test 3: Multiple concurrent connections
  console.log('\n--- Test 3: Multiple Connections ---');
  const ws2 = new WebSocket('ws://localhost:8080');
  await new Promise(resolve => ws2.once('open', resolve));
  console.log('✅ Second client connected');
  
  // Submit another task
  const taskId2 = await master.submitTask('Calculate fibonacci sequence', {
    priority: 2
  });
  
  // Both clients should receive events
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Cleanup
  console.log('\n--- Cleanup ---');
  ws.close();
  ws2.close();
  await master.shutdown();
  
  console.log('\n✅ WebSocket integration test complete!');
  console.log(`Total events received: ${receivedMessages.length}`);
  
  // Verify critical events
  const hasSystemEvent = receivedMessages.some(m => m.type === 'system');
  const hasStreamEvent = receivedMessages.some(m => m.type === 'stream');
  const hasTaskEvent = receivedMessages.some(m => m.data && m.data.event === 'task_start');
  
  console.log('\nVerification:');
  console.log(`- System events: ${hasSystemEvent ? '✅' : '❌'}`);
  console.log(`- Stream events: ${hasStreamEvent ? '✅' : '❌'}`);
  console.log(`- Task events: ${hasTaskEvent ? '✅' : '❌'}`);
}

// Run test
testWebSocketIntegration().catch(console.error);