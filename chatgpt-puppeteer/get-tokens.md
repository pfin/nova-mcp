# How to Get ChatGPT Session Tokens

Since we're in a headless environment, here's how to get your ChatGPT session tokens from your local browser:

## Method 1: Browser Developer Tools

1. **Open ChatGPT in your browser**
   - Go to https://chat.openai.com
   - Log in with your account

2. **Open Developer Tools**
   - Press F12 or right-click → Inspect
   - Go to the "Application" tab (Chrome) or "Storage" tab (Firefox)

3. **Find Cookies**
   - In the left sidebar, expand "Cookies"
   - Click on "https://chat.openai.com"

4. **Copy the tokens**
   - Find `__Secure-next-auth.session-token` - copy its Value
   - Find `cf_clearance` (if present) - copy its Value

5. **Set environment variables**
   ```bash
   export CHATGPT_SESSION_TOKEN="paste-your-session-token-here"
   export CHATGPT_CF_CLEARANCE="paste-your-cf-clearance-here"
   ```

## Method 2: Browser Console Script

1. **While logged into ChatGPT**, open the browser console (F12 → Console)

2. **Run this script**:
   ```javascript
   // Get all cookies for the current domain
   const cookies = document.cookie.split('; ').reduce((acc, cookie) => {
     const [name, value] = cookie.split('=');
     acc[name] = value;
     return acc;
   }, {});

   // Get the session token from localStorage/cookies
   const getToken = () => {
     // Try different methods
     const methods = [
       () => cookies['__Secure-next-auth.session-token'],
       () => localStorage.getItem('__Secure-next-auth.session-token'),
       () => {
         const allCookies = document.cookie.split('; ');
         const sessionCookie = allCookies.find(c => c.includes('session-token'));
         return sessionCookie ? sessionCookie.split('=')[1] : null;
       }
     ];
     
     for (const method of methods) {
       try {
         const token = method();
         if (token) return token;
       } catch (e) {}
     }
     return null;
   };

   const sessionToken = getToken();
   const cfClearance = cookies['cf_clearance'];

   console.log('Copy these to your .env file:');
   console.log('=====================================');
   if (sessionToken) {
     console.log(`CHATGPT_SESSION_TOKEN=${sessionToken}`);
   } else {
     console.log('Session token not found in cookies. Check Application → Cookies in DevTools');
   }
   if (cfClearance) {
     console.log(`CHATGPT_CF_CLEARANCE=${cfClearance}`);
   }
   console.log('=====================================');
   ```

3. **Copy the output** and save to `.env` file

## Method 3: Using Browser Extensions

1. **Install a cookie editor extension**:
   - Chrome: "EditThisCookie" or "Cookie-Editor"
   - Firefox: "Cookie Quick Manager"

2. **Export cookies** for chat.openai.com

3. **Find the required tokens** in the exported data

## Creating the .env file

Once you have the tokens, create a `.env` file in the chatgpt-puppeteer directory:

```bash
cd /home/peter/nova-mcp/chatgpt-puppeteer
cat > .env << EOF
CHATGPT_SESSION_TOKEN=your-token-here
CHATGPT_CF_CLEARANCE=your-clearance-here
EOF
```

## Testing

After setting up the tokens, test with:

```bash
npm run build
node -e "require('dotenv').config(); console.log('Session token:', process.env.CHATGPT_SESSION_TOKEN ? 'Found ✓' : 'Not found ✗')"
```

Then you can use the MCP tools!