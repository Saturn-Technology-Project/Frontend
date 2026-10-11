"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  addGroupMember,
  approvalPolicySummary,
  createApprovalPolicy,
  createGroup,
  fetchApprovalPolicies,
  fetchGroups,
  removeGroupMember,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { OrgMember } from "@/lib/api";

const fieldClass =
  "mt-1.5 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-ring";

function requirementsReady(requirements: { groupId: string }[]) {
  const chosen = requirements.filter((row) => row.groupId);
  if (chosen.length === 0) return true;
  if (chosen.length !== requirements.length) return false;
  return new Set(chosen.map((row) => row.groupId)).size === chosen.length;
}

export function GroupsPanel({ members, canWrite }: { members: OrgMember[]; canWrite: boolean }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [policyName, setPolicyName] = useState("");
  const [requirements, setRequirements] = useState([{ key: "finance", groupId: "", count: 2 }]);
  const [allowRequester, setAllowRequester] = useState(false);
  const groups = useQuery({ queryKey: ["groups"], queryFn: fetchGroups });
  const policies = useQuery({ queryKey: ["approval-policies"], queryFn: fetchApprovalPolicies });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["groups"] });
    await queryClient.invalidateQueries({ queryKey: ["approval-policies"] });
  };

  const addGroup = useMutation({
    mutationFn: () => createGroup({ name: name.trim() }),
    onSuccess: async () => {
      setName("");
      await refresh();
    },
  });

  const membership = useMutation({
    mutationFn: (input: { groupId: string; employeeId: string; remove?: boolean }) =>
      input.remove
        ? removeGroupMember(input.groupId, input.employeeId)
        : addGroupMember(input.groupId, input.employeeId),
    onSuccess: refresh,
  });

  const addPolicy = useMutation({
    mutationFn: () => {
      const chosen = requirements.filter((row) => row.groupId);
      if (chosen.length > 0) {
        return createApprovalPolicy({
          name: policyName.trim(),
          allow_requester: allowRequester,
          requirements: chosen.map((row) => ({ group_id: row.groupId, required_count: row.count })),
        });
      }
      return createApprovalPolicy({
        name: policyName.trim(),
        required_count: requirements[0]?.count || 1,
        allow_requester: allowRequester,
      });
    },
    onSuccess: async () => {
      setPolicyName("");
      setRequirements([{ key: "finance", groupId: "", count: 2 }]);
      await refresh();
    },
  });

  function submitGroup(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    addGroup.mutate();
  }

  function submitPolicy(event: FormEvent) {
    event.preventDefault();
    if (!policyName.trim()) return;
    const chosen = requirements.filter((row) => row.groupId);
    if (chosen.length > 0 && chosen.length !== requirements.length) return;
    const ids = chosen.map((row) => row.groupId);
    if (new Set(ids).size !== ids.length) return;
    addPolicy.mutate();
  }

  const rows = groups.data ?? [];

  return (
    <section className="mt-10 max-w-3xl border-t border-border pt-8">
      <h2 className="text-[13px] font-medium">{t("team.groups")}</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">{t("team.groupBody")}</p>
      {rows.length === 0 ? <p className="mt-4 text-[13px] text-muted-foreground">{t("team.groupEmpty")}</p> : null}
      <ul className="mt-4 space-y-4">
        {rows.map((group) => (
          <li key={group.id} className="rounded-xl border border-border p-4">
            <div className="text-[13px] font-medium">{group.name}</div>
            {group.description ? <p className="mt-1 text-[12px] text-muted-foreground">{group.description}</p> : null}
            <ul className="mt-3 space-y-2">
              {group.members.map((member) => {
                const person = members.find((item) => item.id === member.employee_id);
                return (
                  <li key={member.employee_id} className="flex items-center justify-between gap-3 text-[13px]">
                    <span>{person?.name || person?.email || member.employee_id}</span>
                    {canWrite ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={membership.isPending}
                        onClick={() => membership.mutate({ groupId: group.id, employeeId: member.employee_id, remove: true })}
                      >
                        {t("team.removeMember")}
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {canWrite ? (
              <form
                className="mt-3 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  const employeeId = String(data.get("employee") || "");
                  if (!employeeId) return;
                  membership.mutate({ groupId: group.id, employeeId });
                  event.currentTarget.reset();
                }}
              >
                <select name="employee" className={fieldClass}>
                  <option value="">{t("team.groupMember")}</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name || member.email}
                    </option>
                  ))}
                </select>
                <Button type="submit" variant="outline" disabled={membership.isPending}>
                  {t("team.addMember")}
                </Button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
      {canWrite ? (
        <form onSubmit={submitGroup} className="mt-4 flex gap-2">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("team.groupName")} className={fieldClass} />
          <Button type="submit" disabled={addGroup.isPending || !name.trim()}>
            {t("team.addGroup")}
          </Button>
        </form>
      ) : null}

      <h3 className="mt-8 text-[13px] font-medium">{t("team.approvalPolicy")}</h3>
      <ul className="mt-3 space-y-2 text-[13px]">
        {(policies.data ?? []).map((policy) => (
          <li key={policy.id}>
            {policy.name} · {approvalPolicySummary(policy)} · {policy.status}
          </li>
        ))}
      </ul>
      {canWrite ? (
        <form onSubmit={submitPolicy} className="mt-3 grid max-w-xl gap-3">
          <p className="text-[13px] text-muted-foreground">{t("team.requirementBody")}</p>
          <input value={policyName} onChange={(event) => setPolicyName(event.target.value)} placeholder={t("team.approvalPolicy")} className={fieldClass} />
          {requirements.map((row) => (
            <div key={row.key} className="grid items-end gap-2 sm:grid-cols-[1fr_96px_auto]">
              <select
                value={row.groupId}
                onChange={(event) =>
                  setRequirements((current) =>
                    current.map((item) => (item.key === row.key ? { ...item, groupId: event.target.value } : item))
                  )
                }
                className={fieldClass}
              >
                <option value="">{t("team.groups")}</option>
                {rows.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              <label className="text-[12px] text-muted-foreground">
                {t("team.approvalCount")}
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={row.count}
                  onChange={(event) =>
                    setRequirements((current) =>
                      current.map((item) =>
                        item.key === row.key ? { ...item, count: Number(event.target.value) } : item
                      )
                    )
                  }
                  className={fieldClass}
                />
              </label>
              {requirements.length > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRequirements((current) => current.filter((item) => item.key !== row.key))}
                >
                  {t("team.removeRequirement")}
                </Button>
              ) : (
                <span />
              )}
            </div>
          ))}
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setRequirements((current) => [
                  ...current,
                  { key: `row-${current.length}-${Date.now()}`, groupId: "", count: 1 },
                ])
              }
            >
              {t("team.addRequirement")}
            </Button>
          </div>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={allowRequester} onChange={(event) => setAllowRequester(event.target.checked)} />
            {t("team.allowRequester")}
          </label>
          <Button type="submit" disabled={addPolicy.isPending || !policyName.trim() || !requirementsReady(requirements)}>
            {t("team.createApprovalPolicy")}
          </Button>
        </form>
      ) : null}
      {addGroup.isError || addPolicy.isError || membership.isError ? (
        <p className="mt-3 text-[13px] text-destructive">
          {(addGroup.error || addPolicy.error || membership.error) instanceof Error
            ? (addGroup.error || addPolicy.error || membership.error)?.message
            : t("common.apiError")}
        </p>
      ) : null}
    </section>
  );
}
