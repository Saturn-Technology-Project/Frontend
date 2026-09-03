import type { PolicyAction, PolicyCondition } from "@/types";

export const POLICY_OPERATORS = [
  { value: "gt", labelKey: "policies.op.gt" },
  { value: "gte", labelKey: "policies.op.gte" },
  { value: "lt", labelKey: "policies.op.lt" },
  { value: "lte", labelKey: "policies.op.lte" },
  { value: "eq", labelKey: "policies.op.eq" },
  { value: "ne", labelKey: "policies.op.ne" },
] as const;

export const POLICY_ACTIONS = [
  { value: "allow", labelKey: "policies.action.allow" },
  { value: "approval_required", labelKey: "policies.action.approval" },
  { value: "deny", labelKey: "policies.action.deny" },
] as const;

export const POLICY_ENVIRONMENTS = [
  { value: "production", labelKey: "policies.env.production" },
  { value: "staging", labelKey: "policies.env.staging" },
] as const;

export const FIELD_OPTIONS = ["amount", "customer_id", "currency"] as const;

export function normalizeDecision(raw: string): PolicyAction {
  const key = raw.trim().toLowerCase();
  if (key === "deny") return "deny";
  if (key === "approval" || key === "approval_required") return "approval_required";
  return "allow";
}

export function domainFromTool(tool: string): string {
  const prefix = tool.split(".")[0]?.trim();
  if (!prefix) return "";
  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

export function formatMoney(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? "");
  if (Number.isInteger(n)) return `$${n.toLocaleString("en-US")}`;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function coerceConditionValue(raw: string): string | number | boolean {
  const value = raw.trim();
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value.replace(/^\$/, "");
}

export function formatConditionValue(field: string, value: unknown): string {
  if (field === "amount") return formatMoney(value);
  return String(value ?? "");
}

export function operatorSymbol(operator: string): string {
  switch (operator) {
    case "lte":
    case "le":
      return "≤";
    case "gte":
    case "ge":
      return "≥";
    case "lt":
      return "<";
    case "gt":
      return ">";
    case "ne":
      return "≠";
    default:
      return "=";
  }
}

export function formatMatchedRule(conditions: PolicyCondition[]): string {
  return conditions
    .map((item) => `${item.field} ${operatorSymbol(item.operator)} ${formatConditionValue(item.field, item.value)}`)
    .join(" AND ");
}

export function approvalRisk(amount: unknown): "low" | "medium" | "high" {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "medium";
  if (n > 1000) return "high";
  if (n > 100) return "medium";
  return "low";
}
