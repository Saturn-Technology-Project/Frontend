export function groupToolsByPrefix(
  tools: string[]
): { prefix: string; names: string[] }[] {
  const groups = new Map<string, string[]>();
  for (const tool of tools) {
    const dot = tool.indexOf(".");
    const prefix = dot > 0 ? tool.slice(0, dot) : tool;
    const name = dot > 0 ? tool.slice(dot + 1) : tool;
    const list = groups.get(prefix);
    if (list) list.push(name);
    else groups.set(prefix, [name]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([prefix, names]) => ({
      prefix,
      names: [...names].sort((a, b) => a.localeCompare(b)),
    }));
}
