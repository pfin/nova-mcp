#!/bin/bash

# Script to set up ChatGPT MCP server for remote Chrome connection

echo "🔧 ChatGPT MCP Remote Chrome Setup"
echo "=================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    touch .env
fi

# Update .env to use remote Chrome configuration
echo "📝 Configuring for remote Chrome connection..."

# Function to update or add env variable
update_env() {
    local key=$1
    local value=$2
    if grep -q "^${key}=" .env; then
        # Update existing
        sed -i "s|^${key}=.*|${key}=${value}|" .env
    else
        # Add new
        echo "${key}=${value}" >> .env
    fi
}

# Configure for remote Chrome
update_env "CHATGPT_USE_HYBRID" "true"
update_env "CHATGPT_HEADLESS" "true"
update_env "CHROME_DEBUG_PORT" "9225"
update_env "CHATGPT_USE_EXISTING_BROWSER" "true"

echo "✅ Environment configured for remote Chrome"
echo ""

echo "📋 Next Steps:"
echo "1. Launch Chrome with remote debugging:"
echo "   Windows:  chrome.exe --remote-debugging-port=9225 --user-data-dir=\"C:\\chatgpt-profile\""
echo "   Mac:      /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9225"
echo "   Linux:    google-chrome --remote-debugging-port=9225"
echo ""
echo "2. Log into ChatGPT in the Chrome window"
echo ""
echo "3. Extract tokens:"
echo "   node use-remote-chrome.js"
echo ""
echo "4. Update .env with the extracted tokens"
echo ""
echo "5. The MCP server will now use the remote Chrome connection"
echo ""

# Check if tokens are present
if grep -q "CHATGPT_SESSION_TOKEN=" .env && grep -q "CHATGPT_CF_CLEARANCE=" .env; then
    echo "✅ Tokens found in .env file"
else
    echo "⚠️  No tokens found in .env - you'll need to extract them"
fi

echo ""
echo "🚀 Setup complete!"