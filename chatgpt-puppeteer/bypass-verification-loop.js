#!/usr/bin/env node

console.log('🛡️ ChatGPT Verification Loop Bypass');
console.log('==================================\n');

console.log('The Cloudflare verification loop happens when it detects automated browsers.\n');

console.log('📝 SOLUTION: Use a REGULAR Chrome profile\n');

console.log('Step 1: Close ALL Chrome windows\n');

console.log('Step 2: Start Chrome with your NORMAL profile + debugging:\n');

console.log('On Windows, run this command:');
console.log('---------------------------------------');
console.log('"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%USERPROFILE%\\AppData\\Local\\Google\\Chrome\\User Data"');
console.log('---------------------------------------\n');

console.log('This uses your REAL Chrome profile where you are likely already logged in.\n');

console.log('Step 3: Once Chrome opens:');
console.log('  - Go to https://chat.openai.com');
console.log('  - You should already be logged in (no verification loop!)');
console.log('  - If not logged in, the verification should work normally\n');

console.log('Step 4: After you\'re on ChatGPT, run this command in WSL:');
console.log('  node extract-tokens-simple.js\n');

console.log('💡 WHY THIS WORKS:');
console.log('- Uses your real Chrome profile with all cookies/history');
console.log('- Cloudflare trusts your established browser profile');
console.log('- No automation flags that trigger detection\n');

console.log('⚠️  ALTERNATIVE if that doesn\'t work:\n');

console.log('Use Chrome INCOGNITO mode with debugging:');
console.log('---------------------------------------');
console.log('"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --incognito --remote-debugging-port=9222');
console.log('---------------------------------------\n');

console.log('Then manually log in (incognito often bypasses strict checks).\n');

process.exit(0);