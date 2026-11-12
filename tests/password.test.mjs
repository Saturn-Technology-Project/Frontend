import assert from "node:assert/strict";
import test from "node:test";
import { legacyLoginVerifier, loginVerifier, memberWrapMaterial } from "../src/lib/password.ts";

const hex = (bytes) => Buffer.from(bytes).toString("hex");

test("the value sent as the password depends on the password and the email", async () => {
  const first = await loginVerifier("correct horse", "member@saturn.ai");
  assert.match(first, /^v2\.[0-9a-f]{64}$/);
  // Stable, and the address is compared without regard to case or surrounding spaces.
  assert.equal(await loginVerifier("correct horse", " Member@Saturn.AI "), first);
  assert.notEqual(await loginVerifier("battery staple", "member@saturn.ai"), first);
  // This is why an email change has to send a new value: the old one cannot be derived any more.
  assert.notEqual(await loginVerifier("correct horse", "moved@saturn.ai"), first);
});

test("the key that wraps the member key never equals what is sent to the server", async () => {
  const sent = (await loginVerifier("correct horse", "member@saturn.ai")).slice(3);
  const wrap = hex(await memberWrapMaterial("correct horse", "member@saturn.ai"));
  assert.equal(wrap.length, 64);
  assert.notEqual(wrap, sent);
  // It changes with the password and with the email, so the stored copy of the member key must
  // be wrapped again when either one changes.
  assert.notEqual(hex(await memberWrapMaterial("battery staple", "member@saturn.ai")), wrap);
  assert.notEqual(hex(await memberWrapMaterial("correct horse", "moved@saturn.ai")), wrap);
});

test("the older verifier is a plain labelled hash, kept only to move old accounts over", async () => {
  const legacy = await legacyLoginVerifier("correct horse");
  assert.match(legacy, /^v1\.[0-9a-f]{64}$/);
  assert.equal(await legacyLoginVerifier("correct horse"), legacy);
});
