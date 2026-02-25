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
      coverPhrase: true,
      coverKey: true,
      user: { select: { name: true } },
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

  const coverPhoto = project.photos.find(p => p.thumbnailKey === project.coverKey) || project.photos[0];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative flex h-[60vh] min-h-[400px] w-full flex-col items-center justify-center overflow-hidden">
        {coverPhoto ? (
          <div className="absolute inset-0 z-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/photo/${coverPhoto.id}/view`}
              alt="Portada de galería"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          </div>
        ) : (
          <div className="absolute inset-0 z-0 bg-zinc-900" />
        )}

        <div className="relative z-10 flex flex-col items-center px-4 text-center">
          <h1 className="mb-2 text-4xl font-light tracking-tight text-white md:text-6xl">
            {project.name}
          </h1>
          <p className="mb-8 text-lg font-light uppercase tracking-widest text-white/80 md:text-xl">
            {project.user.name || "Fotógrafo"}
          </p>

          {project.coverPhrase && (
            <div className="mx-auto mt-4 max-w-2xl">
              <p className="font-serif text-xl italic text-white/90 md:text-2xl">
                "{project.coverPhrase}"
              </p>
            </div>
          )}
        </div>

        {/* Decorative gradient overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-10 h-32 bg-linear-to-t from-background to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
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
