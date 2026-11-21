import { cloneElement, useId, type ReactElement, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Campo de formulario: rótulo, control, ayuda y error en un solo bloque.
 *
 * El rótulo se asocia al control con un id generado, así que tocar el texto enfoca el
 * campo (en el móvil eso es la mitad de la puntería) y la ayuda cuelga de `aria-describedby`. La ayuda
 * va DEBAJO del control y dice qué escribir; el error sustituye a la ayuda y dice cómo
 * arreglarlo.
 */
export function Campo({
  etiqueta,
  opcional,
  ayuda,
  error,
  children,
  className,
}: {
  etiqueta: string;
  opcional?: boolean;
  ayuda?: ReactNode;
  error?: ReactNode;
  children: ReactElement<{ id?: string; 'aria-describedby'?: string }>;
  className?: string;
}) {
  const id = useId();
  const notaId = `${id}-nota`;
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[13px] font-semibold text-fg">
        {etiqueta}
        {opcional && <span className="ml-1 font-normal text-muted">(opcional)</span>}
      </label>
      {cloneElement(children, {
        id,
        'aria-describedby': error || ayuda ? notaId : undefined,
      })}
      {(error || ayuda) && (
        <span id={notaId} className={cn('text-xs', error ? 'text-danger' : 'text-muted')}>
          {error || ayuda}
        </span>
      )}
    </div>
  );
}

/** Grupo con título dentro de un formulario largo. */
export function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-3.5 border-0 p-0">
      <legend className="mb-2 w-full border-b border-border pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
        {titulo}
      </legend>
      {children}
    </fieldset>
  );
}
