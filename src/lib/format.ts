export const DEMO_NOW = new Date("2026-09-02T13:31:00+08:00").getTime();

export function minutesAgo(minutes: number, from = DEMO_NOW) {
  return new Date(from - minutes * 60_000).toISOString();
}

export function relativeTime(iso: string, locale: "en" | "zh" = "en") {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60_000));
  if (locale === "zh") {
    if (minutes < 1) return "剛剛";
    if (minutes < 60) return `${minutes} 分鐘前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小時前`;
    return `${Math.floor(hours / 24)} 天前`;
  }
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function formatDayLabel(iso: string, locale: "en" | "zh" = "en") {
  const date = new Date(iso);
  const today = new Date();
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  if (sameDay) return locale === "zh" ? "今天" : "Today";
  if (locale === "zh") {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function greeting(locale: "en" | "zh" = "en") {
  const hour = new Date().getHours();
  if (locale === "zh") {
    if (hour < 12) return "早安。";
    if (hour < 18) return "午安。";
    return "晚安。";
  }
  if (hour < 12) return "Good morning.";
  if (hour < 18) return "Good afternoon.";
  return "Good evening.";
}

export function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

export function parseAmount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatUsdc(value: unknown, asset = "USDC"): string {
  return `${parseAmount(value).toFixed(2)} ${asset}`;
}

export function shortAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
