/**
 * Tests for ThoughtMonitor
 */

import { createThoughtMonitor, DetectedThought } from './thought-monitor';

function testPlanningDetection() {
  console.log('\n=== Testing Planning Detection ===');
  
  const monitor = createThoughtMonitor({ debugMode: true });
  const detections: DetectedThought[] = [];
  
  monitor.on('pattern:planning', (d) => detections.push(d));
  
  // Test various planning phrases
  const testCases = [
    "Let me think about how to approach this problem.\n",
    "I would suggest implementing this in stages.\n",
    "First, I'll analyze the requirements.\n",
    "Here's my approach to solving this:\n",
    "The plan is to create three modules.\n"
  ];
  
  testCases.forEach(text => {
    monitor.processChunk(text);
  });
  
  console.log(`Detected ${detections.length} planning patterns`);
  detections.forEach(d => {
    console.log(`  - "${d.matched}" at position ${d.streamPosition}`);
  });
  
  monitor.destroy();
}

function testTodoViolations() {
  console.log('\n=== Testing TODO Violations ===');
  
  const monitor = createThoughtMonitor();
  const violations: DetectedThought[] = [];
  
  monitor.on('pattern:todo-violation', (d) => violations.push(d));
  
  const code = `
function processData(data) {
  // TODO: Add validation
  // FIXME: Handle edge cases
  
  // This needs implementation later
  throw new Error('Not implemented');
}
`;
  
  monitor.processChunk(code);
  
  console.log(`Found ${violations.length} TODO violations`);
  violations.forEach(v => {
    console.log(`  - ${v.pattern.description}: "${v.matched}"`);
  });
  
  monitor.destroy();
}

function testResearchLoops() {
  console.log('\n=== Testing Research Loop Detection ===');
  
  const monitor = createThoughtMonitor();
  const loops: DetectedThought[] = [];
  
  monitor.on('pattern:research-loop', (d) => loops.push(d));
  
  // Simulate repeated file checking
  const output = `
Reading file config.json...
Processing configuration...
Let me check config.json again to make sure...
Reading file config.json...
I need to understand the schema better.
Reading file config.json...
Checking file config.json...
`;
  
  monitor.processChunk(output);
  
  console.log(`Detected ${loops.length} research loop patterns`);
  loops.forEach(l => {
    console.log(`  - ${l.pattern.description}`);
  });
  
  monitor.destroy();
}

function testSuccessPatterns() {
  console.log('\n=== Testing Success Detection ===');
  
  const monitor = createThoughtMonitor();
  const successes: DetectedThought[] = [];
  
  monitor.on('pattern:success', (d) => successes.push(d));
  
  const output = `
Created file src/index.ts successfully.
Wrote 256 bytes to config.json.
Running tests...
✓ All tests pass
Implementation complete!
`;
  
  monitor.processChunk(output);
  
  console.log(`Detected ${successes.length} success patterns`);
  successes.forEach(s => {
    console.log(`  - ${s.pattern.description}: "${s.matched}"`);
  });
  
  monitor.destroy();
}

function testStallDetection() {
  console.log('\n=== Testing Stall Detection ===');
  
  const monitor = createThoughtMonitor({ 
    stallTimeout: 1000, // 1 second for testing
    debugMode: true 
  });
  
  let stallDetected = false;
  monitor.on('pattern:stall', (d) => {
    console.log(`Stall detected: ${d.pattern.description}`);
    stallDetected = true;
  });
  
  // Simulate some activity then stop
  monitor.processChunk('Starting task...\n');
  
  // Wait for stall detection
  setTimeout(() => {
    if (stallDetected) {
      console.log('✓ Stall detection working correctly');
    } else {
      console.log('✗ Stall detection failed');
    }
    monitor.destroy();
  }, 2000);
}

function testCharacterByCharacter() {
  console.log('\n=== Testing Character-by-Character Processing ===');
  
  const monitor = createThoughtMonitor();
  const detections: DetectedThought[] = [];
  
  monitor.on('detection', (d) => detections.push(d));
  
  // Simulate typing character by character
  const text = "Let me think about this TODO: implement later\n";
  let pos = 0;
  
  const interval = setInterval(() => {
    if (pos < text.length) {
      monitor.processChar(text[pos]);
      pos++;
    } else {
      clearInterval(interval);
      
      console.log(`Processed ${pos} characters`);
      console.log(`Found ${detections.length} patterns`);
      detections.forEach(d => {
        console.log(`  - ${d.pattern.type}: "${d.matched}"`);
      });
      
      monitor.destroy();
    }
  }, 10); // 10ms between characters
}

function testInterruptionFlow() {
  console.log('\n=== Testing Interruption Flow ===');
  
  const monitor = createThoughtMonitor();
  const interrupts: DetectedThought[] = [];
  
  monitor.on('interrupt-required', (d) => {
    interrupts.push(d);
    console.log(`🚨 Interrupt triggered: ${d.pattern.type} - ${d.pattern.description}`);
  });
  
  // Test critical patterns that should trigger interrupts
  const criticalOutput = `
// TODO: Implement the main logic here
function main() {
  throw new Error('Not implemented');
}

// FIXME: Add error handling
`;
  
  monitor.processChunk(criticalOutput);
  
  console.log(`\nTriggered ${interrupts.length} interruption requests`);
  
  monitor.destroy();
}

// Run all tests
async function runAllTests() {
  console.log('Running ThoughtMonitor Tests...\n');
  
  testPlanningDetection();
  testTodoViolations();
  testResearchLoops();
  testSuccessPatterns();
  testCharacterByCharacter();
  testInterruptionFlow();
  
  // Stall detection needs async
  setTimeout(() => {
    testStallDetection();
  }, 100);
}

// Run tests if called directly
if (require.main === module) {
  runAllTests();
}

export { runAllTests };