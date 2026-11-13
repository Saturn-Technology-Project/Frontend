"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UpgradeCover } from "@/components/layout/upgrade-cover";
import { QueryGate } from "@/components/layout/query-gate";
import { useEntitlements } from "@/hooks/use-entitlements";
import { Button } from "@/components/ui/button";
import { useConsole, useCreatePolicy } from "@/hooks/use-console";
import { canAccess } from "@/lib/access";
import { PolicyProgressBar, applyProgress, type PolicyProgress } from "@/components/policies/policy-thinking";
import { ApiError, streamPolicy } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function CreatePolicyPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { data, isPending, isError } = useConsole();
  const createPolicy = useCreatePolicy();
  const canWrite = canAccess(useAuthStore((state) => state.user?.permissions), "policies", "write");
  const { policies: policyAccess } = useEntitlements();
  const [source, setSource] = useState<"set" | "scratch">("set");
  const [setId, setSetId] = useState("");
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<PolicyProgress | null>(null);
  const [instructions, setInstructions] = useState("");
  const sets = data?.toolSets ?? [];
  const selected = sets.find((item) => item.id === setId) ?? sets[0];

  if (!canWrite) {
    return <div className="px-4 py-6 text-[13px] text-muted-foreground md:px-10 md:py-10">{t("policies.notFound")}</div>;
  }

  if (!policyAccess) {
    return (
      <div className="relative min-h-[calc(100dvh-4rem)]">
        <div className="px-4 py-6 md:px-10 md:py-10">
          <h1 className="text-[22px] font-medium tracking-tight">{t("policies.create")}</h1>
        </div>
        <UpgradeCover />
      </div>
    );
  }

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      <div className="px-4 py-6 md:px-10 md:py-10">
        <h1 className="text-[22px] font-medium tracking-tight">{t("policies.create")}</h1>
        <div className="mt-8 grid max-w-[760px] gap-3 sm:grid-cols-2">
          <SourceCard on={source === "set"} title={t("policies.fromSet")} body={t("policies.fromSetBody")} onClick={() => setSource("set")} />
          <SourceCard on={source === "scratch"} title={t("policies.scratch")} body={t("policies.scratchBody")} onClick={() => setSource("scratch")} />
        </div>
        {source === "set" ? (
          <form
            className="mt-10 max-w-[760px]"
            onSubmit={(event) => {
              event.preventDefault();
              if (!selected) return;
              setGenerating(true);
              setProgress({ label: t("policies.generating"), done: 0, total: 0, indeterminate: true, note: "" });
              setError("");
              void streamPolicy("/policies/generate/stream", { tool_set_id: selected.id, name: "", instructions }, (event) => {
                setProgress((current) => applyProgress(current, event, t));
              })
                .then((event) => {
                  if (!event.policy) throw new Error("policy");
                  router.push(`/policies/${event.policy.id}`);
                })
                .catch((caught: unknown) => {
                  setError(caught instanceof ApiError ? caught.message : t("policies.saveFailed"));
                  setGenerating(false);
                });
            }}
          >
            <h2 className="text-[12px] uppercase tracking-[0.08em] text-muted-foreground">{t("policies.capabilitySet")}</h2>
            {sets.length === 0 ? (
              <p className="mt-3 text-[13px] text-muted-foreground">{t("policies.noSets")}</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {sets.map((item) => {
                  const on = item.id === selected?.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setSetId(item.id)}
                      className={cn(
                        "h-9 rounded-full border px-3 text-[13px]",
                        on ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"
                      )}
                    >
                      {item.name}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="mt-4 text-[13px] text-muted-foreground">{t("policies.analyzeNote")}</p>
            <p className="mt-2 text-[13px] text-muted-foreground">{t("policies.unknownRule")}</p>
            <label className="mt-6 block text-[13px]">
              {t("policies.instructions")}
              <textarea
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                placeholder={t("policies.instructionsPlaceholder")}
                rows={4}
                className="mt-2 w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-ring"
              />
            </label>
            <Button type="submit" className="mt-6" disabled={generating || !selected}>
              {generating ? t("policies.generating") : t("policies.generate")}
            </Button>
            {progress ? <PolicyProgressBar progress={progress} /> : null}
            {error ? <p role="alert" className="mt-3 text-[13px] text-destructive">{error}</p> : null}
          </form>
        ) : (
          <form
            className="mt-10 max-w-[760px]"
            onSubmit={(event) => {
              event.preventDefault();
              void createPolicy
                .mutateAsync({
                  name: t("policies.create"),
                  description: "",
                  status: "draft",
                  definition: { nodes: [], edges: [], analyses: [] },
                  rules: [],
                })
                .then((created) => router.push(`/policies/${created.id}`));
            }}
          >
            <p className="text-[13px] text-muted-foreground">{t("policies.scratchBody")}</p>
            <Button type="submit" className="mt-6" disabled={createPolicy.isPending}>
              {createPolicy.isPending ? t("policies.creating") : t("policies.scratch")}
            </Button>
          </form>
        )}
      </div>
    </QueryGate>
  );
}

function SourceCard({ on, title, body, onClick }: { on: boolean; title: string; body: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn("rounded-xl border px-4 py-4 text-left", on ? "border-foreground" : "border-border hover:bg-muted")}
    >
      <div className="text-[14px] font-medium">{title}</div>
      <p className="mt-1 text-[13px] text-muted-foreground">{body}</p>
    </button>
  );
}
