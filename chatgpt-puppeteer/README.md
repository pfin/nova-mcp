# ChatGPT Puppeteer MCP Server

An MCP server that enables automated interaction with ChatGPT through Puppeteer, allowing you to compare responses from different AI models (GPT-4, GPT-4o, GPT-3.5, etc.).

## Features

- 🤖 **Multi-Model Support**: Switch between GPT-4, GPT-4o, GPT-3.5, and other available models
- 💬 **Automated Conversations**: Send queries and receive responses programmatically
- 🔄 **Session Management**: Maintain conversation context across multiple queries
- 📊 **Response Comparison**: Compare responses from different models side-by-side
- 🎯 **Model-Specific Queries**: Direct questions to specific ChatGPT models
- 🔐 **Session Persistence**: Save and restore chat sessions
- 🥷 **Stealth Mode**: Uses puppeteer-extra-plugin-stealth to avoid bot detection
- 🔑 **Multiple Auth Methods**: Session cookies, persistent browser, or credentials

## Available Tools

### 1. `chatgpt_ask`
Send a question to ChatGPT and get a response.

**Parameters:**
- `query` (required): The question to ask
- `model` (optional): Specific model to use (e.g., "gpt-4", "gpt-4o", "gpt-3.5-turbo")
- `newConversation` (optional): Start a new conversation (default: false)

### 2. `chatgpt_compare_models`
Ask the same question to multiple models and compare responses.

**Parameters:**
- `query` (required): The question to ask
- `models` (required): Array of model names to compare

### 3. `chatgpt_select_model`
Switch to a different ChatGPT model.

**Parameters:**
- `model` (required): Model to switch to

### 4. `chatgpt_clear_conversation`
Clear the current conversation and start fresh.

### 5. `chatgpt_get_models`
Get a list of available ChatGPT models.

## Use Cases

1. **Model Comparison**: Compare how different models respond to the same prompt
2. **Quality Testing**: Test response quality across model versions
3. **Cost Optimization**: Find the most cost-effective model for your use case
4. **Research**: Study differences in model capabilities and behaviors
5. **Integration Testing**: Test AI integrations with different model backends

## Configuration

### Environment Variables
```bash
CHATGPT_HEADLESS=false               # Run in headless mode (default: false for ChatGPT)
CHATGPT_TIMEOUT=60000                # Response timeout in ms (default: 60s)
CHATGPT_MODEL=gpt-4o                 # Default model (gpt-4o or gpt-o3 recommended, NOT gpt-4)
CHATGPT_SESSION_PATH=./session       # Path to save session data

# Authentication (see AUTH.md for details)
CHATGPT_SESSION_TOKEN=your-token     # Session token from browser cookies
CHATGPT_CF_CLEARANCE=your-clearance  # Cloudflare clearance cookie (optional)
```

### Authentication
See [AUTH.md](./AUTH.md) for detailed authentication setup. The server supports:
- Session cookies from your browser (recommended)
- Persistent browser sessions
- Environment credentials

### Token Extraction Process

⚠️ **Important Update (2025)**: Direct Puppeteer connections to ChatGPT are blocked by Cloudflare's advanced bot detection. Even with valid session tokens, automated browsers receive 403 errors. Use the Remote Chrome method below for reliable access.

#### Recommended: Remote Chrome Method
This method connects to a manually-launched Chrome instance, bypassing all Cloudflare detection:

1. Launch Chrome with remote debugging:
   ```batch
   # Windows
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9225 --user-data-dir="C:\chatgpt-profile"
   
   # Mac
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9225
   
   # Linux
   google-chrome --remote-debugging-port=9225
   ```

2. Log into ChatGPT normally in the Chrome window

3. Extract tokens using our helper:
   ```bash
   # Automatic extraction and testing
   node use-remote-chrome.js
   
   # Or use the auth helper
   npm run auth
   ```

4. The script will:
   - Connect to your Chrome instance
   - Check authentication status
   - Extract session tokens
   - Display tokens to copy to `.env`

#### Manual Token Extraction:
If automated extraction fails:

1. Open Chrome DevTools (F12) on the ChatGPT tab
2. Go to Application → Cookies → https://chatgpt.com
3. Find and copy these cookies:
   - `__Secure-next-auth.session-token`
   - `cf_clearance`

4. Update your `.env` file:
   ```
   CHATGPT_SESSION_TOKEN=<your-session-token>
   CHATGPT_CF_CLEARANCE=<your-cf-clearance>
   ```

**Note**: Tokens expire approximately every 7 days. When authentication fails, refresh tokens using the remote Chrome method.

For detailed authentication information, see [AUTHENTICATION_SUMMARY.md](./AUTHENTICATION_SUMMARY.md).

#### Troubleshooting Authentication

If you get "Authentication required" errors:
1. Your tokens have likely expired - extract fresh tokens following the steps above
2. Ensure the domain is `.chatgpt.com` (not `.openai.com`)
3. Make sure you're logged into ChatGPT in Chrome before extracting tokens
4. The cf_clearance cookie is optional but helps with Cloudflare challenges

### Improved Authentication (Hybrid Mode)

For better reliability, use the hybrid authentication system:

```bash
# Run the authentication helper
npm run auth

# This will:
# 1. Launch a browser window
# 2. Let you manually log in and pass Cloudflare
# 3. Extract and save tokens automatically
# 4. Test the connection
```

The hybrid client provides:
- **Multiple auth strategies**: Tokens → Browser Profile → Manual
- **Session persistence**: Encrypted session storage
- **Behavioral mimicry**: Human-like interactions
- **Automatic token extraction**: Saves to .env automatically

Enable hybrid mode in your `.env`:
```bash
CHATGPT_USE_HYBRID=true
```

### Understanding Cloudflare Detection

Based on our [Red Team Analysis](./RED_TEAM_ANALYSIS.md), Cloudflare uses:
- **TLS Fingerprinting**: JA3/JA4 handshake analysis
- **Canvas Fingerprinting**: GPU rendering uniqueness
- **Behavioral Analysis**: Mouse/keyboard patterns
- **WebRTC Detection**: IP leak detection

The hybrid approach works by:
1. Using real browser sessions (not automated)
2. Preserving trust through session persistence
3. Simulating human behavior patterns
4. Falling back to manual auth when needed

## Example Usage

### Compare Models
```javascript
// Compare GPT-4 and GPT-3.5 responses
await chatgpt_compare_models({
  query: "Explain quantum computing in simple terms",
  models: ["gpt-4", "gpt-3.5-turbo"]
});
```

### Model-Specific Query
```javascript
// Ask GPT-4 specifically
await chatgpt_ask({
  query: "Write a haiku about programming",
  model: "gpt-4",
  newConversation: true
});
```

## Technical Details

- Uses Puppeteer for browser automation
- Handles dynamic content loading and model switching
- Implements retry logic for reliability
- Manages authentication state across sessions
- Provides clean response extraction

## Security Notes

- Never commit session data or cookies
- Use environment variables for sensitive configuration
- Run in sandboxed environment when possible
- Regularly rotate sessions for security