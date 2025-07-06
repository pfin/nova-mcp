#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import net from 'net';

const execAsync = promisify(exec);

console.log('🔍 Chrome Connection Diagnostics');
console.log('================================\n');

// Check WSL version and networking mode
try {
  const { stdout: wslVersion } = await execAsync('wsl.exe --version 2>/dev/null || echo "WSL1"');
  console.log('WSL Version:', wslVersion.trim());
} catch (e) {
  console.log('WSL Version: Unable to determine');
}

// Check if mirrored networking is enabled
try {
  const { stdout: wslConfig } = await execAsync('cat /mnt/c/Users/$USER/.wslconfig 2>/dev/null || echo "No .wslconfig"');
  if (wslConfig.includes('networkingMode=mirrored')) {
    console.log('✅ Mirrored networking enabled\n');
  } else {
    console.log('⚠️  Mirrored networking NOT enabled\n');
  }
} catch (e) {
  console.log('Could not check .wslconfig\n');
}

// Get Windows host IP
try {
  const { stdout: hostIP } = await execAsync('cat /etc/resolv.conf | grep nameserver | awk \'{print $2}\'');
  console.log('Windows host IP:', hostIP.trim());
} catch (e) {
  console.log('Could not get Windows host IP');
}

console.log('\n📡 Testing connections to port 9222:\n');

// Test different IPs
const ips = [
  { host: 'localhost', ip: '127.0.0.1' },
  { host: '0.0.0.0', ip: '0.0.0.0' },
];

// Add Windows host IP if found
try {
  const { stdout } = await execAsync('cat /etc/resolv.conf | grep nameserver | awk \'{print $2}\'');
  const windowsIP = stdout.trim();
  if (windowsIP && windowsIP !== '127.0.0.1') {
    ips.push({ host: 'Windows Host', ip: windowsIP });
  }
} catch (e) {}

for (const { host, ip } of ips) {
  await new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    
    socket.on('connect', () => {
      console.log(`✅ ${host} (${ip}:9222) - CONNECTED`);
      socket.destroy();
      resolve();
    });
    
    socket.on('timeout', () => {
      console.log(`❌ ${host} (${ip}:9222) - TIMEOUT`);
      socket.destroy();
      resolve();
    });
    
    socket.on('error', (err) => {
      console.log(`❌ ${host} (${ip}:9222) - ${err.code}`);
      resolve();
    });
    
    socket.connect(9222, ip);
  });
}

console.log('\n💡 Solutions:\n');

console.log('1. If all connections failed:');
console.log('   - Make sure Chrome is running with --remote-debugging-port=9222');
console.log('   - Check Windows Firewall settings\n');

console.log('2. For WSL2 without mirrored mode:');
console.log('   - Use the Windows Host IP that worked above');
console.log('   - Or enable mirrored mode in .wslconfig\n');

console.log('3. Try this PowerShell command to check if Chrome is listening:');
console.log('   netstat -an | findstr :9222\n');

console.log('4. Alternative: Use Edge instead:');
console.log('   "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --remote-debugging-port=9222\n');

process.exit(0);