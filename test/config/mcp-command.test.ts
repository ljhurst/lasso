import { describe, expect, it } from 'vitest';
import { buildMcpAddCommand, buildMcpInspectorCommand } from '#src/config/mcp-command.ts';

describe('buildMcpAddCommand', () => {
  it('lower-cases the name for the CLI label', () => {
    expect(buildMcpAddCommand('Porto', 'https://porto.example.com/')).toBe(
      'claude mcp add --transport http porto https://porto.example.com/',
    );
  });

  it('passes the indicator through unmodified, trailing slash included', () => {
    expect(buildMcpAddCommand('Victoria', 'https://victoria.example.com/')).toBe(
      'claude mcp add --transport http victoria https://victoria.example.com/',
    );
  });
});

describe('buildMcpInspectorCommand', () => {
  it('builds a --server-url/--transport http invocation', () => {
    expect(buildMcpInspectorCommand('https://porto.example.com/')).toBe(
      'npx @modelcontextprotocol/inspector --server-url https://porto.example.com/ --transport http',
    );
  });
});
