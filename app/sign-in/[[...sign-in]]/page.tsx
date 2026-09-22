import { SignIn } from "@clerk/nextjs";

import { SiteHeader } from "@/components/site-header";

export default function SignInPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        <SignIn />
      </main>
    </div>
  );
}
