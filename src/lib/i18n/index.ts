"use client";

import { messages, type Locale } from "@/lib/i18n/messages";
import { useLocaleStore } from "@/stores/locale-store";

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

export function useI18n() {
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  function t(path: string, vars?: Record<string, string | number>) {
    return translate(locale, path, vars);
  }

  return { locale, setLocale, t };
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
