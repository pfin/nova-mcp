#!/usr/bin/env node

/**
 * Axiom MCP Demo: Forcing Implementation Over Description
 * 
 * This demonstrates the core problem Axiom solves:
 * - Without Axiom: Claude describes what it WOULD do
 * - With Axiom: Claude is forced to actually DO it
 */

console.log("=== AXIOM MCP: THE PROBLEM & SOLUTION ===\n");

console.log("🔴 THE PROBLEM: Claude Describes Instead of Coding");
console.log("------------------------------------------------");
console.log("User: 'Write a factorial function'");
console.log("Claude: 'I would create a function that calculates factorial...'");
console.log("Result: NO FILES CREATED ❌\n");

console.log("🟢 THE SOLUTION: Axiom Forces Implementation");
console.log("--------------------------------------------");
console.log("User: 'Write a factorial function'");
console.log("Axiom: [Spawns PTY executor]");
console.log("Axiom: [Monitors output character-by-character]");
console.log("Axiom: [Detects no file creation after 30s]");
console.log("Axiom: [INTERVENTION] Stop planning! Create factorial.py NOW!");
console.log("Claude: [Creates actual file]");
console.log("Result: factorial.py CREATED ✅\n");

console.log("📊 KEY METRICS");
console.log("--------------");
console.log("• 5-10 minute task chunks");
console.log("• 30 second planning timeout");
console.log("• 10 second progress checks");
console.log("• Real-time character monitoring");
console.log("• Interrupt before toxic 'success'\n");

console.log("🚀 DEMO COMMANDS");
console.log("----------------");
console.log("1. Test the problem (Claude alone):");
console.log("   claude 'Write a factorial function'\n");

console.log("2. Test the solution (With Axiom V4):");
console.log("   axiom_spawn({");
console.log("     \"prompt\": \"Write a factorial function\",");
console.log("     \"verboseMasterMode\": true");
console.log("   })\n");

console.log("3. Test parallel execution:");
console.log("   axiom_spawn({");
console.log("     \"prompt\": \"Write factorial in Python, JavaScript, and Java\",");
console.log("     \"spawnPattern\": \"parallel\",");
console.log("     \"spawnCount\": 3,");
console.log("     \"verboseMasterMode\": true");
console.log("   })\n");

console.log("💡 THE PHILOSOPHY");
console.log("-----------------");
console.log("\"Don't plan for perfection. Execute in parallel,");
console.log(" observe carefully, intervene intelligently,");
console.log(" and synthesize success.\"\n");

console.log("Files created = Success");
console.log("No files = Failure");
console.log("It's that simple.");