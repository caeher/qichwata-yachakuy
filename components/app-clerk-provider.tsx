"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";

import { ConvexClerkProvider } from "@/components/convex-clerk-provider";

export function AppClerkProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider afterSignOutUrl="/" appearance={{ theme: shadcn }}>
      <ConvexClerkProvider>{children}</ConvexClerkProvider>
    </ClerkProvider>
  );
}
