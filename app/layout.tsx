import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppClerkProvider } from "@/components/app-clerk-provider";
import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Integridad de datos en Stellar",
  description:
    "SHA-256 de archivos, textos y documentos anclado en Stellar (Soroban).",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground min-h-svh font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
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
