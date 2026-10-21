/* eslint-disable @next/next/no-img-element */

/**
 * Portada de la galería con el tema Salvia: la misma estética de la invitación
 * digital (crema, verde salvia, rosas en acuarela), con la foto en arco.
 */
export function SalviaHero({
  title,
  subtitle,
  phrase,
  coverPhotoId,
}: {
  title: string;
  subtitle: string | null;
  phrase: string | null;
  coverPhotoId: string | null;
}) {
  return (
    <header className="salvia-hero relative overflow-hidden px-6 pb-14 pt-24 text-center">
      <img src="/themes/salvia/rosas-esquina.webp" alt="" aria-hidden className="salvia-rosas salvia-rosas--tl" />
      <img src="/themes/salvia/rosas-esquina.webp" alt="" aria-hidden className="salvia-rosas salvia-rosas--br" />

      <p className="salvia-kicker">Álbum de recuerdos</p>
      <h1 className="salvia-script mt-3 text-6xl leading-tight md:text-7xl">{title}</h1>
      {subtitle && <p className="salvia-serif mt-3 text-xl italic">{subtitle}</p>}

      {coverPhotoId && (
        <div className="salvia-arco mx-auto mt-10">
          <img src={`/api/photo/${coverPhotoId}/view`} alt="Portada del álbum" />
          <img src="/themes/salvia/ramo.webp" alt="" aria-hidden className="salvia-arco-ramo" />
        </div>
      )}

      {phrase && <p className="salvia-serif mx-auto mt-12 max-w-xl text-2xl italic">“{phrase}”</p>}
    </header>
  );
}
