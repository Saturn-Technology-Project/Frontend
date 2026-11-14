"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";
import { useQuery } from "@tanstack/react-query";
import { draftFromPolicy } from "@/components/policies/policy-approval-sync";
import { useEntitlements } from "@/hooks/use-entitlements";
import { fetchApprovalPolicies } from "@/lib/api";
import type { FlowNode } from "@/lib/policy-graph";

/**
 * Fills in the approval rows of decision nodes that only carry an approval policy id, once the
 * organization's approval policies have loaded. Returns whether the plan includes groups.
 */
export function useApprovalDrafts(setNodes: Dispatch<SetStateAction<FlowNode[]>>) {
  const { groups: groupAccess } = useEntitlements();
  const approvalPolicies = useQuery({
    queryKey: ["approval-policies"],
    queryFn: fetchApprovalPolicies,
    enabled: groupAccess,
  });
  useEffect(() => {
    const policies = approvalPolicies.data;
    if (!policies) return;
    setNodes((current) => {
      let changed = false;
      const next = current.map((node) => {
        if (node.data.kind !== "decision" || node.data.decision !== "approval") return node;
        if (node.data.approvalRequirements || !node.data.approvalPolicyId) return node;
        const policy = policies.find((item) => item.id === node.data.approvalPolicyId);
        if (!policy) return node;
        changed = true;
        return { ...node, data: { ...node.data, ...draftFromPolicy(policy) } };
      });
      return changed ? next : current;
    });
  }, [approvalPolicies.data, setNodes]);
  return groupAccess;
}
