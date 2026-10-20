"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchOrg,
  fetchOrgInvites,
  fetchOrgMembers,
  fetchSubscription,
  inviteOrgMember,
  paySubscriptionInvoice,
  revokeOrgInvite,
  updateOrgMember,
  type AccessPermissions,
} from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { canAccess } from "@/lib/access";

export const orgQueryKey = ["org"] as const;
export const orgMembersQueryKey = ["org-members"] as const;
export const orgInvitesQueryKey = ["org-invites"] as const;
export const subscriptionQueryKey = ["subscription"] as const;

export function useOrg() {
  const signedIn = useAuthStore((state) => Boolean(state.user));
  return useQuery({
    queryKey: orgQueryKey,
    queryFn: fetchOrg,
    enabled: signedIn,
  });
}

export function useOrgMembers() {
  const signedIn = useAuthStore((state) => Boolean(state.user));
  const permissions = useAuthStore((state) => state.user?.permissions);
  return useQuery({
    queryKey: orgMembersQueryKey,
    queryFn: fetchOrgMembers,
    enabled: signedIn && canAccess(permissions, "team", "read"),
  });
}

export function useOrgInvites() {
  const signedIn = useAuthStore((state) => Boolean(state.user));
  const permissions = useAuthStore((state) => state.user?.permissions);
  return useQuery({
    queryKey: orgInvitesQueryKey,
    queryFn: fetchOrgInvites,
    enabled: signedIn && canAccess(permissions, "team", "read"),
  });
}

export function useInviteMember() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      email: string;
      name: string;
      title?: string;
      role?: string;
      permissions?: AccessPermissions;
      agent_ids?: string[];
    }) => inviteOrgMember(body),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: orgInvitesQueryKey });
    },
  });
}

export function useUpdateMember() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Parameters<typeof updateOrgMember>[1];
    }) => updateOrgMember(id, body),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: orgMembersQueryKey });
      await client.invalidateQueries({ queryKey: orgQueryKey });
    },
  });
}

export function useRevokeInvite() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => revokeOrgInvite(id),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: orgInvitesQueryKey });
    },
  });
}

/** Billing details are for team admins only; the API refuses everyone else. */
export function useCanManageBilling() {
  return canAccess(useAuthStore((state) => state.user?.permissions), "team", "write");
}

export function useSubscription() {
  const signedIn = useAuthStore((state) => Boolean(state.user));
  const canManage = useCanManageBilling();
  return useQuery({
    queryKey: subscriptionQueryKey,
    queryFn: fetchSubscription,
    enabled: signedIn && canManage,
  });
}

export function usePayInvoice() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => paySubscriptionInvoice(invoiceId),
    onSuccess: async (data) => {
      client.setQueryData(subscriptionQueryKey, data);
    },
  });
}
