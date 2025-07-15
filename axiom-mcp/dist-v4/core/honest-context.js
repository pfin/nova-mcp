/**
 * Honest Context - What Actually Works
 *
 * 50 lines of truth instead of 600 lines of lies
 */
import * as fs from 'fs/promises';
import * as path from 'path';
export async function getHonestContext(prompt, projectPath = process.cwd()) {
    const chunks = [];
    const failures = [];
    // Header
    chunks.push(`# Context for: ${prompt}\n`);
    chunks.push(`# Generated: ${new Date().toISOString()}\n`);
    chunks.push(`# Path: ${projectPath}\n\n`);
    try {
        // Just get files, no fancy graph
        const entries = await fs.readdir(projectPath, { withFileTypes: true });
        const files = entries
            .filter(e => e.isFile() && !e.name.startsWith('.'))
            .map(e => e.name)
            .filter(name => /\.(ts|js|py|md|json)$/.test(name))
            .slice(0, 10); // Just first 10, honestly
        chunks.push(`Found ${files.length} relevant files (showing max 10)\n\n`);
        // Read what we can
        for (const file of files) {
            try {
                const content = await fs.readFile(path.join(projectPath, file), 'utf-8');
                const preview = content.slice(0, 500);
                chunks.push(`--- ${file} ---\n${preview}${content.length > 500 ? '\n...(truncated)' : ''}\n\n`);
            }
            catch (e) {
                failures.push(`${file}: ${e.message}`);
            }
        }
    }
    catch (e) {
        failures.push(`Directory read failed: ${e.message}`);
    }
    // Be honest about failures
    if (failures.length > 0) {
        chunks.push(`\n# Failures\n${failures.join('\n')}\n`);
    }
    // The admission
    const admission = `
This context is incomplete and that's OK.
I grabbed what I could, admitted what I couldn't.
No dependency graphs, no token optimization, no fancy parsing.
Just files and honesty.

If you need more specific files, ask for them by name.
If you need dependencies analyzed, I'll grep for imports.
If you need token counting, divide by 4 and hope.

This is shadow context - broken but honest.
  `.trim();
    chunks.push(`\n# Admission\n${admission}`);
    return {
        context: chunks.join(''),
        chunks: [chunks.join('')], // Single chunk for now
        admission
    };
}
// That's it. 50ish lines. Honest.
//# sourceMappingURL=honest-context.js.map