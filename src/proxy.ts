import { NextRequest, NextResponse } from "next/server";

/** Rutas que exigen sesion. El resto pasa: solo se les anota el pathname. */
const PROTECTED = ["/dashboard", "/projects"];

const CANONICAL_HOST = new URL(
  process.env.NEXT_PUBLIC_APP_URL || "https://festora.studio",
).host;

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const needsAuth = PROTECTED.some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );

  if (needsAuth) {
    const token =
      req.cookies.get("authjs.session-token") ??
      req.cookies.get("__Secure-authjs.session-token");

    if (!token) {
      const signInUrl = new URL("/", req.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // El layout raiz lee esta cabecera para poner el `lang` correcto en <html>.
  const headers = new Headers(req.headers);
  headers.set("x-pathname", pathname);

  const res = NextResponse.next({ request: { headers } });

  // Los dominios que no son el canonico (festora-gamma.vercel.app y las
  // previews) sirven el mismo contenido: se marcan noindex para que no
  // compitan con festora.studio como contenido duplicado.
  if (req.headers.get("host") !== CANONICAL_HOST) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|opengraph-image.png|twitter-image.png|robots.txt|sitemap.xml|llms.txt|pricing.md|assets/).*)",
  ],
};
