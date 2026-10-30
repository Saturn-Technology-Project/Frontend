"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, PhotoField } from "@/components/account/photo-field";
import { QueryGate } from "@/components/layout/query-gate";
import { PayloadEncryption } from "@/components/settings/payload-encryption";
import { orgQueryKey, useOrg, useOrgMembers } from "@/hooks/use-team";
import { canAccess } from "@/lib/access";
import { updateOrgPhoto } from "@/lib/api";
import { DONATE_URL } from "@/lib/donate";
import { NavIcon } from "@/components/layout/nav-icon";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export default function SettingsPage() {
  const { t } = useI18n();
  const sessionUser = useAuthStore((state) => state.user);
  const sessionOrg = useAuthStore((state) => state.org);
  const workspace = useOrg();
  const members = useOrgMembers();
  const organization = workspace.data?.organization;
  const kind = organization?.kind ?? sessionOrg?.kind;
  const plan = organization?.plan ?? sessionOrg?.plan;
  const personal = kind === "personal" || (kind == null && (plan === "free" || plan === "pro" || plan === "trial" || plan === "starter"));
  const canTeam = canAccess(sessionUser?.permissions, "team", "read") && !personal;
  const canEditPhoto = canAccess(sessionUser?.permissions, "team", "write");
  const client = useQueryClient();
  const photo = useMutation({
    mutationFn: updateOrgPhoto,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: orgQueryKey });
    },
  });
  const name = organization?.name ?? sessionOrg?.name ?? "—";
  const photoUrl = organization?.photo ?? sessionOrg?.photo;

  return (
    <QueryGate isPending={workspace.isPending && !sessionOrg} isError={false}>
      <div className="px-4 py-6 md:px-10 md:py-8">
        <div className="flex items-center gap-3">
          <Avatar photo={photoUrl} name={name} shape="rounded" className="size-10 text-[16px]" />
          <h1 className="truncate text-[26px] font-semibold tracking-tight">{name}</h1>
        </div>
        <PayloadEncryption />

        <div className="mt-8 border-t border-border">
          <SettingRow label={t("settings.logo")} hint={t("settings.logoHint")}>
            <PhotoField
              appearance="inline"
              photo={photoUrl}
              name={name}
              canEdit={canEditPhoto}
              pending={photo.isPending}
              onChange={(next) => photo.mutate(next)}
            />
            {photo.isError ? <p className="mt-2 text-[13px] text-destructive">{photo.error.message}</p> : null}
          </SettingRow>
          <SettingRow label={t("settings.name")}>{name}</SettingRow>
          {canTeam ? (
            <SettingRow label={t("team.members")}>
              <CountLink href="/team" value={members.data?.length} />
            </SettingRow>
          ) : null}

          <SettingRow label={t("donate.title")} hint={t("donate.free")}>
            <a
              href={DONATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-[13px] hover:bg-muted"
            >
              <NavIcon name="heart" />
              {t("donate.action")}
            </a>
          </SettingRow>
        </div>
      </div>

    </QueryGate>
  );
}

function SettingRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 border-b border-border py-5 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-8">
      <div>
        <div className="text-[13px] text-muted-foreground">{label}</div>
        {hint ? <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="min-w-0 text-[14px]">{children}</div>
    </div>
  );
}

function CountLink({ href, value }: { href: string; value: number | undefined }) {
  return (
    <Link href={href} className="hover:underline">
      {value == null ? "—" : value.toLocaleString()}
    </Link>
  );
}
