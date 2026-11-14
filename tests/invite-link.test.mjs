import assert from "node:assert/strict";
import test from "node:test";
import { readInviteLink } from "../src/lib/invite-link.ts";

test("an invite link is read from the query string the emails use today", () => {
  assert.deepEqual(readInviteLink("?token=abc%2F123&email=New.Member%2Btag@Saturn.ai", ""), {
    token: "abc/123",
    email: "new.member+tag@saturn.ai",
  });
});

test("an invite link is read from the fragment, which wins over the query string", () => {
  assert.deepEqual(readInviteLink("", "#token=frag&email=a%40b.co"), { token: "frag", email: "a@b.co" });
  // Never one half from each: the address has to be the one this token was sent to.
  assert.deepEqual(readInviteLink("?token=old&email=old@b.co", "#token=frag"), { token: "frag", email: "" });
  // A fragment that is not an invite leaves the query string in charge.
  assert.deepEqual(readInviteLink("?token=q&email=q@b.co", "#top"), { token: "q", email: "q@b.co" });
});

test("a link with nothing in it reads as empty, not as an error", () => {
  assert.deepEqual(readInviteLink("", ""), { token: "", email: "" });
  assert.deepEqual(readInviteLink("?email=a@b.co", "#"), { token: "", email: "a@b.co" });
});
