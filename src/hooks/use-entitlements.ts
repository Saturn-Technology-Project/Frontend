"use client";

import { useOrg } from "@/hooks/use-team";
import type { Entitlements } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

function proPlan(plan?: string | null) {
  const cleaned = (plan || "").trim().toLowerCase();
  return cleaned === "pro" || cleaned === "team" || cleaned === "enterprise" || cleaned === "starter";
}

export function useEntitlements() {
  const workspace = useOrg();
  const saved = useAuthStore((state) => state.org);
  const entitlements: Entitlements | undefined = workspace.data?.organization.entitlements ?? saved?.entitlements;
  const plan = workspace.data?.organization.plan ?? saved?.plan;
  // The server entitlements object is authoritative. Until a response includes it,
  // the existing plan field is the same source of truth. An unknown or missing plan stays Free.
  const policies = entitlements ? entitlements.policies === true : proPlan(plan);
  const webhooks = entitlements
    ? "webhooks" in entitlements
      ? entitlements.webhooks === true
      : policies
    : proPlan(plan);
  const groups = entitlements ? entitlements.groups === true : plan === "team" || plan === "enterprise";
  const limit = entitlements?.tool_set_limit;
  return {
    policies,
    webhooks,
    groups,
    toolSetLimit: entitlements
      ? policies
        ? typeof limit === "number"
          ? limit
          : null
        : typeof limit === "number"
          ? limit
          : 1
      : policies
        ? null
        : 1,
    auditFull: entitlements ? entitlements.audit === "full" : policies,
  };
}
