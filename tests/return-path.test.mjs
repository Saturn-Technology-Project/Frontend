import assert from "node:assert/strict";
import test from "node:test";
import { safeReturnPath } from "../src/lib/return-path.ts";

test("authentication preserves internal destinations and URL components", () => {
  for (const path of ["/", "/approvals", "/activity?event=run_123#details", "/tools?name=hello%20world", "/tools?url=https://docs.example/path"]) {
    assert.equal(safeReturnPath(path), path);
  }
  assert.equal(safeReturnPath("/tools/../approvals"), "/approvals");
});

test("authentication rejects external URLs and ambiguous paths", () => {
  for (const path of [null, "", "approvals", "https://other.example/", "https://saturn.invalid/", "//other.example/", "///other.example/", "/\\other.example/", "\\\\other.example/", "javascript:alert(1)", "data:text/html,test", "\n/approvals", "/\t/other.example/", "/approvals\u0000", "/safe/..//other.example/", "/safe/%2e%2e//other.example/", "/ /other.example/"]) {
    assert.equal(safeReturnPath(path), "/overview", JSON.stringify(path));
  }
});
