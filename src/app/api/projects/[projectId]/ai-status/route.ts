import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  // Verificar propiedad del proyecto.
  const project = await prisma.project.findUnique({
    where: { id: projectId, userId: session.user.id },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Contar fotos por estado AI.
  const groups = await prisma.photo.groupBy({
    by: ["aiStatus"],
    where: { projectId },
    _count: { id: true },
  });

  const counts = { PENDING: 0, QUEUED: 0, DONE: 0, FAILED: 0 };
  for (const g of groups) {
    counts[g.aiStatus] = g._count.id;
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const queued = counts.QUEUED;
  const done = counts.DONE;
  const failed = counts.FAILED;
  const pending = counts.PENDING;

  return NextResponse.json({
    total,
    queued,
    done,
    failed,
    pending,
    // true cuando ya no quedan fotos en cola (el proceso after() terminó)
    complete: queued === 0,
  });
}
