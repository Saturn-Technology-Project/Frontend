import { argon2id } from "hash-wasm";

const encoder = new TextEncoder();
const LOGIN_LABEL = "saturn-login-v1\n";
const WRAP_LABEL = "saturn-member-wrap-v1\n";
const SALT_LABEL = "saturn-argon2-salt-v1\n";
const LOGIN_INFO = encoder.encode("saturn-login-v2");
const WRAP_INFO = encoder.encode("saturn-member-wrap-v2");
const HKDF_SALT = new Uint8Array(32);

function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map((item) => item.toString(16).padStart(2, "0")).join("");
}

async function labeledSha256(label: string, password: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(label + password));
  return new Uint8Array(digest);
}

function owned(value: Uint8Array) {
  const copy = new ArrayBuffer(value.byteLength);
  new Uint8Array(copy).set(value);
  return new Uint8Array(copy);
}

async function hkdf(master: Uint8Array, info: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", owned(master), "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: HKDF_SALT, info: owned(info) },
    key,
    256,
  );
  return new Uint8Array(bits);
}

/** Argon2id of the password, then HKDF splits a login verifier from the member-key wrap key. */
async function splitPassword(password: string, email: string) {
  const salt = owned(
    new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(SALT_LABEL + email.trim().toLowerCase()))),
  );
  const master = new Uint8Array(
    await argon2id({
      password,
      salt,
      parallelism: 1,
      iterations: 2,
      memorySize: 19456,
      hashLength: 64,
      outputType: "binary",
    }),
  );
  return {
    login: await hkdf(master, LOGIN_INFO),
    wrap: await hkdf(master, WRAP_INFO),
  };
}

/** Sent to the server. The server hashes this again and never sees the password. */
export async function loginVerifier(password: string, email: string) {
  const keys = await splitPassword(password, email);
  return `v2.${bytesToHex(keys.login)}`;
}

/** Previous verifier, sent once so an older PBKDF2 account can be rewritten. */
export async function legacyLoginVerifier(password: string) {
  return `v1.${bytesToHex(await labeledSha256(LOGIN_LABEL, password))}`;
}

/** Stays in the browser and wraps the member private key. */
export async function memberWrapMaterial(password: string, email: string) {
  const keys = await splitPassword(password, email);
  return keys.wrap;
}

/** Opens password backups created before the HKDF split. */
export async function legacyWrapMaterial(password: string) {
  return labeledSha256(WRAP_LABEL, password);
}
