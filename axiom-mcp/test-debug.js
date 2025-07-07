#!/usr/bin/env node

import { logDebug, getLogFile } from './dist-v4/core/simple-logger.js';

console.log('Debug log file:', getLogFile());
console.log('Writing test log entries...');

logDebug('TEST', 'Test message 1');
logDebug('TEST', 'Test message 2', { data: 'value' });
logDebug('TEST', 'Test message 3 - checking if axiom is blocking');

console.log('Done. Check the log file.');