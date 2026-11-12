"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, fetchNotices, updateNotices, type NoticeSettings } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const EMPTY: NoticeSettings = { approval: false, execute: false, audit: false };

export function EmailNotices() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: ["notices"],
    queryFn: fetchNotices,
  });
  const save = useMutation({
    mutationFn: updateNotices,
    onSuccess: async (next) => {
      queryClient.setQueryData(["notices"], next);
    },
  });
  const current = status.data ?? EMPTY;
  const missing = status.error instanceof ApiError && status.error.status === 404;

  function toggle(key: keyof NoticeSettings) {
    if (!status.isSuccess || save.isPending) return;
    save.mutate({ ...current, [key]: !current[key] });
  }

  return (
    <section className="mt-10 max-w-md border-t border-border pt-8">
      <h2 className="text-[13px] font-medium">{t("profile.notices")}</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">{t("profile.noticesBody")}</p>
      <ul className="mt-4 divide-y divide-border">
        <NoticeRow
          label={t("profile.noticeApproval")}
          body={t("profile.noticeApprovalBody")}
          on={current.approval}
          disabled={!status.isSuccess || save.isPending}
          onToggle={() => toggle("approval")}
          onLabel={t("profile.emailOn")}
          offLabel={t("profile.emailOff")}
        />
        <NoticeRow
          label={t("profile.noticeExecute")}
          body={t("profile.noticeExecuteBody")}
          on={current.execute}
          disabled={!status.isSuccess || save.isPending}
          onToggle={() => toggle("execute")}
          onLabel={t("profile.emailOn")}
          offLabel={t("profile.emailOff")}
        />
        <NoticeRow
          label={t("profile.noticeAudit")}
          body={t("profile.noticeAuditBody")}
          on={current.audit}
          disabled={!status.isSuccess || save.isPending}
          onToggle={() => toggle("audit")}
          onLabel={t("profile.emailOn")}
          offLabel={t("profile.emailOff")}
        />
      </ul>
      {save.isError ? (
        <p role="alert" className="mt-3 text-[13px] text-destructive">
          {save.error instanceof ApiError ? save.error.message : t("common.apiError")}
        </p>
      ) : null}
      {status.isError && !missing ? (
        <p role="alert" className="mt-3 text-[13px] text-destructive">
          {status.error instanceof ApiError ? status.error.message : t("common.apiError")}
        </p>
      ) : null}
    </section>
  );
}

function NoticeRow({
  label,
  body,
  on,
  disabled,
  onToggle,
  onLabel,
  offLabel,
}: {
  label: string;
  body: string;
  on: boolean;
  disabled: boolean;
  onToggle: () => void;
  onLabel: string;
  offLabel: string;
}) {
  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <div className="text-[13px]">{label}</div>
        <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{body}</p>
      </div>
      <button
        type="button"
        aria-pressed={on}
        disabled={disabled}
        onClick={onToggle}
        className={cn(
          "h-8 shrink-0 rounded-full border px-3 text-[12px] disabled:cursor-default",
          on ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground"
        )}
      >
        {on ? onLabel : offLabel}
      </button>
    </li>
  );
}
