import { SignIn } from "@clerk/nextjs";

import { SiteHeader } from "@/components/site-header";
import { ActionLink } from "@/components/yachay/components";
import { safeReturnUrl } from "@/lib/auth/return-url";

type Props = { searchParams: Promise<{ redirect_url?: string | string[] }> };

export default async function SignInPage({ searchParams }: Props) {
  const returnTo = safeReturnUrl((await searchParams).redirect_url);
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY ? (
          <SignIn forceRedirectUrl={returnTo} signUpForceRedirectUrl={returnTo} />
        ) : (
          <section className="flex max-w-md flex-col gap-4 rounded-2xl border border-border bg-card p-6">
            <h1 className="font-heading text-2xl font-medium">El acceso no está configurado</h1>
            <p className="text-muted-foreground text-sm">Yachay está disponible para explorar. Para iniciar sesión, configura las claves de Clerk en el entorno de la aplicación.</p>
            <ActionLink variant="outline" href="/">Volver al inicio</ActionLink>
          </section>
        )}
      </main>
    </div>
  );
}
