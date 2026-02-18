import { notFound } from "next/navigation";
import { getProject } from "@/lib/actions/project-actions";
import { ProjectSettingsForm } from "@/components/dashboard/project-settings-form";

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
      <ProjectSettingsForm project={project} />
    </div>
  );
}
