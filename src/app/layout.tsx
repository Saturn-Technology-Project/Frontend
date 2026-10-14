import type { Metadata, Viewport } from "next";
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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // The proxy creates a request-specific CSP nonce. Rendering at request time
  // lets Next attach that nonce to its framework and page scripts.
  await connection();

  return (
    <html
      lang="zh-Hant"
      className="h-full"
      suppressHydrationWarning
    >
      <body className="h-full overflow-hidden font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
