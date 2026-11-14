import assert from "node:assert/strict";
import test from "node:test";
import { cellTone, componentRows, formatUptime, overall, timeline } from "../src/lib/status-page.ts";

const report = {
  status: "ok",
  checked_at: "2026-11-13T10:00:00+00:00",
  services: [
    { id: "api", name: "API", status: "operational" },
    { id: "database", name: "Database", status: "operational" },
    { id: "redis", name: "Redis", status: "operational" },
  ],
};
const history = {
  days: 90,
  from: "2026-08-16",
  to: "2026-11-13",
  services: [
    { id: "api", name: "API", uptime: 100, days: [{ day: "2026-11-13", uptime: 100, checks: 600, failures: 0 }] },
    {
      id: "database",
      name: "Database",
      uptime: 99.5,
      days: [
        { day: "2026-11-12", uptime: 99, checks: 1440, failures: 14 },
        { day: "2026-11-13", uptime: 100, checks: 600, failures: 0 },
      ],
    },
  ],
};

test("a timeline has one cell per day and leaves unsampled days empty", () => {
  const cells = timeline("2026-11-13", 90, history.services[1].days);
  assert.equal(cells.length, 90);
  assert.equal(cells[0].day, "2026-08-16");
  assert.deepEqual(cells.slice(-3), [
    { day: "2026-11-11", uptime: null },
    { day: "2026-11-12", uptime: 99 },
    { day: "2026-11-13", uptime: 100 },
  ]);
  // Across a month and a year boundary.
  assert.deepEqual(
    timeline("2027-01-01", 3, []).map((cell) => cell.day),
    ["2026-12-30", "2026-12-31", "2027-01-01"]
  );
});

test("the console comes first, then the API's services in a fixed order", () => {
  const rows = componentRows("ok", report, history, "2026-11-13");
  assert.deepEqual(rows.map((row) => row.id), ["console", "api", "database", "redis"]);
  assert.equal(rows[0].cells, null);
  assert.equal(rows[2].uptime, 99.5);
  // Redis is running but nothing has been recorded for it yet.
  assert.equal(rows[3].uptime, null);
  assert.equal(rows[3].cells.every((cell) => cell.uptime === null), true);
  assert.equal(overall(rows), "operational");
});

test("a dependency that is down makes the page degraded, not an outage", () => {
  const down = { ...report, status: "error", services: [report.services[0], { id: "database", name: "Database", status: "down" }] };
  const rows = componentRows("ok", down, history, "2026-11-13");
  assert.equal(rows.find((row) => row.id === "database").state, "down");
  assert.equal(rows.find((row) => row.id === "api").state, "operational");
  assert.equal(overall(rows), "degraded");
});

test("when the report cannot be fetched the API is down and the rest is unknown, with history kept", () => {
  const rows = componentRows("unreachable", undefined, history, "2026-11-13");
  assert.deepEqual(
    rows.map((row) => [row.id, row.state]),
    [
      ["console", "operational"],
      ["api", "down"],
      ["database", "unknown"],
    ]
  );
  assert.equal(rows[2].uptime, 99.5);
  assert.equal(overall(rows), "outage");
  // No history either: the page still has an honest answer.
  const bare = componentRows("unreachable", undefined, undefined, "2026-11-13");
  assert.deepEqual(bare.map((row) => row.id), ["console", "api"]);
  assert.equal(bare[1].cells.length, 90);
  assert.equal(bare[1].cells.at(-1).day, "2026-11-13");
});

test("before the first answer nothing is claimed either way", () => {
  const rows = componentRows("loading", undefined, undefined, "2026-11-13");
  assert.equal(rows.find((row) => row.id === "api").state, "unknown");
  assert.equal(overall(rows), "unknown");
});

test("a status the page does not know is shown as unknown, never as fine", () => {
  const odd = { ...report, services: [{ id: "api", name: "API", status: "maintenance" }] };
  assert.equal(componentRows("ok", odd, undefined, "2026-11-13")[1].state, "unknown");
});

test("day colours and uptime text", () => {
  assert.equal(cellTone(null), "none");
  assert.equal(cellTone(100), "operational");
  assert.equal(cellTone(99.93), "operational"); // one failed minute in a day
  assert.equal(cellTone(98.9), "degraded");
  assert.equal(cellTone(94.9), "down");
  assert.equal(formatUptime(null), "—");
  assert.equal(formatUptime(100), "100%");
  assert.equal(formatUptime(99.5), "99.5%");
  assert.equal(formatUptime(99.931), "99.93%");
  // A failed check never rounds up to a perfect score.
  assert.equal(formatUptime(99.999), "99.99%");
});
