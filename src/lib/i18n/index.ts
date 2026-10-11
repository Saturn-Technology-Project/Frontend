"use client";

import { messages, type Locale } from "@/lib/i18n/messages";
import { updateAccountLocale } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { beginLocaleSave, endLocaleSave, markLocaleChoice, useLocaleStore } from "@/stores/locale-store";

export function accountLocale(locale: Locale): "zh-Hant" | "en-US" {
  return locale === "en" ? "en-US" : "zh-Hant";
}

export function localeFromAccount(value: string | null | undefined): Locale {
  return value?.toLowerCase().startsWith("en") ? "en" : "zh";
}

function getPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object" && key in value) {
      return (value as Record<string, unknown>)[key];
    }
    return undefined;
  }, source);
}

export function translate(
  locale: Locale,
  path: string,
  vars?: Record<string, string | number>
) {
  const raw = getPath(messages[locale], path) ?? getPath(messages.en, path);
  let text = typeof raw === "string" ? raw : path;
  if (vars) {
    for (const [key, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${key}}`, String(value));
    }
  }
  return text;
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
  const locale = useLocaleStore((state) => state.locale);

  function t(path: string, vars?: Record<string, string | number>) {
    return translate(locale, path, vars);
  }

  return { locale, setLocale: chooseLocale, t };
}

function lookup(locale: Locale, path: string): string | undefined {
  const raw = getPath(messages[locale], path) ?? getPath(messages.en, path);
  return typeof raw === "string" ? raw : undefined;
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
