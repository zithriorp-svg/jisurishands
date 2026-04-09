export const dynamic = "force-dynamic";
import "./globals.css";
import AppHeader from "@/components/AppHeader";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Vault Command",
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
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
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
                  navigator.serviceWorker.register('/sw.js').then(function() {
                    console.log('Vault PWA Engine Online');
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
