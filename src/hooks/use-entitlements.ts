"use client";

import { useOrg } from "@/hooks/use-team";
import type { Entitlements } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

export function useEntitlements() {
  const workspace = useOrg();
  const saved = useAuthStore((state) => state.org);
  const entitlements: Entitlements | undefined = workspace.data?.organization.entitlements ?? saved?.entitlements;
  // Saturn is free: every feature is on unless the server's entitlements explicitly turn it off.
  const policies = entitlements?.policies !== false;
  const webhooks = entitlements?.webhooks !== false;
  const groups = entitlements?.groups !== false;
  const limit = entitlements?.tool_set_limit;
  return {
    policies,
    webhooks,
    groups,
    toolSetLimit: entitlements ? (typeof limit === "number" ? limit : null) : null,
    auditFull: entitlements ? entitlements.audit !== "basic" : true,
  };
}
