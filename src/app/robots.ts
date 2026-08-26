import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Se permite a todos los rastreadores, incluidos los de asistentes de IA:
 * bloquearlos impediria que Festora aparezca citada en sus respuestas.
 * Lo que si queda fuera es todo lo privado, empezando por `/g/` (las galerias
 * de los clientes) y el dashboard.
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = ["/api/", "/dashboard", "/projects", "/g/"];

  return {
    rules: [{ userAgent: "*", allow: "/", disallow }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
