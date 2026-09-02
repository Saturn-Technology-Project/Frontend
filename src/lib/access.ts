import type { AccessPermissions } from "@/lib/api";

const RANK = { none: 0, read: 1, write: 2 } as const;

export function canAccess(
  permissions: AccessPermissions | undefined,
  resource: keyof AccessPermissions,
  level: "read" | "write"
) {
  const current = permissions?.[resource] ?? "none";
  return RANK[current] >= RANK[level];
}
