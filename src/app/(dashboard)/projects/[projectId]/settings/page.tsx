import { notFound } from "next/navigation";
import { getProject } from "@/lib/actions/project-actions";
import { ProjectSettingsForm } from "@/components/dashboard/project-settings-form";
import Link from "next/link";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await getProject(projectId);
  if (!project) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={`/projects/${projectId}`}
        className="mb-4 inline-block text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      >
        &larr; {project.name}
      </Link>
      <h1 className="mb-8 text-2xl font-semibold">Configuración</h1>
      <ProjectSettingsForm project={project} />
    </div>
  );
}
