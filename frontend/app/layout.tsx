import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Med-pedia",
  description: "Your AI medical information assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#06070C" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300..700;1,6..72,300..600&family=Instrument+Sans:wght@400..700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full" style={{ fontFamily: "'Instrument Sans', system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
