import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/lib/actions/project-actions";
import { prisma } from "@/lib/prisma";
import { ProjectActions } from "@/components/dashboard/project-actions";
import { CopyGalleryLink } from "@/components/dashboard/copy-gallery-link";
import { ProjectTabs } from "@/components/dashboard/project-tabs";

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

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
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
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="mb-3 inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Proyectos
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            <p className="text-sm text-muted-foreground">
              {project.clientName} &middot; {TYPE_LABELS[project.type]} &middot;{" "}
              {STATUS_LABELS[project.status]}
            </p>
          </div>
          <ProjectActions projectId={project.id} status={project.status} />
        </div>

        {/* Compact stats row */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span>
            <span className="font-medium text-foreground">
              {project._count.photos}
            </span>{" "}
            foto{project._count.photos !== 1 ? "s" : ""}
          </span>
          <span aria-hidden>·</span>
          <span>
            <span className="font-medium text-foreground">
              {project._count.selections}
            </span>{" "}
            favorita{project._count.selections !== 1 ? "s" : ""}
          </span>
          <span aria-hidden>·</span>
          <span className="font-medium text-foreground">
            {formatBytes(projectSize)}
          </span>
          <span aria-hidden>·</span>
          <CopyGalleryLink url={galleryUrl} compact />
        </div>
      </div>

      {/* Tab navigation */}
      <ProjectTabs projectId={projectId} />

      {/* Page content */}
      <div className="mt-6">{children}</div>
    </div>
  );
}
