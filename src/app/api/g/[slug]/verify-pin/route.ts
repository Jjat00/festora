import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPin, createPinToken } from "@/lib/pin";
import { PIN_COOKIE_MAX_AGE } from "@/lib/constants";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { pin } = (await req.json()) as { pin: string };

  if (!pin) {
    return NextResponse.json({ error: "PIN required" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { slug },
    select: { id: true, pin: true, status: true },
  });

  if (!project || !project.pin) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (project.status === "ARCHIVED") {
    return NextResponse.json({ error: "Gallery not available" }, { status: 410 });
  }

  const valid = await verifyPin(pin, project.pin);
  if (!valid) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  const token = await createPinToken(slug);

  const response = NextResponse.json({ success: true });
  response.cookies.set(`festora_pin_${slug}`, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: PIN_COOKIE_MAX_AGE,
    path: `/g/${slug}`,
  });

  return response;
}
