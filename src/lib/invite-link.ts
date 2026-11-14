export interface InviteLink {
  token: string;
  email: string;
}

/**
 * The token and address carried by an invite link.
 *
 * The emailed link has them in the query string today. The fragment is read first, so the link
 * can move to "#token=…&email=…": a fragment is never sent to a server or written to its logs.
 */
export function readInviteLink(search: string, hash: string): InviteLink {
  const fragment = new URLSearchParams(hash.replace(/^#/, ""));
  const source = fragment.get("token") ? fragment : new URLSearchParams(search);
  return {
    token: source.get("token") ?? "",
    // The password hash is salted with the address, so it must be the one the invite was sent to.
    email: (source.get("email") ?? "").trim().toLowerCase(),
  };
}
