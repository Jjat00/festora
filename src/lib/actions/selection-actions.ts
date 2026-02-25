"use server";

import { prisma } from "@/lib/prisma";

export async function toggleSelection(projectId: string, photoId: string) {
  // Verify the project is active and the photo belongs to it
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, status: true, selectionDeadline: true },
  });
  if (!project) throw new Error("Project not found");
  if (project.status === "LOCKED" || project.status === "ARCHIVED") {
    throw new Error("Selections are locked");
  }
  if (project.selectionDeadline && project.selectionDeadline < new Date()) {
    throw new Error("Selection deadline has passed");
  }

  const photo = await prisma.photo.findUnique({
    where: { id: photoId, projectId },
    select: { id: true },
  });
  if (!photo) throw new Error("Photo not found");

  // Toggle: if selection exists, delete it; otherwise create it
  const existing = await prisma.selection.findUnique({
    where: { photoId },
  });

  if (existing) {
    await prisma.selection.delete({ where: { id: existing.id } });
  } else {
    await prisma.selection.create({
      data: { projectId, photoId },
    });
  }

  const totalSelected = await prisma.selection.count({
    where: { projectId },
  });

  return { selected: !existing, totalSelected };
}

export async function computeSmartOrder(projectId: string): Promise<string[]> {
  // Get selected photos with IA fields
  const selectedPhotos = await prisma.photo.findMany({
    where: {
      projectId,
      selection: { isNot: null },
    },
    select: {
      id: true,
      llmTags: true,
      llmCategory: true,
      emotionValence: true,
      compositeScore: true,
    },
  });

  // Get non-selected photos with IA fields
  const unselectedPhotos = await prisma.photo.findMany({
    where: {
      projectId,
      selection: null,
    },
    select: {
      id: true,
      order: true,
      llmTags: true,
      llmCategory: true,
      emotionValence: true,
      compositeScore: true,
      llmDiscardReason: true,
    },
    orderBy: { order: "asc" },
  });

  if (selectedPhotos.length < 5) {
    // Not enough signal — return all photos in original order
    const allPhotos = await prisma.photo.findMany({
      where: { projectId },
      select: { id: true },
      orderBy: { order: "asc" },
    });
    return allPhotos.map((p) => p.id);
  }

  // Build preference profile
  const tagFrequency = new Map<string, number>();
  const categoryFrequency = new Map<string, number>();
  let valenceSum = 0;
  let valenceCount = 0;
  let scoreSum = 0;
  let scoreCount = 0;

  for (const photo of selectedPhotos) {
    for (const tag of photo.llmTags) {
      tagFrequency.set(tag, (tagFrequency.get(tag) ?? 0) + 1);
    }
    if (photo.llmCategory) {
      categoryFrequency.set(
        photo.llmCategory,
        (categoryFrequency.get(photo.llmCategory) ?? 0) + 1
      );
    }
    if (photo.emotionValence !== null) {
      valenceSum += photo.emotionValence;
      valenceCount++;
    }
    if (photo.compositeScore !== null) {
      scoreSum += photo.compositeScore;
      scoreCount++;
    }
  }

  const avgValence = valenceCount > 0 ? valenceSum / valenceCount : null;
  const avgScore = scoreCount > 0 ? scoreSum / scoreCount : 50;

  // Score each unselected photo
  const scored = unselectedPhotos.map((photo) => {
    let affinity = 0;

    // Tag match: +2 per matching tag, weighted by frequency
    for (const tag of photo.llmTags) {
      const freq = tagFrequency.get(tag);
      if (freq) affinity += 2 * freq;
    }

    // Category match: +3, weighted by frequency
    if (photo.llmCategory) {
      const freq = categoryFrequency.get(photo.llmCategory);
      if (freq) affinity += 3 * freq;
    }

    // Valence proximity: +1 if within ±0.3
    if (
      avgValence !== null &&
      photo.emotionValence !== null &&
      Math.abs(photo.emotionValence - avgValence) <= 0.3
    ) {
      affinity += 1;
    }

    // Quality baseline
    affinity += (photo.compositeScore ?? avgScore) * 0.1;

    // Discard penalty
    if (photo.llmDiscardReason) {
      affinity -= 5;
    }

    return { id: photo.id, affinity };
  });

  // Sort by affinity descending
  scored.sort((a, b) => b.affinity - a.affinity);

  // Return selected IDs first (preserve their order), then scored unselected
  const selectedIds = selectedPhotos.map((p) => p.id);
  return [...selectedIds, ...scored.map((s) => s.id)];
}
