import Link from "next/link";
import { getUserProjects } from "@/lib/actions/project-actions";
import { getUserStorageUsage } from "@/lib/actions/storage-actions";
import { ProjectCard } from "@/components/dashboard/project-card";
import { StorageBar } from "@/components/dashboard/storage-bar";

export default async function DashboardPage() {
  const [projects, storage] = await Promise.all([
    getUserProjects(),
    getUserStorageUsage(),
  ]);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Proyectos</h1>
          <p className="text-sm text-muted-foreground">
            {projects.length} proyecto{projects.length !== 1 && "s"}
          </p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          Nuevo proyecto
        </Link>
      </div>

      <div className="mb-8">
        <StorageBar used={storage.used} limit={storage.limit} />
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <p className="mb-2 text-lg font-medium">Sin proyectos</p>
          <p className="mb-6 text-sm text-muted-foreground">
            Crea tu primer proyecto para comenzar
          </p>
          <Link
            href="/projects/new"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            Crear proyecto
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
