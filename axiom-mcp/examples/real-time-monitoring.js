/**
 * Real-Time Monitoring Example
 * 
 * See exactly what's happening character-by-character
 * with verbose master mode.
 */

// Enable verbose mode to see everything
axiom_spawn({
  prompt: "Create a Node.js CLI tool that fetches weather data",
  verboseMasterMode: true  // ← This is the key!
});

// What you'll see in real-time:
/*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           VERBOSE MASTER MODE - SINGLE EXECUTION          
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Task: Create a Node.js CLI tool that fetches weather data
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[task-123] I'll create a Node.js CLI tool that fetches wea...
[task-123] [INTERVENTION - 1.3s] Stop planning! Create weather-cli.js NOW!
[task-123] Creating weather-cli.js...
[task-123] 
[task-123] ```javascript
[task-123] #!/usr/bin/env node
[task-123] const https = require('https');
[task-123] const process = require('process');
[task-123] 
[task-123] const API_KEY = process.env.WEATHER_API_KEY;
[task-123] const city = process.argv[2] || 'London';
[task-123] ...
[task-123] ```
[task-123] 
[task-123] File created: weather-cli.js (247 bytes)
[task-123] Task completed successfully!
*/

// Character-by-character monitoring shows:
// - Exact moment planning is detected
// - Intervention timing (usually <2 seconds)
// - Complete output stream
// - File creation confirmation