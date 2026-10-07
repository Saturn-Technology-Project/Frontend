"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export function UpgradeCover() {
  const { t } = useI18n();
  const [soon, setSoon] = useState(false);
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70 backdrop-blur-[2px]">
      <div className="flex flex-col items-center gap-3">
        <Button type="button" size="lg" onClick={() => setSoon(true)}>
          {t("upgrade.action")}
        </Button>
        {soon ? <p className="text-[13px] text-muted-foreground">{t("upgrade.soon")}</p> : null}
      </div>
    </div>
  );
}
