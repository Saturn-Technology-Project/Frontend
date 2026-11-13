import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { fingerprintOf, fingerprintOfBytes, formatFingerprint } from "../src/lib/fingerprint.ts";

test("a fingerprint is the SHA-256 of the public key, the same from hex or from bytes", async () => {
  const key = Uint8Array.from({ length: 1568 }, (_, index) => (index * 7 + 3) % 256);
  const hex = Buffer.from(key).toString("hex");
  const expected = createHash("sha256").update(key).digest("hex");
  assert.equal(await fingerprintOf(hex), expected);
  assert.equal(await fingerprintOf(hex.toUpperCase()), expected);
  // What the member's browser computes from the key it holds matches what an approver's
  // browser computes from the key the server lists.
  assert.equal(await fingerprintOfBytes(key), expected);
});

test("two different keys never show the same fingerprint", async () => {
  const one = await fingerprintOf("00".repeat(1568));
  const other = await fingerprintOf("00".repeat(1567) + "01");
  assert.notEqual(one, other);
  assert.equal(one.length, 64);
});

test("something that is not a key has no fingerprint", async () => {
  for (const bad of ["", "abc", "zz", "12 34", "0x1234"]) {
    await assert.rejects(fingerprintOf(bad), /not a hex key/, bad);
  }
});

test("a fingerprint is shown in groups of four", () => {
  const fingerprint = "a1b2c3d4".repeat(8);
  const shown = formatFingerprint(fingerprint);
  assert.equal(shown.split(" ").length, 16);
  assert.equal(shown.replaceAll(" ", ""), fingerprint);
  assert.equal(formatFingerprint("A1B2C3"), "a1b2 c3");
  assert.equal(formatFingerprint(""), "");
});
