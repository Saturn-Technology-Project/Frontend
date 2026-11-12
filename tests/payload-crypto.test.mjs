import assert from "node:assert/strict";
import test from "node:test";

const crypto = await import("../src/lib/payload-crypto.ts");
const { useAuthStore } = await import("../src/stores/auth-store.ts");
const { loginVerifier } = await import("../src/lib/password.ts");
const {
  bytesToHex,
  changePasswordKeepingKey,
  clearMemberKey,
  confirmEmailChangeKeepingKey,
  dekProof,
  generateMlKem,
  hexToBytes,
  memberKey,
  openPasswordBackup,
  openRecoveryBackup,
  passwordBackup,
  randomRecoveryKey,
  recoveryBackup,
  unwrapSecret,
  wrapSecret,
} = crypto;

const text = (value) => new TextEncoder().encode(value);
const USER = { id: "user_1", email: "member@saturn.ai", name: "Member", status: "active" };
const ORG = { id: "org_1", name: "Org" };

function signIn(email = USER.email) {
  useAuthStore.setState({ token: "t", user: { ...USER, email }, org: ORG });
}

/** Replace fetch with a table of answers, and record what was sent. */
function stubFetch(routes) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const key = `${init.method ?? "GET"} ${String(url).replace("/saturn-api", "")}`;
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ key, body });
    if (!(key in routes)) return new Response(JSON.stringify({ detail: "Not found" }), { status: 404 });
    const answer = routes[key];
    const value = typeof answer === "function" ? answer(body) : answer;
    if (value === null) return new Response(null, { status: 204 });
    return new Response(JSON.stringify(value), { status: 200, headers: { "content-type": "application/json" } });
  };
  return { calls, restore: () => (globalThis.fetch = original) };
}

test("a secret wrapped to a public key opens only with its private key and the same context", async () => {
  const { publicKey, privateKey } = await generateMlKem();
  const other = await generateMlKem();
  const secret = globalThis.crypto.getRandomValues(new Uint8Array(32));
  const wrapped = await wrapSecret(bytesToHex(publicKey), secret, text("dek\norg_1\n1\nrec_1\naudit"));
  assert.deepEqual(await unwrapSecret(privateKey, wrapped, text("dek\norg_1\n1\nrec_1\naudit")), secret);
  // Another record's context, another key, or a changed byte: none of them open it.
  await assert.rejects(unwrapSecret(privateKey, wrapped, text("dek\norg_1\n1\nrec_2\naudit")));
  await assert.rejects(unwrapSecret(other.privateKey, wrapped, text("dek\norg_1\n1\nrec_1\naudit")));
  const tampered = wrapped.slice(0, -2) + (wrapped.endsWith("00") ? "01" : "00");
  await assert.rejects(unwrapSecret(privateKey, tampered, text("dek\norg_1\n1\nrec_1\naudit")));
  // Two wraps of the same secret never look alike.
  assert.notEqual(await wrapSecret(bytesToHex(publicKey), secret, text("x")), await wrapSecret(bytesToHex(publicKey), secret, text("x")));
});

test("the recovery key restores the organization key, and only for its own organization", async () => {
  const { privateKey } = await generateMlKem();
  const recovery = randomRecoveryKey();
  const backup = await recoveryBackup(recovery, "org_1", 1, privateKey);
  assert.equal(backup.kdf, "PBKDF2-HMAC-SHA256");
  assert.deepEqual(await openRecoveryBackup(recovery, "org_1", backup), privateKey);
  await assert.rejects(openRecoveryBackup(randomRecoveryKey(), "org_1", backup));
  await assert.rejects(openRecoveryBackup(recovery, "org_2", backup));
});

test("a member key backup opens with the same password and email, and with nothing else", async () => {
  const { privateKey } = await generateMlKem();
  const backup = await passwordBackup("correct horse", "user_1", privateKey, "member@saturn.ai");
  assert.equal(backup.kdf, "CLIENT-SECRET");
  assert.deepEqual(await openPasswordBackup("correct horse", "user_1", backup, "member@saturn.ai"), privateKey);
  await assert.rejects(openPasswordBackup("battery staple", "user_1", backup, "member@saturn.ai"));
  // The wrap key comes from the email as well, which is why an email change must re-wrap it.
  await assert.rejects(openPasswordBackup("correct horse", "user_1", backup, "moved@saturn.ai"));
  await assert.rejects(openPasswordBackup("correct horse", "user_2", backup, "member@saturn.ai"));
});

test("a DEK proof is bound to the record it was made for", async () => {
  const dek = globalThis.crypto.getRandomValues(new Uint8Array(32));
  const proof = await dekProof(dek, "org_1", "rec_1", "audit");
  assert.match(proof, /^[0-9a-f]{64}$/);
  assert.equal(await dekProof(dek, "org_1", "rec_1", "audit"), proof);
  assert.notEqual(await dekProof(dek, "org_1", "rec_2", "audit"), proof);
  assert.notEqual(await dekProof(dek, "org_2", "rec_1", "audit"), proof);
});

test("changing the password sends the member key wrapped for the new password", async () => {
  signIn();
  clearMemberKey();
  const { publicKey, privateKey } = await generateMlKem();
  const stored = await passwordBackup("correct horse", USER.id, privateKey, USER.email);
  const { calls, restore } = stubFetch({
    "GET /org/payload-keys/member/backup": { ...stored, member_key_id: "mpk_1", public_key: bytesToHex(publicKey) },
    "PATCH /auth/password": null,
  });
  try {
    await changePasswordKeepingKey("correct horse", "battery staple");
  } finally {
    restore();
  }
  const sent = calls.find((call) => call.key === "PATCH /auth/password").body;
  assert.equal(sent.current_password, await loginVerifier("correct horse", USER.email));
  assert.equal(sent.new_password, await loginVerifier("battery staple", USER.email));
  // The same private key, now under the new password. The old password no longer opens it.
  assert.deepEqual(await openPasswordBackup("battery staple", USER.id, sent.member_backup, USER.email), privateKey);
  await assert.rejects(openPasswordBackup("correct horse", USER.id, sent.member_backup, USER.email));
  // The tab keeps the key, so nothing has to be unlocked again.
  assert.equal(memberKey().memberKeyId, "mpk_1");
  assert.deepEqual(memberKey().privateKey, privateKey);
});

test("a member with no key changes the password without sending a backup", async () => {
  signIn();
  clearMemberKey();
  const { calls, restore } = stubFetch({ "PATCH /auth/password": null });
  try {
    await changePasswordKeepingKey("correct horse", "battery staple");
  } finally {
    restore();
  }
  const sent = calls.find((call) => call.key === "PATCH /auth/password").body;
  assert.equal("member_backup" in sent, false);
  assert.equal(memberKey(), null);
});

test("a failed password change leaves the held key as it was", async () => {
  signIn();
  clearMemberKey();
  const { publicKey, privateKey } = await generateMlKem();
  const stored = await passwordBackup("correct horse", USER.id, privateKey, USER.email);
  const { restore } = stubFetch({
    "GET /org/payload-keys/member/backup": { ...stored, member_key_id: "mpk_1", public_key: bytesToHex(publicKey) },
  });
  try {
    // PATCH is not in the table, so it answers 404.
    await assert.rejects(changePasswordKeepingKey("correct horse", "battery staple"));
  } finally {
    restore();
  }
  assert.equal(memberKey(), null);
});

test("confirming a new email sends the password value and the member key for the new address", async () => {
  signIn();
  clearMemberKey();
  const { publicKey, privateKey } = await generateMlKem();
  const stored = await passwordBackup("correct horse", USER.id, privateKey, USER.email);
  const { calls, restore } = stubFetch({
    "GET /org/payload-keys/member/backup": { ...stored, member_key_id: "mpk_1", public_key: bytesToHex(publicKey) },
    "POST /auth/email/confirm": { ...USER, email: "moved@saturn.ai", organization: ORG, agents: [], mcp_servers: [] },
  });
  try {
    await confirmEmailChangeKeepingKey("111111", "222222", "correct horse", " Moved@Saturn.ai ");
  } finally {
    restore();
  }
  const sent = calls.find((call) => call.key === "POST /auth/email/confirm").body;
  assert.equal(sent.current_code, "111111");
  assert.equal(sent.next_code, "222222");
  // Proof with the value for the old address; the value to store is the one for the new address.
  assert.equal(sent.current_password, await loginVerifier("correct horse", "member@saturn.ai"));
  assert.equal(sent.new_password, await loginVerifier("correct horse", "moved@saturn.ai"));
  assert.notEqual(sent.current_password, sent.new_password);
  assert.deepEqual(await openPasswordBackup("correct horse", USER.id, sent.member_backup, "moved@saturn.ai"), privateKey);
  assert.equal(useAuthStore.getState().user.email, "moved@saturn.ai");
});

test("confirming a new email without the password sends only the codes", async () => {
  signIn();
  const { calls, restore } = stubFetch({
    "POST /auth/email/confirm": { ...USER, email: "moved@saturn.ai", organization: ORG, agents: [], mcp_servers: [] },
  });
  try {
    await confirmEmailChangeKeepingKey("111111", "222222", "", "moved@saturn.ai");
  } finally {
    restore();
  }
  assert.deepEqual(calls.map((call) => call.key), ["POST /auth/email/confirm"]);
  assert.deepEqual(calls[0].body, { current_code: "111111", next_code: "222222" });
});

test("hex helpers round-trip", () => {
  const bytes = Uint8Array.from([0, 1, 15, 16, 255]);
  assert.equal(bytesToHex(bytes), "00010f10ff");
  assert.deepEqual(hexToBytes("00010f10ff"), bytes);
});
