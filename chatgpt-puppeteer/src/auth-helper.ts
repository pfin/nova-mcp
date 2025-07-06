import { Page } from 'puppeteer';

export interface LoginCredentials {
  email?: string;
  password?: string;
  sessionToken?: string;
  cfClearance?: string;
}

export class AuthHelper {
  static async attemptLogin(page: Page, credentials: LoginCredentials): Promise<boolean> {
    try {
      // If we have session cookies, try to set them
      if (credentials.sessionToken || credentials.cfClearance) {
        const cookies = [];
        
        if (credentials.sessionToken) {
          cookies.push({
            name: '__Secure-next-auth.session-token',
            value: credentials.sessionToken,
            domain: '.chatgpt.com',
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'Lax' as const,
          });
        }

        if (credentials.cfClearance) {
          cookies.push({
            name: 'cf_clearance',
            value: credentials.cfClearance,
            domain: '.chatgpt.com',
            path: '/',
            httpOnly: true,
            secure: true,
          });
        }

        await page.setCookie(...cookies);
        
        // Reload to apply cookies
        await page.reload({ waitUntil: 'networkidle2' });
        
        // Check if we're logged in
        const isLoggedIn = await page.evaluate(() => {
          const chatInput = document.querySelector('textarea[placeholder*="Message"], textarea#prompt-textarea');
          const loginButton = document.querySelector('button[data-testid*="login"], a[href*="/auth/login"]');
          return !!chatInput && !loginButton;
        });
        
        return isLoggedIn;
      }

      // If we have email/password, try traditional login (not recommended for production)
      if (credentials.email && credentials.password) {
        // Navigate to login page
        await page.goto('https://chatgpt.com/auth/login', { waitUntil: 'networkidle2' });
        
        // Wait for login form
        await page.waitForSelector('input[name="username"], input[name="email"]', { timeout: 10000 });
        
        // Fill in credentials
        await page.type('input[name="username"], input[name="email"]', credentials.email);
        await page.type('input[name="password"]', credentials.password);
        
        // Submit form
        await page.click('button[type="submit"]');
        
        // Wait for navigation
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
        
        // Check if we're logged in
        const isLoggedIn = await page.evaluate(() => {
          const chatInput = document.querySelector('textarea[placeholder*="Message"], textarea#prompt-textarea');
          return !!chatInput;
        });
        
        return isLoggedIn;
      }

      return false;
    } catch (error) {
      console.error('Login attempt failed:', error);
      return false;
    }
  }

  static async extractSessionInfo(page: Page): Promise<LoginCredentials> {
    const cookies = await page.cookies();
    const sessionInfo: LoginCredentials = {};

    for (const cookie of cookies) {
      if (cookie.name === '__Secure-next-auth.session-token') {
        sessionInfo.sessionToken = cookie.value;
      } else if (cookie.name === 'cf_clearance') {
        sessionInfo.cfClearance = cookie.value;
      }
    }

    return sessionInfo;
  }

  static getCredentialsFromEnv(): LoginCredentials {
    return {
      email: process.env.CHATGPT_EMAIL,
      password: process.env.CHATGPT_PASSWORD,
      sessionToken: process.env.CHATGPT_SESSION_TOKEN,
      cfClearance: process.env.CHATGPT_CF_CLEARANCE,
    };
  }
}