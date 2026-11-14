"use client";

import type { PolicyReview, PolicyValidation } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export function ValidationReport({ report }: { report: PolicyValidation | null }) {
  const { t } = useI18n();
  if (!report) return <p className="text-[13px] text-muted-foreground">{t("policies.validate")}</p>;
  return (
    <div className="text-[13px]">
      <p>
        {t("policies.toolCount", { n: report.toolCount })}
        {" · "}
        {t("policies.analyzedCount", { n: report.analyzed })}
        {report.unclassified.length ? ` · ${t("policies.unclassifiedCount", { n: report.unclassified.length })}` : ""}
        {report.insufficient.length ? ` · ${t("policies.insufficientCount", { n: report.insufficient.length })}` : ""}
      </p>
      <ul className="mt-2 space-y-1">
        {report.issues.map((issue, index) => (
          <li key={`${issue.code}-${index}`} className={issue.level === "error" ? "text-destructive" : "text-muted-foreground"}>
            {issue.tool ? `${issue.tool}: ` : ""}
            {issue.message}
          </li>
        ))}
        {report.probes.map((probe, index) => (
          <li key={`probe-${index}`} className={probe.ok ? "text-muted-foreground" : "text-destructive"}>
            {probe.tool}: {probe.message}
            {probe.expected ? ` (${probe.expected} → ${probe.actual})` : ""}
          </li>
        ))}
      </ul>
      {report.review ? <PolicyReviewList review={report.review} /> : null}
    </div>
  );
}

function PolicyReviewList({ review }: { review: PolicyReview }) {
  const { t } = useI18n();
  const reason = (code: string) =>
    code === "description_truncated" ? t("policies.flagDescriptionTruncated") : code === "hidden_characters" ? t("policies.flagHiddenCharacters") : code;
  const names = (items: string[]) => (items.length ? items.join(", ") : t("policies.reviewNone"));
  return (
    <div className="mt-3 border-t border-border pt-3">
      <p className="font-medium">{t("policies.reviewTitle")}</p>
      <dl className="mt-1 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1">
        <dt className="text-muted-foreground">{t("policies.reviewAllows")}</dt>
        <dd className={review.allows.length ? "text-destructive" : undefined}>{names(review.allows)}</dd>
        <dt className="text-muted-foreground">{t("policies.reviewApprovals")}</dt>
        <dd>{names(review.approvals)}</dd>
      </dl>
      {review.flagged_tools.length ? (
        <div className="mt-2">
          <p role="alert" className="text-destructive">{t("policies.reviewFlagged")}</p>
          <p className="text-muted-foreground">{t("policies.reviewFlaggedNote")}</p>
          <ul className="mt-1 space-y-1">
            {review.flagged_tools.map((item) => (
              <li key={item.tool}>
                <span className="font-mono">{item.tool}</span>: {item.reasons.map(reason).join(", ")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
