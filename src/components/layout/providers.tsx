"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect, useState, type ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useLocaleStore } from "@/stores/locale-store";

export function Providers({ children }: { children: ReactNode }) {
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
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delay={200}>
          <LocaleDocument>{children}</LocaleDocument>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function LocaleDocument({ children }: { children: ReactNode }) {
  const locale = useLocaleStore((state) => state.locale);

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-Hant" : "en-US";
  }, [locale]);

  return children;
}
