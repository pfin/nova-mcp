#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const sessionPath = './chatgpt-session';
const userDataPath = './chatgpt-user-data';

console.log('🧹 Clearing session data...');

// Clear session directory
if (fs.existsSync(sessionPath)) {
  fs.rmSync(sessionPath, { recursive: true, force: true });
  console.log('✅ Cleared session directory');
}

// Clear user data directory
if (fs.existsSync(userDataPath)) {
  fs.rmSync(userDataPath, { recursive: true, force: true });
  console.log('✅ Cleared user data directory');
}

console.log('\n✅ All session data cleared. The next run will start fresh.');