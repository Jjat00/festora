"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    label: "Fotos",
    segment: "photos",
    href: (id: string) => `/projects/${id}/photos`,
  },
  {
    label: "Favoritas",
    segment: "selections",
    href: (id: string) => `/projects/${id}/selections`,
  },
  {
    label: "Configuración",
    segment: "settings",
    href: (id: string) => `/projects/${id}/settings`,
  },
];

export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex border-b border-[var(--border)]">
      {TABS.map((tab) => {
        const href = tab.href(projectId);
        const isActive = pathname.includes(`/${tab.segment}`);
        return (
          <Link
            key={tab.label}
            href={href}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              isActive
                ? "border-[var(--foreground)] text-[var(--foreground)]"
                : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
