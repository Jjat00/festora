import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { backfillEmbeddings } from "@/lib/actions/ai-actions";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Backfill todos los proyectos del usuario
  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true },
  });

  const results = [];
  for (const project of projects) {
    const result = await backfillEmbeddings(project.id);
    results.push({ projectId: project.id, name: project.name, ...result });
  }

  return NextResponse.json({ results });
}
