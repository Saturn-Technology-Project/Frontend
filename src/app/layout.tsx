import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { connection } from "next/server";
import { Providers } from "@/components/layout/providers";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Saturn",
  description: "Enterprise AI control plane",
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    apple: "/logo.png",
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // The proxy creates a request-specific CSP nonce. Rendering at request time
  // lets Next attach that nonce to its framework and page scripts.
  await connection();
  // The theme script runs before hydration, so it needs the same nonce to pass the CSP.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="zh-Hant"
      className="h-full"
      suppressHydrationWarning
    >
      <body className="h-full overflow-hidden font-sans">
        <Providers nonce={nonce}>{children}</Providers>
      </body>
    </html>
  );
}
