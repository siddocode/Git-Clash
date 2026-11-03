import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import "./globals.css";
import FingerPrintLoader from "@/components/FingerPrintLoader";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Git Clash — Developer Ranking Arena",
  description: "Vote head-to-head on GitHub profiles and climb the live Elo leaderboard.",
};

const themeInitScript = `
  (function() {
    try {
      var saved = localStorage.getItem('git-clash-theme');
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var theme = (saved === 'dark' || saved === 'light') ? saved : (prefersDark ? 'dark' : 'light');
      document.documentElement.classList.add(theme);
      document.documentElement.setAttribute('data-theme', theme);
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen max-w-4xl mx-auto px-2.5 sm:px-6 transition-colors duration-300 overflow-x-clip">
        <ThemeProvider>
          <FingerPrintLoader />
          <Navbar />
          <main className="pt-20 sm:pt-24 pb-12 w-full">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
