#!/usr/bin/env node

console.log('🔍 Verifying Chrome Debug Port');
console.log('==============================\n');

console.log('Since you have MIRRORED networking, localhost should work.\n');

console.log('The connection is being REFUSED, which means:\n');

console.log('❌ Chrome is NOT listening on port 9222\n');

console.log('Common reasons:\n');

console.log('1. Chrome was already running when you ran the command');
console.log('   → Close ALL Chrome windows first\n');

console.log('2. The command didn\'t include the port');
console.log('   → Make sure you typed: --remote-debugging-port=9222\n');

console.log('3. Chrome started but couldn\'t bind to the port');
console.log('   → Check if another process is using port 9222\n');

console.log('✅ CORRECT STEPS:\n');

console.log('1. In Windows: Close ALL Chrome windows');
console.log('2. In Windows Command Prompt, run:');
console.log('   "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222');
console.log('3. Chrome should open with "DevTools listening on ws://..." in the console');
console.log('4. Then run the token extractor\n');

console.log('💡 To verify Chrome is listening, in Windows run:');
console.log('   netstat -an | findstr :9222');
console.log('   You should see "0.0.0.0:9222" or "127.0.0.1:9222" LISTENING\n');

// Try one more connection attempt
try {
  const response = await fetch('http://localhost:9222/json/version');
  const data = await response.json();
  console.log('✅ WAIT! Chrome IS running! Found:', data.Browser);
} catch (e) {
  console.log('❌ Confirmed: Chrome is NOT accessible on port 9222');
}

process.exit(0);