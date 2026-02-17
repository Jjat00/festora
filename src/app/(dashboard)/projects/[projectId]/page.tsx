import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/lib/actions/project-actions";
import { prisma } from "@/lib/prisma";
import { ProjectActions } from "@/components/dashboard/project-actions";
import { CopyGalleryLink } from "@/components/dashboard/copy-gallery-link";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[i]}`;
}

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

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await getProject(projectId);
  if (!project) notFound();

  const galleryUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/g/${project.slug}`;

  const sizeAggregate = await prisma.photo.aggregate({
    where: { projectId: project.id },
    _sum: { size: true },
  });
  const projectSize = sizeAggregate._sum.size ?? 0;

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-block text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          &larr; Proyectos
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              {project.clientName} &middot; {TYPE_LABELS[project.type]} &middot;{" "}
              {STATUS_LABELS[project.status]}
            </p>
          </div>
          <ProjectActions projectId={project.id} status={project.status} />
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-[var(--border)] p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Fotos</p>
          <p className="text-2xl font-semibold">{project._count.photos}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Favoritas</p>
          <p className="text-2xl font-semibold">{project._count.selections}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Almacenamiento</p>
          <p className="text-2xl font-semibold">{formatBytes(projectSize)}</p>
        </div>
        <CopyGalleryLink url={galleryUrl} />
      </div>

      {/* Navigation */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href={`/projects/${project.id}/photos`}
          className="rounded-lg border border-[var(--border)] p-4 text-center transition-colors hover:border-[var(--accent)]"
        >
          <p className="font-medium">Fotos</p>
          <p className="text-sm text-[var(--muted-foreground)]">
            Subir y gestionar fotos
          </p>
        </Link>
        <Link
          href={`/projects/${project.id}/selections`}
          className="rounded-lg border border-[var(--border)] p-4 text-center transition-colors hover:border-[var(--accent)]"
        >
          <p className="font-medium">Favoritas</p>
          <p className="text-sm text-[var(--muted-foreground)]">
            Ver y exportar selecciones
          </p>
        </Link>
        <Link
          href={`/projects/${project.id}/settings`}
          className="rounded-lg border border-[var(--border)] p-4 text-center transition-colors hover:border-[var(--accent)]"
        >
          <p className="font-medium">Configuración</p>
          <p className="text-sm text-[var(--muted-foreground)]">
            PIN, deadline, slug
          </p>
        </Link>
      </div>
    </div>
  );
}
