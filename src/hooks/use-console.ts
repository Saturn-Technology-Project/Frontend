"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  approveApproval,
  createAgent,
  createPolicy,
  deleteAgent,
  deleteMcpServer,
  deletePolicy,
  fetchConsole,
  rejectApproval,
  updateAgent,
  updatePolicy,
  type AgentUpdateBody,
  type PolicyWrite,
} from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

export const consoleQueryKey = ["console"] as const;

export function useConsole() {
  const signedIn = useAuthStore((state) => Boolean(state.user));
  return useQuery({
    queryKey: consoleQueryKey,
    queryFn: fetchConsole,
    enabled: signedIn,
    staleTime: 0,
    refetchInterval: 10_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

export function useCreateAgent() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; description?: string; model?: string }) =>
      createAgent(body),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: consoleQueryKey });
    },
  });
}

export function useDeleteAgent() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAgent(id),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: consoleQueryKey });
    },
  });
}

export function useDeleteMcpServer() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMcpServer(id),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: consoleQueryKey });
    },
  });
}

export function useUpdateAgent() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AgentUpdateBody }) =>
      updateAgent(id, body),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: consoleQueryKey });
    },
  });
}

export function useCreatePolicy() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: PolicyWrite) => createPolicy(body),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: consoleQueryKey });
    },
  });
}

export function useDeletePolicy() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePolicy(id),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: consoleQueryKey });
    },
  });
}

export function useUpdatePolicy() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<PolicyWrite> }) =>
      updatePolicy(id, body),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: consoleQueryKey });
    },
  });
}

export function useResolveApproval() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
    }: {
      id: string;
      decision: "approved" | "rejected";
    }) => (decision === "approved" ? approveApproval(id) : rejectApproval(id)),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: consoleQueryKey });
    },
  });
}
