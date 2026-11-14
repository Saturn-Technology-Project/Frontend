"use client";

import { useSyncExternalStore } from "react";
import { loadMessages, lookup, translate } from "@/lib/i18n/catalog";
import type { Locale } from "@/lib/i18n/messages";
import { updateAccountLocale } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { beginLocaleSave, endLocaleSave, markLocaleChoice, useLocaleStore } from "@/stores/locale-store";

export function accountLocale(locale: Locale): "zh-Hant" | "en-US" {
  return locale === "en" ? "en-US" : "zh-Hant";
}

export function localeFromAccount(value: string | null | undefined): Locale {
  return value?.toLowerCase().startsWith("en") ? "en" : "zh";
}

export { translate };

// The language on screen. It follows the chosen language once that language's messages have
// arrived, so switching keeps the old text for a moment instead of showing none.
let shown: Locale | null = null;
const listeners = new Set<() => void>();
const RETRY_MS = 2000;

function show(locale: Locale) {
  loadMessages(locale).then(
    () => {
      // A later choice may have replaced this one while it was loading.
      if (useLocaleStore.getState().locale !== locale) return;
      shown = locale;
      for (const listener of listeners) listener();
    },
    () => {
      window.setTimeout(() => {
        if (useLocaleStore.getState().locale === locale) show(locale);
      }, RETRY_MS);
    }
  );
}

if (typeof window !== "undefined") {
  // Started as soon as this module loads, not in an effect, so the download runs alongside
  // hydration. The store has already read the saved choice from localStorage by now.
  show(useLocaleStore.getState().locale);
  useLocaleStore.subscribe((state, previous) => {
    if (state.locale !== previous.locale) show(state.locale);
  });
}

function subscribeShown(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * The language whose messages are loaded and on screen. Null on the server, during hydration
 * and until the first messages arrive; LocaleDocument renders no page before then.
 */
export function useShownLocale(): Locale | null {
  return useSyncExternalStore(
    subscribeShown,
    () => shown,
    () => null
  );
}

export function chooseLocale(locale: Locale) {
  markLocaleChoice();
  useLocaleStore.getState().setLocale(locale);
  const signedIn = useAuthStore.getState().user;
  if (!signedIn) return;
  const code = accountLocale(locale);
  beginLocaleSave();
  void updateAccountLocale(code)
    .then((saved) => {
      const current = useAuthStore.getState().user;
      if (current?.id === signedIn.id) {
        useAuthStore.setState({ user: { ...current, locale: saved.locale } });
      }
    })
    .catch(() => undefined)
    .finally(endLocaleSave);
}

export function useI18n() {
  const chosen = useLocaleStore((state) => state.locale);
  const locale = useShownLocale() ?? chosen;

  function t(path: string, vars?: Record<string, string | number>) {
    return translate(locale, path, vars);
  }

  return { locale, setLocale: chooseLocale, t };
}

export function agentCopy(
  _locale: Locale,
  id: string,
  fallback?: { name?: string; description?: string }
) {
  return {
    name: fallback?.name || id,
    description: fallback?.description || "",
  };
}

export function eventActor(
  locale: Locale,
  event: {
    actor: string;
    actorId?: string;
    actorKind: string;
  }
) {
  if (event.actorKind === "wallet") {
    return lookup(locale, "actor.wallet") ?? event.actor;
  }
  return event.actor;
}

export function eventText(
  locale: Locale,
  key: string | undefined,
  fallback: string | undefined
) {
  if (key) return lookup(locale, key) ?? fallback ?? "";
  return fallback ?? "";
}

export type { Locale };
