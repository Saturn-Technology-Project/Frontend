"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Locale } from "@/lib/i18n/messages";

let localeRevision = 0;
let localeSaveInFlight = 0;

export function markLocaleChoice() {
  localeRevision += 1;
}

export function localeRevisionNow() {
  return localeRevision;
}

export function beginLocaleSave() {
  localeSaveInFlight += 1;
}

export function endLocaleSave() {
  localeSaveInFlight = Math.max(0, localeSaveInFlight - 1);
}

export function localeSavePending() {
  return localeSaveInFlight > 0;
}

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: "zh",
      setLocale: (locale) => set({ locale }),
    }),
    { name: "saturn-locale" }
  )
);
