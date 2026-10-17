import { ml_kem1024 } from "@noble/post-quantum/ml-kem.js";
import { ApiError, revealActivity, fetchAssistRequests, fetchMemberBackup, fetchMemberRewrap, fetchPayloadBackup, fetchPayloadKeys, registerMemberPayloadKey, submitMemberRewrap, type PasswordBackup, type PayloadEnvelope, type RecoveryBackup, type AssistRequest } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { legacyWrapMaterial, memberWrapMaterial } from "@/lib/password";

const encoder = new TextEncoder();
const WRAP_INFO = encoder.encode("saturn-payload-mlkem1024-v1");
const RECOVERY_INFO = encoder.encode("saturn-recovery-v1");
const WRAP_VERSION = 2;
const KEM_CIPHERTEXT_BYTES = ml_kem1024.lengths.cipherText ?? 1568;
const SHA384_ZERO_SALT = new Uint8Array(48);

const SESSION_KEY = "saturn-member-key";
export const PASSWORD_ITERATIONS = 600_000;

type HeldMemberKey = { privateKey: Uint8Array; publicKey: Uint8Array; memberKeyId: string };

let heldMember: HeldMemberKey | null = null;

function dropStoredMemberKey() {
  if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(SESSION_KEY);
}

export function holdMemberKey(privateKey: Uint8Array, publicKey: Uint8Array, memberKeyId: string) {
  heldMember = { privateKey, publicKey, memberKeyId };
  dropStoredMemberKey();
}

export function clearMemberKey() {
  heldMember = null;
  dropStoredMemberKey();
}

export function memberKey(): HeldMemberKey | null {
  dropStoredMemberKey();
  return heldMember;
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

async function hkdf(secret: Uint8Array, salt: Uint8Array, info: Uint8Array, hash: "SHA-256" | "SHA-384") {
  const key = await crypto.subtle.importKey("raw", source(secret), "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "HKDF", hash, salt: source(salt), info: source(info) }, key, 256);
  return new Uint8Array(bits);
}

export async function generateMlKem() {
  const { publicKey, secretKey } = ml_kem1024.keygen();
  return { publicKey: new Uint8Array(publicKey), privateKey: new Uint8Array(secretKey) };
}

export function randomRecoveryKey() {
  return crypto.getRandomValues(new Uint8Array(32));
}

async function wrapAesKey(shared: Uint8Array) {
  return hkdf(shared, SHA384_ZERO_SALT, WRAP_INFO, "SHA-384");
}

export async function wrapSecret(recipientPublicHex: string, secret: Uint8Array, aad: Uint8Array) {
  const { cipherText, sharedSecret } = ml_kem1024.encapsulate(hexToBytes(recipientPublicHex));
  const aes = await crypto.subtle.importKey("raw", source(await wrapAesKey(new Uint8Array(sharedSecret))), "AES-GCM", false, ["encrypt"]);
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: source(nonce), additionalData: source(aad) }, aes, source(secret)));
  const out = new Uint8Array(1 + cipherText.length + nonce.length + ciphertext.length);
  out[0] = WRAP_VERSION;
  out.set(cipherText, 1);
  out.set(nonce, 1 + cipherText.length);
  out.set(ciphertext, 1 + cipherText.length + nonce.length);
  return bytesToHex(out);
}

export async function unwrapSecret(privateRaw: Uint8Array, wrappedHex: string, aad: Uint8Array) {
  const wrapped = hexToBytes(wrappedHex);
  const kemEnd = 1 + KEM_CIPHERTEXT_BYTES;
  const nonceEnd = kemEnd + 12;
  if (wrapped[0] !== WRAP_VERSION || wrapped.length < nonceEnd + 16) throw new Error("Invalid key envelope");
  const shared = ml_kem1024.decapsulate(wrapped.slice(1, kemEnd), privateRaw);
  const aes = await crypto.subtle.importKey("raw", source(await wrapAesKey(new Uint8Array(shared))), "AES-GCM", false, ["decrypt"]);
  const nonce = wrapped.slice(kemEnd, nonceEnd);
  const ciphertext = wrapped.slice(nonceEnd);
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: source(nonce), additionalData: source(aad) }, aes, source(ciphertext)));
}

export async function recoveryBackup(recoveryKey: Uint8Array, organizationId: string, keyVersion: number, privateKey: Uint8Array): Promise<RecoveryBackup> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const derived = await hkdf(recoveryKey, salt, RECOVERY_INFO, "SHA-256");
  const aes = await crypto.subtle.importKey("raw", source(derived), "AES-GCM", false, ["encrypt"]);
  const aad = encoder.encode(`recovery\n${organizationId}\n${keyVersion}`);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: source(nonce), additionalData: source(aad) }, aes, source(privateKey)));
  return { v: 1, kdf: "HKDF-SHA256", salt: bytesToHex(salt), nonce: bytesToHex(nonce), ciphertext: bytesToHex(ciphertext), org_key_version: keyVersion };
}

export async function openRecoveryBackup(recoveryKey: Uint8Array, organizationId: string, backup: { salt: string; nonce: string; ciphertext: string; org_key_version: number }) {
  const derived = await hkdf(recoveryKey, hexToBytes(backup.salt), RECOVERY_INFO, "SHA-256");
  const aes = await crypto.subtle.importKey("raw", source(derived), "AES-GCM", false, ["decrypt"]);
  const aad = encoder.encode(`recovery\n${organizationId}\n${backup.org_key_version}`);
  return new Uint8Array(
    await crypto.subtle.decrypt({ name: "AES-GCM", iv: source(hexToBytes(backup.nonce)), additionalData: source(aad) }, aes, source(hexToBytes(backup.ciphertext))),
  );
}

export async function decryptEnvelope(privateKey: Uint8Array, organizationId: string, recordId: string, payloadType: string, envelope: PayloadEnvelope) {
  const dek = await unwrapSecret(
    privateKey,
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
  wrappedHex: string,
  wrapAad: string,
  organizationId: string,
  recordId: string,
  payloadType: string,
  envelope: PayloadEnvelope,
) {
  const dek = await unwrapSecret(privateKey, wrappedHex, encoder.encode(wrapAad));
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
    envelope.wrapped_dek,
    `dek\n${organizationId}\n${envelope.org_key_version}\n${recordId}\n${payloadType}`,
    organizationId,
    recordId,
    payloadType,
    envelope,
  );
}

async function aesKey(raw: Uint8Array, usages: KeyUsage[]) {
  return crypto.subtle.importKey("raw", source(raw), "AES-GCM", false, usages);
}

export async function passwordBackup(
  password: string,
  userId: string,
  privateKey: Uint8Array,
  email: string,
): Promise<PasswordBackup> {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const aes = await aesKey(await memberWrapMaterial(password, email), ["encrypt"]);
  const aad = encoder.encode(`password\n${userId}`);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: source(nonce), additionalData: source(aad) }, aes, source(privateKey)),
  );
  return {
    v: 1,
    kdf: "HKDF-SHA256",
    iterations: 1,
    salt: "",
    nonce: bytesToHex(nonce),
    ciphertext: bytesToHex(ciphertext),
  };
}

export async function openPasswordBackup(password: string, userId: string, backup: PasswordBackup, email: string) {
  const aad = encoder.encode(`password\n${userId}`);
  if (backup.kdf === "HKDF-SHA256") {
    const aes = await aesKey(await memberWrapMaterial(password, email), ["decrypt"]);
    return new Uint8Array(
      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: source(hexToBytes(backup.nonce)), additionalData: source(aad) },
        aes,
        source(hexToBytes(backup.ciphertext)),
      ),
    );
  }
  if (backup.kdf !== "PBKDF2-HMAC-SHA256" || backup.iterations !== PASSWORD_ITERATIONS) {
    throw new Error("unsupported password backup");
  }
  const base = await crypto.subtle.importKey("raw", source(await legacyWrapMaterial(password)), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: source(hexToBytes(backup.salt)), iterations: PASSWORD_ITERATIONS },
    base,
    256,
  );
  const aes = await crypto.subtle.importKey("raw", source(new Uint8Array(bits)), "AES-GCM", false, ["decrypt"]);
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

export async function unlockOrganizationKey(recoveryHex: string) {
  const orgId = useAuthStore.getState().org?.id ?? "";
  const recovery = recoveryHex.trim();
  if (!orgId || !recovery) throw new Error("organization key is locked");
  const [backup, status] = await Promise.all([fetchPayloadBackup(), fetchPayloadKeys()]);
  if (!status.public_key) throw new Error("organization key is locked");
  const privateKey = await openRecoveryBackup(hexToBytes(recovery), orgId, backup);
  holdOrganizationKey(privateKey, hexToBytes(status.public_key));
}

export class MemberFingerprintMismatch extends Error {
  constructor() {
    super("member public key fingerprint does not match");
  }
}

async function publicKeyFingerprint(hexKey: string) {
  const digest = await crypto.subtle.digest("SHA-256", source(hexToBytes(hexKey)));
  return bytesToHex(new Uint8Array(digest));
}

export async function helpMemberAccess(request: AssistRequest) {
  const orgId = useAuthStore.getState().org?.id ?? "";
  const mine = memberKey();
  const orgPrivate = organizationKey();
  if (!orgId || (!mine && !orgPrivate)) throw new Error("organization key is locked");
  const fresh = await fetchAssistRequests();
  const registered = fresh.requests.find((item) => item.member_key_id === request.member_key_id);
  if (!registered) throw new MemberFingerprintMismatch();
  const presented = await publicKeyFingerprint(request.public_key);
  const expected = await publicKeyFingerprint(registered.public_key);
  if (presented !== expected) throw new MemberFingerprintMismatch();
  const sources = await fetchMemberRewrap(request.member_key_id);
  const records = [];
  for (const item of sources.records) {
    const own = mine && item.own_wrap
      ? await unwrapSecret(
          mine.privateKey,
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
  const email = useAuthStore.getState().user?.email ?? "";
  if (!userId || !email || !password) return;
  try {
    const backup = await fetchMemberBackup();
    const privateKey = await openPasswordBackup(password, userId, backup, email);
    holdMemberKey(privateKey, hexToBytes(backup.public_key), backup.member_key_id);
    if (typeof sessionStorage !== "undefined") sessionStorage.removeItem("saturn-member-rewrap");
  } catch (error) {
    if (error instanceof ApiError && error.status !== 404) throw error;
    const missing = error instanceof ApiError && error.status === 404;
    const { publicKey, privateKey } = await generateMlKem();
    const backup = await passwordBackup(password, userId, privateKey, email);
    const registered = await registerMemberPayloadKey({
      public_key: bytesToHex(publicKey),
      backup,
      needs_assist: !missing,
    });
    holdMemberKey(privateKey, publicKey, registered.id);
    if (!missing && typeof sessionStorage !== "undefined") sessionStorage.setItem("saturn-member-rewrap", "1");
  }
}

export async function openSealedActivity(eventId: string, organizationId: string) {
  const revealed = await revealActivity(eventId);
  if (revealed.decrypt === "client" && revealed.envelope) {
    return decryptHeldEnvelope(organizationId, eventId, "audit", revealed.envelope);
  }
  return revealed;
}