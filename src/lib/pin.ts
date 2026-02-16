import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const PIN_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "fallback-secret"
);

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

export async function createPinToken(slug: string): Promise<string> {
  return new SignJWT({ slug })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(PIN_SECRET);
}

export async function verifyPinToken(
  token: string,
  slug: string
): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, PIN_SECRET);
    return payload.slug === slug;
  } catch {
    return false;
  }
}
