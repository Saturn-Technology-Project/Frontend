// A member's encryption key is identified by the SHA-256 of its public key. The same value is
// shown to the member who owns the key and to whoever is asked to approve or help with it, so
// the two of them can read it to each other and catch a key that is not the member's.
//
// Kept free of browser-only imports so it runs under node --test.

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const clean = hex.trim().toLowerCase();
  if (clean.length === 0 || clean.length % 2 !== 0 || /[^0-9a-f]/.test(clean)) throw new Error("not a hex key");
  const out = new Uint8Array(new ArrayBuffer(clean.length / 2));
  for (let index = 0; index < out.length; index += 1) out[index] = Number.parseInt(clean.slice(index * 2, index * 2 + 2), 16);
  return out;
}

export async function fingerprintOfBytes(publicKey: Uint8Array): Promise<string> {
  const copy = new Uint8Array(new ArrayBuffer(publicKey.byteLength));
  copy.set(publicKey);
  const digest = await crypto.subtle.digest("SHA-256", copy);
  return [...new Uint8Array(digest)].map((item) => item.toString(16).padStart(2, "0")).join("");
}

/** The full fingerprint, 64 hex characters, of a public key given as hex. */
export async function fingerprintOf(publicKeyHex: string): Promise<string> {
  return fingerprintOfBytes(hexToBytes(publicKeyHex));
}

/** Groups of four, so two people can read it aloud and keep their place. */
export function formatFingerprint(fingerprint: string): string {
  return (fingerprint.toLowerCase().match(/.{1,4}/g) ?? []).join(" ");
}
