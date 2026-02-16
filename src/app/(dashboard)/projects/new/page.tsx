import { NewProjectForm } from "@/components/dashboard/new-project-form";

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-8 text-2xl font-semibold">Nuevo proyecto</h1>
      <NewProjectForm />
    </div>
  );
}
