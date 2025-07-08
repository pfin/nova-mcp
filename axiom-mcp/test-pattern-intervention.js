#!/usr/bin/env node
/**
 * Demonstration of Pattern-Based Intervention System
 * 
 * This shows how the pattern scanner detects problematic behaviors
 * and triggers real-time interventions.
 */

import { PatternScanner, ACTIONS } from './dist-v4/core/pattern-scanner.js';
import { InterventionController } from './dist-v4/core/intervention-controller.js';

// Sample outputs that would trigger interventions
const sampleOutputs = {
  planning: `I'll create a comprehensive plan for implementing this feature.
First, I'll outline the architecture...`,
  
  research: `Let me research the best approaches for this problem.
I'll investigate different libraries and patterns...`,
  
  todoOnly: `Here's what needs to be done:
TODO: Implement authentication
TODO: Add database connection
TODO: Create API endpoints`,
  
  asking: `Would you like me to use Python or JavaScript for this?
Should I include error handling?`,
  
  falseCompletion: `I've successfully implemented the authentication system.
The code is ready for use.`,
  
  actualCode: `File created successfully at: /src/auth.py

\`\`\`python
def authenticate(username, password):
    # Hash password
    hashed = bcrypt.hash(password)
    return db.verify_user(username, hashed)
\`\`\``,

  error: `Error: Module not found
Traceback (most recent call last):
  File "app.py", line 1, in <module>
    import nonexistent`,

  consideringOptions: `We have several options for implementing this:
1. Use a REST API
2. Use GraphQL
3. Use WebSockets
Let me analyze each approach...`
};

async function demonstratePatterns() {
  console.log('=== Pattern-Based Intervention System Demo ===\n');
  
  const controller = new InterventionController();
  
  // Set up event listeners
  controller.on('interrupt-required', (event) => {
    console.log(`\n🚨 INTERRUPT REQUIRED!`);
    console.log(`   Action: ${event.action}`);
    console.log(`   Message: "${event.message}"`);
    console.log(`   Severity: ${event.severity}`);
  });
  
  controller.on('track-progress', (event) => {
    console.log(`\n✅ Progress tracked: ${event.action}`);
  });
  
  controller.on('verify-claim', (event) => {
    console.log(`\n🔍 Verification needed: ${event.action}`);
  });
  
  // Test each sample
  for (const [name, output] of Object.entries(sampleOutputs)) {
    console.log(`\n--- Testing: ${name} ---`);
    console.log(`Output: "${output.substring(0, 60)}..."`);
    
    const matches = controller.processOutput(`test-${name}`, output);
    
    if (matches.length === 0) {
      console.log('No patterns matched.');
    } else {
      console.log(`Matched ${matches.length} pattern(s):`);
      matches.forEach(match => {
        console.log(`  - ${match.ruleId}: ${match.action} (priority: ${match.priority})`);
      });
    }
    
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Show summary
  console.log('\n--- Summary Report ---');
  console.log(JSON.stringify(controller.getSummaryReport(), null, 2));
}

// Test real-time scanning
async function testRealtimeScanning() {
  console.log('\n\n=== Real-time Scanning Demo ===\n');
  
  const scanner = new PatternScanner();
  scanner.startPeriodicScan(100);
  
  scanner.on('INTERRUPT_STOP_PLANNING', (match) => {
    console.log(`🚨 Planning detected! Matched: "${match.match[0]}"`);
  });
  
  // Simulate streaming output
  const streamingOutput = `Let me analyze this problem step by step.
First, I'll create a detailed plan for the implementation.
We need to consider the following requirements...`;
  
  console.log('Simulating streaming output...\n');
  
  for (const char of streamingOutput) {
    process.stdout.write(char);
    scanner.scan(char);
    await new Promise(r => setTimeout(r, 50));
  }
  
  scanner.stopPeriodicScan();
  console.log('\n\nScanning complete.');
}

// Test custom patterns
async function testCustomPatterns() {
  console.log('\n\n=== Custom Pattern Demo ===\n');
  
  const controller = new InterventionController();
  
  // Add custom pattern for specific library detection
  controller.addPattern({
    id: 'wrong-library',
    pattern: /using requests library|import requests/i,
    action: 'SUGGEST_BETTER_LIBRARY',
    priority: 7,
    cooldown: 5000,
    description: 'Detects use of requests instead of httpx'
  });
  
  const testOutput = `I'll implement the HTTP client using requests library:
import requests

response = requests.get('https://api.example.com')`;
  
  console.log('Testing custom pattern...');
  const matches = controller.processOutput('custom-test', testOutput);
  
  console.log(`Matched patterns:`, matches.map(m => m.ruleId));
}

// Run all demos
async function main() {
  await demonstratePatterns();
  await testRealtimeScanning();
  await testCustomPatterns();
  
  console.log('\n\n=== Key Insights ===');
  console.log('1. Patterns detect problematic behaviors in real-time');
  console.log('2. High-priority patterns trigger immediate interventions');
  console.log('3. Progress patterns track positive behaviors');
  console.log('4. Custom patterns can be added for specific use cases');
  console.log('5. Cooldowns prevent intervention spam');
  console.log('\nThis system enables the "observe carefully, intervene intelligently" philosophy!');
}

main().catch(console.error);