"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateProject } from "@/lib/actions/project-actions";
import type { Project } from "@prisma/client";
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

export function ProjectSettingsForm({ project }: { project: Project }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);

    try {
      await updateProject(project.id, {
        name: formData.get("name") as string,
        clientName: formData.get("clientName") as string,
        type: formData.get("type") as ProjectType,
        date: new Date(formData.get("date") as string),
        pin: (formData.get("pin") as string) || null,
        coverPhrase: (formData.get("coverPhrase") as string) || null,
        selectionDeadline: formData.get("selectionDeadline")
          ? new Date(formData.get("selectionDeadline") as string)
          : null,
      });
      setMessage("Guardado");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent";
  const labelClass = "mb-1 block text-sm font-medium";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div
          className={`rounded-lg p-3 text-sm ${message === "Guardado" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}
        >
          {message}
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
          defaultValue={project.name}
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
          defaultValue={project.clientName}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="type" className={labelClass}>
            Tipo
          </label>
          <select
            id="type"
            name="type"
            defaultValue={project.type}
            className={inputClass}
          >
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
          <input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={project.date.toISOString().split("T")[0]}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Link de galería</label>
        <button
          type="button"
          onClick={() => {
            const url = `${window.location.origin}/g/${project.slug}`;
            navigator.clipboard.writeText(url).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
          className="flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          /g/{project.slug}
          <span className="text-xs">
            {copied ? "✓ Copiado" : "Copiar"}
          </span>
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pin" className={labelClass}>
            PIN de acceso{" "}
            <span className="text-muted-foreground">(dejar vacío para quitar)</span>
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
            Fecha límite
          </label>
          <input
            id="selectionDeadline"
            name="selectionDeadline"
            type="date"
            defaultValue={
              project.selectionDeadline
                ? project.selectionDeadline.toISOString().split("T")[0]
                : ""
            }
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="coverPhrase" className={labelClass}>
          Frase de portada <span className="text-muted-foreground">(opcional)</span>
        </label>
        <textarea
          id="coverPhrase"
          name="coverPhrase"
          rows={3}
          placeholder="Ej: Para siempre y por siempre..."
          defaultValue={project.coverPhrase || ""}
          className={`${inputClass} resize-none`}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Esta frase aparecerá sobre la imagen principal al abrir la galería.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
