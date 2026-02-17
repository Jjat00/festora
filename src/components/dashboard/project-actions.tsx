"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteProject, lockProject, unlockProject } from "@/lib/actions/project-actions";

export function ProjectActions({
  projectId,
  status,
}: {
  projectId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("¿Eliminar este proyecto? Esta acción no se puede deshacer."))
      return;
    setLoading(true);
    try {
      await deleteProject(projectId);
      router.push("/dashboard");
    } catch {
      setLoading(false);
    }
  }

  async function handleLock() {
    if (!confirm("¿Bloquear selecciones? Los clientes ya no podrán modificar sus favoritas."))
      return;
    setLoading(true);
    try {
      await lockProject(projectId);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleUnlock() {
    if (!confirm("¿Desbloquear selecciones? Los clientes podrán volver a modificar sus favoritas."))
      return;
    setLoading(true);
    try {
      await unlockProject(projectId);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-2">
      {status === "ACTIVE" && (
        <button
          onClick={handleLock}
          disabled={loading}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:border-yellow-500 hover:text-yellow-500 disabled:opacity-50"
        >
          Bloquear
        </button>
      )}
      {status === "LOCKED" && (
        <button
          onClick={handleUnlock}
          disabled={loading}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:border-green-500 hover:text-green-500 disabled:opacity-50"
        >
          Desbloquear
        </button>
      )}
      <button
        onClick={handleDelete}
        disabled={loading}
        className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:border-red-500 hover:text-red-500 disabled:opacity-50"
      >
        Eliminar
      </button>
    </div>
  );
}
