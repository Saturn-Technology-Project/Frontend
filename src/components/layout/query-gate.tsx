"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";

export function QueryGate({
  isPending,
  isError,
  children,
}: {
  isPending: boolean;
  isError: boolean;
  children: ReactNode;
}) {
  const { t } = useI18n();

  if (isPending) {
    return (
      <div className="px-10 py-10 text-[13px] text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-10 py-10 text-[13px] text-muted-foreground">
        {t("common.apiError")}
      </div>
    );
  }

  return children;
}
