const encoder = new TextEncoder();
const LOGIN_LABEL = "saturn-login-v1\n";
const WRAP_LABEL = "saturn-member-wrap-v1\n";

async function labeledSha256(label: string, password: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(label + password));
  return new Uint8Array(digest);
}

function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map((item) => item.toString(16).padStart(2, "0")).join("");
}

/** Sent to the server. The server hashes this again and never sees the password. */
export async function loginVerifier(password: string) {
  return `v1.${bytesToHex(await labeledSha256(LOGIN_LABEL, password))}`;
}

/** Stays in the browser and wraps the member private key. */
export async function memberWrapMaterial(password: string) {
  return labeledSha256(WRAP_LABEL, password);
}
