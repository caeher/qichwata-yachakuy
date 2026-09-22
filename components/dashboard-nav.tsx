"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Resumen", exact: true },
  { href: "/dashboard/documents", label: "Documentos", exact: false },
  { href: "/dashboard/billing", label: "Facturación", exact: false },
  { href: "/dashboard/settings", label: "Ajustes", exact: false },
] as const;

function isActive(pathname: string, href: string, exact: boolean) {
  if (exact) {
    return pathname === href;
  }
  if (href === "/dashboard/documents") {
    return pathname === href || pathname.startsWith("/dashboard/documents/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="border-border border-b" aria-label="Panel">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap gap-1 px-4 py-2 sm:px-6">
        {links.map((link) => {
          const active = isActive(pathname, link.href, link.exact);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-8 items-center rounded-lg px-3 text-sm font-medium transition-colors",
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
