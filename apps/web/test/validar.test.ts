import { describe, expect, it } from 'vitest';
import { clave, correo, entero, importe, largo, requerido, telefono, todas, usuario, validar } from '@/lib/validar';

describe('reglas de validación por campo', () => {
  it('el importe no acepta negativos, letras ni más de 2 decimales', () => {
    expect(importe()('-5')).toMatch(/negativo/);
    expect(importe()('abc')).toMatch(/números/);
    expect(importe()('1.234')).toMatch(/2 decimales/);
    expect(importe()('25.50')).toBeNull();
    expect(importe()('25,5')).toBeNull();
  });

  it('el importe tiene tope (9999.99 por defecto) y puede exigir mayor que cero', () => {
    expect(importe()('9999.99')).toBeNull();
    expect(importe()('10000')).toMatch(/pasar de/);
    expect(importe({ permiteCero: false })('0')).toMatch(/mayor que 0/);
    expect(importe()('')).toBeNull(); // vacío lo decide `requerido`
  });

  it('las cantidades son enteros no negativos', () => {
    expect(entero()('3.5')).toMatch(/enteros/);
    expect(entero()('-1')).toMatch(/negativo/);
    expect(entero()('12')).toBeNull();
  });

  it('largo, requerido y encadenado', () => {
    expect(requerido('El nombre')('  ')).toBe('El nombre es obligatorio');
    expect(largo(1, 5)('abcdef')).toMatch(/Máximo 5/);
    expect(todas(requerido('X'), largo(1, 3))('abcd')).toMatch(/Máximo 3/);
  });

  it('correo, teléfono, usuario y clave', () => {
    expect(correo('no-es-correo')).toMatch(/válido/);
    expect(correo('ana@correo.com')).toBeNull();
    expect(telefono('abc')).toMatch(/números/);
    expect(telefono('123')).toMatch(/7 y 15/);
    expect(telefono('+591 7000 0000')).toBeNull();
    expect(usuario('a')).toMatch(/Mínimo 3/);
    expect(usuario('ana perez')).toMatch(/Solo letras/);
    expect(clave('12345')).toMatch(/Mínimo 6/);
  });

  it('validar devuelve solo los campos con error', () => {
    const e = validar(
      { a: requerido('A'), b: importe() },
      { a: '', b: '10' },
    );
    expect(Object.keys(e)).toEqual(['a']);
  });
});
