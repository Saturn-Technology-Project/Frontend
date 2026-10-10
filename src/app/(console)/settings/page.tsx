"use client";

import Link from "next/link";
import { QueryGate } from "@/components/layout/query-gate";
import { StatusLabel } from "@/components/ui/status-dot";
import { useConsole } from "@/hooks/use-console";
import { useOrg, useOrgMembers } from "@/hooks/use-team";
import { canAccess } from "@/lib/access";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export default function SettingsPage() {
  const { t } = useI18n();
  const sessionUser = useAuthStore((state) => state.user);
  const sessionOrg = useAuthStore((state) => state.org);
  const workspace = useOrg();
  const members = useOrgMembers();
  const { data, isPending, isError } = useConsole();
  const organization = workspace.data?.organization;
  const kind = organization?.kind ?? sessionOrg?.kind;
  const plan = organization?.plan ?? sessionOrg?.plan;
  const personal = kind === "personal" || (kind == null && (plan === "free" || plan === "pro" || plan === "trial" || plan === "starter"));
  const canTeam = canAccess(sessionUser?.permissions, "team", "read") && !personal;
  const name = organization?.name ?? sessionOrg?.name ?? "—";
  const agents = data?.agents ?? [];
  const servers = data?.mcpServers ?? [];
  const addons = organization?.addons ?? [];
  const apiOk = Boolean(data && !isError && data.services.every((service) => service.status === "operational"));
  const planLabel = plan ? plan.slice(0, 1).toUpperCase() + plan.slice(1) : "—";

  return (
    <QueryGate isPending={isPending && !data && !sessionOrg} isError={false}>
      <div className="px-4 py-5 md:px-8 md:py-6">
        <h1 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">{t("nav.organization")}</h1>
        <p className="mt-1 max-w-xl text-[13px] text-muted-foreground">{t("settings.lead")}</p>

        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="truncate text-[20px] font-semibold tracking-tight">{name}</div>
              <div className="mt-1 text-[13px] text-muted-foreground">
                {personal ? t("nav.personalLabel") : t("nav.team")} · {planLabel}
              </div>
            </div>
            <Link href="/subscription" className="text-[13px] text-muted-foreground hover:text-foreground">
              {t("nav.subscription")}
            </Link>
          </div>
        </section>

        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
          {canTeam ? (
            <Stat href="/team" label={t("team.members")} value={members.data?.length} />
          ) : null}
          <Stat href="/agents" label={t("settings.agents")} value={data ? agents.length : undefined} />
          <Stat href="/tools/connections" label={t("settings.mcpServers")} value={data ? servers.length : undefined} />
        </div>

        <section className="mt-3 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-[15px] font-medium">{t("settings.api")}</h2>
              <p className="mt-1 max-w-md text-[13px] text-muted-foreground">{t("settings.apiBody")}</p>
            </div>
            <StatusLabel tone={apiOk ? "operational" : "down"}>
              {apiOk ? t("settings.connected") : t("settings.disconnected")}
            </StatusLabel>
          </div>
        </section>

        {addons.length > 0 ? (
          <section className="mt-3 rounded-xl border border-border bg-card p-5">
            <h2 className="text-[15px] font-medium">{t("subscription.addons")}</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {addons.map((addon) => (
                <li key={addon.id}>
                  {addon.href ? (
                    <a href={addon.href} className="inline-flex rounded-full bg-muted px-3 py-1 text-[12px] hover:text-foreground">
                      {addon.name}
                    </a>
                  ) : (
                    <span className="inline-flex rounded-full bg-muted px-3 py-1 text-[12px]">{addon.name}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </QueryGate>
  );
}

function Stat({ href, label, value }: { href: string; label: string; value: number | undefined }) {
  return (
    <Link href={href} className="rounded-xl border border-border bg-card px-4 py-4 hover:border-foreground/20">
      <div className="text-[28px] font-semibold tracking-tight">{value == null ? "—" : value.toLocaleString()}</div>
      <div className="mt-1 text-[12px] text-muted-foreground">{label}</div>
    </Link>
  );
}
