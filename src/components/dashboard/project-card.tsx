import Link from "next/link";
import type { Project } from "@prisma/client";

type ProjectWithCounts = Project & {
  _count: { photos: number; selections: number };
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  ACTIVE: "Activo",
  LOCKED: "Bloqueado",
  ARCHIVED: "Archivado",
};

const TYPE_LABELS: Record<string, string> = {
  WEDDING: "Boda",
  QUINCEANERA: "XV Años",
  GRADUATION: "Graduación",
  PORTRAIT: "Retrato",
  CASUAL: "Casual",
  CORPORATE: "Corporativo",
  PRODUCT: "Producto",
  OTHER: "Otro",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-yellow-500/10 text-yellow-500",
  ACTIVE: "bg-green-500/10 text-green-500",
  LOCKED: "bg-red-500/10 text-red-500",
  ARCHIVED: "bg-gray-500/10 text-gray-500",
};

export function ProjectCard({ project }: { project: ProjectWithCounts }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group rounded-lg border border-border p-4 transition-colors hover:border-accent"
    >
      <div className="mb-3 flex items-center justify-between">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[project.status]}`}
        >
          {STATUS_LABELS[project.status]}
        </span>
        <span className="text-xs text-muted-foreground">
          {TYPE_LABELS[project.type]}
        </span>
      </div>

      <h3 className="mb-1 font-medium text-foreground/70 group-hover:text-foreground">
        {project.name}
      </h3>
      <p className="mb-3 text-sm text-muted-foreground">
        {project.clientName}
      </p>

      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>{project._count.photos} fotos</span>
        <span>{project._count.selections} favoritas</span>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {new Date(project.date).toLocaleDateString("es-MX", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </p>
    </Link>
  );
}
