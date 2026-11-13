import assert from "node:assert/strict";
import test from "node:test";
import { consoleRefetchInterval } from "../src/lib/poll.ts";

test("only the pages that show live activity poll every ten seconds", () => {
  for (const path of ["/overview", "/activity", "/approvals", "/approvals/resubmit"]) {
    assert.equal(consoleRefetchInterval(path), 10_000, path);
  }
  for (const path of ["/agents", "/policies/new", "/settings", "/team", "/tools/connections", "/activityx", "/", null]) {
    assert.equal(consoleRefetchInterval(path), 60_000, String(path));
  }
});
