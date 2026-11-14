import type { Edge } from "@xyflow/react";
import type { FlowNode } from "@/lib/policy-graph";
import type { ToolSetItem } from "@/types";

export interface SchemaField {
  tool: string;
  name: string;
  type: string;
  enumValues: string[];
  description: string;
}

export function schemaFields(schema: Record<string, unknown> | undefined): Omit<SchemaField, "tool">[] {
  const properties = schema?.properties;
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) return [];
  return Object.entries(properties as Record<string, unknown>).map(([name, raw]) => {
    const prop = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    const enumValues = Array.isArray(prop.enum) ? prop.enum.filter((item) => item != null).map(String) : [];
    const type = typeof prop.type === "string" ? prop.type : enumValues.length ? "string" : "";
    return {
      name,
      type,
      enumValues,
      description: typeof prop.description === "string" ? prop.description : "",
    };
  });
}

export function connectedToolNames(nodeId: string, nodes: FlowNode[], edges: Edge[]): string[] {
  const neighbors = new Map<string, string[]>();
  for (const edge of edges) {
    neighbors.set(edge.source, [...(neighbors.get(edge.source) ?? []), edge.target]);
    neighbors.set(edge.target, [...(neighbors.get(edge.target) ?? []), edge.source]);
  }
  const seen = new Set<string>();
  const stack = [nodeId];
  const names: string[] = [];
  while (stack.length) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const node = nodes.find((item) => item.id === id);
    if (node?.data.kind === "tool" && node.data.tool) names.push(node.data.tool);
    for (const next of neighbors.get(id) ?? []) stack.push(next);
  }
  return Array.from(new Set(names));
}

export interface ToolGroup {
  id: string;
  name: string;
  tools: { name: string }[];
}

export function groupByServer(items: ToolSetItem[]): ToolGroup[] {
  const groups: ToolGroup[] = [];
  for (const item of items) {
    const id = item.serverId || item.serverName || "other";
    let group = groups.find((entry) => entry.id === id);
    if (!group) {
      group = { id, name: item.serverName.trim(), tools: [] };
      groups.push(group);
    }
    if (!group.tools.some((tool) => tool.name === item.name)) {
      group.tools.push({ name: item.name });
    }
  }
  return groups;
}
