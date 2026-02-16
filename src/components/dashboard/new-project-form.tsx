"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createProject } from "@/lib/actions/project-actions";
import type { ProjectType } from "@prisma/client";

const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
  { value: "WEDDING", label: "Boda" },
  { value: "QUINCEANERA", label: "XV Años" },
  { value: "GRADUATION", label: "Graduación" },
  { value: "PORTRAIT", label: "Retrato" },
  { value: "CASUAL", label: "Casual" },
  { value: "CORPORATE", label: "Corporativo" },
  { value: "PRODUCT", label: "Producto" },
  { value: "OTHER", label: "Otro" },
];

export function NewProjectForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await createProject({
        name: formData.get("name") as string,
        clientName: formData.get("clientName") as string,
        type: formData.get("type") as ProjectType,
        date: new Date(formData.get("date") as string),
        pin: (formData.get("pin") as string) || undefined,
        selectionDeadline: formData.get("selectionDeadline")
          ? new Date(formData.get("selectionDeadline") as string)
          : undefined,
      });
      router.push(`/projects/${result.project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear proyecto");
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]";
  const labelClass = "mb-1 block text-sm font-medium";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className={labelClass}>
          Nombre del proyecto
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="Boda Ana y Carlos"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="clientName" className={labelClass}>
          Nombre del cliente
        </label>
        <input
          id="clientName"
          name="clientName"
          type="text"
          required
          placeholder="Ana García"
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="type" className={labelClass}>
            Tipo de proyecto
          </label>
          <select id="type" name="type" className={inputClass}>
            {PROJECT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="date" className={labelClass}>
            Fecha
          </label>
          <input id="date" name="date" type="date" required className={inputClass} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pin" className={labelClass}>
            PIN de acceso{" "}
            <span className="text-[var(--muted-foreground)]">(opcional)</span>
          </label>
          <input
            id="pin"
            name="pin"
            type="text"
            placeholder="1234"
            maxLength={8}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="selectionDeadline" className={labelClass}>
            Fecha límite{" "}
            <span className="text-[var(--muted-foreground)]">(opcional)</span>
          </label>
          <input
            id="selectionDeadline"
            name="selectionDeadline"
            type="date"
            className={inputClass}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[var(--accent-foreground)] hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Creando..." : "Crear proyecto"}
      </button>
    </form>
  );
}
