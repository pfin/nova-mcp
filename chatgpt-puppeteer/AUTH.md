# ChatGPT Authentication Guide

The ChatGPT Puppeteer MCP server uses puppeteer-extra with the stealth plugin to automate ChatGPT interactions. Due to ChatGPT's authentication requirements, you need to provide authentication credentials.

## Authentication Methods

### Method 1: Session Cookies (Recommended)

1. **Get your session cookies from ChatGPT**:
   - Open ChatGPT in your browser and log in
   - Open Developer Tools (F12)
   - Go to Application/Storage → Cookies → https://chat.openai.com
   - Find these cookies:
     - `__Secure-next-auth.session-token`
     - `cf_clearance` (if present)

2. **Set environment variables**:
   ```bash
   export CHATGPT_SESSION_TOKEN="your-session-token-value"
   export CHATGPT_CF_CLEARANCE="your-cf-clearance-value"  # Optional
   ```

3. **Run the server**:
   ```bash
   npm run build
   npx @modelcontextprotocol/inspector ./dist/index.js
   ```

### Method 2: Persistent Browser Session

The server automatically saves authenticated sessions to `./chatgpt-user-data` and `./chatgpt-session`. Once you log in manually, subsequent runs will reuse the saved session.

### Method 3: Email/Password (Not Recommended)

Due to security measures and potential captchas, this method is less reliable:

```bash
export CHATGPT_EMAIL="your-email@example.com"
export CHATGPT_PASSWORD="your-password"
```

## Troubleshooting

### "Authentication required" error

1. **Check your cookies**: Session tokens expire. Get fresh cookies from your browser.
2. **Clear saved data**: Remove `./chatgpt-user-data` and `./chatgpt-session` directories.
3. **Use non-headless mode**: Set `headless: false` in the client config for manual login.

### Bot detection

The stealth plugin helps avoid detection, but if you're still blocked:

1. Use cookies from a real browser session
2. Avoid rapid repeated requests
3. Use realistic delays between actions

### Rate limiting

ChatGPT has rate limits. The server doesn't automatically handle these, so:

1. Add delays between requests
2. Don't run multiple instances simultaneously
3. Consider implementing retry logic in your application

## Security Notes

- **Never commit credentials**: Add `.env` to `.gitignore`
- **Use environment variables**: Don't hardcode tokens
- **Session tokens expire**: Implement token refresh logic
- **Be respectful**: Don't abuse the service or violate OpenAI's terms

## Example Usage

```typescript
// After setting environment variables
const client = new ChatGPTClientEnhanced();
await client.initialize(); // Will use env credentials

// Or provide credentials programmatically
const client = new ChatGPTClientEnhanced({
  sessionPath: './my-session',
  userDataDir: './my-user-data',
});
```