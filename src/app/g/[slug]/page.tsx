import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyPinToken } from "@/lib/pin";
import { GalleryView } from "@/components/gallery/gallery-view";

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const project = await prisma.project.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      clientName: true,
      type: true,
      date: true,
      pin: true,
      status: true,
      selectionDeadline: true,
      photos: {
        select: {
          id: true,
          thumbnailKey: true,
          originalFilename: true,
          width: true,
          height: true,
          order: true,
          llmCategory: true,
          compositeScore: true,
          selection: { select: { id: true } },
        },
        orderBy: { order: "asc" },
      },
      _count: { select: { selections: true } },
    },
  });

  if (!project || project.status === "ARCHIVED") notFound();

  // Check PIN if required
  if (project.pin) {
    const cookieStore = await cookies();
    const pinCookie = cookieStore.get(`festora_pin_${slug}`);
    if (!pinCookie || !(await verifyPinToken(pinCookie.value, slug))) {
      redirect(`/g/${slug}/pin`);
    }
  }

  const isLocked =
    project.status === "LOCKED" ||
    (project.selectionDeadline !== null && project.selectionDeadline < new Date());

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-6 text-center">
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        <p className="text-sm text-muted-foreground">
          {project.clientName}
        </p>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {project.photos.length} foto{project.photos.length !== 1 && "s"}
          </p>
          <p className="text-sm font-medium">
            {project._count.selections} favorita
            {project._count.selections !== 1 && "s"} seleccionada
            {project._count.selections !== 1 && "s"}
          </p>
        </div>

        {isLocked && (
          <div className="mb-6 rounded-lg bg-yellow-500/10 p-3 text-center text-sm text-yellow-500">
            Las selecciones están bloqueadas
          </div>
        )}

        <GalleryView
          projectId={project.id}
          photos={project.photos.map((p) => ({
            id: p.id,
            thumbnailKey: p.thumbnailKey,
            filename: p.originalFilename,
            selected: p.selection !== null,
            width: p.width,
            height: p.height,
            category: p.llmCategory,
            compositeScore: p.compositeScore,
          }))}
          totalSelected={project._count.selections}
          isLocked={isLocked}
        />
      </div>
    </div>
  );
}
