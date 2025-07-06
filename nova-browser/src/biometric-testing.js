// Test suite for advanced biometric browser behaviors

const AdvancedHumanBrowser = require('./advanced-human-browser');

// Visualization helper for biometric data
class BiometricVisualizer {
  constructor() {
    this.data = {
      heartRate: [],
      breathing: [],
      fatigue: [],
      stress: [],
      mouseMovements: [],
      typingSpeed: [],
      errors: []
    };
    
    this.startTime = Date.now();
  }

  record(browser) {
    const elapsed = (Date.now() - this.startTime) / 1000;
    
    this.data.heartRate.push({
      time: elapsed,
      value: browser.biometrics.heartRate
    });
    
    this.data.breathing.push({
      time: elapsed,
      value: browser.breathingPattern()
    });
    
    this.data.fatigue.push({
      time: elapsed,
      value: browser.biometrics.fatigueFactor
    });
    
    this.data.stress.push({
      time: elapsed,
      value: browser.biometrics.stress
    });
  }

  recordMouseMovement(from, to, duration) {
    this.data.mouseMovements.push({
      time: (Date.now() - this.startTime) / 1000,
      from,
      to,
      duration,
      distance: Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2))
    });
  }

  recordTyping(char, delay, wasError) {
    this.data.typingSpeed.push({
      time: (Date.now() - this.startTime) / 1000,
      char,
      delay,
      wasError
    });
  }

  async saveReport(filename) {
    const fs = require('fs').promises;
    const report = {
      session: {
        duration: (Date.now() - this.startTime) / 1000,
        timestamp: new Date().toISOString()
      },
      biometrics: this.data,
      statistics: this.calculateStatistics()
    };
    
    await fs.writeFile(filename, JSON.stringify(report, null, 2));
    console.log(`Biometric report saved to ${filename}`);
  }

  calculateStatistics() {
    return {
      averageHeartRate: this.average(this.data.heartRate.map(d => d.value)),
      heartRateVariability: this.standardDeviation(this.data.heartRate.map(d => d.value)),
      averageStress: this.average(this.data.stress.map(d => d.value)),
      peakFatigue: Math.max(...this.data.fatigue.map(d => d.value)),
      mouseMovementStats: {
        count: this.data.mouseMovements.length,
        averageDistance: this.average(this.data.mouseMovements.map(d => d.distance)),
        averageDuration: this.average(this.data.mouseMovements.map(d => d.duration))
      },
      typingStats: {
        totalChars: this.data.typingSpeed.length,
        averageDelay: this.average(this.data.typingSpeed.map(d => d.delay)),
        errorRate: this.data.typingSpeed.filter(d => d.wasError).length / this.data.typingSpeed.length
      }
    };
  }

  average(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  standardDeviation(arr) {
    const avg = this.average(arr);
    const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
    return Math.sqrt(this.average(squareDiffs));
  }
}

// Test scenarios
async function testBiometricTyping() {
  console.log('Testing biometric typing patterns...');
  
  const browser = new AdvancedHumanBrowser({
    headless: false,
    autoBreaks: false
  });
  
  const visualizer = new BiometricVisualizer();
  
  try {
    await browser.launch('biometric-test');
    await browser.newPage();
    await browser.goto('https://www.keybr.com/');
    
    // Record baseline
    console.log('Recording baseline biometrics...');
    for (let i = 0; i < 10; i++) {
      visualizer.record(browser);
      await browser.wait(1000);
    }
    
    // Simulate increasing fatigue
    console.log('Simulating fatigue buildup...');
    browser.biometrics.fatigueFactor = 0;
    
    const texts = [
      'The quick brown fox jumps over the lazy dog.',
      'Pack my box with five dozen liquor jugs.',
      'How vexingly quick daft zebras jump!',
      'The five boxing wizards jump quickly.',
      'Sphinx of black quartz, judge my vow.'
    ];
    
    for (let round = 0; round < 5; round++) {
      // Gradually increase fatigue
      browser.biometrics.fatigueFactor = round * 0.2;
      browser.biometrics.caffeineLevel = Math.max(0, 1 - round * 0.2);
      
      console.log(`Round ${round + 1}: Fatigue=${browser.biometrics.fatigueFactor.toFixed(2)}`);
      
      for (const text of texts) {
        // Monitor typing
        const startMonitor = browser.page.evaluateHandle(() => {
          const delays = [];
          let lastTime = Date.now();
          
          document.addEventListener('keypress', (e) => {
            const now = Date.now();
            delays.push(now - lastTime);
            lastTime = now;
          });
          
          return delays;
        });
        
        await browser.typeWithPersonality('input[type="text"]', text, { clear: true });
        
        // Record biometrics
        visualizer.record(browser);
        
        await browser.wait(2000, 3000);
      }
    }
    
    // Test stress response
    console.log('Testing stress response...');
    browser.emotionalState.mood = 'frustrated';
    browser.biometrics.stress = 0.8;
    
    await browser.typeWithPersonality(
      'input[type="text"]',
      'This is a stressful typing test with likely errors!',
      { clear: true }
    );
    
    visualizer.record(browser);
    
    // Save report
    await visualizer.saveReport('biometric-typing-report.json');
    
  } finally {
    await browser.close();
  }
}

async function testMouseBiometrics() {
  console.log('Testing mouse movement biometrics...');
  
  const browser = new AdvancedHumanBrowser({
    headless: false
  });
  
  const visualizer = new BiometricVisualizer();
  
  try {
    await browser.launch('mouse-biometric-test');
    await browser.newPage();
    await browser.goto('https://quickdraw.withgoogle.com/');
    
    // Test different emotional states
    const states = [
      { mood: 'focused', stress: 0.2, confidence: 0.9 },
      { mood: 'frustrated', stress: 0.8, confidence: 0.4 },
      { mood: 'bored', stress: 0.3, confidence: 0.6 },
      { mood: 'excited', stress: 0.5, confidence: 1.0 }
    ];
    
    for (const state of states) {
      console.log(`Testing ${state.mood} state...`);
      
      browser.emotionalState.mood = state.mood;
      browser.biometrics.stress = state.stress;
      browser.emotionalState.confidence = state.confidence;
      
      // Perform various mouse movements
      const movements = [
        { x: 100, y: 100 },
        { x: 800, y: 100 },
        { x: 800, y: 600 },
        { x: 100, y: 600 },
        { x: 450, y: 350 }
      ];
      
      for (let i = 0; i < movements.length; i++) {
        const from = await browser.page.evaluate(() => ({
          x: window.mouseX || 0,
          y: window.mouseY || 0
        }));
        
        const startTime = Date.now();
        await browser.moveMouseBiometrically(movements[i].x, movements[i].y);
        const duration = Date.now() - startTime;
        
        visualizer.recordMouseMovement(from, movements[i], duration);
        visualizer.record(browser);
        
        await browser.wait(1000, 2000);
      }
    }
    
    await visualizer.saveReport('mouse-biometric-report.json');
    
  } finally {
    await browser.close();
  }
}

async function testReadingPatterns() {
  console.log('Testing reading patterns with attention modeling...');
  
  const browser = new AdvancedHumanBrowser({
    headless: false
  });
  
  const visualizer = new BiometricVisualizer();
  
  try {
    await browser.launch('reading-test');
    await browser.newPage();
    await browser.goto('https://en.wikipedia.org/wiki/Special:Random');
    
    // Test different attention levels
    const attentionLevels = [1.0, 0.7, 0.4, 0.2];
    
    for (const attention of attentionLevels) {
      console.log(`Testing with attention level: ${attention}`);
      
      browser.biometrics.attention = attention;
      browser.biometrics.fatigueFactor = 1 - attention;
      
      // Track eye movements
      const eyeMovements = [];
      browser.page.on('mousemove', (x, y) => {
        eyeMovements.push({
          time: Date.now(),
          x,
          y
        });
      });
      
      // Read content
      await browser.readWithAttention('#mw-content-text');
      
      visualizer.record(browser);
      
      // Navigate to next article
      await browser.intelligentClick('a[title*="Random article"]');
      await browser.contextualWait('page_load');
    }
    
    await visualizer.saveReport('reading-pattern-report.json');
    
  } finally {
    await browser.close();
  }
}

async function testLongSession() {
  console.log('Testing long session with break detection...');
  
  const browser = new AdvancedHumanBrowser({
    headless: false,
    autoBreaks: true
  });
  
  const visualizer = new BiometricVisualizer();
  
  // Record biometrics every 30 seconds
  const recordingInterval = setInterval(() => {
    visualizer.record(browser);
  }, 30000);
  
  try {
    await browser.launch('long-session-test');
    await browser.newPage();
    
    // Simulate 2-hour work session
    const tasks = [
      { url: 'https://mail.google.com', action: 'check email' },
      { url: 'https://docs.google.com', action: 'write document' },
      { url: 'https://calendar.google.com', action: 'check calendar' },
      { url: 'https://github.com', action: 'code review' },
      { url: 'https://stackoverflow.com', action: 'research' }
    ];
    
    const sessionDuration = 30 * 60 * 1000; // 30 minutes for demo
    const startTime = Date.now();
    
    while (Date.now() - startTime < sessionDuration) {
      // Pick random task
      const task = tasks[Math.floor(Math.random() * tasks.length)];
      
      console.log(`Performing task: ${task.action}`);
      await browser.goto(task.url);
      
      // Simulate work
      await browser.contextualWait('page_load');
      
      // Random interactions
      for (let i = 0; i < 5; i++) {
        if (Math.random() < 0.5) {
          await browser.organicScroll('down');
        }
        
        await browser.moveMouseBiometrically(
          Math.random() * 1920,
          Math.random() * 1080
        );
        
        await browser.wait(3000, 7000);
      }
      
      // Update emotional state based on "work"
      if (Math.random() < 0.3) {
        browser.updateEmotionalState({ type: 'error' });
      } else {
        browser.updateEmotionalState({ type: 'success' });
      }
      
      // Check if break needed
      const biometricState = browser.updateBiometrics();
      if (biometricState === 'break_needed') {
        console.log('Break needed - biometrics indicate fatigue');
      }
    }
    
    clearInterval(recordingInterval);
    await visualizer.saveReport('long-session-report.json');
    
  } finally {
    clearInterval(recordingInterval);
    await browser.close();
  }
}

// Device fingerprint consistency test
async function testFingerprintConsistency() {
  console.log('Testing device fingerprint consistency...');
  
  const profiles = ['profile1', 'profile2', 'profile3'];
  const fingerprints = [];
  
  for (const profile of profiles) {
    const browser = new AdvancedHumanBrowser({
      headless: false,
      defaultProfile: profile
    });
    
    try {
      await browser.launch(profile);
      await browser.newPage();
      await browser.goto('https://amiunique.org/fp');
      
      // Wait for fingerprint to load
      await browser.wait(5000);
      
      // Extract fingerprint data
      const fingerprint = await browser.page.evaluate(() => {
        const data = {};
        const rows = document.querySelectorAll('table tr');
        
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 2) {
            const key = cells[0].textContent.trim();
            const value = cells[1].textContent.trim();
            data[key] = value;
          }
        });
        
        return data;
      });
      
      fingerprints.push({
        profile,
        fingerprint,
        deviceProfile: browser.deviceProfile
      });
      
      console.log(`Profile ${profile} fingerprinted`);
      
    } finally {
      await browser.close();
    }
  }
  
  // Compare fingerprints
  const fs = require('fs').promises;
  await fs.writeFile(
    'fingerprint-consistency-report.json',
    JSON.stringify(fingerprints, null, 2)
  );
  
  console.log('Fingerprint report saved');
}

// Run all tests
async function runAllTests() {
  const tests = [
    { name: 'Biometric Typing', fn: testBiometricTyping },
    { name: 'Mouse Biometrics', fn: testMouseBiometrics },
    { name: 'Reading Patterns', fn: testReadingPatterns },
    { name: 'Long Session', fn: testLongSession },
    { name: 'Fingerprint Consistency', fn: testFingerprintConsistency }
  ];
  
  for (const test of tests) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Running: ${test.name}`);
    console.log('='.repeat(50));
    
    try {
      await test.fn();
      console.log(`✓ ${test.name} completed`);
    } catch (err) {
      console.error(`✗ ${test.name} failed:`, err.message);
    }
    
    // Break between tests
    console.log('\nTaking break between tests...');
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
}

// Export test functions
module.exports = {
  testBiometricTyping,
  testMouseBiometrics,  
  testReadingPatterns,
  testLongSession,
  testFingerprintConsistency,
  runAllTests,
  BiometricVisualizer
};

// Run specific test if called directly
if (require.main === module) {
  const testName = process.argv[2];
  
  if (testName && module.exports[testName]) {
    module.exports[testName]().catch(console.error);
  } else {
    console.log('Available tests:');
    console.log('  node biometric-testing.js testBiometricTyping');
    console.log('  node biometric-testing.js testMouseBiometrics');
    console.log('  node biometric-testing.js testReadingPatterns');
    console.log('  node biometric-testing.js testLongSession');
    console.log('  node biometric-testing.js testFingerprintConsistency');
    console.log('  node biometric-testing.js runAllTests');
  }
}