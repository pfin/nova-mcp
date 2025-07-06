// Advanced Human Browser - Next Generation Bot Prevention Bypass
// Implements biometric patterns, emotional states, and learning behaviors

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

puppeteer.use(StealthPlugin());

class AdvancedHumanBrowser {
  constructor(options = {}) {
    this.options = {
      headless: false,
      profilePath: './browser-profiles',
      defaultProfile: 'default',
      viewport: { width: 1920, height: 1080 },
      ...options
    };
    
    // Biometric patterns
    this.biometrics = {
      heartRate: 70, // BPM - affects micro-movements
      breathingRate: 16, // Per minute - affects scroll patterns
      blinkRate: 17, // Per minute - affects focus changes
      fatigueFactor: 0, // 0-1, increases over time
      caffeineLevel: 0.5, // 0-1, affects speed and precision
      stress: 0.3, // 0-1, affects error rate
      attention: 0.8, // 0-1, affects reading patterns
      lastBreak: Date.now()
    };
    
    // Behavioral memory
    this.memory = {
      visitedSites: new Map(),
      learnedElements: new Map(),
      typingPatterns: new Map(),
      navigationHabits: [],
      sessionStart: Date.now(),
      totalActions: 0,
      errors: []
    };
    
    // Emotional state
    this.emotionalState = {
      mood: 'neutral', // neutral, focused, frustrated, bored, excited
      patience: 0.7, // 0-1, affects wait times
      curiosity: 0.5, // 0-1, affects exploration behavior
      confidence: 0.8 // 0-1, affects navigation speed
    };
    
    // Device fingerprint consistency
    this.deviceProfile = this.generateDeviceProfile();
    
    // Initialize behavioral models
    this.initializeBehavioralModels();
  }

  // Generate consistent device profile
  generateDeviceProfile() {
    const seed = this.options.defaultProfile;
    const hash = crypto.createHash('sha256').update(seed).digest('hex');
    
    // Use hash to generate consistent but random values
    const getValue = (index, min, max) => {
      const hex = hash.substr(index * 2, 2);
      const value = parseInt(hex, 16) / 255;
      return Math.floor(min + value * (max - min));
    };
    
    return {
      screenResolution: {
        width: getValue(0, 1366, 2560),
        height: getValue(1, 768, 1440)
      },
      colorDepth: getValue(2, 24, 32),
      pixelRatio: getValue(3, 1, 2),
      timezone: getValue(4, -12, 12) * 60,
      language: ['en-US', 'en-GB', 'en', 'es', 'fr', 'de'][getValue(5, 0, 6)],
      platform: ['Win32', 'MacIntel', 'Linux x86_64'][getValue(6, 0, 3)],
      memory: getValue(7, 4, 32),
      cores: getValue(8, 2, 16),
      touchPoints: getValue(9, 0, 1) * 10,
      fonts: this.generateFontList(hash)
    };
  }

  // Generate consistent font list
  generateFontList(hash) {
    const allFonts = [
      'Arial', 'Verdana', 'Times New Roman', 'Georgia', 'Comic Sans MS',
      'Trebuchet MS', 'Arial Black', 'Impact', 'Lucida Sans Unicode',
      'Tahoma', 'Lucida Console', 'Courier New', 'Monaco', 'Helvetica',
      'Calibri', 'Cambria', 'Consolas', 'Century Gothic', 'Candara'
    ];
    
    // Select subset based on hash
    const count = parseInt(hash.substr(20, 2), 16) % 10 + 10;
    const fonts = [];
    for (let i = 0; i < count; i++) {
      const index = parseInt(hash.substr(22 + i * 2, 2), 16) % allFonts.length;
      if (!fonts.includes(allFonts[index])) {
        fonts.push(allFonts[index]);
      }
    }
    return fonts;
  }

  // Initialize behavioral models
  initializeBehavioralModels() {
    // Circadian rhythm affects behavior
    this.circadianRhythm = () => {
      const hour = new Date().getHours();
      const minute = new Date().getMinutes();
      const timeOfDay = hour + minute / 60;
      
      // Energy levels throughout the day
      let energy = 0.5;
      if (timeOfDay >= 6 && timeOfDay <= 10) {
        energy = 0.3 + (timeOfDay - 6) * 0.175; // Morning ramp up
      } else if (timeOfDay >= 10 && timeOfDay <= 14) {
        energy = 0.9 - (timeOfDay - 10) * 0.05; // Peak to lunch dip
      } else if (timeOfDay >= 14 && timeOfDay <= 18) {
        energy = 0.7 + (timeOfDay - 14) * 0.05; // Afternoon recovery
      } else if (timeOfDay >= 18 && timeOfDay <= 22) {
        energy = 0.9 - (timeOfDay - 18) * 0.15; // Evening decline
      } else {
        energy = 0.3; // Night time low
      }
      
      return energy;
    };
    
    // Micro-movements from heartbeat
    this.heartbeatPattern = () => {
      const bpm = this.biometrics.heartRate + (Math.random() - 0.5) * 10;
      const period = 60000 / bpm; // ms per beat
      const phase = (Date.now() % period) / period;
      return Math.sin(phase * Math.PI * 2) * 2; // Small oscillation
    };
    
    // Breathing pattern affects scrolling
    this.breathingPattern = () => {
      const breathsPerMin = this.biometrics.breathingRate;
      const period = 60000 / breathsPerMin;
      const phase = (Date.now() % period) / period;
      
      // Inhale/exhale curve
      if (phase < 0.4) {
        return Math.sin(phase * 2.5 * Math.PI) * 0.7; // Inhale
      } else if (phase < 0.5) {
        return 0.7; // Pause
      } else if (phase < 0.9) {
        return 0.7 - Math.sin((phase - 0.5) * 2.5 * Math.PI) * 0.7; // Exhale
      } else {
        return 0; // Pause
      }
    };
  }

  // Update biometric state
  updateBiometrics() {
    const sessionDuration = Date.now() - this.memory.sessionStart;
    const minutesActive = sessionDuration / 60000;
    
    // Fatigue increases over time
    this.biometrics.fatigueFactor = Math.min(1, minutesActive / 120); // Max fatigue at 2 hours
    
    // Stress from errors
    const recentErrors = this.memory.errors.filter(e => 
      Date.now() - e.timestamp < 300000 // Last 5 minutes
    ).length;
    this.biometrics.stress = Math.min(1, 0.3 + recentErrors * 0.1);
    
    // Attention wanes with fatigue
    this.biometrics.attention = Math.max(0.3, 1 - this.biometrics.fatigueFactor * 0.5);
    
    // Caffeine decays
    this.biometrics.caffeineLevel = Math.max(0, this.biometrics.caffeineLevel - 0.001);
    
    // Heart rate affected by stress and caffeine
    this.biometrics.heartRate = 70 + 
      this.biometrics.stress * 20 + 
      this.biometrics.caffeineLevel * 10;
    
    // Check if break needed
    if (minutesActive > 45 && Date.now() - this.biometrics.lastBreak > 2700000) {
      return 'break_needed';
    }
  }

  // Update emotional state based on interactions
  updateEmotionalState(event) {
    switch (event.type) {
      case 'error':
        this.emotionalState.mood = 'frustrated';
        this.emotionalState.patience *= 0.8;
        this.emotionalState.confidence *= 0.9;
        break;
      
      case 'success':
        this.emotionalState.mood = 'focused';
        this.emotionalState.confidence = Math.min(1, this.emotionalState.confidence * 1.1);
        break;
      
      case 'waiting':
        this.emotionalState.patience *= 0.95;
        if (this.emotionalState.patience < 0.3) {
          this.emotionalState.mood = 'bored';
        }
        break;
      
      case 'discovery':
        this.emotionalState.mood = 'excited';
        this.emotionalState.curiosity = Math.min(1, this.emotionalState.curiosity * 1.2);
        break;
    }
  }

  // Advanced mouse movement with biometric influence
  async moveMouseBiometrically(toX, toY) {
    const from = await this.page.evaluate(() => ({
      x: window.mouseX || 0,
      y: window.mouseY || 0
    }));
    
    const distance = Math.sqrt(Math.pow(toX - from.x, 2) + Math.pow(toY - from.y, 2));
    const baseSteps = Math.max(25, Math.floor(distance / 5));
    
    // Adjust steps based on fatigue and caffeine
    const steps = Math.floor(baseSteps * (1 + this.biometrics.fatigueFactor * 0.3));
    
    // Generate control points with personality
    const jitter = 50 * (1 + this.biometrics.stress);
    const smoothness = 0.8 - this.biometrics.fatigueFactor * 0.3;
    
    const cp1 = {
      x: from.x + (toX - from.x) * 0.25 + (Math.random() - 0.5) * jitter,
      y: from.y + (toY - from.y) * 0.25 + (Math.random() - 0.5) * jitter
    };
    
    const cp2 = {
      x: from.x + (toX - from.x) * 0.75 + (Math.random() - 0.5) * jitter,
      y: from.y + (toY - from.y) * 0.75 + (Math.random() - 0.5) * jitter
    };
    
    // Move with micro-tremors from heartbeat
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = this.bezierPoint(from, cp1, cp2, { x: toX, y: toY }, t);
      
      // Add heartbeat micro-movement
      const heartbeat = this.heartbeatPattern();
      const tremor = this.biometrics.fatigueFactor * 3;
      
      await this.page.mouse.move(
        point.x + heartbeat + (Math.random() - 0.5) * tremor,
        point.y + (Math.random() - 0.5) * tremor
      );
      
      // Variable speed based on confidence and fatigue
      const speedMultiplier = this.emotionalState.confidence * (1 - this.biometrics.fatigueFactor * 0.5);
      await this.wait(10 / speedMultiplier, 20 / speedMultiplier);
    }
  }

  // Context-aware clicking
  async intelligentClick(selector, options = {}) {
    const element = await this.page.waitForSelector(selector, {
      visible: true,
      timeout: options.timeout || 10000
    });
    
    // Check if we've clicked this before
    const memory = this.memory.learnedElements.get(selector);
    if (memory) {
      // Faster, more confident click
      const box = await element.boundingBox();
      
      // Click in remembered area
      const x = box.x + box.width * memory.preferredX;
      const y = box.y + box.height * memory.preferredY;
      
      await this.moveMouseBiometrically(x, y);
      await this.wait(50, 150); // Quicker recognition
    } else {
      // First time - explore the element
      const box = await element.boundingBox();
      
      // Hover and explore
      await this.moveMouseBiometrically(
        box.x + box.width * 0.5,
        box.y + box.height * 0.5
      );
      
      await this.wait(200, 500); // Reading/recognition time
      
      // Decide where to click based on element size
      const preferredX = 0.3 + Math.random() * 0.4;
      const preferredY = 0.3 + Math.random() * 0.4;
      
      // Remember for next time
      this.memory.learnedElements.set(selector, {
        preferredX,
        preferredY,
        clickCount: 1,
        lastClicked: Date.now()
      });
      
      const x = box.x + box.width * preferredX;
      const y = box.y + box.height * preferredY;
      
      await this.moveMouseBiometrically(x, y);
      await this.wait(100, 300);
    }
    
    // Click with pressure variation
    await this.performClick();
    
    // Update memory
    if (memory) {
      memory.clickCount++;
      memory.lastClicked = Date.now();
    }
    
    return element;
  }

  // Realistic click with pressure simulation
  async performClick() {
    const clickDuration = 50 + Math.random() * 100;
    const doubleClickChance = this.emotionalState.mood === 'frustrated' ? 0.05 : 0.01;
    
    await this.page.mouse.down();
    await this.wait(clickDuration);
    await this.page.mouse.up();
    
    // Accidental double clicks when frustrated
    if (Math.random() < doubleClickChance) {
      await this.wait(50, 150);
      await this.page.mouse.down();
      await this.wait(clickDuration * 0.8);
      await this.page.mouse.up();
    }
  }

  // Advanced typing with personal patterns
  async typeWithPersonality(selector, text, options = {}) {
    await this.intelligentClick(selector, options);
    await this.wait(200, 500);
    
    // Clear if needed
    if (options.clear) {
      await this.selectAll();
      await this.page.keyboard.press('Delete');
      await this.wait(100, 200);
    }
    
    // Get or create typing pattern for this text type
    const textType = this.classifyText(text);
    let pattern = this.memory.typingPatterns.get(textType);
    
    if (!pattern) {
      pattern = this.generateTypingPattern();
      this.memory.typingPatterns.set(textType, pattern);
    }
    
    // Type with personal rhythm
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      // Typing speed affected by multiple factors
      const baseSpeed = pattern.averageSpeed;
      const fatigueMod = 1 + this.biometrics.fatigueFactor * 0.5;
      const stressMod = 1 + this.biometrics.stress * 0.3;
      const caffeineMod = 1 - this.biometrics.caffeineLevel * 0.2;
      
      const speed = baseSpeed * fatigueMod * stressMod * caffeineMod;
      
      // Common typing patterns
      if (Math.random() < pattern.errorRate * (1 + this.biometrics.stress)) {
        await this.makeTypingError(char, text, i);
      }
      
      // Burst typing for common words
      const nextWord = this.getWordAt(text, i);
      if (pattern.knownWords.has(nextWord.toLowerCase())) {
        // Type whole word quickly
        for (const c of nextWord) {
          await this.page.keyboard.type(c);
          await this.wait(speed * 0.7, speed * 0.9);
        }
        i += nextWord.length - 1;
      } else {
        // Regular typing
        await this.page.keyboard.type(char);
        
        // Natural pauses
        let delay = this.randomBetween(speed * 0.8, speed * 1.2);
        
        // Longer pauses after punctuation
        if (['.', ',', '!', '?', ';', ':'].includes(char)) {
          delay += this.randomBetween(200, 500);
        }
        
        // Thinking pauses
        if (Math.random() < 0.03) {
          delay += this.randomBetween(500, 1500);
          
          // Sometimes backspace during thinking
          if (Math.random() < 0.3 && i > 0) {
            await this.wait(delay * 0.5);
            await this.page.keyboard.press('Backspace');
            await this.wait(200, 400);
            i--; // Retype the character
          }
        }
        
        await this.wait(delay);
      }
    }
  }

  // Make realistic typing errors
  async makeTypingError(intendedChar, fullText, position) {
    const errorTypes = ['transpose', 'neighbor', 'double', 'missing'];
    const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
    
    switch (errorType) {
      case 'transpose':
        if (position < fullText.length - 1) {
          // Type next char first
          await this.page.keyboard.type(fullText[position + 1]);
          await this.wait(50, 150);
          await this.page.keyboard.type(intendedChar);
          
          // Realize error and fix
          await this.wait(200, 600);
          await this.page.keyboard.press('Backspace');
          await this.page.keyboard.press('Backspace');
          await this.wait(100, 200);
        }
        break;
      
      case 'neighbor':
        const wrongChar = this.getNeighborKey(intendedChar);
        await this.page.keyboard.type(wrongChar);
        await this.wait(100, 300);
        await this.page.keyboard.press('Backspace');
        await this.wait(50, 150);
        break;
      
      case 'double':
        await this.page.keyboard.type(intendedChar);
        await this.wait(30, 80);
        await this.page.keyboard.type(intendedChar);
        await this.wait(150, 400);
        await this.page.keyboard.press('Backspace');
        break;
      
      case 'missing':
        // Skip character, then go back
        if (position < fullText.length - 2) {
          await this.page.keyboard.type(fullText[position + 1]);
          await this.wait(100, 300);
          await this.page.keyboard.press('ArrowLeft');
          await this.wait(100, 200);
          await this.page.keyboard.type(intendedChar);
          await this.page.keyboard.press('ArrowRight');
        }
        break;
    }
  }

  // Classify text type for appropriate typing pattern
  classifyText(text) {
    if (text.includes('@')) return 'email';
    if (text.match(/^https?:\/\//)) return 'url';
    if (text.match(/^\d+$/)) return 'number';
    if (text.match(/^[A-Z][a-z]+\s[A-Z][a-z]+$/)) return 'name';
    if (text.length > 50) return 'paragraph';
    return 'general';
  }

  // Generate personal typing pattern
  generateTypingPattern() {
    return {
      averageSpeed: this.randomBetween(80, 120),
      errorRate: 0.02 + Math.random() * 0.03,
      knownWords: new Set([
        'the', 'and', 'for', 'are', 'but', 'not', 'you', 'with',
        'have', 'this', 'from', 'they', 'will', 'would', 'there',
        'their', 'what', 'about', 'which', 'when', 'make', 'can',
        'time', 'just', 'know', 'take', 'people', 'into', 'year',
        'your', 'good', 'some', 'could', 'them', 'than', 'like'
      ])
    };
  }

  // Breathing-influenced scrolling
  async organicScroll(direction = 'down', amount = null) {
    const breathing = this.breathingPattern();
    const baseAmount = amount || this.randomBetween(200, 400);
    
    // Adjust scroll based on breathing and reading
    const scrollAmount = baseAmount * (1 + breathing * 0.2);
    
    // Smooth scroll with natural acceleration
    const duration = 500 + this.biometrics.fatigueFactor * 300;
    const steps = 30;
    
    for (let i = 0; i < steps; i++) {
      const progress = i / steps;
      const eased = this.easeInOutSine(progress);
      
      await this.page.evaluate((dir, amount, eased) => {
        const currentStep = amount * eased / 30;
        if (dir === 'down') {
          window.scrollBy(0, currentStep);
        } else {
          window.scrollBy(0, -currentStep);
        }
      }, direction, scrollAmount, eased);
      
      await this.wait(duration / steps);
    }
    
    // Sometimes overshoot and correct
    if (Math.random() < 0.1) {
      await this.wait(200, 400);
      await this.organicScroll(
        direction === 'down' ? 'up' : 'down',
        scrollAmount * 0.1
      );
    }
  }

  // Reading with attention patterns
  async readWithAttention(selector) {
    const element = await this.page.waitForSelector(selector, { visible: true });
    const text = await element.evaluate(el => el.textContent);
    
    const wordCount = text.trim().split(/\s+/).length;
    const baseReadingTime = (wordCount / 250) * 60 * 1000; // 250 WPM base
    
    // Adjust for attention and fatigue
    const attentionMod = 2 - this.biometrics.attention;
    const readingTime = baseReadingTime * attentionMod;
    
    const startTime = Date.now();
    
    // Simulate eye movement while reading
    const boundingBox = await element.boundingBox();
    let currentLine = 0;
    const linesEstimate = Math.ceil(wordCount / 10); // Rough estimate
    
    while (Date.now() - startTime < readingTime) {
      // Saccadic eye movements
      const lineProgress = currentLine / linesEstimate;
      
      // F-pattern reading for web content
      if (lineProgress < 0.3) {
        // Read thoroughly at the beginning
        await this.simulateReadingPattern(boundingBox, 'horizontal');
      } else if (lineProgress < 0.6) {
        // Start skimming
        await this.simulateReadingPattern(boundingBox, 'f-pattern');
      } else {
        // Quick scanning at the end
        await this.simulateReadingPattern(boundingBox, 'scan');
      }
      
      // Attention wandering
      if (Math.random() < (1 - this.biometrics.attention) * 0.1) {
        // Look away briefly
        await this.moveMouseBiometrically(
          Math.random() * this.options.viewport.width,
          Math.random() * this.options.viewport.height
        );
        await this.wait(1000, 3000);
      }
      
      // Scroll as reading progresses
      if (Math.random() < 0.3) {
        await this.organicScroll('down', 50 + Math.random() * 150);
      }
      
      currentLine++;
      await this.wait(2000, 4000);
    }
    
    return text;
  }

  // Simulate different reading patterns
  async simulateReadingPattern(boundingBox, pattern) {
    switch (pattern) {
      case 'horizontal':
        // Left to right reading
        for (let i = 0; i < 3; i++) {
          await this.moveMouseBiometrically(
            boundingBox.x + Math.random() * 50,
            boundingBox.y + (i * 30) + Math.random() * 20
          );
          await this.wait(100, 300);
          
          await this.moveMouseBiometrically(
            boundingBox.x + boundingBox.width - Math.random() * 50,
            boundingBox.y + (i * 30) + Math.random() * 20
          );
          await this.wait(200, 400);
        }
        break;
      
      case 'f-pattern':
        // F-shaped reading pattern
        await this.moveMouseBiometrically(
          boundingBox.x + boundingBox.width * 0.7,
          boundingBox.y
        );
        await this.wait(300, 500);
        
        await this.moveMouseBiometrically(
          boundingBox.x,
          boundingBox.y + 50
        );
        await this.wait(200, 400);
        
        await this.moveMouseBiometrically(
          boundingBox.x + boundingBox.width * 0.5,
          boundingBox.y + 50
        );
        break;
      
      case 'scan':
        // Quick vertical scanning
        await this.moveMouseBiometrically(
          boundingBox.x + Math.random() * boundingBox.width,
          boundingBox.y + Math.random() * 100
        );
        await this.wait(100, 200);
        break;
    }
  }

  // Take breaks like a human
  async takeBreak() {
    console.log('Taking a break...');
    
    // Move mouse to a corner (like moving away from desk)
    await this.moveMouseBiometrically(10, 10);
    
    // Idle for break duration
    const breakDuration = this.randomBetween(180000, 600000); // 3-10 minutes
    await this.wait(breakDuration);
    
    // Reset some biometrics after break
    this.biometrics.fatigueFactor *= 0.5;
    this.biometrics.stress *= 0.7;
    this.biometrics.attention = Math.min(1, this.biometrics.attention * 1.5);
    this.biometrics.lastBreak = Date.now();
    this.emotionalState.patience = Math.min(1, this.emotionalState.patience * 1.3);
    
    // Simulate return - move mouse back
    await this.moveMouseBiometrically(
      this.options.viewport.width / 2,
      this.options.viewport.height / 2
    );
    
    console.log('Break finished, resuming...');
  }

  // Learn from navigation patterns
  async learnNavigation(url, action) {
    this.memory.navigationHabits.push({
      url,
      action,
      timestamp: Date.now(),
      successful: true
    });
    
    // Keep only recent habits
    this.memory.navigationHabits = this.memory.navigationHabits
      .filter(h => Date.now() - h.timestamp < 86400000); // 24 hours
  }

  // Adaptive wait times based on context
  async contextualWait(context) {
    let baseWait = 1000;
    
    switch (context) {
      case 'page_load':
        baseWait = 2000 + this.emotionalState.patience * 3000;
        break;
      
      case 'after_click':
        baseWait = 500 + (1 - this.emotionalState.confidence) * 1500;
        break;
      
      case 'before_type':
        baseWait = 300 + this.biometrics.fatigueFactor * 700;
        break;
      
      case 'thinking':
        baseWait = 1000 + (1 - this.biometrics.attention) * 2000;
        break;
    }
    
    // Add randomness
    const actualWait = baseWait * (0.8 + Math.random() * 0.4);
    await this.wait(actualWait);
  }

  // Override parent methods with biometric enhancements
  async launch(profileName = this.options.defaultProfile) {
    const browser = await super.launch(profileName);
    
    // Start biometric monitoring
    this.biometricInterval = setInterval(() => {
      const state = this.updateBiometrics();
      if (state === 'break_needed' && this.options.autoBreaks) {
        this.takeBreak();
      }
    }, 30000); // Check every 30 seconds
    
    return browser;
  }

  async newPage() {
    this.page = await this.browser.newPage();
    
    // Apply device fingerprint
    await this.page.evaluateOnNewDocument((deviceProfile) => {
      // Override screen properties
      Object.defineProperty(screen, 'width', {
        get: () => deviceProfile.screenResolution.width
      });
      Object.defineProperty(screen, 'height', {
        get: () => deviceProfile.screenResolution.height
      });
      Object.defineProperty(screen, 'colorDepth', {
        get: () => deviceProfile.colorDepth
      });
      
      // Override navigator properties
      Object.defineProperty(navigator, 'language', {
        get: () => deviceProfile.language
      });
      Object.defineProperty(navigator, 'platform', {
        get: () => deviceProfile.platform
      });
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => deviceProfile.cores
      });
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => deviceProfile.memory
      });
      Object.defineProperty(navigator, 'maxTouchPoints', {
        get: () => deviceProfile.touchPoints
      });
      
      // Timezone
      const originalDateTimeFormat = Intl.DateTimeFormat;
      Intl.DateTimeFormat = function(...args) {
        args[1] = { ...args[1], timeZone: `UTC${deviceProfile.timezone >= 0 ? '+' : ''}${deviceProfile.timezone / 60}` };
        return originalDateTimeFormat.apply(this, args);
      };
      
      // WebGL fingerprint spoofing
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) {
          return 'Intel Inc.'; // UNMASKED_VENDOR_WEBGL
        }
        if (parameter === 37446) {
          return 'Intel Iris OpenGL Engine'; // UNMASKED_RENDERER_WEBGL
        }
        return getParameter.apply(this, [parameter]);
      };
      
      // Canvas fingerprint protection
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(...args) {
        const dataURL = originalToDataURL.apply(this, args);
        // Add slight noise to canvas
        return dataURL.replace(/[A-Za-z0-9+\/]{4}(?=[A-Za-z0-9+\/]{4}|=|$)/g, match => {
          const char = match.charCodeAt(0);
          return String.fromCharCode(char + (Math.random() < 0.01 ? 1 : 0));
        });
      };
      
      // Font detection protection
      const originalGetComputedStyle = window.getComputedStyle;
      window.getComputedStyle = function(...args) {
        const result = originalGetComputedStyle.apply(this, args);
        if (args[1] === 'font-family') {
          // Return only whitelisted fonts
          const fontList = deviceProfile.fonts || ['Arial', 'Times New Roman'];
          return fontList.join(', ');
        }
        return result;
      };
      
    }, this.deviceProfile);
    
    // Set viewport with device scale
    await this.page.setViewport({
      width: this.options.viewport.width,
      height: this.options.viewport.height,
      deviceScaleFactor: this.deviceProfile.pixelRatio,
      hasTouch: this.deviceProfile.touchPoints > 0,
      isLandscape: true,
      isMobile: false
    });
    
    return this.page;
  }

  // Enhanced navigation with memory
  async goto(url, options = {}) {
    // Check if we've visited before
    const visitMemory = this.memory.visitedSites.get(url);
    
    if (visitMemory) {
      console.log(`Returning to familiar site: ${url}`);
      // Faster, more confident navigation
      await this.page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
        ...options
      });
      
      await this.contextualWait('page_load');
      
      // Update visit count
      visitMemory.visitCount++;
      visitMemory.lastVisit = Date.now();
    } else {
      console.log(`First visit to: ${url}`);
      // Cautious first visit
      await this.page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
        ...options
      });
      
      await this.contextualWait('page_load');
      
      // Explore the page
      await this.exploreNewSite();
      
      // Remember the site
      this.memory.visitedSites.set(url, {
        firstVisit: Date.now(),
        lastVisit: Date.now(),
        visitCount: 1,
        elements: new Map()
      });
    }
    
    // Learn from navigation
    await this.learnNavigation(url, 'visit');
    
    return this.page;
  }

  // Explore new sites like a curious human
  async exploreNewSite() {
    // Random exploration pattern
    const explorationMoves = this.randomBetween(3, 7);
    
    for (let i = 0; i < explorationMoves; i++) {
      // Look around the page
      const x = Math.random() * this.options.viewport.width;
      const y = Math.random() * this.options.viewport.height;
      
      await this.moveMouseBiometrically(x, y);
      await this.wait(500, 1500);
      
      // Maybe scroll a bit
      if (Math.random() < 0.5) {
        await this.organicScroll('down', 100 + Math.random() * 200);
      }
    }
    
    // Update emotional state
    this.updateEmotionalState({ type: 'discovery' });
  }

  // Cleanup
  async close() {
    if (this.biometricInterval) {
      clearInterval(this.biometricInterval);
    }
    
    // Save session memory
    const memoryPath = path.join(
      this.options.profilePath,
      this.currentProfile,
      'browser-memory.json'
    );
    
    await fs.writeFile(memoryPath, JSON.stringify({
      biometrics: this.biometrics,
      emotionalState: this.emotionalState,
      memory: {
        visitedSites: Array.from(this.memory.visitedSites.entries()),
        learnedElements: Array.from(this.memory.learnedElements.entries()),
        typingPatterns: Array.from(this.memory.typingPatterns.entries()),
        navigationHabits: this.memory.navigationHabits
      }
    }, null, 2));
    
    await super.close();
  }

  // Helper methods from parent class
  bezierPoint(p0, p1, p2, p3, t) {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;
    
    return {
      x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
      y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
    };
  }

  wait(min, max = null) {
    const delay = max ? this.randomBetween(min, max) : min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  easeInOutSine(t) {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  }

  selectAll() {
    return this.page.keyboard.down('Control').then(() => 
      this.page.keyboard.press('a')
    ).then(() => 
      this.page.keyboard.up('Control')
    );
  }

  getNeighborKey(char) {
    const keyboard = {
      'q': ['w', 'a'],
      'w': ['q', 'e', 's'],
      'e': ['w', 'r', 'd'],
      'r': ['e', 't', 'f'],
      't': ['r', 'y', 'g'],
      'y': ['t', 'u', 'h'],
      'u': ['y', 'i', 'j'],
      'i': ['u', 'o', 'k'],
      'o': ['i', 'p', 'l'],
      'p': ['o', 'l'],
      'a': ['q', 's', 'z'],
      's': ['a', 'w', 'd', 'x'],
      'd': ['s', 'e', 'f', 'c'],
      'f': ['d', 'r', 'g', 'v'],
      'g': ['f', 't', 'h', 'b'],
      'h': ['g', 'y', 'j', 'n'],
      'j': ['h', 'u', 'k', 'm'],
      'k': ['j', 'i', 'l'],
      'l': ['k', 'o', 'p'],
      'z': ['a', 'x'],
      'x': ['z', 's', 'c'],
      'c': ['x', 'd', 'v'],
      'v': ['c', 'f', 'b'],
      'b': ['v', 'g', 'n'],
      'n': ['b', 'h', 'm'],
      'm': ['n', 'j']
    };
    
    const neighbors = keyboard[char.toLowerCase()];
    if (neighbors) {
      const neighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
      return char === char.toUpperCase() ? neighbor.toUpperCase() : neighbor;
    }
    return char;
  }

  getWordAt(text, position) {
    let start = position;
    let end = position;
    
    while (start > 0 && /\w/.test(text[start - 1])) start--;
    while (end < text.length && /\w/.test(text[end])) end++;
    
    return text.substring(start, end);
  }
}

// Export the advanced browser
module.exports = AdvancedHumanBrowser;