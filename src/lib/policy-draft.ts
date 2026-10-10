export type PolicyTemplate = "readonly" | "balanced" | "strict";
export type ToolKind = "read" | "write" | "unknown";

const READ = /(?:^|[._\-\s])(read|get|list|search|query|fetch|describe|lookup)(?:$|[._\-\s])/i;
const WRITE =
  /(?:^|[._\-\s])(write|create|update|delete|remove|send|post|put|execute|place|transfer|order|pay|publish|drop|insert)(?:$|[._\-\s])/i;

export function classifyTool(name: string, description: string, nameOnly = false): ToolKind {
  const source = nameOnly ? name : `${name} ${description}`;
  const write = WRITE.test(source);
  const read = READ.test(source);
  if (write) return "write";
  if (read) return "read";
  return "unknown";
}

export function draftDecision(kind: ToolKind, template: PolicyTemplate): "allow" | "approval" | "deny" {
  if (kind === "unknown") return "deny";
  if (template === "balanced") return kind === "read" ? "allow" : "approval";
  return kind === "read" ? "allow" : "deny";
}

export function draftFromSet(
  items: { name: string; description?: string }[],
  template: PolicyTemplate
) {
  const rows = items.map((item) => {
    const kind = classifyTool(item.name, item.description ?? "", template === "strict");
    return { tool: item.name, kind, decision: draftDecision(kind, template) };
  });
  return {
    rules: rows.map((row) => ({
      tool: row.tool,
      condition: "true",
      decision: row.decision,
    })),
    total: rows.length,
    unknown: rows.filter((row) => row.kind === "unknown").length,
  };
}
