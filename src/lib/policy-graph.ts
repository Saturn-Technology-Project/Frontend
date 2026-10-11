import type { Edge, Node } from "@xyflow/react";
import type { PolicyDefinition, PolicyNodeKind, PolicyRule } from "@/types";

export interface FlowData extends Record<string, unknown> {
  kind: PolicyNodeKind;
  tool?: string;
  agentIds?: string[];
  field?: string;
  operator?: string;
  value?: string | number | boolean;
  op?: "and" | "or" | "not";
  decision?: "allow" | "approval" | "deny";
  approvalPolicyId?: string;
  approvalRequirements?: NodeApprovalRequirement[];
  allowRequester?: boolean;
  rateLimit?: string;
  classification?: {
    status?: string;
    operation?: string;
    resource?: string;
    risk?: string;
    sideEffects?: string;
    rationale?: string;
  };
}

export interface NodeApprovalRequirement {
  groupId: string;
  groupName?: string;
  requiredCount: number;
}

export type FlowNode = Node<FlowData, "policy">;

export function approvalSummary(data: FlowData) {
  if (data.decision !== "approval") return "";
  const rows = (data.approvalRequirements ?? []).filter((row) => row.groupId);
  if (rows.length === 0) return "";
  return rows.map((row) => `${row.groupName || row.groupId} ${row.requiredCount}`).join(" + ");
}

const KINDS: PolicyNodeKind[] = ["subject", "tool", "condition", "logic", "decision", "enforcement"];

export function isKind(value: string): value is PolicyNodeKind {
  return KINDS.includes(value as PolicyNodeKind);
}

export function definitionFromRules(rules: PolicyRule[]): PolicyDefinition {
  const nodes: PolicyDefinition["nodes"] = [];
  const edges: PolicyDefinition["edges"] = [];
  rules.forEach((rule, index) => {
    const y = index * 132;
    const toolId = `tool_${rule.id}`;
    nodes.push({
      id: toolId,
      type: "tool",
      position: { x: 40, y },
      data: { tool: rule.tool },
    });
    let previous = toolId;
    let x = 280;
    rule.conditions.forEach((condition, condIndex) => {
      const id = `condition_${rule.id}_${condIndex}`;
      nodes.push({
        id,
        type: "condition",
        position: { x, y },
        data: { field: condition.field, operator: condition.operator, value: condition.value },
      });
      edges.push({ id: `edge_${previous}_${id}`, source: previous, target: id });
      previous = id;
      x += 220;
    });
    const decisionId = `decision_${rule.id}`;
    const decision = rule.decision === "approval_required" ? "approval" : rule.decision;
    nodes.push({
      id: decisionId,
      type: "decision",
      position: { x, y },
      data: { decision },
    });
    edges.push({ id: `edge_${previous}_${decisionId}`, source: previous, target: decisionId });
  });
  return { nodes, edges, analyses: [] };
}

export function toFlow(definition: PolicyDefinition): { nodes: FlowNode[]; edges: Edge[] } {
  return {
    nodes: definition.nodes.filter((node) => isKind(node.type)).map((node) => ({
      id: node.id,
      type: "policy",
      position: node.position ?? { x: 0, y: 0 },
      data: { ...(node.data as FlowData), kind: node.type },
    })),
    edges: definition.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    })),
  };
}

export function toDefinition(
  nodes: FlowNode[],
  edges: Edge[],
  analyses: PolicyDefinition["analyses"],
  toolSetId?: string | null
): PolicyDefinition {
  return {
    ...(toolSetId ? { toolSetId } : {}),
    analyses,
    nodes: nodes.map((node) => {
      const { kind, ...data } = node.data;
      return {
        id: node.id,
        type: kind,
        position: node.position,
        data,
      };
    }),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    })),
  };
}

export function blankData(kind: PolicyNodeKind): FlowData {
  if (kind === "subject") return { kind, agentIds: [] };
  if (kind === "tool") return { kind, tool: "" };
  if (kind === "condition") return { kind, field: "", operator: "eq", value: "" };
  if (kind === "logic") return { kind, op: "and" };
  if (kind === "decision") return { kind, decision: "deny" };
  return { kind, rateLimit: "" };
}

export interface FormCondition {
  id: string;
  field: string;
  operator: string;
  value: string | number | boolean;
}

export interface FormRule {
  toolId: string;
  tool: string;
  decisionId: string | null;
  decision: "allow" | "approval" | "deny";
  conditions: FormCondition[];
}

export function formRules(nodes: FlowNode[], edges: Edge[]): FormRule[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const outgoing = new Map<string, string[]>();
  for (const edge of edges) {
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target]);
  }
  return nodes
    .filter((node) => node.data.kind === "tool")
    .flatMap((tool) => {
      const rules: FormRule[] = [];
      const reached = new Set<string>();
      const walk = (id: string, path: Set<string>, conditions: FormCondition[]) => {
        for (const next of outgoing.get(id) ?? []) {
          if (path.has(next)) continue;
          const node = byId.get(next);
          if (!node) continue;
          if (node.data.kind === "decision") {
            if (reached.has(node.id)) continue;
            reached.add(node.id);
            const raw = node.data.decision;
            rules.push({
              toolId: tool.id,
              tool: tool.data.tool || "",
              decisionId: node.id,
              decision: raw === "allow" || raw === "approval" || raw === "deny" ? raw : "deny",
              conditions,
            });
            continue;
          }
          if (node.data.kind === "enforcement") continue;
          const own =
            node.data.kind === "condition"
              ? [
                  ...conditions,
                  {
                    id: node.id,
                    field: String(node.data.field ?? ""),
                    operator: String(node.data.operator ?? "eq"),
                    value: node.data.value ?? "",
                  },
                ]
              : conditions;
          walk(next, new Set([...path, next]), own);
        }
      };
      walk(tool.id, new Set([tool.id]), []);
      if (rules.length === 0) {
        rules.push({ toolId: tool.id, tool: tool.data.tool || "", decisionId: null, decision: "deny", conditions: [] });
      }
      return rules;
    });
}

export function newNode(kind: PolicyNodeKind, position: { x: number; y: number }): FlowNode {
  return {
    id: `${kind}_${crypto.randomUUID().slice(0, 8)}`,
    type: "policy",
    position,
    data: blankData(kind),
  };
}
