import { ApiError, createApprovalPolicy, updateApprovalPolicy, type ApprovalPolicyRecord } from "@/lib/api";
import type { FlowData } from "@/lib/policy-graph";
import type { PolicyDefinition } from "@/types";

export function draftFromPolicy(policy: ApprovalPolicyRecord): Pick<FlowData, "approvalRequirements" | "allowRequester"> {
  const requirements = policy.requirements ?? [];
  if (requirements.length > 0) {
    return {
      approvalRequirements: requirements.map((item) => ({
        groupId: item.group_id,
        groupName: item.group_name,
        requiredCount: item.required_count,
      })),
      allowRequester: policy.allow_requester,
    };
  }
  return {
    approvalRequirements: [{ groupId: policy.group_id ?? "", requiredCount: policy.required_count || 1 }],
    allowRequester: policy.allow_requester,
  };
}

export async function syncNodeApprovals(definition: PolicyDefinition, policyName: string, groupAccess: boolean, incomplete: string) {
  if (!groupAccess) return definition;
  const nodes = [];
  for (const node of definition.nodes) {
    nodes.push(await syncApprovalNode(node, policyName, incomplete));
  }
  return { ...definition, nodes };
}

async function syncApprovalNode(node: PolicyDefinition["nodes"][number], policyName: string, incomplete: string) {
  if (node.type !== "decision" || !node.data || typeof node.data !== "object") return node;
  const data = node.data;
  if (data.decision !== "approval" || !Array.isArray(data.approvalRequirements)) return node;
  const rows = data.approvalRequirements.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    return [{
      groupId: typeof row.groupId === "string" ? row.groupId : "",
      requiredCount: typeof row.requiredCount === "number" ? row.requiredCount : Number(row.requiredCount),
    }];
  });
  const chosen = rows.filter((row) => row.groupId);
  if ((rows.length > 1 && chosen.length !== rows.length) || new Set(chosen.map((row) => row.groupId)).size !== chosen.length) {
    throw new ApiError(400, incomplete);
  }
  if (chosen.some((row) => !Number.isInteger(row.requiredCount) || row.requiredCount < 1 || row.requiredCount > 20)) {
    throw new ApiError(400, incomplete);
  }
  const allowRequester = data.allowRequester === true;
  const policyId = typeof data.approvalPolicyId === "string" ? data.approvalPolicyId : "";
  if (chosen.length === 0) {
    const count = Number.isInteger(rows[0]?.requiredCount) ? rows[0].requiredCount : 1;
    if (!policyId && count <= 1) return node;
    if (count < 1 || count > 20) throw new ApiError(400, incomplete);
    const saved = policyId
      ? await updateApprovalPolicy(policyId, { required_count: count, requirements: [], allow_requester: allowRequester })
      : await createApprovalPolicy({ name: approvalRecordName(policyName, node.id), required_count: count, allow_requester: allowRequester });
    return { ...node, data: { ...data, approvalPolicyId: saved.id } };
  }
  const requirements = chosen.map((row) => ({ group_id: row.groupId, required_count: row.requiredCount }));
  const saved = policyId
    ? await updateApprovalPolicy(policyId, { requirements, allow_requester: allowRequester })
    : await createApprovalPolicy({
        name: approvalRecordName(policyName, node.id),
        requirements,
        allow_requester: allowRequester,
      });
  return { ...node, data: { ...data, approvalPolicyId: saved.id } };
}

function approvalRecordName(policyName: string, nodeId: string) {
  return `${(policyName.trim() || "Approval").slice(0, 40)} ${nodeId}`.slice(0, 80);
}
