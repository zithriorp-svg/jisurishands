export const dynamic = "force-dynamic";

import "./globals.css";
import AppHeader from "@/components/AppHeader";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Vault Command", // Changed slightly so you know the deploy worked!
  description: "Secure Command Center",
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
        {/* FORCE CHROME TO READ THE BLUEPRINT AND ICON */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="bg-slate-950 text-slate-100 antialiased font-sans min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1">
          {children}
        </main>
        
        {/* INSTANT PWA ENGINE IGNITION SEQUENCE */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('PWA Engine Locked & Loaded');
                  }).catch(function(err) {
                    console.log('PWA Engine Failed', err);
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
