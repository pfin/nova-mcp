#!/usr/bin/env node

import { NovaBrowser } from "./dist/nova-browser.js";
import { NovaTools } from "./dist/nova-tools.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

async function testNovaBrowser() {
  console.log("🌟 Testing Nova Browser\n");
  console.log("🎭 Hip hop consciousness: We innovate, we don't imitate\n");

  const browser = new NovaBrowser({
    mode: "stealth",
    headless: false,
  });

  const tools = new NovaTools(browser);

  try {
    // Test 1: Navigation
    console.log("📍 Test 1: Stealth Navigation");
    const navResult = await tools.execute("nova_navigate", {
      url: "https://example.com",
      humanDelay: true,
    });
    console.log(navResult.content[0].text);

    // Test 2: Screenshot
    console.log("\n📸 Test 2: Screenshot");
    const screenshotResult = await tools.execute("nova_screenshot", {
      name: "test-page",
      fullPage: true,
    });
    console.log(screenshotResult.content[0].text);

    // Test 3: Session Info
    console.log("\n📊 Test 3: Session Info");
    const sessionResult = await tools.execute("nova_session", {
      action: "info",
    });
    console.log("Fingerprint sample:");
    const fingerprint = browser.getFingerprint();
    console.log(`  Session ID: ${fingerprint.sessionId}`);
    console.log(`  User Agent: ${fingerprint.userAgent.substring(0, 50)}...`);
    console.log(`  Screen: ${fingerprint.screenResolution.width}x${fingerprint.screenResolution.height}`);
    console.log(`  WebGL: ${fingerprint.webglVendor} / ${fingerprint.webglRenderer}`);

    // Test 4: Human-like interaction
    console.log("\n🤖 Test 4: Human-like Interaction");
    const searchResult = await tools.execute("nova_navigate", {
      url: "https://www.google.com",
    });
    console.log(searchResult.content[0].text);

    // Wait for page to load
    await tools.execute("nova_wait_smart", {
      condition: "time",
      value: "2000",
    });

    // Type in search box with human-like behavior
    console.log("Typing search query...");
    const typeResult = await tools.execute("nova_type", {
      selector: 'textarea[name="q"], input[name="q"]',
      text: "Nova Browser MCP stealth automation",
      wpm: 80,
    });
    console.log(typeResult.content[0].text);

    // Test 5: Extract console logs
    console.log("\n📝 Test 5: Console Logs");
    const logs = browser.getConsoleLogs();
    console.log(`Captured ${logs.length} console entries`);

    console.log("\n✅ All tests completed successfully!");
    console.log("💪 Nova Browser is ready for stealth automation!");

  } catch (error) {
    console.error("\n❌ Test failed:", error);
  } finally {
    console.log("\n🎭 Closing Nova Browser...");
    await browser.close();
  }
}

// Run tests
testNovaBrowser().catch(console.error);