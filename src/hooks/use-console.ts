"use client";

import {
  keepPreviousData,
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

export const consoleQueryKey = ["console"] as const;

export function useConsole() {
  return useQuery({
    queryKey: consoleQueryKey,
    queryFn: fetchConsole,
    staleTime: 5_000,
    refetchInterval: 12_000,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
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
