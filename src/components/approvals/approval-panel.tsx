"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { SectionLabel } from "@/components/ui/section-label";
import { useI18n } from "@/lib/i18n";
import type { Approval } from "@/types";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[112px_1fr] gap-4 py-3">
      <SectionLabel className="pt-0.5">{label}</SectionLabel>
      <div className="text-[15px] leading-6 text-foreground">{value}</div>
    </div>
  );
}

export function ApprovalPanel({
  approval,
  open,
  onOpenChange,
  onResolve,
  resolving = false,
}: {
  approval: Approval | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolve: (decision: "approved" | "rejected") => void;
  resolving?: boolean;
}) {
  const { t } = useI18n();
  if (!approval) return null;

  const pending = approval.status === "pending";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[420px] max-w-[420px] gap-0 rounded-md p-0 ring-border sm:max-w-[420px]"
      >
        <div className="border-b border-border px-6 py-5">
          <DialogTitle className="saturn-label">
            {t("approvals.humanRequired")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("approvals.reviewAria")}
          </DialogDescription>
        </div>

        <div className="divide-y divide-border px-6">
          <Field
            label={t("approvals.refund")}
            value={`${approval.amount ?? approval.action} ${approval.currency ?? ""}`.trim()}
          />
          <Field label={t("approvals.customer")} value={approval.customer} />
          <Field label={t("approvals.reason")} value={approval.reason || "—"} />
          <Field label={t("approvals.policy")} value={approval.policy} />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          {pending ? (
            <>
              <Button
                variant="outline"
                disabled={resolving}
                onClick={() => onResolve("rejected")}
              >
                {t("approvals.reject")}
              </Button>
              <Button disabled={resolving} onClick={() => onResolve("approved")}>
                {t("approvals.approve")}
              </Button>
            </>
          ) : (
            <div className="text-[12px] text-muted-foreground">
              {t(
                approval.status === "approved"
                  ? "approvals.approvedBy"
                  : "approvals.rejectedBy",
                { name: approval.resolvedBy ?? "" }
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
