const DEFAULT_RETURN_PATH = "/overview";
const RETURN_ORIGIN = "https://saturn.invalid";

/** Only root-relative, same-origin destinations can be used after authentication. */
export function safeReturnPath(value: string | null): string {
  if (!value?.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(value)) {
    return DEFAULT_RETURN_PATH;
  }
  try {
    const url = new URL(value, RETURN_ORIGIN);
    // Dot-segment normalization can turn /safe/..//host into a protocol-relative path.
    if (url.origin !== RETURN_ORIGIN || url.pathname.startsWith("//")) return DEFAULT_RETURN_PATH;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_RETURN_PATH;
  }
}
