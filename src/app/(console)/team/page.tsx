"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { QueryGate } from "@/components/layout/query-gate";
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
import { GroupsPanel } from "@/components/account/groups-panel";
import { useEntitlements } from "@/hooks/use-entitlements";
import { canAccess } from "@/lib/access";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ApiError, type AccessPermissions, type OrgMember } from "@/lib/api";
import type { Agent } from "@/types";

const RESOURCES: (keyof AccessPermissions)[] = ["agents", "policies", "approvals", "team"];
const LEVELS: AccessPermissions["agents"][] = ["none", "read", "write"];
const ROLES = ["admin", "operator", "viewer", "custom"] as const;

const EMPTY: AccessPermissions = {
  agents: "none",
  policies: "none",
  approvals: "none",
  team: "none",
};

const fieldClass =
  "mt-1.5 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-ring";

export default function TeamPage() {
  const { t } = useI18n();
  const permissions = useAuthStore((state) => state.user?.permissions);
  const canRead = canAccess(permissions, "team", "read");
  const canWrite = canAccess(permissions, "team", "write");
  const { groups: groupAccess } = useEntitlements();
  const org = useOrg();
  const members = useOrgMembers();
  const invites = useOrgInvites();
  const { data: consoleData } = useConsole();
  const agents = consoleData?.agents ?? [];
  const invite = useInviteMember();
  const updateMember = useUpdateMember();
  const revokeInvite = useRevokeInvite();
  const [openId, setOpenId] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    name: "",
    title: "",
    role: "operator",
  });
  const [inviteToken, setInviteToken] = useState("");
  const [invitedEmail, setInvitedEmail] = useState("");
  const [inviteError, setInviteError] = useState("");

  const catalogRoles = org.data?.catalog.roles ?? [];
  const pendingInvites = (invites.data ?? []).filter((item) => item.status === "pending");
  const people = members.data ?? [];

  if (org.data?.organization.kind === "personal") {
    return (
      <div className="px-4 py-5 md:px-8 md:py-6">
        <h1 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">{t("team.title")}</h1>
        <p className="mt-6 text-[13px] text-muted-foreground">{t("team.personal")}</p>
      </div>
    );
  }

  if (!canRead && !org.isPending) {
    return (
      <div className="px-4 py-5 md:px-8 md:py-6">
        <h1 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">{t("team.title")}</h1>
        <p className="mt-6 text-[13px] text-muted-foreground">{t("team.forbidden")}</p>
      </div>
    );
  }

  return (
    <QueryGate isPending={org.isPending || members.isPending} isError={org.isError || members.isError}>
      <div className="px-4 py-5 md:px-8 md:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">{t("team.title")}</h1>
            <p className="mt-1 max-w-xl text-[13px] text-muted-foreground">{t("team.subtitle")}</p>
          </div>
          {canWrite ? (
            <Button className="w-full sm:w-auto" variant={inviting ? "outline" : "default"} onClick={() => setInviting((current) => !current)}>
              {inviting ? t("agents.cancel") : t("team.invite")}
            </Button>
          ) : null}
        </div>

        {groupAccess ? <GroupsPanel members={people} canWrite={canWrite} /> : null}

        {canWrite && inviting ? (
          <form
            className="mt-6 max-w-2xl rounded-xl border border-border bg-card p-4"
            onSubmit={async (event) => {
              event.preventDefault();
              const email = inviteForm.email.trim().toLowerCase();
              setInviteError("");
              setInvitedEmail("");
              try {
                const result = await invite.mutateAsync({
                  email,
                  name: inviteForm.name.trim(),
                  title: inviteForm.title.trim() || t("team.operator"),
                  role: inviteForm.role,
                });
                // Production emails the link and returns no token. Only local development returns it.
                setInviteToken(result.token ?? "");
                setInvitedEmail(email);
                setInviteForm({ email: "", name: "", title: "", role: "operator" });
              } catch (err) {
                setInviteToken("");
                if (err instanceof ApiError && err.status === 503) setInviteError(t("team.inviteMailDown"));
                else if (err instanceof ApiError && err.status === 409) setInviteError(t("team.inviteConflict"));
                else setInviteError(t("common.requestFailed"));
              }
            }}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-[12px] text-muted-foreground">
                {t("team.email")}
                <input
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))}
                  className={fieldClass}
                />
              </label>
              <label className="block text-[12px] text-muted-foreground">
                {t("team.name")}
                <input
                  required
                  value={inviteForm.name}
                  onChange={(event) => setInviteForm((current) => ({ ...current, name: event.target.value }))}
                  className={fieldClass}
                />
              </label>
              <label className="block text-[12px] text-muted-foreground">
                {t("team.titleField")}
                <input
                  value={inviteForm.title}
                  onChange={(event) => setInviteForm((current) => ({ ...current, title: event.target.value }))}
                  className={fieldClass}
                />
              </label>
              <div>
                <div className="text-[12px] text-muted-foreground">{t("team.role")}</div>
                <div className="mt-1.5 grid grid-cols-3 gap-1">
                  {ROLES.filter((role) => role !== "custom").map((role) => (
                    <Choice key={role} on={inviteForm.role === role} onClick={() => setInviteForm((current) => ({ ...current, role }))}>
                      {t(`team.${role}`)}
                    </Choice>
                  ))}
                </div>
              </div>
            </div>
            {inviteError ? <p className="mt-3 text-[13px] text-destructive">{inviteError}</p> : null}
            <Button type="submit" className="mt-4" disabled={invite.isPending}>
              {t("team.invite")}
            </Button>
            {invitedEmail && !inviteToken ? (
              <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-[12px] text-muted-foreground">
                {t("team.inviteSent", { email: invitedEmail })}
              </p>
            ) : null}
            {inviteToken ? (
              <p className="mt-4 break-all rounded-lg bg-muted px-3 py-2 font-mono text-[12px] text-muted-foreground">
                {t("team.inviteLink")}{" "}
                {`/accept-invite?token=${encodeURIComponent(inviteToken)}&email=${encodeURIComponent(invitedEmail)}`}
              </p>
            ) : null}
          </form>
        ) : null}

        {pendingInvites.length > 0 ? (
          <section className="mt-6 max-w-3xl">
            <h2 className="text-[13px] font-medium text-muted-foreground">{t("team.invites")}</h2>
            <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {pendingInvites.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium">{item.name}</div>
                    <div className="truncate text-[12px] text-muted-foreground">
                      {item.email} · {t(`team.${item.role}`)}
                    </div>
                  </div>
                  {canWrite ? (
                    <Button variant="ghost" size="sm" disabled={revokeInvite.isPending} onClick={() => revokeInvite.mutate(item.id)}>
                      {t("team.revoke")}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-6 max-w-3xl">
          <h2 className="text-[13px] font-medium text-muted-foreground">
            {t("team.members")}
            {people.length > 0 ? ` · ${people.length}` : ""}
          </h2>
          {people.length === 0 ? (
            <div className="mt-2 rounded-xl border border-dashed border-border px-6 py-12 text-center">
              <p className="text-[15px] font-medium">{t("team.empty")}</p>
            </div>
          ) : (
            <ul className="mt-2 space-y-2">
              {people.map((member) => {
                const open = openId === member.id;
                return (
                  <li key={member.id} className="overflow-hidden rounded-xl border border-border bg-card">
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setOpenId(open ? null : member.id)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-[13px] font-medium">
                        {(member.name || "?").slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium">{member.name}</span>
                        <span className="block truncate text-[12px] text-muted-foreground">
                          {member.email}
                          {member.title ? ` · ${member.title}` : ""}
                        </span>
                      </span>
                      <span className="hidden rounded-full bg-muted px-2.5 py-1 text-[12px] sm:inline">{t(`team.${member.role}`)}</span>
                      <StatusLabel tone={member.status === "active" ? "active" : "paused"}>
                        {t(`team.${member.status === "active" ? "active" : "disabled"}`)}
                      </StatusLabel>
                    </button>
                    {open ? (
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
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </QueryGate>
  );
}

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "h-9 rounded-lg border px-2 text-[12px]",
        on ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
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
  agents: Agent[];
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
  const [perms, setPerms] = useState<AccessPermissions>({ ...EMPTY, ...member.permissions });
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
  const groups = useMemo(() => {
    const order: string[] = [];
    const buckets = new Map<string, Agent[]>();
    for (const agent of agents) {
      const key = agent.registeredUserEmail || agent.registeredUserName || "";
      if (!buckets.has(key)) {
        buckets.set(key, []);
        order.push(key);
      }
      buckets.get(key)?.push(agent);
    }
    return order.map((key) => {
      const items = buckets.get(key) ?? [];
      return {
        key: key || "unregistered",
        name: items[0]?.registeredUserName || "",
        email: items[0]?.registeredUserEmail || "",
        agents: items,
      };
    });
  }, [agents]);

  function onRoleChange(next: string) {
    setRole(next);
    const preset = catalogRoles.find((item) => item.id === next);
    if (preset && next !== "custom") setPerms({ ...EMPTY, ...preset.permissions });
  }

  return (
    <form
      className="space-y-5 border-t border-border px-4 py-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!canWrite) return;
        await onSave({
          role,
          permissions: perms,
          status,
          agent_ids: agentIds,
          agent_edit_ids: editIds.filter((id) => agentIds.includes(id)),
        });
      }}
    >
      <div>
        <div className="text-[12px] text-muted-foreground">{t("team.role")}</div>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {ROLES.map((item) => (
            <Choice key={item} on={role === item} onClick={() => canWrite && onRoleChange(item)}>
              {t(`team.${item}`)}
            </Choice>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[12px] text-muted-foreground">{t("team.status")}</div>
        <div className="mt-1.5 grid max-w-xs grid-cols-2 gap-1">
          <Choice on={status === "active"} onClick={() => canWrite && setStatus("active")}>
            {t("team.active")}
          </Choice>
          <Choice on={status === "disabled"} onClick={() => canWrite && setStatus("disabled")}>
            {t("team.disabled")}
          </Choice>
        </div>
      </div>

      <div>
        <div className="text-[12px] text-muted-foreground">{t("team.permissions")}</div>
        <ul className="mt-1.5 divide-y divide-border overflow-hidden rounded-lg border border-border">
          {RESOURCES.map((resource) => (
            <li key={resource} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[13px]">{resourceLabel[resource]}</span>
              <div className="grid grid-cols-3 gap-1 sm:w-[220px]">
                {LEVELS.map((level) => (
                  <Choice
                    key={level}
                    on={perms[resource] === level}
                    onClick={() => {
                      if (!canWrite) return;
                      setRole("custom");
                      setPerms((current) => ({ ...current, [resource]: level }));
                    }}
                  >
                    {t(`team.${level}`)}
                  </Choice>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {agents.length > 0 ? (
        <div>
          <div className="text-[12px] text-muted-foreground">{t("team.agents")}</div>
          <div className="mt-1.5 space-y-3">
            {groups.map((group) => (
              <section key={group.key}>
                <div className="flex items-baseline gap-2 px-1">
                  <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{t("team.registeredBy")}</span>
                  <span className="truncate text-[13px] font-medium">
                    {group.name || group.email || t("team.unregistered")}
                  </span>
                  {group.name && group.email ? (
                    <span className="truncate text-[12px] text-muted-foreground">{group.email}</span>
                  ) : null}
                </div>
                <ul className="mt-1.5 divide-y divide-border overflow-hidden rounded-lg border border-border">
                  {group.agents.map((agent) => {
                    const assigned = agentIds.includes(agent.id);
                    return (
                      <li key={agent.id} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                        <label className="flex min-w-0 items-center gap-2 text-[13px]">
                          <input
                            type="checkbox"
                            checked={assigned}
                            disabled={!canWrite}
                            onChange={(event) => {
                              setAgentIds((current) =>
                                event.target.checked ? [...current, agent.id] : current.filter((id) => id !== agent.id)
                              );
                              if (!event.target.checked) setEditIds((current) => current.filter((id) => id !== agent.id));
                            }}
                          />
                          <span className="truncate">{agent.name}</span>
                        </label>
                        <label className={cn("flex items-center gap-2 text-[12px]", assigned ? "text-foreground" : "text-muted-foreground")}>
                          <input
                            type="checkbox"
                            checked={assigned && editIds.includes(agent.id)}
                            disabled={!canWrite || !assigned}
                            onChange={(event) => {
                              setEditIds((current) =>
                                event.target.checked ? [...current, agent.id] : current.filter((id) => id !== agent.id)
                              );
                            }}
                          />
                          {t("team.canModify")}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>
      ) : null}

      {canWrite ? (
        <Button type="submit" disabled={saving}>
          {saving ? t("team.saving") : t("team.save")}
        </Button>
      ) : null}
    </form>
  );
}
