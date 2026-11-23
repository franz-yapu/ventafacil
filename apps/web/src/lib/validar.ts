/**
 * Validación por campo para los formularios.
 *
 * Cada regla devuelve el mensaje de error o `null`. Los límites salen de `@ventafacil/shared`
 * para que la pantalla y el servidor digan lo mismo: la pantalla avisa en el campo, el
 * servidor es quien de verdad lo impide.
 */
import { LIMITES } from '@ventafacil/shared';

export type Regla = (valor: string) => string | null;

const vacio = (v: string) => v.trim() === '';

export const requerido =
  (que = 'Este campo'): Regla =>
  (v) =>
    vacio(v) ? `${que} es obligatorio` : null;

export const largo =
  (min: number, max: number): Regla =>
  (v) => {
    const t = v.trim();
    if (t === '') return null;
    if (t.length < min) return `Mínimo ${min} caracteres`;
    if (t.length > max) return `Máximo ${max} caracteres`;
    return null;
  };

/** Importe en bolivianos: positivo, hasta 2 decimales y con tope. */
export const importe =
  (opts: { max?: number; permiteCero?: boolean } = {}): Regla =>
  (v) => {
    const t = v.trim();
    if (t === '') return null;
    if (t.startsWith('-')) return 'No puede ser negativo';
    if (!/^\d+([.,]\d{1,2})?$/.test(t)) return 'Usa solo números, hasta 2 decimales (ej. 25.50)';
    const n = Number(t.replace(',', '.'));
    const max = opts.max ?? LIMITES.importeMax;
    if (n > max) return `No puede pasar de ${max}`;
    if (n === 0 && opts.permiteCero === false) return 'Debe ser mayor que 0';
    return null;
  };

/** Cantidad entera (unidades). */
export const entero =
  (opts: { max?: number } = {}): Regla =>
  (v) => {
    const t = v.trim();
    if (t === '') return null;
    if (t.startsWith('-')) return 'No puede ser negativo';
    if (!/^\d+$/.test(t)) return 'Solo números enteros, sin decimales';
    if (Number(t) > (opts.max ?? LIMITES.cantidadMax))
      return `No puede pasar de ${opts.max ?? LIMITES.cantidadMax}`;
    return null;
  };

export const correo: Regla = (v) => {
  const t = v.trim();
  if (t === '') return null;
  if (t.length > LIMITES.correoMax) return `Máximo ${LIMITES.correoMax} caracteres`;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t)
    ? null
    : 'Escribe un correo válido (ej. nombre@correo.com)';
};

/** Teléfono: dígitos, espacios, +, guiones y paréntesis; 7 a 15 dígitos. */
export const telefono: Regla = (v) => {
  const t = v.trim();
  if (t === '') return null;
  if (!/^[\d\s+()-]+$/.test(t)) return 'Solo números, espacios, + y guiones';
  const d = t.replace(/\D/g, '').length;
  return d < 7 || d > 15 ? 'Debe tener entre 7 y 15 dígitos' : null;
};

export const usuario: Regla = (v) => {
  const t = v.trim();
  if (t === '') return null;
  if (t.length < 3) return 'Mínimo 3 caracteres';
  if (t.length > LIMITES.usuarioMax) return `Máximo ${LIMITES.usuarioMax} caracteres`;
  return /^[a-zA-Z0-9._-]+$/.test(t) ? null : 'Solo letras, números, punto, guion y guion bajo';
};

export const clave: Regla = (v) => {
  if (v === '') return null;
  if (v.length < 6) return 'Mínimo 6 caracteres';
  if (v.length > LIMITES.claveMax) return `Máximo ${LIMITES.claveMax} caracteres`;
  return null;
};

/** Encadena reglas: devuelve el primer error. */
export const todas =
  (...reglas: Regla[]): Regla =>
  (v) => {
    for (const r of reglas) {
      const e = r(v);
      if (e) return e;
    }
    return null;
  };

export type Reglas<T extends string> = Record<T, Regla>;

/** Aplica las reglas a los valores y devuelve solo los campos con error. */
export function validar<T extends string>(
  reglas: Reglas<T>,
  valores: Record<T, string>,
): Partial<Record<T, string>> {
  const out: Partial<Record<T, string>> = {};
  for (const k of Object.keys(reglas) as T[]) {
    const e = reglas[k](valores[k] ?? '');
    if (e) out[k] = e;
  }
  return out;
}
