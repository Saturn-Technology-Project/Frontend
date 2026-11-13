"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Avatar } from "@/components/account/photo-field";
import { NavIcon } from "@/components/layout/nav-icon";
import { DONATE_URL } from "@/lib/donate";
import { useMobileNav } from "@/components/layout/mobile-nav";
import { useConsole } from "@/hooks/use-console";
import { useEntitlements } from "@/hooks/use-entitlements";
import { useOrg } from "@/hooks/use-team";
import { logout } from "@/lib/api";
import { canAccess } from "@/lib/access";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const items = [
  { href: "/overview", key: "nav.home", icon: "home" },
  { href: "/tools", key: "nav.marketplace", icon: "grid" },
  { href: "/tools/connections", key: "nav.connections", icon: "link" },
  { href: "/agents", key: "nav.agents", icon: "bot" },
  { href: "/tools/mapping", key: "nav.mapping", icon: "sliders" },
  { href: "/policies", key: "nav.policies", icon: "shield" },
  { href: "/activity", key: "nav.audit", icon: "list" },
  { href: "/webhooks", key: "nav.webhooks", icon: "webhook" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const { open, setOpen } = useMobileNav();
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const apply = () => setCompact(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);
  const user = useAuthStore((state) => state.user);
  const permissions = user?.permissions;
  const workspace = useOrg();
  const savedOrg = useAuthStore((state) => state.org);
  const kind = workspace.data?.organization.kind ?? savedOrg?.kind;
  const plan = workspace.data?.organization.plan ?? savedOrg?.plan;
  const personal = kind === "personal" || (kind == null && (plan === "free" || plan === "pro" || plan === "trial" || plan === "starter"));
  const canTeam = canAccess(permissions, "team", "read") && !personal;
  const orgName = workspace.data?.organization.name ?? savedOrg?.name;
  const brand = personal ? t("nav.personalLabel") : orgName || "—";
  const { data } = useConsole();
  const { policies: policyAccess, webhooks: webhookAccess } = useEntitlements();
  const pending = data?.approvals.filter((item) => item.status === "pending").length ?? 0;
  const approveOn = pathname === "/approvals";
  const resubmitOn = pathname === "/approvals/resubmit";

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label={t("nav.closeMenu")}
          className="fixed inset-0 z-50 bg-foreground/30 md:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}
    <aside
      inert={compact && !open ? true : undefined}
      className={cn(
        "flex h-full w-[220px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:w-[min(88vw,320px)] max-md:pt-[env(safe-area-inset-top)] max-md:pb-[env(safe-area-inset-bottom)] max-md:shadow-xl max-md:transition-transform max-md:duration-200",
        open ? "max-md:translate-x-0" : "max-md:-translate-x-full"
      )}
    >
      <div className="flex h-14 items-center gap-2 px-4">
        <Avatar
          photo={workspace.data?.organization.photo ?? savedOrg?.photo}
          name={brand}
          className="size-7 shrink-0 bg-primary text-[12px] font-semibold text-primary-foreground"
        />
        <span className="truncate text-[15px] font-semibold tracking-tight">{brand}</span>
        <button
          type="button"
          aria-label={t("nav.closeMenu")}
          className="ml-auto inline-flex size-11 items-center justify-center rounded-lg text-[20px] leading-none text-muted-foreground hover:bg-sidebar-accent hover:text-foreground md:hidden"
          onClick={() => setOpen(false)}
        >
          ×
        </button>
      </div>
      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2">
        <Link
          href="/approvals"
          className={cn(
            "flex h-11 items-center gap-2.5 rounded-lg px-2.5 text-[14px] text-muted-foreground hover:bg-sidebar-accent hover:text-foreground md:h-9 md:text-[13px]",
            approveOn && "bg-sidebar-accent text-foreground hover:bg-sidebar-accent"
          )}
        >
          <NavIcon name="check" />
          <span className="min-w-0 flex-1 truncate">{t("nav.approve")}</span>
          {pending > 0 ? (
            <span className="rounded-full bg-foreground px-1.5 text-[11px] leading-5 text-background">{pending}</span>
          ) : null}
        </Link>
        <Link
          href="/approvals/resubmit"
          className={cn(
            "flex h-11 items-center gap-2.5 rounded-lg px-2.5 text-[14px] text-muted-foreground hover:bg-sidebar-accent hover:text-foreground md:h-9 md:text-[13px]",
            resubmitOn && "bg-sidebar-accent text-foreground hover:bg-sidebar-accent"
          )}
        >
          <NavIcon name="resubmit" />
          <span className="min-w-0 flex-1 truncate">{t("nav.resubmit")}</span>
        </Link>
        <div className="mx-2.5 my-2 h-px bg-sidebar-border" role="separator" />
        {items.map((item) => {
          const base = item.href.split("#")[0];
          const reserved = pathname.startsWith("/tools/connections") || pathname.startsWith("/tools/mapping");
          const on = item.href === "/tools"
            ? pathname === "/tools" || (pathname.startsWith("/tools/") && !reserved)
            : pathname === base || pathname.startsWith(`${base}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-11 items-center gap-2.5 rounded-lg px-2.5 text-[14px] text-muted-foreground hover:bg-sidebar-accent hover:text-foreground md:h-9 md:text-[13px]",
                on && "bg-sidebar-accent text-foreground hover:bg-sidebar-accent"
              )}
            >
              <NavIcon name={item.icon} />
              <span className="min-w-0 flex-1 truncate">{t(item.key)}</span>
              {(item.href === "/policies" && !policyAccess) || (item.href === "/webhooks" && !webhookAccess) ? (
                <span className="text-[11px] text-muted-foreground">Pro</span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <AccountFooter userName={user?.name || "—"} email={user?.email || "—"} photo={user?.photo} canTeam={canTeam} />
    </aside>
    </>
  );
}

function AccountFooter({
  userName,
  email,
  photo,
  canTeam,
}: {
  userName: string;
  email: string;
  photo?: string | null;
  canTeam: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t, locale, setLocale } = useI18n();
  const [panel, setPanel] = useState<"account" | "language" | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const [shownPath, setShownPath] = useState(pathname);
  // Moving to another page closes the account panel.
  if (pathname !== shownPath) {
    setShownPath(pathname);
    setPanel(null);
  }
  useEffect(() => {
    if (!panel) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setPanel(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setPanel(null);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [panel]);

  return (
    <div ref={rootRef} className="border-t border-sidebar-border p-2">
      <div className="relative">
        {panel === "language" ? (
          <div className="absolute inset-x-0 bottom-full z-20 mb-1 flex flex-col gap-2 rounded-xl border border-border bg-card p-1.5 text-card-foreground shadow-lg">
            <div className="px-2.5 py-1.5 text-[12px] font-medium">{t("settings.language")}</div>
            <Choice on={locale === "zh"} onClick={() => setLocale("zh")}>
              {t("settings.chinese")}
            </Choice>
            <Choice on={locale === "en"} onClick={() => setLocale("en")}>
              {t("settings.english")}
            </Choice>
          </div>
        ) : null}
        <a
          href={DONATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
        >
          <NavIcon name="heart" />
          {t("donate.action")}
        </a>
        <button
          type="button"
          aria-expanded={panel === "language"}
          aria-haspopup="dialog"
          onClick={() => setPanel((current) => (current === "language" ? null : "language"))}
          className={cn(
            "flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
            panel === "language" && "bg-sidebar-accent text-foreground"
          )}
        >
          <NavIcon name="globe" />
          {t("settings.language")}
        </button>
      </div>
      <div className="relative mt-1">
        {panel === "account" ? (
          <div className="absolute inset-x-0 bottom-full z-20 mb-1.5 flex flex-col gap-2 rounded-xl border border-border bg-card p-1.5 text-card-foreground shadow-[0_8px_24px_rgba(17,17,16,0.08)]">
            <MenuLink href="/profile" active={pathname.startsWith("/profile")} onNavigate={() => setPanel(null)}>
              <NavIcon name="user" />
              {t("profile.title")}
            </MenuLink>
            {canTeam ? (
              <MenuLink href="/team" active={pathname.startsWith("/team")} onNavigate={() => setPanel(null)}>
                <NavIcon name="users" />
                {t("nav.team")}
              </MenuLink>
            ) : null}
            <MenuLink href="/settings" active={pathname.startsWith("/settings")} onNavigate={() => setPanel(null)}>
              <NavIcon name="building" />
              {t("nav.organization")}
            </MenuLink>
            <div className="mx-2 h-px bg-border" />
            <button
              type="button"
              className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] text-foreground hover:bg-muted"
              onClick={async () => {
                setPanel(null);
                // The session lives in a cookie only the server can end. If the request fails,
                // try once more; either way drop what this tab cached and leave the console.
                // When both attempts fail the cookie is still valid, and the sign-in page will
                // show the account as still signed in instead of pretending otherwise.
                await logout().catch(() => logout().catch(() => undefined));
                queryClient.clear();
                router.replace("/login");
              }}
            >
              <NavIcon name="logout" />
              {t("login.signOut")}
            </button>
          </div>
        ) : null}
        <button
          type="button"
          aria-expanded={panel === "account"}
          aria-haspopup="dialog"
          onClick={() => setPanel((current) => (current === "account" ? null : "account"))}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-sidebar-accent",
            panel === "account" && "bg-sidebar-accent"
          )}
        >
          <Avatar photo={photo} name={userName} className="size-8 shrink-0 text-[12px]" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px]">{userName}</span>
            <span className="block truncate text-[11px] text-muted-foreground">{email}</span>
          </span>
        </button>
      </div>
    </div>
  );
}

function MenuLink({
  href,
  active,
  onNavigate,
  children,
}: {
  href: string;
  active: boolean;
  onNavigate: () => void;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-foreground hover:bg-muted",
        active && "bg-muted font-medium"
      )}
    >
      {children}
    </Link>
  );
}

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "flex h-9 w-full items-center rounded-lg px-2.5 text-left text-[13px]",
        on ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
