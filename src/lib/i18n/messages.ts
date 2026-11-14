import type { Messages } from "./messages/en";

export type Locale = "en" | "zh";
export type { Messages };

/** One chunk per language, so a visit downloads only the language it shows. */
export const messageLoaders: Record<Locale, () => Promise<Messages>> = {
  en: () => import("./messages/en").then((module) => module.en),
  zh: () => import("./messages/zh").then((module) => module.zh),
};
