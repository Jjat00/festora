"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_STORAGE_LIMIT } from "@/lib/constants";

async function getAuthenticatedUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

export async function getUserStorageUsage() {
  const userId = await getAuthenticatedUserId();

  const [user, aggregate] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { storageLimit: true },
    }),
    prisma.photo.aggregate({
      where: { project: { userId } },
      _sum: { size: true },
    }),
  ]);

  const limit = Number(user?.storageLimit ?? DEFAULT_STORAGE_LIMIT);
  const used = aggregate._sum.size ?? 0;
  const percentage = limit > 0 ? Math.round((used / limit) * 100) : 0;

  return { used, limit, percentage };
}
