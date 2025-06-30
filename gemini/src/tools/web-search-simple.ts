import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { spawn } from 'child_process';

export const webSearchSchema = z.object({
  query: z.string().describe('The search query'),
  count: z.number().optional().default(10).describe('Number of results to return'),
});

export type WebSearchInput = z.infer<typeof webSearchSchema>;

export const webSearchTool = {
  name: 'web_search',
  description: 'Search the web using Brave Search (requires Brave Search MCP server to be running)',
  inputSchema: zodToJsonSchema(webSearchSchema),
};

export async function handleWebSearch(
  input: WebSearchInput
): Promise<{ content: Array<{ type: string; text: string }> }> {
  // For now, return a placeholder that instructs users to use Brave Search MCP directly
  return {
    content: [
      {
        type: 'text',
        text: `To search the web for "${input.query}", please use the Brave Search MCP server directly. This feature requires integration with the running Brave Search MCP server.`,
      },
    ],
  };
}