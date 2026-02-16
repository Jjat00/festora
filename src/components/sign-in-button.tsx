"use client";

import { signIn } from "next-auth/react";

export function SignInButton({
  className,
  label,
}: {
  className?: string;
  label?: string;
}) {
  return (
    <button
      onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
      className={
        className ??
        "rounded-full border border-[#27272a] px-5 py-2 text-xs font-medium text-[#a1a1aa] transition-colors hover:border-[#52525b] hover:text-white"
      }
    >
      {label ?? "Acceder"}
    </button>
  );
}
