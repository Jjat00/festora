"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateProject } from "@/lib/actions/project-actions";
import { generateCoverPhrase } from "@/lib/actions/ai-actions";
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
  const [coverPhrase, setCoverPhrase] = useState(project.coverPhrase || "");
  const [generating, setGenerating] = useState(false);

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

  async function handleGeneratePhrase() {
    setGenerating(true);
    try {
      const form = document.getElementById("settings-form") as HTMLFormElement;
      const projectType = (new FormData(form).get("type") as string) || project.type;
      const phrase = await generateCoverPhrase(projectType, coverPhrase || undefined);
      setCoverPhrase(phrase);
    } catch {
      setMessage("Error al generar la frase");
    } finally {
      setGenerating(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent";
  const labelClass = "mb-1 block text-sm font-medium";

  return (
    <form id="settings-form" onSubmit={handleSubmit} className="space-y-6">
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
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="coverPhrase" className="text-sm font-medium">
            Frase de portada <span className="text-muted-foreground">(opcional)</span>
          </label>
          <button
            type="button"
            onClick={handleGeneratePhrase}
            disabled={generating}
            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-accent transition-colors disabled:opacity-50"
          >
            {generating ? (
              <>
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Generando...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M8 1a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 8 1ZM10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM12.95 4.11a.75.75 0 1 0-1.06-1.06l-1.062 1.06a.75.75 0 0 0 1.061 1.06l1.06-1.06ZM15 8a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 15 8ZM11.828 11.828a.75.75 0 1 0-1.06-1.06l-1.06 1.06a.75.75 0 1 0 1.06 1.06l1.06-1.06ZM8 13a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 8 13ZM4.172 11.828a.75.75 0 1 0 1.06-1.06l-1.06-1.06a.75.75 0 1 0-1.06 1.06l1.06 1.06ZM1 8a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 1 8ZM4.172 4.172a.75.75 0 0 0-1.06-1.06l-1.06 1.06a.75.75 0 0 0 1.06 1.06l1.06-1.06Z" />
                </svg>
                Generar con IA
              </>
            )}
          </button>
        </div>
        <textarea
          id="coverPhrase"
          name="coverPhrase"
          rows={3}
          placeholder="Ej: El amor que nos unió ese día..."
          value={coverPhrase}
          onChange={(e) => setCoverPhrase(e.target.value)}
          className={`${inputClass} resize-none`}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Escribe tu idea y dale a "Generar con IA" para potenciarla. También puedes generar una desde cero.
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
