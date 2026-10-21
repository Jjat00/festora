"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_STORAGE_LIMIT } from "@/lib/constants";
import { ownerUsage } from "@/lib/guest-upload";

async function getAuthenticatedUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

export async function getUserStorageUsage() {
  const userId = await getAuthenticatedUserId();

  // Mismo cálculo que aplica la cuota: incluye miniaturas de invitados y reservas en curso
  const [user, used] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { storageLimit: true },
    }),
    ownerUsage(prisma, userId),
  ]);

  const limit = Number(user?.storageLimit ?? DEFAULT_STORAGE_LIMIT);
  const percentage = limit > 0 ? Math.round((used / limit) * 100) : 0;

  return { used, limit, percentage };
}
