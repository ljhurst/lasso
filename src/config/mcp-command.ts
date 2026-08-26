export function buildMcpAddCommand(name: string, indicator: string): string {
  return `claude mcp add --transport http ${name.toLowerCase()} ${indicator}`;
}

export function buildMcpInspectorCommand(indicator: string): string {
  return `npx @modelcontextprotocol/inspector --server-url ${indicator} --transport http`;
}
