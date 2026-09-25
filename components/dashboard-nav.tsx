"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Inicio", exact: true },
  { href: "/dashboard/learn", label: "Módulos", exact: false },
  { href: "/dashboard/activities", label: "Actividades", exact: false },
  { href: "/dashboard/progress", label: "Progreso", exact: false },
  { href: "/dashboard/certificates", label: "Certificados", exact: false },
] as const;

function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="border-border border-b" aria-label="Aprendizaje">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap gap-1 px-4 py-2 sm:px-6">
        {links.map((link) => {
          const active = isActive(pathname, link.href, link.exact);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-9 shrink-0 items-center rounded-lg px-3 text-sm font-medium transition-colors",
                active
                  ? "bg-leaf-pale text-leaf-dark"
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
