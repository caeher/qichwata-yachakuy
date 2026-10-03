"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

import { ActionLink } from "@/components/yachay/components";

export function SiteAuthControls() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return (
      <nav className="flex items-center gap-1" aria-label="Acceso">
        <ActionLink variant="ghost" size="sm" href="/verify">
          Verificar
        </ActionLink>
        <ActionLink variant="ghost" size="sm" href="/sign-in">
          Entrar
        </ActionLink>
        <ActionLink size="sm" href="/sign-up">
          Comenzar
        </ActionLink>
      </nav>
    );
  }

  return (
    <nav className="flex items-center gap-2" aria-label="Acceso">
      <ActionLink variant="ghost" size="sm" href="/verify">
        Verificar
      </ActionLink>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button
            type="button"
            className="text-ink hover:bg-paper-deep inline-flex h-9 items-center rounded-full px-4 text-sm font-bold transition"
          >
            Entrar
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button
            type="button"
            className="bg-leaf text-paper hover:bg-leaf-dark inline-flex h-9 items-center rounded-full px-4 text-sm font-bold transition"
          >
            Comenzar
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </nav>
  );
}
