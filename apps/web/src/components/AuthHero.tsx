import { Check } from 'lucide-react';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMarca } from '@/theme/ThemeProvider';
import { cn } from '@/lib/utils';

/**
 * Pantallas de acceso: una sala oscura plana (sin degradados) con el color de la marca como
 * ÚNICO acento, titulares en serif de contraste, un sello con texto que gira despacio y un
 * recibo que se «cobra» al cargar. Es el mismo lenguaje del rediseño de bidstream.
 *
 * White-label: el acento sale de `--color-primary` del negocio, aclarado lo justo para leerse
 * sobre el fondo oscuro (`--auth-accent`), así que una marca navy o una lima funcionan igual.
 * Todo lo que se mueve es decorativo (`aria-hidden`) y se apaga con movimiento reducido.
 */
const ACENTO = {
  '--auth-accent': 'color-mix(in srgb, var(--color-primary) 55%, white)',
} as CSSProperties;

function reduceMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

/** Cuenta de 0 a `hasta` en ~1 s (sin movimiento: aparece ya con el valor final). */
function useCuenta(hasta: number, retrasoMs = 500): number {
  const [v, setV] = useState(reduceMotion() ? hasta : 0);
  useEffect(() => {
    if (reduceMotion()) return;
    let raf = 0;
    const ini = performance.now() + retrasoMs;
    const paso = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - ini) / 1000));
      setV(Math.round(hasta * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [hasta, retrasoMs]);
  return v;
}

export interface Recibo {
  titulo: string;
  lineas: [string, string][];
  totalEtiqueta: string;
  total: number;
  pie: string;
  sello: string;
}

export const RECIBO_NEGOCIO: Recibo = {
  titulo: 'RECIBO N.º 000128',
  lineas: [
    ['1 × Llanta 185/65 R15', '420.00'],
    ['2 × Filtro de aceite', '90.00'],
  ],
  totalEtiqueta: 'Total',
  total: 510,
  pie: 'Efectivo · Caja 1 · Sincronizado',
  sello: 'COBRADO',
};

export const RECIBO_PLATAFORMA: Recibo = {
  titulo: 'RESUMEN DEL MES',
  lineas: [
    ['6 negocios activos', ''],
    ['Planes con oferta', '3'],
  ],
  totalEtiqueta: 'MRR',
  total: 748,
  pie: 'Cada cambio queda en la bitácora',
  sello: 'AL DÍA',
};

function ReciboTarjeta({ r }: { r: Recibo }) {
  const total = useCuenta(r.total);
  return (
    <div className="auth-float relative w-[280px] text-[#1b1a20]" aria-hidden="true">
      <div className="rounded-t-[16px] bg-[#f6f3ea] px-5 pb-4 pt-5 shadow-[0_30px_60px_-24px_rgba(0,0,0,0.7)]">
        <div className="font-mono text-[10px] font-semibold tracking-[0.12em] opacity-70">
          {r.titulo}
        </div>
        <ul className="mt-3 space-y-1.5 text-[13px]">
          {r.lineas.map(([a, b]) => (
            <li key={a} className="flex justify-between gap-3">
              <span>{a}</span>
              <span className="font-mono">{b}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-end justify-between border-t border-dashed border-black/25 pt-3">
          <span className="text-[13px] font-semibold">{r.totalEtiqueta}</span>
          <span className="auth-display text-[34px] font-semibold leading-none tabular-nums">
            Bs. {total}.00
          </span>
        </div>
      </div>
      {/* Línea de perforación con las muescas del recibo. */}
      <div
        className="relative bg-[#f6f3ea] px-5 pb-4 pt-3 text-[11px] opacity-90"
        style={{ borderTop: '3px dotted rgba(0,0,0,0.25)' }}
      >
        <span className="absolute -left-[9px] -top-[11px] h-[18px] w-[18px] rounded-full bg-nav" />
        <span className="absolute -right-[9px] -top-[11px] h-[18px] w-[18px] rounded-full bg-nav" />
        {r.pie}
      </div>
      <div className="h-3 rounded-b-[16px] bg-[#f6f3ea]" />
      <div
        className="auth-stamp absolute -right-5 -top-7 grid h-[70px] w-[70px] place-items-center rounded-full border-[3px] border-[color:var(--auth-accent)] bg-nav text-[11px] font-extrabold tracking-[0.08em] text-[color:var(--auth-accent)]"
        style={{ transform: 'rotate(-8deg)' }}
      >
        {r.sello}
      </div>
    </div>
  );
}

function Sello({ inicial, anillo }: { inicial: string; anillo: string }) {
  return (
    <svg viewBox="0 0 520 520" aria-hidden="true" className="h-full w-full">
      <defs>
        <path id="auth-anillo" d="M260 260 m-205 0 a205 205 0 1 1 410 0 a205 205 0 1 1 -410 0" />
      </defs>
      <g className="auth-spin">
        <text fontSize="21" fontWeight="700" fill="var(--auth-accent)" letterSpacing="2">
          <textPath href="#auth-anillo" textLength="1280" lengthAdjust="spacing">
            {anillo}
          </textPath>
        </text>
      </g>
      <circle
        cx="260"
        cy="260"
        r="168"
        fill="none"
        stroke="var(--auth-accent)"
        strokeOpacity="0.4"
        strokeWidth="1.5"
        strokeDasharray="2 9"
        strokeLinecap="round"
      />
      <circle cx="260" cy="260" r="132" fill="#2a2930" stroke="#efeee9" strokeWidth="4" />
      <circle cx="260" cy="260" r="118" fill="none" stroke="var(--auth-accent)" strokeWidth="1.5" />
      <text
        x="260"
        y="296"
        textAnchor="middle"
        fontFamily="Fraunces Variable, Georgia, serif"
        fontSize="124"
        fontWeight="500"
        fill="#efeee9"
      >
        {inicial}
      </text>
      <circle cx="322" cy="262" r="11" fill="var(--auth-accent)" />
    </svg>
  );
}

/** Sala oscura (escritorio). */
export function AuthHero({
  cabecera,
  titular,
  texto,
  puntos,
  recibo = RECIBO_NEGOCIO,
  anillo = 'COBRAR · CONTROLAR · CERRAR CAJA · SIN INTERNET · ',
  className,
}: {
  cabecera: ReactNode;
  titular: ReactNode;
  texto: string;
  puntos?: string[];
  recibo?: Recibo;
  anillo?: string;
  className?: string;
}) {
  const marca = useMarca();
  const inicial = (marca?.appName ?? marca?.name ?? 'V').trim().charAt(0).toUpperCase() || 'V';
  return (
    <aside
      style={ACENTO}
      className={cn(
        'relative hidden w-[46%] max-w-[720px] shrink-0 flex-col overflow-hidden rounded-[28px] bg-nav p-10 text-nav-fg md:flex xl:p-12',
        className,
      )}
    >
      {/* Resplandor suave del color de marca detrás del sello. */}
      <div
        aria-hidden="true"
        className="auth-glow pointer-events-none absolute -right-20 top-10 h-[360px] w-[360px] rounded-full blur-[90px]"
        style={{ background: 'var(--auth-accent)' }}
      />

      <div className="relative z-10 flex items-center gap-3">{cabecera}</div>

      <div className="relative z-10 mt-10">
        <h2 className="auth-display max-w-[460px] text-[46px] leading-[1.02] motion-safe:animate-rise xl:text-[54px]">
          {titular}
        </h2>
        <p
          className="mt-5 max-w-[400px] text-[15px] leading-relaxed text-nav-muted motion-safe:animate-rise"
          style={{ animationDelay: '80ms' }}
        >
          {texto}
        </p>
      </div>

      <div className="relative z-10 mt-auto flex min-h-[300px] items-end justify-between gap-4 pt-8">
        {puntos && (
          <ul className="mb-2 flex max-w-[230px] flex-col gap-3 text-[14px] font-medium">
            {puntos.map((p, i) => (
              <li
                key={p}
                className="flex items-start gap-2.5 motion-safe:animate-rise"
                style={{ animationDelay: `${180 + i * 90}ms` }}
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--auth-accent)] text-nav">
                  <Check size={12} strokeWidth={3.2} aria-hidden="true" />
                </span>
                {p}
              </li>
            ))}
          </ul>
        )}
        <div className="relative h-[400px] w-[340px] shrink-0">
          <div className="absolute right-0 top-0 h-[205px] w-[205px]">
            <Sello inicial={inicial} anillo={anillo} />
          </div>
          <div
            className="absolute bottom-0 left-0 motion-safe:animate-rise"
            style={{ animationDelay: '260ms' }}
          >
            <ReciboTarjeta r={recibo} />
          </div>
        </div>
      </div>
    </aside>
  );
}

/** La misma sala, compacta, para móvil. */
export function AuthHeroMovil({ cabecera, titular }: { cabecera: ReactNode; titular: ReactNode }) {
  return (
    <div
      style={ACENTO}
      className="relative overflow-hidden rounded-[24px] bg-nav p-6 text-nav-fg md:hidden"
    >
      <div
        aria-hidden="true"
        className="auth-glow pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-[70px]"
        style={{ background: 'var(--auth-accent)' }}
      />
      <div className="relative flex items-center gap-3">{cabecera}</div>
      <p className="auth-display relative mt-6 text-[34px] leading-[1.04] motion-safe:animate-rise">
        {titular}
      </p>
    </div>
  );
}

/** Pestañas Entrar / Crear cuenta (como en bidstream). */
export function AuthTabs({ actual }: { actual: 'entrar' | 'registro' }) {
  const item = (on: boolean) =>
    cn(
      'rounded-full px-4 py-1.5 text-[14px] font-semibold transition-[background-color,color,box-shadow] duration-150',
      on ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg',
    );
  return (
    <nav aria-label="Acceso" className="mb-7 inline-flex gap-1 rounded-full bg-track p-1">
      <Link
        to="/login"
        aria-current={actual === 'entrar' ? 'page' : undefined}
        className={item(actual === 'entrar')}
      >
        Entrar
      </Link>
      <Link
        to="/registro"
        aria-current={actual === 'registro' ? 'page' : undefined}
        className={item(actual === 'registro')}
      >
        Crear cuenta
      </Link>
    </nav>
  );
}

/** Versión visible en el pie de todas las pantallas de entrada. */
export const VERSION_APP = '0.0.2';

/** Marco de página: sala oscura a la izquierda, hoja de formulario a la derecha. */
export function AuthLayout({
  hero,
  movil,
  children,
}: {
  hero: ReactNode;
  movil: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col gap-4 bg-bg p-3 md:flex-row md:gap-6 md:p-6">
      {movil}
      {hero}
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-2 md:py-0">
        {children}
        <p className="text-center text-[11px] tabular-nums text-muted">Versión {VERSION_APP}</p>
      </div>
    </div>
  );
}
