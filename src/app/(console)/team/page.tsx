"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { QueryGate } from "@/components/layout/query-gate";
import { SectionLabel } from "@/components/ui/section-label";
import { StatusLabel } from "@/components/ui/status-dot";
import { useConsole } from "@/hooks/use-console";
import {
  useInviteMember,
  useOrg,
  useOrgInvites,
  useOrgMembers,
  useRevokeInvite,
  useUpdateMember,
} from "@/hooks/use-team";
import { canAccess } from "@/lib/access";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import type { AccessPermissions, OrgMember } from "@/lib/api";

const RESOURCES: (keyof AccessPermissions)[] = [
  "agents",
  "policies",
  "approvals",
  "team",
];
const LEVELS: AccessPermissions["agents"][] = ["none", "read", "write"];
const ROLES = ["admin", "operator", "viewer", "custom"] as const;

const EMPTY: AccessPermissions = {
  agents: "none",
  policies: "none",
  approvals: "none",
  team: "none",
};

export default function TeamPage() {
  const { t } = useI18n();
  const permissions = useAuthStore((state) => state.user?.permissions);
  const canRead = canAccess(permissions, "team", "read");
  const canWrite = canAccess(permissions, "team", "write");
  const org = useOrg();
  const members = useOrgMembers();
  const invites = useOrgInvites();
  const { data: consoleData } = useConsole();
  const agents = consoleData?.agents ?? [];
  const invite = useInviteMember();
  const updateMember = useUpdateMember();
  const revokeInvite = useRevokeInvite();
  const [openId, setOpenId] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    name: "",
    title: "",
    role: "operator",
  });
  const [inviteToken, setInviteToken] = useState("");

  const catalogRoles = org.data?.catalog.roles ?? [];
  const pendingInvites = (invites.data ?? []).filter((item) => item.status === "pending");

  if (org.data?.organization.kind === "personal") {
    return (
      <div className="px-4 py-6 md:px-10 md:py-10 text-[13px] text-muted-foreground">
        {t("team.personal")}
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="px-4 py-6 md:px-10 md:py-10 text-[13px] text-muted-foreground">
        {t("team.forbidden")}
      </div>
    );
  }

  return (
    <QueryGate isPending={org.isPending || members.isPending} isError={org.isError || members.isError}>
      <div className="px-4 py-6 md:px-10 md:py-10">
        <h1 className="text-[22px] font-medium tracking-tight">{t("team.title")}</h1>
        <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">
          {t("team.subtitle")}
        </p>

        {canWrite ? (
          <form
            className="mt-10 max-w-[640px] border-t border-border pt-8"
            onSubmit={async (event) => {
              event.preventDefault();
              try {
                const result = await invite.mutateAsync({
                  email: inviteForm.email.trim(),
                  name: inviteForm.name.trim(),
                  title: inviteForm.title.trim() || t("team.operator"),
                  role: inviteForm.role,
                });
                setInviteToken(result.token ?? "");
                setInviteForm({ email: "", name: "", title: "", role: "operator" });
              } catch {
                setInviteToken("");
              }
            }}
          >
            <SectionLabel>{t("team.invite")}</SectionLabel>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                label={t("team.email")}
                value={inviteForm.email}
                type="email"
                onChange={(value) => setInviteForm((current) => ({ ...current, email: value }))}
              />
              <Field
                label={t("team.name")}
                value={inviteForm.name}
                onChange={(value) => setInviteForm((current) => ({ ...current, name: value }))}
              />
              <Field
                label={t("team.titleField")}
                value={inviteForm.title}
                required={false}
                onChange={(value) => setInviteForm((current) => ({ ...current, title: value }))}
              />
              <label className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                {t("team.role")}
                <select
                  value={inviteForm.role}
                  onChange={(event) =>
                    setInviteForm((current) => ({ ...current, role: event.target.value }))
                  }
                  className="mt-2 h-9 w-full rounded-md border border-border bg-background px-2 text-[13px] text-foreground outline-none"
                >
                  {ROLES.filter((role) => role !== "custom").map((role) => (
                    <option key={role} value={role}>
                      {t(`team.${role}`)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {invite.isError ? (
              <p className="mt-3 text-[12px] text-destructive">{t("common.requestFailed")}</p>
            ) : null}
            <Button type="submit" className="mt-4" disabled={invite.isPending}>
              {t("team.invite")}
            </Button>
            {inviteToken ? (
              <p className="mt-4 break-all font-mono text-[12px] text-muted-foreground">
                {t("team.inviteToken")} {inviteToken}
              </p>
            ) : null}
          </form>
        ) : null}

        <section className="mt-10">
          <SectionLabel className="mb-3">{t("team.members")}</SectionLabel>
          {(members.data ?? []).length === 0 ? (
            <p className="text-[13px] text-muted-foreground">{t("team.empty")}</p>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {(members.data ?? []).map((member) => (
                <li key={member.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(openId === member.id ? null : member.id)}
                    className="flex w-full flex-col items-start gap-1 py-4 text-left hover:bg-muted/40 md:grid md:grid-cols-[180px_1fr_120px_100px_100px] md:items-center md:gap-4"
                  >
                    <span className="text-[13px] font-medium">{member.name}</span>
                    <span className="truncate text-[13px] text-muted-foreground">
                      {member.email} · {member.title}
                    </span>
                    <span className="text-[12px] text-muted-foreground">
                      {t(`team.${member.role}`)}
                    </span>
                    <StatusLabel
                      tone={member.status === "active" ? "active" : "paused"}
                    >
                      {t(`team.${member.status === "active" ? "active" : "disabled"}`)}
                    </StatusLabel>
                    <span className="font-mono text-[11px] text-muted-foreground md:justify-self-end">
                      {RESOURCES.map((resource) => member.permissions[resource]?.[0] ?? "n").join("")}
                    </span>
                  </button>
                  {openId === member.id ? (
                    <MemberEditor
                      member={member}
                      agents={agents}
                      catalogRoles={catalogRoles}
                      canWrite={canWrite}
                      saving={updateMember.isPending}
                      onSave={async (body) => {
                        await updateMember.mutateAsync({ id: member.id, body });
                      }}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <SectionLabel className="mb-3">{t("team.invites")}</SectionLabel>
          {pendingInvites.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">{t("team.noInvites")}</p>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {pendingInvites.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-4 py-3.5 text-[13px]"
                >
                  <span>
                    {item.name} · {item.email}
                    <span className="ml-3 text-muted-foreground">{t(`team.${item.role}`)}</span>
                  </span>
                  {canWrite ? (
                    <Button
                      variant="outline"
                      disabled={revokeInvite.isPending}
                      onClick={() => revokeInvite.mutate(item.id)}
                    >
                      {t("team.revoke")}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </QueryGate>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
      {label}
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-9 w-full rounded-md border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-ring"
      />
    </label>
  );
}

function MemberEditor({
  member,
  agents,
  catalogRoles,
  canWrite,
  saving,
  onSave,
}: {
  member: OrgMember;
  agents: { id: string; name: string }[];
  catalogRoles: { id: string; permissions: AccessPermissions }[];
  canWrite: boolean;
  saving: boolean;
  onSave: (body: {
    role: string;
    permissions: AccessPermissions;
    status: string;
    agent_ids: string[];
    agent_edit_ids: string[];
  }) => Promise<void>;
}) {
  const { t } = useI18n();
  const [role, setRole] = useState(member.role);
  const [status, setStatus] = useState(member.status);
  const [perms, setPerms] = useState<AccessPermissions>({
    ...EMPTY,
    ...member.permissions,
  });
  const [agentIds, setAgentIds] = useState(member.agent_ids);
  const [editIds, setEditIds] = useState<string[]>(
    member.agent_edit_ids ?? (member.permissions.agents === "write" ? member.agent_ids : [])
  );
  const resourceLabel = useMemo(
    () => ({
      agents: t("team.resourceAgents"),
      policies: t("team.resourcePolicies"),
      approvals: t("team.resourceApprovals"),
      team: t("team.resourceTeam"),
    }),
    [t]
  );

  function onRoleChange(next: string) {
    setRole(next);
    const preset = catalogRoles.find((item) => item.id === next);
    if (preset && next !== "custom") {
      setPerms({ ...EMPTY, ...preset.permissions });
    }
  }

  if (!canWrite) {
    return (
      <div className="mb-4 grid gap-2 px-0 pb-4 text-[13px] text-muted-foreground">
        {RESOURCES.map((resource) => (
          <div key={resource} className="grid grid-cols-1 gap-1 sm:grid-cols-[120px_1fr] sm:gap-4">
            <span>{resourceLabel[resource]}</span>
            <span>{t(`team.${perms[resource]}`)}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <form
      className="mb-4 space-y-5 border-t border-border pt-4"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSave({
          role,
          permissions: perms,
          status,
          agent_ids: agentIds,
          agent_edit_ids: editIds.filter((id) => agentIds.includes(id)),
        });
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          {t("team.role")}
          <select
            value={role}
            onChange={(event) => onRoleChange(event.target.value)}
            className="mt-2 h-9 w-full rounded-md border border-border bg-background px-2 text-[13px] text-foreground outline-none"
          >
            {ROLES.map((item) => (
              <option key={item} value={item}>
                {t(`team.${item}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          {t("team.status")}
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="mt-2 h-9 w-full rounded-md border border-border bg-background px-2 text-[13px] text-foreground outline-none"
          >
            <option value="active">{t("team.active")}</option>
            <option value="disabled">{t("team.disabled")}</option>
          </select>
        </label>
      </div>

      <div>
        <SectionLabel>{t("team.permissions")}</SectionLabel>
        <div className="mt-3 space-y-2">
          {RESOURCES.map((resource) => (
            <div
              key={resource}
              className="grid grid-cols-1 items-start gap-2 text-[13px] sm:grid-cols-[140px_1fr] sm:items-center sm:gap-4"
            >
              <span>{resourceLabel[resource]}</span>
              <select
                value={perms[resource]}
                onChange={(event) => {
                  const level = event.target.value as AccessPermissions["agents"];
                  setRole("custom");
                  setPerms((current) => ({ ...current, [resource]: level }));
                }}
                className="h-8 rounded-md border border-border bg-background px-2 text-[13px] outline-none"
              >
                {LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {t(`team.${level}`)}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {agents.length > 0 ? (
        <div>
          <SectionLabel>{t("team.agents")}</SectionLabel>
          <div className="mt-3 space-y-2 text-[13px]">
            {agents.map((agent) => (
              <div key={agent.id} className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={agentIds.includes(agent.id)}
                    onChange={(event) => {
                      setAgentIds((current) =>
                        event.target.checked
                          ? [...current, agent.id]
                          : current.filter((id) => id !== agent.id)
                      );
                      if (!event.target.checked) {
                        setEditIds((current) => current.filter((id) => id !== agent.id));
                      }
                    }}
                  />
                  {agent.name}
                </label>
                <label className="flex items-center gap-2 text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={agentIds.includes(agent.id) && editIds.includes(agent.id)}
                    disabled={!agentIds.includes(agent.id)}
                    onChange={(event) => {
                      setEditIds((current) =>
                        event.target.checked
                          ? [...current, agent.id]
                          : current.filter((id) => id !== agent.id)
                      );
                    }}
                  />
                  {t("team.canModify")}
                </label>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <Button type="submit" disabled={saving}>
        {saving ? t("team.saving") : t("team.save")}
      </Button>
    </form>
  );
}
