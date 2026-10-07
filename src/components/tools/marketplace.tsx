"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { consoleQueryKey } from "@/hooks/use-console";
import { connectMcpServer } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { MarketIcon } from "@/components/tools/market-icon";
import { marketCatalog, marketCategories, marketName, type MarketCategory, type MarketEntry } from "@/lib/marketplace";
import { cn } from "@/lib/utils";
import type { McpServer } from "@/types";

const fieldClass =
  "mt-1.5 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] outline-none focus:border-ring";

function sameEndpoint(left: string, right: string) {
  return left.trim().replace(/\/+$/, "").toLowerCase() === right.trim().replace(/\/+$/, "").toLowerCase();
}

export function Marketplace({ servers, canAdmin }: { servers: McpServer[]; canAdmin: boolean }) {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MarketCategory | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [custom, setCustom] = useState(false);
  const [tab, setTab] = useState<"overview" | "setup">("overview");

  const needle = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      marketCatalog.filter((entry) => {
        if (category !== "all" && entry.category !== category) return false;
        if (!needle) return true;
        const text = [marketName(entry.id), entry.publisher, entry.blurb.en, entry.blurb.zh, entry.category].join(" ").toLowerCase();
        return text.includes(needle);
      }),
    [category, needle]
  );
  const featured = visible.filter((entry) => entry.featured);
  const selected = marketCatalog.find((entry) => entry.id === selectedId) ?? null;

  function open(entry: MarketEntry, nextTab: "overview" | "setup" = "overview") {
    setCustom(false);
    setSelectedId(entry.id);
    setTab(nextTab);
  }

  return (
    <div className="flex items-start">
      <div className="min-w-0 flex-1 px-8 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight">{t("marketplace.title")}</h1>
            <p className="mt-1 max-w-xl text-[13px] text-muted-foreground">{t("marketplace.lead")}</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("marketplace.search")}
              className="h-9 w-[240px] rounded-full border border-border bg-muted px-4 text-[13px] outline-none focus:border-ring"
            />
            <Button
              type="button"
              onClick={() => {
                setCustom(true);
                setSelectedId(null);
                setTab("setup");
              }}
            >
              {t("marketplace.addCustom")}
            </Button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Chip active={category === "all"} onClick={() => setCategory("all")}>
            {t("marketplace.categories.all")}
          </Chip>
          {marketCategories.map((item) => (
            <Chip key={item} active={category === item} onClick={() => setCategory(item)}>
              {t(`marketplace.categories.${item}`)}
            </Chip>
          ))}
        </div>

        <section className="mt-5 rounded-xl border border-border bg-card px-6 py-6">
          <h2 className="max-w-md text-[22px] font-semibold tracking-tight">{t("marketplace.heroTitle")}</h2>
          <p className="mt-2 max-w-lg text-[13px] leading-5 text-muted-foreground">{t("marketplace.heroBody")}</p>
          <div className="mt-5 flex gap-2">
            {marketCatalog.filter((entry) => entry.featured).map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => open(entry)}
                className="flex size-10 items-center justify-center rounded-full bg-muted hover:bg-foreground/10"
                title={marketName(entry.id)}
              >
                <MarketIcon id={entry.id} className="size-4" />
              </button>
            ))}
          </div>
        </section>

        {featured.length > 0 ? (
          <section className="mt-8">
            <h2 className="text-[15px] font-medium">{t("marketplace.featured")}</h2>
            <ul className="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-4">
              {featured.map((entry) => (
                <MarketCard
                  key={entry.id}
                  entry={entry}
                  locale={locale}
                  selected={selectedId === entry.id}
                  connected={servers.some((server) => entry.endpoint && sameEndpoint(server.endpoint, entry.endpoint))}
                  onOpen={() => open(entry)}
                  onConnect={() => open(entry, "setup")}
                />
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-8">
          <h2 className="text-[15px] font-medium">{t("marketplace.all")}</h2>
          {visible.length === 0 ? (
            <p className="mt-4 text-[13px] text-muted-foreground">{t("marketplace.noMatch")}</p>
          ) : (
            <ul className="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-3">
              {visible.map((entry) => (
                <MarketCard
                  key={entry.id}
                  entry={entry}
                  locale={locale}
                  selected={selectedId === entry.id}
                  connected={servers.some((server) => entry.endpoint && sameEndpoint(server.endpoint, entry.endpoint))}
                  onOpen={() => open(entry)}
                  onConnect={() => open(entry, "setup")}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      {custom || selected ? (
        <aside className="sticky top-0 flex h-[calc(100vh-3.5rem)] w-[340px] shrink-0 flex-col overflow-y-auto border-l border-border bg-card">
          <div className="flex items-start justify-between gap-3 px-5 pt-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-full bg-muted">
                  <MarketIcon id={custom ? "custom" : selected?.id ?? ""} className="size-4" />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[16px] font-medium">
                    {custom ? t("marketplace.customTitle") : marketName(selected?.id ?? "")}
                  </div>
                  <div className="truncate text-[12px] text-muted-foreground">
                    {custom ? t("marketplace.customBody") : selected?.publisher}
                  </div>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="text-[12px] text-muted-foreground hover:text-foreground"
              onClick={() => {
                setCustom(false);
                setSelectedId(null);
              }}
            >
              {t("marketplace.close")}
            </button>
          </div>

          {!custom && selected ? (
            <Detail
              entry={selected}
              locale={locale}
              tab={tab}
              onTab={setTab}
              canAdmin={canAdmin}
              linked={servers.find((server) => selected.endpoint && sameEndpoint(server.endpoint, selected.endpoint)) ?? null}
            />
          ) : (
            <ConnectForm canAdmin={canAdmin} />
          )}
        </aside>
      ) : null}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 rounded-full border px-3 text-[12px]",
        active ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function MarketCard({
  entry,
  locale,
  selected,
  connected,
  onOpen,
  onConnect,
}: {
  entry: MarketEntry;
  locale: "en" | "zh";
  selected: boolean;
  connected: boolean;
  onOpen: () => void;
  onConnect: () => void;
}) {
  const { t } = useI18n();
  return (
    <li className={cn("flex flex-col rounded-xl border bg-card p-4", selected ? "border-foreground" : "border-border")}>
      <button type="button" onClick={onOpen} className="min-w-0 text-left">
        <span className="flex items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <MarketIcon id={entry.id} className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-medium">{marketName(entry.id)}</span>
            <span className="block truncate text-[12px] text-muted-foreground">{entry.publisher}</span>
          </span>
        </span>
        <span className="mt-3 line-clamp-2 block text-[13px] text-muted-foreground">{entry.blurb[locale]}</span>
      </button>
      <div className="mt-4">
        {connected ? (
          <span className="inline-flex h-8 items-center rounded-lg bg-muted px-3 text-[12px]">{t("marketplace.already")}</span>
        ) : (
          <Button type="button" size="sm" onClick={onConnect}>
            {t("tools.connectAction")}
          </Button>
        )}
      </div>
    </li>
  );
}

function Detail({
  entry,
  locale,
  tab,
  onTab,
  canAdmin,
  linked,
}: {
  entry: MarketEntry;
  locale: "en" | "zh";
  tab: "overview" | "setup";
  onTab: (tab: "overview" | "setup") => void;
  canAdmin: boolean;
  linked: McpServer | null;
}) {
  const { t } = useI18n();
  return (
    <>
      <div className="mt-5 flex gap-4 border-b border-border px-5 text-[13px]">
        <button
          type="button"
          className={cn("border-b-2 pb-2", tab === "overview" ? "border-foreground" : "border-transparent text-muted-foreground")}
          onClick={() => onTab("overview")}
        >
          {t("marketplace.overview")}
        </button>
        <button
          type="button"
          className={cn("border-b-2 pb-2", tab === "setup" ? "border-foreground" : "border-transparent text-muted-foreground")}
          onClick={() => onTab("setup")}
        >
          {t("marketplace.setup")}
        </button>
      </div>
      {tab === "overview" ? (
        <div className="space-y-5 px-5 py-5 text-[13px]">
          <p className="leading-5 text-muted-foreground">{entry.blurb[locale]}</p>
          <div>
            <div className="text-[12px] text-muted-foreground">{t("marketplace.capabilities")}</div>
            <ul className="mt-2 space-y-1.5">
              {entry.points[locale].map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
          {linked && linked.tools.length > 0 ? (
            <div>
              <div className="text-[12px] text-muted-foreground">{t("marketplace.connectedTools")}</div>
              <ul className="mt-2 space-y-1 font-mono text-[12px]">
                {linked.tools.slice(0, 12).map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="grid grid-cols-[88px_1fr] gap-y-2 text-[12px]">
            <div className="text-muted-foreground">{t("marketplace.publisher")}</div>
            <div>{entry.publisher}</div>
            <div className="text-muted-foreground">{t("marketplace.docs")}</div>
            <a href={entry.docs} target="_blank" rel="noreferrer" className="truncate underline">
              {entry.docs.replace(/^https?:\/\//, "")}
            </a>
          </div>
        </div>
      ) : (
        <ConnectForm
          key={entry.id}
          canAdmin={canAdmin}
          initialName={marketName(entry.id)}
          initialEndpoint={entry.endpoint}
          auth={entry.auth}
          lockedEndpoint={Boolean(entry.endpoint)}
        />
      )}
    </>
  );
}

function ConnectForm({
  canAdmin,
  initialName = "",
  initialEndpoint = "",
  auth = "token",
  lockedEndpoint = false,
}: {
  canAdmin: boolean;
  initialName?: string;
  initialEndpoint?: string;
  auth?: "token" | "optional";
  lockedEndpoint?: boolean;
}) {
  const { t } = useI18n();
  const client = useQueryClient();
  const [name, setName] = useState(initialName);
  const [endpoint, setEndpoint] = useState(initialEndpoint);
  const [token, setToken] = useState("");
  const connect = useMutation({
    mutationFn: () =>
      connectMcpServer({
        name: name.trim(),
        endpoint: endpoint.trim(),
        authorization: token.trim() || undefined,
      }),
    onSuccess: async () => {
      setToken("");
      await client.invalidateQueries({ queryKey: consoleQueryKey });
    },
  });
  const ready = Boolean(name.trim() && endpoint.trim() && (auth === "optional" || token.trim()));

  if (!canAdmin) {
    return <p className="px-5 py-5 text-[13px] text-muted-foreground">{t("marketplace.adminOnly")}</p>;
  }

  return (
    <form
      className="space-y-4 px-5 py-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!ready) return;
        connect.mutate();
      }}
    >
      <p className="text-[12px] leading-5 text-muted-foreground">{auth === "optional" ? t("marketplace.endpointHint") : t("marketplace.tokenHint")}</p>
      <label className="block text-[12px] text-muted-foreground">
        {t("tools.name")}
        <input value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} />
      </label>
      <label className="block text-[12px] text-muted-foreground">
        {t("tools.endpoint")}
        <input
          value={endpoint}
          readOnly={lockedEndpoint}
          onChange={(event) => setEndpoint(event.target.value)}
          placeholder="https://"
          className={cn(fieldClass, lockedEndpoint && "text-muted-foreground")}
        />
      </label>
      <label className="block text-[12px] text-muted-foreground">
        {t("tools.token")}
        <input
          type="password"
          value={token}
          autoComplete="off"
          placeholder={auth === "optional" ? t("tools.tokenOptional") : ""}
          onChange={(event) => setToken(event.target.value)}
          className={fieldClass}
        />
      </label>
      <Button type="submit" disabled={connect.isPending || !ready}>
        {connect.isSuccess ? t("marketplace.already") : t("tools.connectAction")}
      </Button>
      {connect.isError ? <p className="text-[13px] text-destructive">{connect.error.message}</p> : null}
    </form>
  );
}
