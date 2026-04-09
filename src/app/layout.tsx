export const dynamic = "force-dynamic";
import "./globals.css";
import AppHeader from "@/components/AppHeader";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Vault Web", 
  description: "Secure Command Center"
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
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="bg-slate-950 text-slate-100 antialiased font-sans min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1">
          {children}
        </main>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
