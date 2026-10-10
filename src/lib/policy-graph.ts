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

export type FlowNode = Node<FlowData, "policy">;

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

export function newNode(kind: PolicyNodeKind, position: { x: number; y: number }): FlowNode {
  return {
    id: `${kind}_${crypto.randomUUID().slice(0, 8)}`,
    type: "policy",
    position,
    data: blankData(kind),
  };
}
