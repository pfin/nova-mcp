/**
 * Simple WebSocket Test - Just verify streaming works
 */

import { EventBus } from './core/event-bus.js';
import { MonitoringWebSocketServer } from './server/websocket-server.js';
import WebSocket from 'ws';

async function testWebSocket() {
  console.log('=== Simple WebSocket Test ===\n');
  
  // Create event bus
  const eventBus = new EventBus({ logDir: './logs-v3' });
  
  // Create WebSocket server
  const wsServer = new MonitoringWebSocketServer(eventBus, 8080);
  
  // Give server time to start
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Connect client
  console.log('Connecting client...');
  const ws = new WebSocket('ws://localhost:8080');
  
  const messages: any[] = [];
  
  ws.on('open', () => {
    console.log('✅ Client connected');
  });
  
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    messages.push(msg);
    console.log(`📥 Received: ${msg.type} ${msg.taskId || ''}`);
  });
  
  // Wait for connection
  await new Promise(resolve => ws.once('open', resolve));
  
  // Test 1: Event streaming
  console.log('\n--- Test 1: Event Streaming ---');
  eventBus.logEvent({
    taskId: 'test-123',
    workerId: 'test-worker',
    event: 'task_start' as any,
    payload: { message: 'Starting test task' }
  });
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  eventBus.logEvent({
    taskId: 'test-123',
    workerId: 'test-worker',
    event: 'task_complete' as any,
    payload: { message: 'Task completed' }
  });
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Test 2: Intervention
  console.log('\n--- Test 2: Intervention ---');
  
  let interventionReceived = false;
  wsServer.on('intervention', (data) => {
    console.log('📤 Server received intervention:', data);
    interventionReceived = true;
  });
  
  ws.send(JSON.stringify({
    type: 'intervene',
    taskId: 'test-123',
    prompt: 'Test intervention'
  }));
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Results
  console.log('\n--- Results ---');
  console.log(`Total messages received: ${messages.length}`);
  console.log(`System messages: ${messages.filter(m => m.type === 'system').length}`);
  console.log(`Stream messages: ${messages.filter(m => m.type === 'stream').length}`);
  console.log(`Task updates: ${messages.filter(m => m.type === 'task_update').length}`);
  console.log(`Intervention handled: ${interventionReceived ? '✅' : '❌'}`);
  
  // Cleanup
  ws.close();
  await wsServer.shutdown();
  await eventBus.close();
  
  console.log('\n✅ Test complete!');
}

testWebSocket().catch(console.error);