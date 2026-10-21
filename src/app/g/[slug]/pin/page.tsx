import { prisma } from "@/lib/prisma";
import { toGalleryTheme } from "@/lib/themes";
import { greatVibes, cormorant } from "@/components/gallery/themes/fonts";
import { PinForm } from "./pin-form";

export default async function PinPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await prisma.project.findUnique({
    where: { slug },
    select: { name: true, theme: true },
  });
  const theme = toGalleryTheme(project?.theme);

  if (theme === "default") return <PinForm themed={false} title={null} />;

  return (
    <div data-theme={theme} className={`${greatVibes.variable} ${cormorant.variable}`}>
      <PinForm themed title={project?.name ?? null} />
    </div>
  );
}
