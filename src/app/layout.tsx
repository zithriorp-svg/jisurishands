export const dynamic = "force-dynamic";

import "./globals.css";
import AppHeader from "@/components/AppHeader";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "FinTech Vault",
  description: "Secure Command Center",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#10b981",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased font-sans min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
