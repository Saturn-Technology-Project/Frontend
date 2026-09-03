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
  createRun,
  enrollAgent,
  enrollConnector,
  fetchConsole,
  fetchConnectorEnrollment,
  fetchEnrollment,
  rejectApproval,
  updateAgent,
  updatePolicy,
  type AgentUpdateBody,
  type PolicyWrite,
} from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

export const consoleQueryKey = ["console"] as const;

export function useConsole() {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: consoleQueryKey,
    queryFn: fetchConsole,
    enabled: Boolean(token),
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

export function enrollmentQueryKey(agentId: string) {
  return ["enrollment", agentId] as const;
}

export function useEnrollment(agentId: string, enabled = true) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: enrollmentQueryKey(agentId),
    queryFn: () => fetchEnrollment(agentId),
    enabled: Boolean(token) && enabled,
  });
}

export function useEnrollAgent() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (agentId: string) => enrollAgent(agentId),
    onSuccess: async (data, agentId) => {
      client.setQueryData(enrollmentQueryKey(agentId), data);
      await client.invalidateQueries({ queryKey: consoleQueryKey });
    },
  });
}

export function connectorEnrollmentQueryKey() {
  return ["connector-enrollment"] as const;
}

export function useConnectorEnrollment(enabled = true) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: connectorEnrollmentQueryKey(),
    queryFn: fetchConnectorEnrollment,
    enabled: Boolean(token) && enabled,
  });
}

export function useEnrollConnector() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => enrollConnector(),
    onSuccess: async (data) => {
      client.setQueryData(connectorEnrollmentQueryKey(), data);
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

export function useCreateRun() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ agentId, prompt }: { agentId: string; prompt: string }) =>
      createRun(agentId, prompt),
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
