import type { Metadata } from "next";
import { Providers } from "@/components/layout/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Saturn",
  description: "Enterprise AI control plane",
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
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
