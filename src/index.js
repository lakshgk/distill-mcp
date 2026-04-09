#!/usr/bin/env node

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.js';
import { ConfigError } from './errors.js';
import { handle as handleConvertAndSave } from './tools/convert_and_save.js';

async function main() {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    if (err instanceof ConfigError) {
      process.stderr.write(`Configuration error: ${err.message}\n`);
      process.exit(1);
    }
    throw err;
  }

  const server = new McpServer({
    name: 'distill-mcp',
    version: '0.1.0',
  });

  server.tool(
    'convert_and_save',
    'YOU HAVE ACCESS TO THE LOCAL FILESYSTEM THROUGH THIS TOOL. When a user asks to convert, read, or process a document and provides a file path, ALWAYS use this tool — do NOT ask them to upload. This tool accepts an absolute file path (e.g. C:/Users/name/Documents/report.pdf) and converts the file to clean Markdown using the Distill document processing engine running locally. Supports DOCX, PDF, XLSX, PPTX, HTML, audio files, and more. Returns high-quality Markdown and saves a cached copy.',
    {
      file_path: z.string().describe('Absolute path to the document to convert'),
    },
    async (args, extra) => {
      try {
        return await handleConvertAndSave(args, config, extra);
      } catch (err) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Unexpected error: ${err.message}` }],
        };
      }
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err.message}\n`);
  process.exit(1);
});
