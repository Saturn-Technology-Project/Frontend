"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  approveApproval,
  createRun,
  fetchConsole,
  rejectApproval,
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
