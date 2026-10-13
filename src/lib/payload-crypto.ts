import { revealActivity, type PayloadEnvelope, type RecoveryBackup } from "@/lib/api";

const encoder = new TextEncoder();
const WRAP_INFO = encoder.encode("saturn-payload-wrap-v1");
const RECOVERY_INFO = encoder.encode("saturn-recovery-v1");
const ZERO_SALT = new Uint8Array(32);

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

export async function openSealedActivity(eventId: string, organizationId: string) {
  const revealed = await revealActivity(eventId);
  if (revealed.decrypt === "client" && revealed.envelope) {
    const key = organizationKey();
    if (!key || !organizationPublic) throw new Error("organization key is locked");
    return decryptEnvelope(key, organizationPublic, organizationId, eventId, "audit", revealed.envelope);
  }
  return revealed;
}
