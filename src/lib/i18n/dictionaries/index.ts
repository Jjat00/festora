import type { Locale } from "@/lib/i18n/config";
import { es } from "./es";
import { en } from "./en";

/**
 * Ensancha los literales de `as const` a `string` para que el diccionario
 * ingles tenga que cumplir la misma forma sin repetir los textos exactos.
 */
type Widen<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly Widen<U>[]
    : T extends object
      ? { -readonly [K in keyof T]: Widen<T[K]> }
      : T;

export type Dictionary = Widen<typeof es>;

const dictionaries: Record<Locale, Dictionary> = { es, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
