import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Panel de marca de las pantallas sin sesión (escritorio).
 *
 * Color del NEGOCIO a todo lo ancho: un degradado del propio color de marca (más claro
 * arriba, más profundo abajo) con un resplandor de su color secundario, así que el
 * white-label llega hasta aquí y ninguna marca se ve igual que otra. Debajo, la captura
 * REAL del producto en un marco de navegador, asomando por el borde: enseña lo que se va a
 * usar en vez de prometerlo.
 *
 * Es decoración: la imagen lleva `alt=""` y todo el texto importante está fuera de ella.
 */
export function AuthHero({
  cabecera,
  titular,
  texto,
  puntos,
  imagen = '/hero/pos.webp',
  tono = 'marca',
  className,
}: {
  cabecera: ReactNode;
  titular: ReactNode;
  texto: string;
  puntos?: string[];
  imagen?: string;
  /** `tinta`: fondo casi negro con el color de marca como luz (la puerta de plataforma). */
  tono?: 'marca' | 'tinta';
  className?: string;
}) {
  return (
    <aside
      className={cn(
        'relative hidden w-[48%] max-w-[760px] shrink-0 flex-col overflow-hidden p-10 md:flex xl:p-14',
        tono === 'tinta' ? 'text-white' : 'text-primary-fg',
        className,
      )}
      style={{
        background:
          tono === 'tinta'
            ? 'linear-gradient(155deg, #23232e 0%, #15151c 55%, #0b0b10 100%)'
            : 'linear-gradient(155deg, color-mix(in srgb, var(--color-primary) 88%, white) 0%, var(--color-primary) 38%, color-mix(in srgb, var(--color-primary) 52%, black) 100%)',
      }}
    >
      {/* Resplandores: el secundario del negocio arriba a la derecha y luz blanca abajo. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full opacity-45 blur-[90px]"
        style={{ background: tono === 'tinta' ? 'var(--color-primary)' : 'var(--color-secondary)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-24 h-[380px] w-[380px] rounded-full bg-white/15 blur-[90px]"
      />

      <div className="relative z-10 flex items-center gap-3">{cabecera}</div>

      <div className="relative z-10 mt-10 xl:mt-14">
        <h2 className="max-w-[440px] text-[34px] font-extrabold leading-[1.08] tracking-[-0.035em] xl:text-[40px]">
          {titular}
        </h2>
        <p className="mt-4 max-w-[400px] text-[15px] leading-relaxed">{texto}</p>
        {puntos && (
          <ul className="mt-6 flex flex-col gap-2.5 text-[14px] font-semibold">
            {puntos.map((p, i) => (
              <li
                key={p}
                className="flex items-center gap-2.5 motion-safe:animate-rise"
                style={{ animationDelay: `${150 + i * 90}ms` }}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-current/20">
                  <Check size={12} strokeWidth={3} aria-hidden="true" />
                </span>
                {p}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* La captura: marco de navegador, inclinada un punto y cortada por el borde. */}
      <div
        aria-hidden="true"
        className="relative z-10 mt-auto pt-10 motion-safe:animate-rise"
        style={{ animationDelay: '300ms' }}
      >
        <div className="-mb-24 ml-2 w-[118%] origin-top-left -rotate-[1.5deg] overflow-hidden rounded-[14px] border border-white/25 bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] xl:-mb-28">
          <div className="flex items-center gap-1.5 border-b border-black/10 bg-[#f1f0ee] px-3.5 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            <span className="ml-3 h-5 flex-1 rounded-md bg-black/[0.06]" />
          </div>
          <img
            src={imagen}
            alt=""
            width={1280}
            height={800}
            loading="eager"
            className="block w-full"
          />
        </div>
      </div>
    </aside>
  );
}

/**
 * Cabecera de las pantallas sin sesión en móvil: el mismo degradado de marca, pero como
 * banda superior con esquinas redondeadas. Antes el móvil era un logo suelto sobre blanco.
 */
export function AuthHeroMovil({ cabecera, titular }: { cabecera: ReactNode; titular: ReactNode }) {
  return (
    <div
      className="relative overflow-hidden rounded-b-[28px] px-6 pb-10 pt-8 text-primary-fg md:hidden"
      style={{
        background:
          'linear-gradient(155deg, color-mix(in srgb, var(--color-primary) 88%, white) 0%, var(--color-primary) 45%, color-mix(in srgb, var(--color-primary) 55%, black) 100%)',
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-45 blur-[60px]"
        style={{ background: 'var(--color-secondary)' }}
      />
      <div className="relative flex items-center gap-3">{cabecera}</div>
      <p className="relative mt-6 text-[26px] font-extrabold leading-[1.1] tracking-[-0.03em]">
        {titular}
      </p>
    </div>
  );
}
