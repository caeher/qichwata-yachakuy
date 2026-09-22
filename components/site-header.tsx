import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";

type SiteHeaderProps = {
  title?: string;
  trailing?: React.ReactNode;
};

export function SiteHeader({ title, trailing }: SiteHeaderProps) {
  return (
    <header className="border-border border-b">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="text-sm font-medium tracking-tight sm:text-base"
        >
          {title ?? "stellar-data-integrity"}
        </Link>
        <div className="flex items-center gap-2">
          {trailing}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
