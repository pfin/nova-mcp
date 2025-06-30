# ChatGPT Puppeteer MCP Server

An MCP server that enables automated interaction with ChatGPT through Puppeteer, allowing you to compare responses from different AI models (GPT-4, GPT-4o, GPT-3.5, etc.).

## Features

- 🤖 **Multi-Model Support**: Switch between GPT-4, GPT-4o, GPT-3.5, and other available models
- 💬 **Automated Conversations**: Send queries and receive responses programmatically
- 🔄 **Session Management**: Maintain conversation context across multiple queries
- 📊 **Response Comparison**: Compare responses from different models side-by-side
- 🎯 **Model-Specific Queries**: Direct questions to specific ChatGPT models
- 🔐 **Session Persistence**: Save and restore chat sessions

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
CHATGPT_HEADLESS=true           # Run in headless mode (default: true)
CHATGPT_TIMEOUT=60000           # Response timeout in ms (default: 60s)
CHATGPT_MODEL=gpt-4            # Default model to use
CHATGPT_SESSION_PATH=./session  # Path to save session data
```

### Authentication
The tool will prompt for authentication on first use. Session cookies are saved for subsequent runs.

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