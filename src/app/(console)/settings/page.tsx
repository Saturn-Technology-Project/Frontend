"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { QueryGate } from "@/components/layout/query-gate";
import { SectionLabel } from "@/components/ui/section-label";
import { StatusLabel } from "@/components/ui/status-dot";
import { useConsole } from "@/hooks/use-console";
import { useOrg } from "@/hooks/use-team";
import { canAccess } from "@/lib/access";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const sessionUser = useAuthStore((state) => state.user);
  const sessionOrg = useAuthStore((state) => state.org);
  const workspace = useOrg();
  const kind = workspace.data?.organization.kind ?? sessionOrg?.kind;
  const plan = workspace.data?.organization.plan ?? sessionOrg?.plan;
  const personal = kind === "personal" || (kind == null && (plan === "free" || plan === "pro" || plan === "trial" || plan === "starter"));
  const canTeam = canAccess(sessionUser?.permissions, "team", "read") && !personal;
  const { data, isPending, isError } = useConsole();
  const apiOk = data?.services.every((service) => service.status === "operational");

  return (
    <QueryGate isPending={isPending && !data} isError={false}>
      <div className="flex flex-col gap-6 px-4 py-5 md:flex-row md:gap-10 md:px-8 md:py-6">
        <nav className="flex gap-1 overflow-x-auto text-[13px] md:w-[180px] md:shrink-0 md:flex-col md:space-y-1 md:overflow-visible">
          <div className={cn("shrink-0 rounded-lg bg-muted px-3 py-2.5 font-medium")}>{t("settings.title")}</div>
          {canTeam ? (
            <Link href="/team" className="shrink-0 rounded-lg px-3 py-2.5 text-muted-foreground hover:bg-muted">
              {t("nav.team")}
            </Link>
          ) : null}
          <Link href="/subscription" className="shrink-0 rounded-lg px-3 py-2.5 text-muted-foreground hover:bg-muted">
            {t("nav.subscription")}
          </Link>
        </nav>
        <div className="min-w-0 max-w-[640px] flex-1">
        <h1 className="text-[22px] font-medium tracking-tight">{t("settings.title")}</h1>

        <section className="mt-10 border-t border-border pt-8">
          <SectionLabel>{t("settings.workspace")}</SectionLabel>
          <div className="mt-4 grid grid-cols-1 gap-y-3 text-[13px] sm:grid-cols-[140px_1fr]">
            <div className="text-muted-foreground">{t("settings.enterprise")}</div>
            <div>{sessionOrg?.name}</div>
            <div className="text-muted-foreground">{t("settings.employee")}</div>
            <div>{sessionUser?.employeeTitle || sessionUser?.name}</div>
            <div className="text-muted-foreground">{t("settings.operator")}</div>
            <div>{sessionUser?.name}</div>
            <div className="text-muted-foreground">{t("login.email")}</div>
            <div>{sessionUser?.email}</div>
            <div className="text-muted-foreground">{t("settings.agents")}</div>
            <div>
              {sessionUser?.agents?.length
                ? sessionUser.agents.map((agent) => agent.name).join(", ")
                : "—"}
            </div>
            <div className="text-muted-foreground">{t("settings.mcpServers")}</div>
            <div>
              {sessionUser?.mcpServers?.length
                ? sessionUser.mcpServers.map((server) => server.name).join(", ")
                : "—"}
            </div>
          </div>
        </section>

        <section className="mt-10 border-t border-border pt-8">
          <SectionLabel>{t("settings.language")}</SectionLabel>
          <div className="mt-4 flex gap-2">
            <Button
              variant={locale === "zh" ? "default" : "outline"}
              onClick={() => setLocale("zh")}
            >
              {t("settings.chinese")}
            </Button>
            <Button
              variant={locale === "en" ? "default" : "outline"}
              onClick={() => setLocale("en")}
            >
              {t("settings.english")}
            </Button>
          </div>
        </section>

        <section className="mt-10 border-t border-border pt-8">
          <SectionLabel>{t("settings.appearance")}</SectionLabel>
          <div className="mt-4 flex gap-2">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              onClick={() => setTheme("light")}
            >
              {t("settings.light")}
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              onClick={() => setTheme("dark")}
            >
              {t("settings.dark")}
            </Button>
          </div>
        </section>

        <section className="mt-10 border-t border-border pt-8">
          <SectionLabel>{t("settings.api")}</SectionLabel>
          <p className="mt-3 text-[13px] text-muted-foreground">
            {t("settings.apiBody")}
          </p>
          <div className="mt-4">
            <StatusLabel tone={apiOk && !isError ? "operational" : "down"}>
              {apiOk && !isError ? t("settings.connected") : t("settings.disconnected")}
            </StatusLabel>
          </div>
        </section>
        </div>
      </div>
    </QueryGate>
  );
}
