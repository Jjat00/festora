import { notFound } from "next/navigation";
import { getProject } from "@/lib/actions/project-actions";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { SelectionsView } from "@/components/dashboard/selections-view";
import Link from "next/link";

export default async function SelectionsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const project = await getProject(projectId);
  if (!project) notFound();

  const selections = await prisma.selection.findMany({
    where: { projectId },
    include: {
      photo: {
        select: {
          id: true,
          originalFilename: true,
          objectKey: true,
          thumbnailKey: true,
          order: true,
        },
      },
    },
    orderBy: { photo: { order: "asc" } },
  });

  return (
    <div>
      <Link
        href={`/projects/${projectId}`}
        className="mb-4 inline-block text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      >
        &larr; {project.name}
      </Link>
      <h1 className="mb-2 text-2xl font-semibold">Favoritas</h1>
      <p className="mb-8 text-sm text-[var(--muted-foreground)]">
        {selections.length} foto{selections.length !== 1 && "s"} seleccionada
        {selections.length !== 1 && "s"} de {project._count.photos}
      </p>

      <SelectionsView
        projectId={projectId}
        projectName={project.name}
        selections={selections.map((s) => ({
          id: s.id,
          photoId: s.photo.id,
          filename: s.photo.originalFilename,
          thumbnailKey: s.photo.thumbnailKey,
        }))}
      />
    </div>
  );
}
