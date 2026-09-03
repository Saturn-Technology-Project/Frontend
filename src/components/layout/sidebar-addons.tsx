"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOrg } from "@/hooks/use-team";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const CONTACT =
  "mailto:hello@saturn.ai?subject=Saturn%20Add-on";

const itemClass =
  "flex h-8 items-center rounded-md px-2 text-[13px] text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground";

function AddonItem({
  addon,
}: {
  addon: { id: string; name: string; href?: string | null };
}) {
  if (!addon.href) {
    return <div className={cn(itemClass, "hover:bg-transparent")}>{addon.name}</div>;
  }
  if (addon.href.startsWith("http://") || addon.href.startsWith("https://")) {
    return (
      <a href={addon.href} target="_blank" rel="noreferrer" className={itemClass}>
        {addon.name}
      </a>
    );
  }
  return (
    <Link href={addon.href} className={itemClass}>
      {addon.name}
    </Link>
  );
}

export function SidebarAddons() {
  const { t } = useI18n();
  const orgId = useAuthStore((state) => state.org?.id);
  const org = useOrg();
  const addons = org.data?.organization.addons ?? [];
  const [open, setOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    setContactOpen(false);
  }, [orgId]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className={cn(
          "flex h-8 w-full items-center justify-between rounded-md px-2 text-[13px] transition-colors",
          open
            ? "text-foreground"
            : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
        )}
      >
        <span>{t("nav.addons")}</span>
        <ChevronRight
          className={cn(
            "size-3.5 shrink-0 transition-transform",
            open && "rotate-90"
          )}
        />
      </button>

      {open ? (
        <div className="mt-0.5 ml-2 border-l border-border pl-2">
          {addons.length > 0
            ? addons.map((addon) => <AddonItem key={addon.id} addon={addon} />)
            : (
              <button
                type="button"
                onClick={() => setContactOpen(true)}
                className="flex h-8 w-full items-center rounded-md px-2 text-left text-[13px] text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
              >
                {t("addons.buy")}
              </button>
            )}
        </div>
      ) : null}

      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent
          showCloseButton={false}
          className="w-[420px] max-w-[420px] gap-0 rounded-md p-0 ring-border sm:max-w-[420px]"
        >
          <div className="border-b border-border px-6 py-5">
            <DialogTitle className="text-[15px] font-medium tracking-tight">
              {t("addons.contactTitle")}
            </DialogTitle>
            <DialogDescription className="mt-2 text-[13px] leading-6 text-muted-foreground">
              {t("addons.contactBody")}
            </DialogDescription>
          </div>
          <div className="flex items-center justify-end gap-2 px-6 py-4">
            <Button variant="outline" onClick={() => setContactOpen(false)}>
              {t("agents.cancel")}
            </Button>
            <Button
              onClick={() => {
                window.location.href = CONTACT;
              }}
            >
              {t("addons.cta")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
