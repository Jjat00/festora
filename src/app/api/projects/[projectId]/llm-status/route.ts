import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId, userId: session.user.id },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // "since" permite al cliente saber cuántas fotos se analizaron
  // después del momento en que disparó el análisis.
  const sinceParam = req.nextUrl.searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : null;

  const [analyzed, total] = await Promise.all([
    prisma.photo.count({
      where: {
        projectId,
        llmAnalyzedAt: since ? { gte: since } : { not: null },
      },
    }),
    // Total de fotos que se enviaron a analizar en este batch
    // (solo si el cliente pasó "since"; si no, total del proyecto)
    since
      ? prisma.photo.count({ where: { projectId } })
      : prisma.photo.count({ where: { projectId } }),
  ]);

  return NextResponse.json({ analyzed, total });
}
