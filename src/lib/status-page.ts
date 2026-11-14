// What the status page shows, worked out from the API's two answers. No React here, so it
// runs under node --test.

export type ComponentState = "operational" | "degraded" | "down" | "unknown";
export type Overall = "operational" | "degraded" | "outage" | "unknown";
export type CellTone = "operational" | "degraded" | "down" | "none";
/** Whether GET /status has answered yet, and if it has not, whether it failed. */
export type Phase = "loading" | "ok" | "unreachable";

export interface StatusReport {
  status: string;
  checked_at?: string;
  services?: { id: string; name: string; status: string }[];
}

export interface StatusHistory {
  days: number;
  from: string;
  to: string;
  services: {
    id: string;
    name: string;
    uptime: number | null;
    days: { day: string; uptime: number | null; checks: number; failures: number }[];
  }[];
}

export interface DayCell {
  day: string;
  uptime: number | null;
}

export interface ComponentRow {
  id: string;
  /** The name the API gave. The page prefers its own translation and falls back to this. */
  name: string;
  state: ComponentState;
  uptime: number | null;
  /** One cell per day, oldest first. Null for a service whose history is not recorded. */
  cells: DayCell[] | null;
}

export const CONSOLE = "console";
export const HISTORY_DAYS = 90;
const ORDER = [CONSOLE, "api", "database", "redis"];

function known(value: string): ComponentState {
  return value === "operational" || value === "degraded" || value === "down" ? value : "unknown";
}

function addDays(day: string, amount: number): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date + amount)).toISOString().slice(0, 10);
}

/** `days` cells ending on `to`. A day with no samples is a cell with no uptime, not a gap. */
export function timeline(to: string, days: number, recorded: { day: string; uptime: number | null }[]): DayCell[] {
  const byDay = new Map(recorded.map((item) => [item.day, item.uptime]));
  return Array.from({ length: days }, (_, index) => {
    const day = addDays(to, index - (days - 1));
    return { day, uptime: byDay.get(day) ?? null };
  });
}

/**
 * The console is listed first and is always up: this page is served by it. The API is down
 * when its report cannot be fetched at all, and then nothing is known about what is behind it.
 */
export function componentRows(
  phase: Phase,
  report: StatusReport | null | undefined,
  history: StatusHistory | null | undefined,
  today: string
): ComponentRow[] {
  const states = new Map<string, { name: string; state: ComponentState }>();
  if (phase === "ok") {
    for (const service of report?.services ?? []) {
      states.set(service.id, { name: service.name, state: known(service.status) });
    }
  } else {
    states.set("api", { name: "API", state: phase === "unreachable" ? "down" : "unknown" });
    for (const service of history?.services ?? []) {
      if (!states.has(service.id)) states.set(service.id, { name: service.name, state: "unknown" });
    }
  }
  const to = history?.to ?? today;
  const days = history?.days ?? HISTORY_DAYS;
  const rows: ComponentRow[] = [{ id: CONSOLE, name: "Console", state: "operational", uptime: null, cells: null }];
  for (const [id, item] of states) {
    const past = history?.services.find((service) => service.id === id);
    rows.push({
      id,
      name: item.name,
      state: item.state,
      uptime: past?.uptime ?? null,
      cells: timeline(to, days, past?.days ?? []),
    });
  }
  const rank = (id: string) => (ORDER.includes(id) ? ORDER.indexOf(id) : ORDER.length);
  return rows.sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id));
}

export function overall(rows: ComponentRow[]): Overall {
  if (rows.some((row) => row.id === "api" && row.state === "down")) return "outage";
  if (rows.some((row) => row.state === "down" || row.state === "degraded")) return "degraded";
  if (rows.some((row) => row.state === "unknown")) return "unknown";
  return "operational";
}

/** A minute or two of failed checks in a day still reads as a good day; an hour does not. */
export function cellTone(uptime: number | null): CellTone {
  if (uptime === null) return "none";
  if (uptime >= 99.9) return "operational";
  if (uptime >= 95) return "degraded";
  return "down";
}

/** Two decimals, and never rounded up to 100 when a check failed. */
export function formatUptime(value: number | null): string {
  if (value === null) return "—";
  if (value >= 100) return "100%";
  const text = Math.min(value, 99.99).toFixed(2);
  return `${text.replace(/\.?0+$/, "")}%`;
}
