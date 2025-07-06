// Human-Like Browser Automation with Puppeteer
// General purpose browser automation that mimics real user behavior

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs').promises;
const path = require('path');

// Use stealth plugin with all evasions
puppeteer.use(StealthPlugin());

class HumanBrowser {
  constructor(options = {}) {
    this.options = {
      headless: false,
      profilePath: './browser-profiles',
      defaultProfile: 'default',
      viewport: { width: 1920, height: 1080 },
      ...options
    };
    
    this.browser = null;
    this.page = null;
    this.currentProfile = null;
    
    // Human behavior parameters
    this.typingSpeed = { min: 50, max: 150 };
    this.mouseSpeed = 1.2;
    this.readingSpeed = 250; // words per minute
  }

  // Initialize browser with human-like settings
  async launch(profileName = this.options.defaultProfile) {
    const profilePath = path.join(this.options.profilePath, profileName);
    
    // Ensure profile directory exists
    await fs.mkdir(profilePath, { recursive: true });
    
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      `--user-data-dir=${profilePath}`,
      '--profile-directory=Default',
      `--window-size=${this.options.viewport.width},${this.options.viewport.height}`,
      '--start-maximized'
    ];

    // Random user agents pool
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    ];

    this.browser = await puppeteer.launch({
      headless: this.options.headless,
      args,
      defaultViewport: null,
      ignoreHTTPSErrors: true,
      devtools: false
    });

    this.currentProfile = profileName;
    return this.browser;
  }

  // Create a new page with anti-detection measures
  async newPage() {
    this.page = await this.browser.newPage();
    
    // Set random user agent
    const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    await this.page.setUserAgent(userAgent);
    
    // Inject human-like behaviors
    await this.page.evaluateOnNewDocument(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });
      
      // Add realistic plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          return [
            { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', length: 1 },
            { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', length: 1 },
            { name: 'Native Client', filename: 'internal-nacl-plugin', length: 2 }
          ];
        }
      });
      
      // Mock permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
      
      // Add chrome runtime
      window.chrome = {
        runtime: {},
        loadTimes: function() {},
        csi: function() {},
        app: {}
      };
      
      // Track mouse position for natural movements
      let mouseX = 0, mouseY = 0;
      document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
      });
      
      // Make window.navigator.webdriver undefined
      delete navigator.__proto__.webdriver;
    });
    
    // Set viewport with device scale factor
    await this.page.setViewport({
      ...this.options.viewport,
      deviceScaleFactor: 1,
      hasTouch: false,
      isLandscape: true,
      isMobile: false
    });
    
    return this.page;
  }

  // Navigate to a URL with human-like behavior
  async goto(url, options = {}) {
    const defaultOptions = {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    };
    
    await this.page.goto(url, { ...defaultOptions, ...options });
    
    // Wait for page to settle
    await this.wait(1000, 2000);
    
    // Perform initial mouse movement
    await this.moveMouseNaturally(
      Math.random() * this.options.viewport.width,
      Math.random() * this.options.viewport.height
    );
    
    return this.page;
  }

  // Natural mouse movement with bezier curves
  async moveMouseNaturally(toX, toY) {
    const from = await this.page.evaluate(() => ({
      x: window.mouseX || 0,
      y: window.mouseY || 0
    }));
    
    const distance = Math.sqrt(Math.pow(toX - from.x, 2) + Math.pow(toY - from.y, 2));
    const steps = Math.max(25, Math.floor(distance / 5));
    
    // Generate control points for bezier curve
    const cp1 = {
      x: from.x + (toX - from.x) * 0.25 + (Math.random() - 0.5) * 100,
      y: from.y + (toY - from.y) * 0.25 + (Math.random() - 0.5) * 100
    };
    
    const cp2 = {
      x: from.x + (toX - from.x) * 0.75 + (Math.random() - 0.5) * 100,
      y: from.y + (toY - from.y) * 0.75 + (Math.random() - 0.5) * 100
    };
    
    // Move along bezier curve
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = this.bezierPoint(from, cp1, cp2, { x: toX, y: toY }, t);
      
      await this.page.mouse.move(point.x, point.y);
      await this.wait(10 / this.mouseSpeed, 20 / this.mouseSpeed);
    }
  }

  // Calculate point on bezier curve
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

  // Click with natural movement and timing
  async click(selector, options = {}) {
    const element = await this.page.waitForSelector(selector, { 
      visible: true,
      timeout: options.timeout || 10000 
    });
    
    const box = await element.boundingBox();
    if (!box) throw new Error('Element not visible');
    
    // Random point within element (avoiding edges)
    const x = box.x + box.width * (0.2 + Math.random() * 0.6);
    const y = box.y + box.height * (0.2 + Math.random() * 0.6);
    
    // Move to element naturally
    await this.moveMouseNaturally(x, y);
    
    // Hover briefly
    await this.wait(100, 300);
    
    // Click with random button down/up timing
    await this.page.mouse.down();
    await this.wait(50, 150);
    await this.page.mouse.up();
    
    return element;
  }

  // Type with human-like patterns
  async type(selector, text, options = {}) {
    await this.click(selector, options);
    await this.wait(200, 500);
    
    // Clear existing text if requested
    if (options.clear) {
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('a');
      await this.page.keyboard.up('Control');
      await this.wait(50, 100);
      await this.page.keyboard.press('Delete');
      await this.wait(100, 200);
    }
    
    // Type character by character with variations
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      // Occasionally make typos and correct them
      if (Math.random() < 0.03 && i > 0 && i < text.length - 1) {
        // Make a typo
        const typoChar = this.getNearbyKey(char);
        await this.page.keyboard.type(typoChar);
        await this.wait(100, 300);
        
        // Realize mistake and correct
        await this.page.keyboard.press('Backspace');
        await this.wait(50, 150);
      }
      
      // Type the character
      await this.page.keyboard.type(char);
      
      // Variable typing speed
      let delay = this.randomBetween(this.typingSpeed.min, this.typingSpeed.max);
      
      // Longer pauses after punctuation
      if (['.', ',', '!', '?'].includes(char)) {
        delay += this.randomBetween(100, 300);
      }
      
      // Occasional thinking pauses
      if (Math.random() < 0.05) {
        delay += this.randomBetween(300, 800);
      }
      
      await this.wait(delay);
    }
  }

  // Get nearby key for typo simulation
  getNearbyKey(char) {
    const keyboard = {
      'a': ['q', 'w', 's', 'z'],
      'b': ['v', 'g', 'h', 'n'],
      'c': ['x', 'd', 'f', 'v'],
      // ... add more as needed
    };
    
    const nearby = keyboard[char.toLowerCase()];
    if (nearby) {
      return nearby[Math.floor(Math.random() * nearby.length)];
    }
    return char;
  }

  // Scroll naturally
  async scrollNaturally(direction = 'down', amount = null) {
    const scrollAmount = amount || this.randomBetween(100, 300);
    
    // Smooth scroll with momentum
    const steps = 20;
    const stepSize = scrollAmount / steps;
    
    for (let i = 0; i < steps; i++) {
      const progress = i / steps;
      const eased = this.easeOutCubic(progress);
      const currentStep = stepSize * (1 + (1 - eased) * 0.5);
      
      await this.page.evaluate((dir, step) => {
        if (dir === 'down') {
          window.scrollBy(0, step);
        } else {
          window.scrollBy(0, -step);
        }
      }, direction, currentStep);
      
      await this.wait(20, 40);
    }
  }

  // Read content naturally (simulate reading time)
  async readContent(selector) {
    const element = await this.page.waitForSelector(selector, { visible: true });
    const text = await element.evaluate(el => el.textContent);
    
    // Calculate reading time based on word count
    const wordCount = text.trim().split(/\s+/).length;
    const readingTime = (wordCount / this.readingSpeed) * 60 * 1000; // Convert to milliseconds
    
    // Simulate reading with occasional scrolls
    const startTime = Date.now();
    while (Date.now() - startTime < readingTime) {
      // Random eye movement (small mouse movements)
      const currentPos = await this.page.evaluate(() => ({
        x: window.mouseX || 0,
        y: window.mouseY || 0
      }));
      
      await this.moveMouseNaturally(
        currentPos.x + this.randomBetween(-50, 50),
        currentPos.y + this.randomBetween(-30, 30)
      );
      
      // Occasional scroll
      if (Math.random() < 0.3) {
        await this.scrollNaturally('down', this.randomBetween(50, 150));
      }
      
      await this.wait(2000, 4000);
    }
    
    return text;
  }

  // Wait for random time between min and max
  async wait(min = 1000, max = null) {
    const delay = max ? this.randomBetween(min, max) : min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  // Random number between min and max
  randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Easing function for smooth animations
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  // Take screenshot with timestamp
  async screenshot(name = 'screenshot') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}-${timestamp}.png`;
    await this.page.screenshot({ path: filename, fullPage: false });
    return filename;
  }

  // Fill form naturally
  async fillForm(formData) {
    for (const [selector, value] of Object.entries(formData)) {
      // Random order simulation
      await this.wait(500, 1500);
      
      // Check if it's a select element
      const isSelect = await this.page.evaluate(sel => {
        const element = document.querySelector(sel);
        return element && element.tagName === 'SELECT';
      }, selector);
      
      if (isSelect) {
        await this.page.select(selector, value);
      } else {
        await this.type(selector, value, { clear: true });
      }
      
      // Tab to next field occasionally
      if (Math.random() < 0.7) {
        await this.wait(100, 300);
        await this.page.keyboard.press('Tab');
      }
    }
  }

  // Handle popups and alerts
  async handlePopups() {
    this.page.on('dialog', async dialog => {
      console.log(`Dialog detected: ${dialog.message()}`);
      await this.wait(1000, 2000); // Think before dismissing
      await dialog.accept();
    });
  }

  // Save and load cookies
  async saveCookies(filename = 'cookies.json') {
    const cookies = await this.page.cookies();
    await fs.writeFile(
      path.join(this.options.profilePath, this.currentProfile, filename),
      JSON.stringify(cookies, null, 2)
    );
  }

  async loadCookies(filename = 'cookies.json') {
    try {
      const cookiesPath = path.join(this.options.profilePath, this.currentProfile, filename);
      const cookies = JSON.parse(await fs.readFile(cookiesPath, 'utf8'));
      await this.page.setCookie(...cookies);
      return true;
    } catch (err) {
      return false;
    }
  }

  // Close browser
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

// Example usage
async function example() {
  const browser = new HumanBrowser({
    headless: false,
    profilePath: './profiles'
  });

  try {
    // Launch browser with a specific profile
    await browser.launch('my-profile');
    
    // Create new page
    await browser.newPage();
    
    // Navigate to a website
    await browser.goto('https://example.com');
    
    // Interact naturally
    await browser.wait(2000, 3000);
    await browser.click('a[href="/about"]');
    
    // Fill a form
    await browser.fillForm({
      '#name': 'John Doe',
      '#email': 'john@example.com',
      '#message': 'This is a test message'
    });
    
    // Take screenshot
    await browser.screenshot('example-form');
    
    // Save cookies for next session
    await browser.saveCookies();
    
  } finally {
    await browser.close();
  }
}

module.exports = HumanBrowser;

// Run example if called directly
if (require.main === module) {
  example().catch(console.error);
}