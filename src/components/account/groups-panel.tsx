"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { addGroupMember, createGroup, deleteGroup, fetchGroups, removeGroupMember } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { OrgMember } from "@/lib/api";

const fieldClass =
  "mt-1.5 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-ring";

export function GroupsPanel({ members, canWrite }: { members: OrgMember[]; canWrite: boolean }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [confirming, setConfirming] = useState("");
  const groups = useQuery({ queryKey: ["groups"], queryFn: fetchGroups });

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

  const removeGroup = useMutation({
    mutationFn: (groupId: string) => deleteGroup(groupId),
    onSuccess: async () => {
      setConfirming("");
      await refresh();
    },
  });

  function submitGroup(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    addGroup.mutate();
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
            <div className="flex items-center justify-between gap-3">
              <div className="text-[13px] font-medium">{group.name}</div>
              {canWrite ? (
                confirming === group.id ? (
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setConfirming("")}>
                      {t("team.cancel")}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={removeGroup.isPending}
                      onClick={() => removeGroup.mutate(group.id)}
                    >
                      {t("team.confirmDeleteGroup")}
                    </Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" onClick={() => setConfirming(group.id)}>
                    {t("team.deleteGroup")}
                  </Button>
                )
              ) : null}
            </div>
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
      {addGroup.isError || membership.isError || removeGroup.isError ? (
        <p className="mt-3 text-[13px] text-destructive">
          {(addGroup.error || membership.error || removeGroup.error) instanceof Error
            ? (addGroup.error || membership.error || removeGroup.error)?.message
            : t("common.apiError")}
        </p>
      ) : null}
    </section>
  );
}
