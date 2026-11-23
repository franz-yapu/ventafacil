import { useState } from 'react';
import { validar, type Reglas } from '@/lib/validar';

/**
 * Validación por campo para un formulario.
 *
 * Un campo enseña su error al salir de él (`onBlur={() => tocar('x')}`) y todos a la vez
 * al intentar guardar (`intentar()`, que además dice si se puede enviar). Las reglas se
 * evalúan en cada render: el error aparece y desaparece mientras se escribe.
 */
export function useValidacion<T extends string>(reglas: Reglas<T>, valores: Record<T, string>) {
  const [tocados, setTocados] = useState<Set<string>>(new Set());
  const [intentado, setIntentado] = useState(false);
  const errores = validar(reglas, valores);
  return {
    errores,
    /** Error a mostrar en el campo `k` (sólo si ya lo tocó o se intentó guardar). */
    ver: (k: T): string | undefined => (intentado || tocados.has(k) ? errores[k] : undefined),
    tocar: (k: T) => setTocados((t) => new Set(t).add(k)),
    /** Llamar al pulsar Guardar: marca todos los campos y devuelve `true` si todo está bien. */
    intentar: (): boolean => {
      setIntentado(true);
      const bien = Object.keys(errores).length === 0;
      // El foco va al primer campo inválido, para quien navega con teclado o lector de
      // pantalla. Se espera al render que pinta `aria-invalid`.
      if (!bien && typeof document !== 'undefined') {
        setTimeout(() => {
          document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
        }, 0);
      }
      return bien;
    },
    reiniciar: () => {
      setTocados(new Set());
      setIntentado(false);
    },
  };
}
