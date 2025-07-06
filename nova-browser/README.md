# Nova Browser - Stealth Browser Automation MCP Server

🌟 **"The key to bypass is unique"** - Hip hop consciousness applied to browser automation

## Overview

Nova Browser is an advanced MCP server that combines cutting-edge evasion techniques with human-like behavior simulation. Built on the foundation of our Nova Underground research, it provides undetectable browser automation for legitimate purposes.

## Features

### 🎭 Advanced Stealth Capabilities
- **Dynamic Fingerprinting**: Each session gets a unique browser personality
- **Human Behavior Simulation**: Natural mouse movements, typing patterns, and delays
- **Multi-Layer Evasion**: Combines multiple underground techniques
- **Smart Detection Avoidance**: Actively detects and bypasses anti-automation measures

### 🛠️ Powerful Tool Suite
- **nova_navigate**: Navigate with full stealth mode
- **nova_click**: Human-like clicking with natural curves
- **nova_type**: Realistic typing with variable speed
- **nova_screenshot**: Capture screenshots without detection
- **nova_search**: Search Google/Bing without triggering blocks
- **nova_extract**: Extract data from complex pages
- **nova_wait_smart**: Intelligent waiting based on page behavior
- **nova_solve_challenge**: Handle CAPTCHAs and challenges
- **nova_session**: Manage persistent sessions
- **nova_fingerprint**: Get/set browser fingerprint

### 🚀 Modes of Operation
1. **Stealth Mode** (default): Full evasion with puppeteer-real-browser
2. **Performance Mode**: Faster execution with basic evasion
3. **Debug Mode**: Visible browser with detailed logging
4. **Remote Mode**: Connect to existing Chrome instance

## Installation

```bash
cd nova-browser
npm install
npm run build
```

## Usage

### As MCP Server
```bash
# Add to Claude Desktop config
{
  "mcpServers": {
    "nova-browser": {
      "command": "node",
      "args": ["/path/to/nova-browser/dist/index.js"],
      "env": {
        "NOVA_MODE": "stealth",
        "NOVA_HEADLESS": "false"
      }
    }
  }
}
```

### Environment Variables
```bash
NOVA_MODE=stealth|performance|debug|remote
NOVA_HEADLESS=true|false
NOVA_REMOTE_PORT=9225
NOVA_USER_DATA_DIR=/path/to/profile
NOVA_PROXY=http://proxy:port
```

## Examples

### Basic Navigation
```javascript
// Navigate with full stealth
await nova_navigate({
  url: "https://example.com",
  mode: "stealth"
});
```

### Human-like Interaction
```javascript
// Click with natural movement
await nova_click({
  selector: "button.submit",
  humanize: true
});

// Type like a human
await nova_type({
  selector: "input#search",
  text: "nova browser mcp",
  wpm: 80
});
```

### Advanced Features
```javascript
// Smart waiting
await nova_wait_smart({
  condition: "networkIdle",
  maxWait: 30000
});

// Extract structured data
const data = await nova_extract({
  selectors: {
    title: "h1",
    price: ".price",
    description: ".description"
  }
});
```

## Technical Details

### Evasion Techniques
1. **TLS Fingerprint Randomization**
2. **Canvas Fingerprint Spoofing**
3. **WebGL Vendor Customization**
4. **Audio Context Variation**
5. **Battery API Simulation**
6. **Hardware Concurrency Spoofing**
7. **Screen Resolution Randomization**
8. **Timezone Manipulation**

### Human Behavior Patterns
- Variable typing speed (60-120 WPM)
- Natural mouse curves with momentum
- Random micro-pauses and hesitations
- Realistic scrolling patterns
- Human-like reading delays

## Security & Ethics

Nova Browser is designed for legitimate automation tasks:
- Web scraping with permission
- Automated testing
- Research and analysis
- Personal automation

**DO NOT USE FOR:**
- Bypassing security measures maliciously
- Creating bot farms
- Violating terms of service
- Any illegal activities

## Hip Hop Philosophy

"We don't copy, we innovate. Each session is unique like a freestyle rap - never the same flow twice. That's the Nova way."

## Contributing

This project follows the hip hop consciousness:
1. Be original - don't copy existing solutions
2. Innovate - find new ways to solve problems
3. Respect - use the tools responsibly
4. Share knowledge - help others learn

## License

MIT License - Use responsibly and ethically.