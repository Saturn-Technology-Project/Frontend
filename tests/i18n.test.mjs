import assert from "node:assert/strict";
import test from "node:test";
import { loadMessages, lookup, messagesLoaded, translate } from "../src/lib/i18n/catalog.ts";
import { messageLoaders } from "../src/lib/i18n/messages.ts";

function keys(value, prefix = "") {
  return Object.entries(value).flatMap(([key, item]) =>
    typeof item === "string" ? [`${prefix}${key}`] : keys(item, `${prefix}${key}.`)
  );
}

test("both languages have exactly the same keys", async () => {
  const en = keys(await messageLoaders.en()).sort();
  const zh = keys(await messageLoaders.zh()).sort();
  assert.ok(en.length > 500);
  assert.deepEqual(zh, en);
});

test("a language prints nothing until it has loaded, then its own text", async () => {
  // Nothing has loaded "zh" in this process yet: no key is ever printed in its place.
  assert.equal(messagesLoaded("zh"), false);
  assert.equal(translate("zh", "login.signOut"), "");
  assert.equal(lookup("zh", "login.signOut"), undefined);
  await loadMessages("zh");
  assert.equal(messagesLoaded("zh"), true);
  assert.equal(translate("zh", "login.signOut"), "登出");
  // Loading one language does not load the other.
  assert.equal(messagesLoaded("en"), false);
  await loadMessages("en");
  assert.equal(translate("en", "login.signOut"), "Sign out");
});

test("placeholders are filled in, and an unknown key shows as the key", async () => {
  await loadMessages("en");
  assert.equal(translate("en", "policies.version", { n: 3 }).includes("3"), true);
  assert.equal(translate("en", "policies.version", { n: 3 }).includes("{n}"), false);
  assert.equal(translate("en", "no.such.key"), "no.such.key");
  assert.equal(lookup("en", "no.such.key"), undefined);
  // A section is not a message.
  assert.equal(translate("en", "login"), "login");
});
