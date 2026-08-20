import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacidad · Festora",
  description:
    "Cómo Festora guarda, protege y comparte tus fotos: almacenamiento privado, enlaces temporales y la promesa de que nadie —tampoco nosotros— curiosea tus galerías.",
};

const ACTUALIZADO = "20 de agosto de 2026";

const PROMESAS = [
  {
    titulo: "Nunca son públicas",
    texto:
      "El almacenamiento es privado. No existe una URL abierta a tus fotos ni forma de llegar a ellas por Google, y sin el enlace del proyecto no hay nada que encontrar.",
    icono: (
      <>
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </>
    ),
  },
  {
    titulo: "Nadie las mira",
    texto:
      "Festora no tiene ninguna pantalla para abrir las fotos de otra cuenta. No las vendemos, no las publicamos, no las usamos en marketing ni para entrenar modelos.",
    icono: (
      <>
        <path d="m15 18-.722-3.25" />
        <path d="M2 8a10.645 10.645 0 0 0 20 0" />
        <path d="m20 15-1.726-2.05" />
        <path d="m4 15 1.726-2.05" />
        <path d="m9 18 .722-3.25" />
      </>
    ),
  },
  {
    titulo: "Tú decides quién entra",
    texto:
      "Un enlace único por proyecto, con PIN opcional y fecha límite. Cuando borras un proyecto, los archivos desaparecen del almacenamiento, no solo de tu vista.",
    icono: (
      <>
        <path d="M2 18v-3a4 4 0 0 1 4-4h4" />
        <circle cx="16" cy="8" r="3" />
        <path d="M14 21v-2a4 4 0 0 1 8 0v2" />
      </>
    ),
  },
];

const NUNCA = [
  "Vender, ceder o alquilar tus fotos a nadie.",
  "Usarlas en publicidad, en la web de Festora o en redes sin tu permiso escrito.",
  "Entregarlas a un tercero para entrenar modelos de inteligencia artificial.",
  "Hacerlas públicas, indexables o accesibles sin el enlace del proyecto.",
  "Construir perfiles publicitarios contigo o con tus clientes.",
];

function Seccion({
  numero,
  titulo,
  children,
}: {
  numero: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="scroll-mt-24 border-t border-border/60 py-10 first:border-t-0">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {numero}
        </span>
        <h2 className="text-xl font-medium tracking-tight sm:text-2xl">
          {titulo}
        </h2>
      </div>
      <div className="mt-4 space-y-4 text-sm font-light leading-relaxed text-muted-foreground sm:text-[15px]">
        {children}
      </div>
    </section>
  );
}

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/assets/logo.png"
              alt="Festora"
              width={26}
              height={26}
              className="dark:brightness-0 dark:invert"
            />
            <span className="text-sm font-medium tracking-tight">Festora</span>
          </Link>
          <Link
            href="/"
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Volver al inicio
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 pb-24">
        {/* ── Encabezado ── */}
        <header className="pt-16 pb-10 sm:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Privacidad
          </span>
          <h1 className="mt-6 text-3xl font-medium tracking-tight sm:text-5xl">
            Tus fotos son tuyas.
            <br />
            <span className="text-muted-foreground">De nadie más.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base font-light leading-relaxed text-muted-foreground">
            Subir a Festora las fotos de una boda, de un cumpleaños o de tu
            familia es un acto de confianza. Esta página explica, sin letra
            pequeña, dónde viven esas fotos, quién puede verlas y qué hacemos
            —y qué no hacemos— con ellas.
          </p>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Última actualización: {ACTUALIZADO}
          </p>
        </header>

        {/* ── Las tres promesas ── */}
        <div className="grid gap-4 sm:grid-cols-3">
          {PROMESAS.map((p) => (
            <div
              key={p.titulo}
              className="rounded-2xl border border-border/60 bg-muted/20 p-5"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-foreground"
                >
                  {p.icono}
                </svg>
              </div>
              <h3 className="text-sm font-semibold">{p.titulo}</h3>
              <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">
                {p.texto}
              </p>
            </div>
          ))}
        </div>

        {/* ── Cuerpo ── */}
        <div className="mt-14">
          <Seccion numero="01" titulo="Dónde viven tus fotos">
            <p>
              Cuando subes una foto, viaja cifrada desde tu navegador
              directamente al almacenamiento de Cloudflare R2, sin pasar por
              ningún servidor intermedio de Festora. Se guardan dos archivos: el
              original y una miniatura ligera que tu propio navegador genera
              antes de subirla, para que la galería cargue rápido.
            </p>
            <p>
              Ese almacenamiento es <strong className="font-medium text-foreground">privado</strong>:
              el contenedor no está abierto a internet y no existe una dirección
              pública de tus archivos. Cada vez que alguien autorizado abre la
              galería, Festora genera un enlace firmado y temporal que caduca
              en cuestión de horas. Fuera de esa ventana, el enlace deja de
              funcionar aunque alguien lo haya copiado.
            </p>
            <p>
              En la base de datos solo guardamos los datos que hacen funcionar
              la galería: nombre del proyecto y del cliente, fecha, nombre de
              archivo, tamaño, dimensiones, orden y las selecciones que marca
              tu cliente. Nunca guardamos tus fotos en la base de datos.
            </p>
          </Seccion>

          <Seccion numero="02" titulo="Quién puede verlas">
            <p>Exactamente tres tipos de personas, y ninguna más:</p>
            <ul className="ml-1 space-y-2">
              <li className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                <span>
                  <strong className="font-medium text-foreground">Tú</strong>,
                  con tu sesión iniciada. Solo ves tus propios proyectos.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                <span>
                  <strong className="font-medium text-foreground">
                    Quien tenga el enlace
                  </strong>{" "}
                  que tú compartas, y el PIN si se lo pusiste.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                <span>
                  <strong className="font-medium text-foreground">Nadie más.</strong>{" "}
                  No hay perfiles públicos, ni feed, ni buscador de galerías, ni
                  fotos «destacadas» de otros usuarios.
                </span>
              </li>
            </ul>
            <p>
              El enlace de cada proyecto es una cadena aleatoria de ocho
              caracteres: no se puede adivinar y no aparece en buscadores. Aun
              así, un enlace sin PIN funciona para cualquiera que lo tenga, así
              que compártelo con el mismo cuidado con el que compartirías las
              llaves de tu casa. Si las fotos son delicadas, ponle PIN.
            </p>
          </Seccion>

          <Seccion numero="03" titulo="¿Y el equipo de Festora?">
            <p>
              No miramos tus fotos. No existe en Festora ninguna pantalla,
              herramienta ni proceso que permita abrir la galería de otra
              cuenta: la aplicación solo entrega fotos a su dueño autenticado o
              a quien presente el enlace —y el PIN— del proyecto.
            </p>
            <p>
              Ser honestos también significa contar el resto. Festora administra
              la infraestructura donde viven los archivos, así que existen
              credenciales técnicas capaces de leer el almacenamiento; es
              inevitable en cualquier servicio que guarde archivos por ti. Ese
              acceso se limita a operar el servicio —restaurar un archivo
              perdido, investigar un error, responder a una orden judicial— y
              nunca se usa para curiosear. Si alguien te promete que le resulta
              técnicamente imposible acceder, o está cifrando de extremo a
              extremo, o no te está contando todo.
            </p>
            <p>
              Lo que sí es una promesa firme: nunca abriremos tus fotos por
              curiosidad, ni para marketing, ni para entrenar modelos, ni para
              enseñárselas a nadie.
            </p>
          </Seccion>

          <Seccion numero="04" titulo="La inteligencia artificial, contada entera">
            <p>
              Festora usa IA para buscar por texto, describir escenas, puntuar
              la calidad de una toma y proponer álbumes. Para eso, y solo para
              eso, envía la <strong className="font-medium text-foreground">miniatura</strong>{" "}
              de la foto —la versión reducida de 800&nbsp;px, no el original— a
              los modelos de Google (Gemini) que analizan la imagen y devuelven
              una descripción, unas etiquetas y un vector numérico. Eso es lo
              que se guarda junto a la foto; la imagen no se queda allí. Si
              alguna foto no llegara a tener miniatura, se enviaría el archivo
              original.
            </p>
            <p>
              Es un proceso automático de principio a fin:{" "}
              <strong className="font-medium text-foreground">
                ninguna persona ve la imagen
              </strong>
              , ni de Festora ni del proveedor. En sus condiciones de API de
              pago, estos proveedores no usan el contenido enviado para entrenar
              sus modelos, y Festora tampoco lo autoriza. No enviamos tus fotos
              a ningún otro servicio de IA.
            </p>
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
              <p className="text-sm font-light leading-relaxed">
                <strong className="font-medium text-foreground">
                  En una frase:
                </strong>{" "}
                la IA lee tus fotos como lo haría un índice automático —para que
                tú las encuentres— y no como material que alguien archiva, mira
                o reutiliza.
              </p>
            </div>
          </Seccion>

          <Seccion numero="05" titulo="Los datos de tu cuenta">
            <p>
              Entras con Google. De ahí recibimos tu nombre, tu correo y tu foto
              de perfil, y nada más: Festora nunca ve tu contraseña ni pide
              acceso a tu Gmail, a tu Drive ni a tus contactos. Usamos el correo
              para identificarte y para escribirte si algo pasa con tu cuenta.
            </p>
            <p>
              Guardamos también cuánto espacio ocupas, para respetar el límite
              de tu plan. No hay publicidad en Festora, así que no hay nada que
              perfilar.
            </p>
          </Seccion>

          <Seccion numero="06" titulo="Cookies (las justas)">
            <p>
              Festora usa dos cookies y las dos son técnicas: la de tu sesión,
              para mantenerte dentro sin volver a iniciar sesión, y la del PIN
              de una galería, que dura siete días para que tu cliente no tenga
              que teclearlo cada vez. Ambas son{" "}
              <span className="font-mono text-xs">HttpOnly</span>, es decir,
              ilegibles para cualquier script.
            </p>
            <p>
              No hay cookies publicitarias, ni píxeles de redes sociales, ni
              rastreadores de terceros siguiéndote por la galería.
            </p>
          </Seccion>

          <Seccion numero="07" titulo="Cuánto tiempo se quedan">
            <p>
              Tus fotos se quedan mientras tú quieras. Cuando borras una foto o
              un proyecto completo, se elimina tanto el registro de la base de
              datos como los archivos —original y miniatura— del almacenamiento.
              No hay papelera oculta ni copia «por si acaso».
            </p>
            <p>
              Si borras tu cuenta, se van contigo todos tus proyectos, fotos y
              selecciones. Las copias de seguridad de la infraestructura pueden
              conservar restos durante un periodo corto antes de rotarse, y
              después desaparecen también de ahí.
            </p>
          </Seccion>

          <Seccion numero="08" titulo="Cómo están protegidas">
            <ul className="ml-1 space-y-2">
              <li className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                <span>Todo el tráfico viaja cifrado con HTTPS, incluida la subida.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                <span>Los archivos se guardan cifrados en reposo en Cloudflare R2.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                <span>
                  Los PIN se guardan con <span className="font-mono text-xs">bcrypt</span>:
                  ni nosotros podemos leer el PIN que elegiste.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                <span>
                  Cada acceso a una foto usa un enlace firmado y temporal, nunca
                  una URL permanente.
                </span>
              </li>
            </ul>
            <p>
              Si algún día ocurriera una brecha que afecte a tus fotos o a tus
              datos, te lo diremos por correo con lo que sepamos y lo que
              estemos haciendo. Sin comunicados vacíos.
            </p>
          </Seccion>

          <Seccion numero="09" titulo="Quién más participa">
            <p>
              Para funcionar, Festora se apoya en proveedores que procesan datos
              por encargo nuestro y bajo contrato. Estos son todos:
            </p>
            <ul className="ml-1 space-y-2">
              <li className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                <span>
                  <strong className="font-medium text-foreground">Cloudflare R2</strong> —
                  almacenamiento privado de fotos y miniaturas.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                <span>
                  <strong className="font-medium text-foreground">Vercel</strong> —
                  alojamiento de la aplicación.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                <span>
                  <strong className="font-medium text-foreground">Google</strong> —
                  inicio de sesión y modelos de IA que analizan las miniaturas.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                <span>
                  <strong className="font-medium text-foreground">
                    Base de datos gestionada
                  </strong>{" "}
                  — metadatos de proyectos, fotos y selecciones. Sin imágenes.
                </span>
              </li>
            </ul>
            <p>
              Ninguno de ellos recibe tus fotos para uso propio, y la lista se
              actualiza aquí si algún día cambia.
            </p>
          </Seccion>

          <Seccion numero="10" titulo="Lo que puedes hacer tú">
            <ul className="ml-1 space-y-2">
              <li className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                <span>
                  Ponle <strong className="font-medium text-foreground">PIN</strong> a
                  las galerías delicadas, en los ajustes del proyecto.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                <span>
                  Define una{" "}
                  <strong className="font-medium text-foreground">fecha límite</strong>{" "}
                  de selección o bloquea el proyecto cuando termine el trabajo.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                <span>
                  Borra el proyecto cuando tu cliente ya tenga sus fotos: lo que
                  no está guardado no se puede filtrar.
                </span>
              </li>
            </ul>
          </Seccion>

          <Seccion numero="11" titulo="Tus derechos">
            <p>
              Tus datos son tuyos: puedes consultarlos, corregirlos, borrarlos o
              llevártelos cuando quieras. Casi todo está en tus manos sin pedir
              permiso a nadie — descargar tus fotos en su calidad original,
              borrar una foto suelta o un proyecto entero, cambiar o quitar el
              PIN de una galería.
            </p>
            <p>
              Si eres cliente de un fotógrafo y quieres que tus fotos dejen de
              estar en una galería, habla con quien te compartió el enlace: esa
              persona es dueña del proyecto y puede borrarlo en un clic, y con
              él desaparecen los archivos del almacenamiento.
            </p>
          </Seccion>

          <Seccion numero="12" titulo="Cambios en esta página">
            <p>
              Si algo de lo anterior cambia —un proveedor nuevo, otro uso de la
              IA, otra forma de compartir— actualizamos esta página y movemos la
              fecha de arriba. Si el cambio afecta de verdad a tu privacidad, te
              avisamos por correo antes de aplicarlo, no después.
            </p>
          </Seccion>
        </div>

        {/* ── Lo que nunca hacemos ── */}
        <section className="mt-6 rounded-2xl border border-border/60 bg-muted/20 p-6 sm:p-8">
          <h2 className="text-lg font-medium tracking-tight">
            Lo que Festora nunca hará
          </h2>
          <ul className="mt-5 space-y-3">
            {NUNCA.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-0.5 shrink-0 text-muted-foreground"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
                <span className="text-sm font-light leading-relaxed text-muted-foreground">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
