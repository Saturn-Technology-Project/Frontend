// Pages where someone is waiting for something to happen: a call to appear, an approval to land.
const LIVE_PATHS = ["/overview", "/activity", "/approvals"];
const LIVE_INTERVAL = 10_000;
const BACKGROUND_INTERVAL = 60_000;

/** How often the console data is refetched while this path is open, in milliseconds. */
export function consoleRefetchInterval(pathname: string | null): number {
  const live = LIVE_PATHS.some((path) => pathname === path || Boolean(pathname?.startsWith(`${path}/`)));
  return live ? LIVE_INTERVAL : BACKGROUND_INTERVAL;
}
