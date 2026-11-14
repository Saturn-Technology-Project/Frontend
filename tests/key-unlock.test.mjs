import assert from "node:assert/strict";
import test from "node:test";

const { attachKeyUnlockDialog, keyUnlockRequested, requestKeyUnlock, settleKeyUnlock, subscribeKeyUnlock } = await import(
  "../src/lib/key-unlock.ts"
);
const crypto = await import("../src/lib/payload-crypto.ts");
const { useAuthStore } = await import("../src/stores/auth-store.ts");
const { MemberKeyPasswordError, clearMemberKey, generateMlKem, bytesToHex, memberKey, passwordBackup, reopenMemberKey, decryptHeldEnvelope } = crypto;

const USER = { id: "user_1", email: "member@saturn.ai", name: "Member", status: "active" };

function stubFetch(routes) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const key = `${init.method ?? "GET"} ${String(url).replace("/saturn-api", "")}`;
    calls.push(key);
    if (!(key in routes)) return new Response(JSON.stringify({ detail: "Not found" }), { status: 404 });
    return new Response(JSON.stringify(routes[key]), { status: 200, headers: { "content-type": "application/json" } });
  };
  return { calls, restore: () => (globalThis.fetch = original) };
}

test("with no dialog on the page nothing can ask, so the answer is no at once", async () => {
  assert.equal(await requestKeyUnlock(), false);
  assert.equal(keyUnlockRequested(), false);
});

test("the dialog answers everyone who is waiting, and detaching answers no", async () => {
  let notified = 0;
  const unsubscribe = subscribeKeyUnlock(() => (notified += 1));
  const detach = attachKeyUnlockDialog();
  const first = requestKeyUnlock();
  const second = requestKeyUnlock();
  assert.equal(keyUnlockRequested(), true);
  settleKeyUnlock(true);
  assert.deepEqual(await Promise.all([first, second]), [true, true]);
  assert.equal(keyUnlockRequested(), false);
  const third = requestKeyUnlock();
  detach();
  assert.equal(await third, false);
  assert.equal(await requestKeyUnlock(), false);
  assert.ok(notified >= 4);
  unsubscribe();
});

test("the unlock password opens the stored key, and a wrong one never replaces it", async () => {
  useAuthStore.setState({ token: "t", user: USER, org: { id: "org_1", name: "Org" } });
  clearMemberKey();
  const { publicKey, privateKey } = await generateMlKem();
  const backup = await passwordBackup("correct horse", USER.id, privateKey, USER.email);
  const net = stubFetch({
    "GET /org/payload-keys/member/backup": { ...backup, member_key_id: "mk_1", public_key: bytesToHex(publicKey) },
  });
  try {
    await assert.rejects(reopenMemberKey("battery staple"), MemberKeyPasswordError);
    assert.equal(memberKey(), null);
    // The sign-in path would register a fresh key here. This one must only ever read.
    assert.deepEqual(net.calls, ["GET /org/payload-keys/member/backup"]);
    await reopenMemberKey("correct horse");
    assert.equal(memberKey()?.memberKeyId, "mk_1");
    assert.deepEqual(memberKey()?.privateKey, privateKey);
    assert.equal(net.calls.every((call) => call.startsWith("GET ")), true);
  } finally {
    net.restore();
    clearMemberKey();
  }
});

test("a member with no stored key gets the API's 404, and nothing is created", async () => {
  useAuthStore.setState({ token: "t", user: USER, org: { id: "org_1", name: "Org" } });
  const net = stubFetch({});
  try {
    await assert.rejects(reopenMemberKey("correct horse"), (error) => error.status === 404);
    assert.deepEqual(net.calls, ["GET /org/payload-keys/member/backup"]);
    assert.equal(memberKey(), null);
  } finally {
    net.restore();
  }
});

test("a sealed record asks for the key only when none is held", async () => {
  clearMemberKey();
  const envelope = { v: 1, org_key_version: 1, nonce: "00", ciphertext: "00", wrapped_dek: "" };
  const detach = attachKeyUnlockDialog();
  try {
    const opening = decryptHeldEnvelope("org_1", "rec_1", "audit", envelope);
    // The prompt is up; declining it ends in the same error as before there was a prompt.
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(keyUnlockRequested(), true);
    settleKeyUnlock(false);
    await assert.rejects(opening, /organization key is locked/);

    const { publicKey, privateKey } = await generateMlKem();
    crypto.holdMemberKey(privateKey, publicKey, "mk_1");
    await assert.rejects(decryptHeldEnvelope("org_1", "rec_1", "audit", envelope), /organization key is locked/);
    assert.equal(keyUnlockRequested(), false);
  } finally {
    detach();
    clearMemberKey();
  }
});
