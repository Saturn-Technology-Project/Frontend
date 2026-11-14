import { messageLoaders, type Locale, type Messages } from "@/lib/i18n/messages";

// The languages downloaded so far. Kept free of React and the stores so it runs under node --test.
const loaded: Partial<Record<Locale, Messages>> = {};
const loading: Partial<Record<Locale, Promise<void>>> = {};

export function loadMessages(locale: Locale): Promise<void> {
  loading[locale] ??= messageLoaders[locale]().then(
    (messages) => {
      loaded[locale] = messages;
    },
    (error: unknown) => {
      // Forget the failed attempt so the next call tries the download again.
      delete loading[locale];
      throw error;
    }
  );
  return loading[locale];
}

export function messagesLoaded(locale: Locale): boolean {
  return loaded[locale] !== undefined;
}

function getPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object" && key in value) {
      return (value as Record<string, unknown>)[key];
    }
    return undefined;
  }, source);
}

/** The message for a key, or undefined when the key is unknown or the language has not loaded. */
export function lookup(locale: Locale, path: string): string | undefined {
  const raw = getPath(loaded[locale], path);
  return typeof raw === "string" ? raw : undefined;
}

export function translate(
  locale: Locale,
  path: string,
  vars?: Record<string, string | number>
) {
  // An unknown key shows as the key. A language that has not loaded yet shows nothing: pages
  // wait for it (see LocaleDocument), so this only keeps a stray early call from printing keys.
  let text = lookup(locale, path) ?? (messagesLoaded(locale) ? path : "");
  if (vars) {
    for (const [key, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${key}}`, String(value));
    }
  }
  return text;
}
