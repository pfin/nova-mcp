# Nova Playwright MCP Server

A Playwright-based browser automation MCP server with advanced stealth capabilities and comprehensive debugging tools.

## Features

- **Stealth Mode**: Built-in anti-detection measures to avoid bot detection
- **Comprehensive Tools**: Navigation, element interaction, debugging, and data extraction
- **Error Handling**: Detailed error reporting and page state inspection
- **Screenshot Support**: Capture full page or element screenshots
- **Network Monitoring**: Track and debug network requests
- **Cookie Management**: Full cookie control

## Installation

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install
```

3. Build the TypeScript code:
```bash
npm run build
```

## Usage

### As an MCP Server

Add to your Claude desktop configuration:

```bash
claude mcp add puppeteer -- node /path/to/nova-playwright/dist/index.js
```

Or use the provided install script from the parent directory:

```bash
cd /path/to/nova-mcp
./mcp_install.sh
```

### Configuration

Environment variables:
- `NOVA_HEADLESS`: Set to "false" to see the browser (default: true)
- `NOVA_STEALTH`: Set to "false" to disable stealth mode (default: true)
- `NOVA_USER_DATA_DIR`: Path to persist browser data
- `NOVA_PROXY`: Proxy server URL
- `NOVA_SLOW_MO`: Slow down operations by specified milliseconds

## Available Tools

### Navigation
- `nova_navigate`: Navigate to a URL
- `nova_go_back`: Navigate back in history
- `nova_go_forward`: Navigate forward in history
- `nova_reload`: Reload the current page

### Waiting
- `nova_wait_for_element`: Wait for an element to appear
- `nova_wait_for_text`: Wait for specific text
- `nova_wait_until_loaded`: Wait until page is fully loaded

### Element State
- `nova_element_exists`: Check if element exists
- `nova_element_visible`: Check if element is visible
- `nova_element_count`: Count matching elements

### Debugging
- `nova_get_page_errors`: Get console errors
- `nova_get_network_status`: Get network request status
- `nova_get_page_state`: Get current page state

### Interaction
- `nova_click`: Click an element
- `nova_type`: Type text with human-like delays
- `nova_fill`: Fill a form field
- `nova_press`: Press keyboard keys
- `nova_hover`: Hover over an element
- `nova_scroll`: Scroll the page
- `nova_select`: Select dropdown option

### Data Extraction
- `nova_screenshot`: Take a screenshot
- `nova_evaluate`: Execute JavaScript
- `nova_extract`: Extract data from elements

### Browser Control
- `nova_set_viewport`: Set viewport size
- `nova_get_cookies`: Get cookies
- `nova_set_cookie`: Set a cookie
- `nova_clear_cookies`: Clear all cookies

## Testing

Test the server with the MCP inspector:

```bash
npm run test
```

Or run the included test script:

```bash
node test-swap-pulse.js
```

## Stealth Features

Nova Playwright includes multiple anti-detection measures:

- Removes `navigator.webdriver` property
- Overrides browser automation indicators
- Spoofs realistic browser fingerprints
- Adds human-like delays and interactions
- Bypasses common CDP detection methods
- Customizes user agent strings
- Implements realistic viewport and screen properties

## Troubleshooting

### Missing Libraries

If you see warnings about missing libraries on Linux, install them:

```bash
# Ubuntu/Debian
sudo apt-get install libgtk-4-1 libgraphene-1.0-0 libwoff1 libvpx7 libopus0 \
  libgstreamer1.0-0 libgstreamer-plugins-base1.0-0 libgstreamer-plugins-good1.0-0 \
  libflite1 libwebp7 libavif15 libharfbuzz-icu0 libenchant-2-2 libsecret-1-0 \
  libhyphen0 libmanette-0.2-0 libx264-dev
```

### Headless Mode

By default, the browser runs in headless mode. To see the browser:

```bash
export NOVA_HEADLESS=false
```

### Debugging

Enable verbose logging by checking:
- Console logs: Available via `nova_get_page_errors`
- Network logs: Available via `nova_get_network_status`
- Page state: Available via `nova_get_page_state`

## Development

Watch mode for development:

```bash
npm run watch
```

Lint the code:

```bash
npm run lint
```

## License

MIT