import { prisma } from "@/lib/prisma";
import { SLUG_LENGTH } from "@/lib/constants";

const CHARSET = "abcdefghijkmnpqrstuvwxyz23456789"; // no ambiguous chars (0, o, l, 1)

function generateRandomSlug(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes)
    .map((b) => CHARSET[b % CHARSET.length])
    .join("");
}

export async function generateUniqueSlug(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const slug = generateRandomSlug(SLUG_LENGTH);
    const existing = await prisma.project.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing) return slug;
  }
  // Fallback: use longer slug
  return generateRandomSlug(SLUG_LENGTH + 4);
}
