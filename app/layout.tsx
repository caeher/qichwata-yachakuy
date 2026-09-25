import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DM_Sans, Fraunces, Geist_Mono } from "next/font/google";

import { AppClerkProvider } from "@/components/app-clerk-provider";
import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Yachay — Aprende quechua con raíces",
  description:
    "Acércate al quechua con rutas de aprendizaje, práctica gradual y respeto por sus variantes.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <html
      lang="es"
      className={`${dmSans.variable} ${fraunces.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body
        className="bg-background text-foreground min-h-svh font-sans antialiased"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {publishableKey ? (
            <AppClerkProvider>{children}</AppClerkProvider>
          ) : (
            children
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
