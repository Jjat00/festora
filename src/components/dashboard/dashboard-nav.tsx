"use client";

import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import type { User } from "next-auth";

export function DashboardNav({ user }: { user: User }) {
  return (
    <nav className="border-b border-[var(--border)] bg-[var(--background)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="text-lg font-semibold">
            Festora
          </Link>
          <div className="flex gap-4">
            <Link
              href="/dashboard"
              className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              Proyectos
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {user.image && (
              <Image
                src={user.image}
                alt={user.name || ""}
                width={32}
                height={32}
                className="rounded-full"
              />
            )}
            <span className="text-sm">{user.name}</span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            Salir
          </button>
        </div>
      </div>
    </nav>
  );
}
