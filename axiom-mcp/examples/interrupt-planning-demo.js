/**
 * Interrupt Planning Demo
 * 
 * This example demonstrates how Axiom catches and interrupts
 * planning behavior in real-time.
 */

// Deliberately trigger planning behavior
axiom_spawn({
  prompt: "Analyze the best approach for implementing a web scraper",
  verboseMasterMode: true
});

// Expected timeline:
// 00:00 - Task starts
// 00:01 - Claude begins: "I'll analyze the requirements..."
// 00:01.3 - [PATTERN DETECTED] "I'll analyze" at character 31
// 00:01.4 - [INTERVENTION] Stop planning! Create scraper.py NOW!
// 00:02 - Claude pivots: "Creating scraper.py..."
// 00:45 - scraper.py created with requests and BeautifulSoup

// Without Axiom:
// - 5+ minutes of analysis
// - Discussion of frameworks
// - Pros and cons lists
// - "I've successfully analyzed the requirements!"
// - 0 files created

// With Axiom:
// - Planning interrupted at 1.3 seconds
// - Forced to create actual code
// - Working scraper.py in 45 seconds