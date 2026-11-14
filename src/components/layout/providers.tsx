"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useShownLocale } from "@/lib/i18n";
import { useLocaleStore } from "@/stores/locale-store";

export function Providers({ children, nonce }: { children: ReactNode; nonce?: string }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} nonce={nonce}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delay={200}>
          <LocaleDocument>{children}</LocaleDocument>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

// Pages with no translated text. Their server-rendered HTML is kept as it is.
const UNTRANSLATED = new Set(["/trust"]);

function LocaleDocument({ children }: { children: ReactNode }) {
  const locale = useLocaleStore((state) => state.locale);
  const shown = useShownLocale();
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-Hant" : "en-US";
  }, [locale]);

  // Each language is its own download. Until the first one arrives no page renders, on the
  // server or in the browser, so no text is ever drawn from a missing language and the two
  // agree during hydration. The pages showed this same blank screen while checking the session.
  if (!shown && !UNTRANSLATED.has(pathname)) {
    return <div className="min-h-screen bg-background" />;
  }

  return children;
}
