import { ApiError, revealActivity, fetchMemberBackup, fetchMemberRewrap, registerMemberPayloadKey, submitMemberRewrap, type PasswordBackup, type PayloadEnvelope, type RecoveryBackup, type AssistRequest } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";

const encoder = new TextEncoder();
const WRAP_INFO = encoder.encode("saturn-payload-wrap-v1");
const RECOVERY_INFO = encoder.encode("saturn-recovery-v1");
const ZERO_SALT = new Uint8Array(32);

const SESSION_KEY = "saturn-member-key";
export const PASSWORD_ITERATIONS = 600_000;

type HeldMemberKey = { privateKey: Uint8Array; publicKey: Uint8Array; memberKeyId: string };

let heldMember: HeldMemberKey | null = null;

export function holdMemberKey(privateKey: Uint8Array, publicKey: Uint8Array, memberKeyId: string) {
  heldMember = { privateKey, publicKey, memberKeyId };
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        privateKey: bytesToHex(privateKey),
        publicKey: bytesToHex(publicKey),
        memberKeyId,
      }),
    );
  }
}

export function clearMemberKey() {
  heldMember = null;
  if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(SESSION_KEY);
}

export function memberKey(): HeldMemberKey | null {
  if (heldMember) return heldMember;
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { privateKey?: string; publicKey?: string; memberKeyId?: string };
    if (!parsed.privateKey || !parsed.publicKey || !parsed.memberKeyId) return null;
    heldMember = {
      privateKey: hexToBytes(parsed.privateKey),
      publicKey: hexToBytes(parsed.publicKey),
      memberKeyId: parsed.memberKeyId,
    };
    return heldMember;
  } catch {
    return null;
  }
}

let organizationPrivate: Uint8Array | null = null;
let organizationPublic: Uint8Array | null = null;

export function holdOrganizationKey(key: Uint8Array | null, publicKey?: Uint8Array | null) {
  organizationPrivate = key;
  organizationPublic = key ? (publicKey ?? null) : null;
}

export function organizationKey() {
  return organizationPrivate;
}

export function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map((item) => item.toString(16).padStart(2, "0")).join("");
}

export function hexToBytes(hex: string) {
  const out = new Uint8Array(hex.length / 2);
  for (let index = 0; index < out.length; index += 1) out[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  return out;
}

function source(value: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new ArrayBuffer(value.byteLength);
  new Uint8Array(copy).set(value);
  return new Uint8Array(copy);
}

async function importPublic(raw: Uint8Array) {
  return crypto.subtle.importKey("raw", source(raw), { name: "X25519" }, true, []);
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded.replaceAll("-", "+").replaceAll("_", "/"));
  const out = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) out[index] = binary.charCodeAt(index);
  return out;
}

async function importPrivate(raw: Uint8Array, publicRaw: Uint8Array) {
  return crypto.subtle.importKey(
    "jwk",
    {
      crv: "X25519",
      kty: "OKP",
      d: bytesToBase64Url(raw),
      x: bytesToBase64Url(publicRaw),
      ext: true,
      key_ops: ["deriveBits"],
    },
    { name: "X25519" },
    true,
    ["deriveBits"],
  );
}

async function hkdf(secret: Uint8Array, salt: Uint8Array, info: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", source(secret), "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: source(salt), info: source(info) }, key, 256);
  return new Uint8Array(bits);
}

export async function generateX25519() {
  const pair = (await crypto.subtle.generateKey({ name: "X25519" }, true, ["deriveBits"])) as CryptoKeyPair;
  const publicKey = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  if (!jwk.d) throw new Error("Browser did not export the private key");
  return { publicKey, privateKey: base64UrlToBytes(jwk.d) };
}

export function randomRecoveryKey() {
  return crypto.getRandomValues(new Uint8Array(32));
}

async function sharedKey(privateKey: CryptoKey, publicRaw: Uint8Array, info: Uint8Array) {
  const bits = await crypto.subtle.deriveBits({ name: "X25519", public: await importPublic(publicRaw) }, privateKey, 256);
  return hkdf(new Uint8Array(bits), ZERO_SALT, info);
}

export async function wrapSecret(recipientPublicHex: string, secret: Uint8Array, aad: Uint8Array) {
  const ephemeral = (await crypto.subtle.generateKey({ name: "X25519" }, true, ["deriveBits"])) as CryptoKeyPair;
  const aes = await crypto.subtle.importKey("raw", source(await sharedKey(ephemeral.privateKey, hexToBytes(recipientPublicHex), WRAP_INFO)), "AES-GCM", false, ["encrypt"]);
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: source(nonce), additionalData: source(aad) }, aes, source(secret)));
  const ephemeralPublic = new Uint8Array(await crypto.subtle.exportKey("raw", ephemeral.publicKey));
  const out = new Uint8Array(1 + 32 + 12 + ciphertext.length);
  out[0] = 1;
  out.set(ephemeralPublic, 1);
  out.set(nonce, 33);
  out.set(ciphertext, 45);
  return bytesToHex(out);
}

export async function unwrapSecret(privateRaw: Uint8Array, publicRaw: Uint8Array, wrappedHex: string, aad: Uint8Array) {
  const wrapped = hexToBytes(wrappedHex);
  if (wrapped[0] !== 1) throw new Error("Invalid key envelope");
  const aes = await crypto.subtle.importKey(
    "raw",
    source(await sharedKey(await importPrivate(privateRaw, publicRaw), wrapped.slice(1, 33), WRAP_INFO)),
    "AES-GCM",
    false,
    ["decrypt"],
  );
  const nonce = wrapped.slice(33, 45);
  const ciphertext = wrapped.slice(45);
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: source(nonce), additionalData: source(aad) }, aes, source(ciphertext)));
}

export async function recoveryBackup(recoveryKey: Uint8Array, organizationId: string, keyVersion: number, privateKey: Uint8Array): Promise<RecoveryBackup> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const derived = await hkdf(recoveryKey, salt, RECOVERY_INFO);
  const aes = await crypto.subtle.importKey("raw", source(derived), "AES-GCM", false, ["encrypt"]);
  const aad = encoder.encode(`recovery\n${organizationId}\n${keyVersion}`);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: source(nonce), additionalData: source(aad) }, aes, source(privateKey)));
  return { v: 1, kdf: "HKDF-SHA256", salt: bytesToHex(salt), nonce: bytesToHex(nonce), ciphertext: bytesToHex(ciphertext), org_key_version: keyVersion };
}

export async function openRecoveryBackup(recoveryKey: Uint8Array, organizationId: string, backup: { salt: string; nonce: string; ciphertext: string; org_key_version: number }) {
  const derived = await hkdf(recoveryKey, hexToBytes(backup.salt), RECOVERY_INFO);
  const aes = await crypto.subtle.importKey("raw", source(derived), "AES-GCM", false, ["decrypt"]);
  const aad = encoder.encode(`recovery\n${organizationId}\n${backup.org_key_version}`);
  return new Uint8Array(
    await crypto.subtle.decrypt({ name: "AES-GCM", iv: source(hexToBytes(backup.nonce)), additionalData: source(aad) }, aes, source(hexToBytes(backup.ciphertext))),
  );
}

export async function decryptEnvelope(privateKey: Uint8Array, publicKey: Uint8Array, organizationId: string, recordId: string, payloadType: string, envelope: PayloadEnvelope) {
  const dek = await unwrapSecret(
    privateKey,
    publicKey,
    envelope.wrapped_dek,
    encoder.encode(`dek\n${organizationId}\n${envelope.org_key_version}\n${recordId}\n${payloadType}`),
  );
  const aes = await crypto.subtle.importKey("raw", source(dek), "AES-GCM", false, ["decrypt"]);
  const aad = encoder.encode(`${organizationId}\n${recordId}\n${payloadType}\n${envelope.v}`);
  const body = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: source(hexToBytes(envelope.nonce)), additionalData: source(aad) },
    aes,
    source(hexToBytes(envelope.ciphertext)),
  );
  return JSON.parse(new TextDecoder().decode(body)) as Record<string, unknown>;
}

async function openWithKey(
  privateKey: Uint8Array,
  publicKey: Uint8Array,
  wrappedHex: string,
  wrapAad: string,
  organizationId: string,
  recordId: string,
  payloadType: string,
  envelope: PayloadEnvelope,
) {
  const dek = await unwrapSecret(privateKey, publicKey, wrappedHex, encoder.encode(wrapAad));
  const aes = await crypto.subtle.importKey("raw", source(dek), "AES-GCM", false, ["decrypt"]);
  const aad = encoder.encode(`${organizationId}\n${recordId}\n${payloadType}\n${envelope.v}`);
  const body = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: source(hexToBytes(envelope.nonce)), additionalData: source(aad) },
    aes,
    source(hexToBytes(envelope.ciphertext)),
  );
  return JSON.parse(new TextDecoder().decode(body)) as Record<string, unknown>;
}

export async function decryptHeldEnvelope(
  organizationId: string,
  recordId: string,
  payloadType: string,
  envelope: PayloadEnvelope & { recipient_wraps?: { member_key_id?: string; wrapped_dek?: string }[] },
) {
  const mine = memberKey();
  const wrap = mine?.memberKeyId
    ? envelope.recipient_wraps?.find((item) => item.member_key_id === mine.memberKeyId && item.wrapped_dek)
    : undefined;
  if (mine && wrap?.wrapped_dek) {
    return openWithKey(
      mine.privateKey,
      mine.publicKey,
      wrap.wrapped_dek,
      `dek\n${organizationId}\n${mine.memberKeyId}\n${recordId}\n${payloadType}`,
      organizationId,
      recordId,
      payloadType,
      envelope,
    );
  }
  const orgPrivate = organizationKey();
  if (!orgPrivate || !organizationPublic || !envelope.wrapped_dek) throw new Error("organization key is locked");
  return openWithKey(
    orgPrivate,
    organizationPublic,
    envelope.wrapped_dek,
    `dek\n${organizationId}\n${envelope.org_key_version}\n${recordId}\n${payloadType}`,
    organizationId,
    recordId,
    payloadType,
    envelope,
  );
}

export async function passwordBackup(password: string, userId: string, privateKey: Uint8Array): Promise<PasswordBackup> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const base = await crypto.subtle.importKey("raw", source(encoder.encode(password)), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: source(salt), iterations: PASSWORD_ITERATIONS },
    base,
    256,
  );
  const aes = await crypto.subtle.importKey("raw", source(new Uint8Array(bits)), "AES-GCM", false, ["encrypt"]);
  const aad = encoder.encode(`password\n${userId}`);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: source(nonce), additionalData: source(aad) }, aes, source(privateKey)),
  );
  return {
    v: 1,
    kdf: "PBKDF2-HMAC-SHA256",
    iterations: PASSWORD_ITERATIONS,
    salt: bytesToHex(salt),
    nonce: bytesToHex(nonce),
    ciphertext: bytesToHex(ciphertext),
  };
}

export async function openPasswordBackup(password: string, userId: string, backup: PasswordBackup) {
  if (backup.kdf !== "PBKDF2-HMAC-SHA256" || backup.iterations !== PASSWORD_ITERATIONS) {
    throw new Error("unsupported password backup");
  }
  const base = await crypto.subtle.importKey("raw", source(encoder.encode(password)), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: source(hexToBytes(backup.salt)), iterations: PASSWORD_ITERATIONS },
    base,
    256,
  );
  const aes = await crypto.subtle.importKey("raw", source(new Uint8Array(bits)), "AES-GCM", false, ["decrypt"]);
  const aad = encoder.encode(`password\n${userId}`);
  return new Uint8Array(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: source(hexToBytes(backup.nonce)), additionalData: source(aad) },
      aes,
      source(hexToBytes(backup.ciphertext)),
    ),
  );
}

export function clearIgnoredAssists() {
  if (typeof sessionStorage !== "undefined") sessionStorage.removeItem("saturn-assist-ignored");
}

export function ignoredAssists() {
  if (typeof sessionStorage === "undefined") return new Set<string>();
  return new Set((sessionStorage.getItem("saturn-assist-ignored") ?? "").split(",").filter(Boolean));
}

export function ignoreAssist(memberKeyId: string) {
  const next = ignoredAssists();
  next.add(memberKeyId);
  sessionStorage.setItem("saturn-assist-ignored", [...next].join(","));
}

export async function helpMemberAccess(request: AssistRequest) {
  const orgId = useAuthStore.getState().org?.id ?? "";
  const mine = memberKey();
  if (!mine || !orgId) throw new Error("organization key is locked");
  const sources = await fetchMemberRewrap(request.member_key_id);
  const records = [];
  for (const item of sources.records) {
    const own = item.own_wrap
      ? await unwrapSecret(
          mine.privateKey,
          mine.publicKey,
          item.own_wrap,
          encoder.encode(`dek\n${orgId}\n${mine.memberKeyId}\n${item.id}\n${item.type}`),
        ).catch(() => null)
      : null;
    const orgPrivate = organizationKey();
    const opened =
      own ??
      (orgPrivate && organizationPublic && item.wrapped_dek
        ? await unwrapSecret(
            orgPrivate,
            organizationPublic,
            item.wrapped_dek,
            encoder.encode(`dek\n${orgId}\n${item.org_key_version}\n${item.id}\n${item.type}`),
          ).catch(() => null)
        : null);
    if (!opened) continue;
    records.push({
      id: item.id,
      type: item.type,
      wrapped_dek: await wrapSecret(
        request.public_key,
        opened,
        encoder.encode(`dek\n${orgId}\n${request.member_key_id}\n${item.id}\n${item.type}`),
      ),
      content_sha256: item.content_sha256,
    });
  }
  if (sources.records.length > 0 && records.length === 0) throw new Error("organization key is locked");
  await submitMemberRewrap({ member_key_id: request.member_key_id, records });
}

export async function unlockMemberKey(password: string) {
  clearIgnoredAssists();
  const userId = useAuthStore.getState().user?.id ?? "";
  if (!userId || !password) return;
  try {
    const backup = await fetchMemberBackup();
    const privateKey = await openPasswordBackup(password, userId, backup);
    holdMemberKey(privateKey, hexToBytes(backup.public_key), backup.member_key_id);
    if (typeof sessionStorage !== "undefined") sessionStorage.removeItem("saturn-member-rewrap");
  } catch (error) {
    if (error instanceof ApiError && error.status !== 404) throw error;
    const missing = error instanceof ApiError && error.status === 404;
    const { publicKey, privateKey } = await generateX25519();
    const backup = await passwordBackup(password, userId, privateKey);
    const registered = await registerMemberPayloadKey({
      public_key: bytesToHex(publicKey),
      backup,
      needs_assist: !missing,
    });