import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type Tono = 'success' | 'danger' | 'warning' | 'info' | 'primary';

/** Clases literales (Tailwind no ve las que se arman por partes). */
export const TONO: Record<Tono, { icono: string; barra: string; borde: string; relleno: string }> =
  {
    success: {
      icono: 'bg-success-bg text-success',
      barra: 'bg-success',
      borde: 'border-t-success',
      relleno: 'from-success-bg',
    },
    danger: {
      icono: 'bg-danger-bg text-danger',
      barra: 'bg-danger',
      borde: 'border-t-danger',
      relleno: 'from-danger-bg',
    },
    warning: {
      icono: 'bg-warning-bg text-warning',
      barra: 'bg-warning',
      borde: 'border-t-warning',
      relleno: 'from-warning-bg',
    },
    info: {
      icono: 'bg-info-bg text-info',
      barra: 'bg-info',
      borde: 'border-t-info',
      relleno: 'from-info-bg',
    },
    primary: {
      icono: 'bg-primary-soft text-primary',
      barra: 'bg-primary',
      borde: 'border-t-primary',
      relleno: 'from-primary-soft',
    },
  };

/** Entrada escalonada: cada pieza sube un poco después de la anterior. */
export const retraso = (i: number) => ({ animationDelay: `${Math.min(i, 12) * 55}ms` });

/** Tarjeta con borde superior y degradado del tono, que entra escalonada y se eleva al pasar. */
export function TarjetaTono({
  tono,
  i = 0,
  className = '',
  children,
}: {
  tono: Tono;
  i?: number;
  className?: string;
  children: ReactNode;
}) {
  void tono;
  return (
    <div
      style={retraso(i)}
      className={`rounded-theme border border-border bg-surface motion-safe:animate-rise ${className}`}
    >
      {children}
    </div>
  );
}

/** Cabecera de una sección del panel: icono de color, título y una línea de contexto. */
export function BannerSeccion({
  tono,
  icon: Icon,
  titulo,
  descripcion,
  acciones,
}: {
  tono: Tono;
  icon: LucideIcon;
  titulo: string;
  descripcion?: ReactNode;
  acciones?: ReactNode;
}) {
  void tono;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-theme border border-border bg-surface p-4 motion-safe:animate-rise">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-track text-muted">
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-[17px] font-bold tracking-[-0.01em]">{titulo}</h2>
        {descripcion && <p className="text-[13px] text-muted">{descripcion}</p>}
      </div>
      {acciones}
    </div>
  );
}
