import { AVISO_DIAS, GRACIA_DIAS, periodoPagado } from '@ventafacil/shared';
import { describe, expect, it } from 'vitest';

const DIA = 86_400_000;
const ahora = new Date('2026-12-01T12:00:00Z');
const fin = (dias: number) => new Date(ahora.getTime() + dias * DIA);

describe('periodoPagado', () => {
  it('no aplica a la prueba, a suspendidos ni a planes sin fecha', () => {
    expect(periodoPagado({ status: 'trial', currentPeriodEnd: fin(3) }, ahora)).toBeNull();
    expect(periodoPagado({ status: 'suspended', currentPeriodEnd: fin(3) }, ahora)).toBeNull();
    expect(periodoPagado({ status: 'active', currentPeriodEnd: null }, ahora)).toBeNull();
  });

  it('al día hasta 16 días; por vencer desde 15', () => {
    expect(
      periodoPagado({ status: 'active', currentPeriodEnd: fin(AVISO_DIAS + 1) }, ahora)!.fase,
    ).toBe('al_dia');
    const p = periodoPagado({ status: 'active', currentPeriodEnd: fin(AVISO_DIAS) }, ahora)!;
    expect(p.fase).toBe('por_vencer');
    expect(p.diasRestantes).toBe(15);
    expect(p.puedeEscribir).toBe(true);
  });

  it('el último día sigue "por vencer" y puede escribir', () => {
    const p = periodoPagado(
      { status: 'active', currentPeriodEnd: new Date(ahora.getTime() + 3_600_000) },
      ahora,
    )!;
    expect(p.fase).toBe('por_vencer');
    expect(p.diasRestantes).toBe(1);
  });

  it('vencido: 7 días de gracia con escritura, después sólo lectura', () => {
    const g = periodoPagado({ status: 'active', currentPeriodEnd: fin(-1) }, ahora)!;
    expect(g.fase).toBe('gracia');
    expect(g.diasVencido).toBe(1);
    expect(g.graciaRestante).toBe(GRACIA_DIAS - 1);
    expect(g.puedeEscribir).toBe(true);

    const ultimo = periodoPagado(
      { status: 'active', currentPeriodEnd: fin(-(GRACIA_DIAS - 0.5)) },
      ahora,
    )!;
    expect(ultimo.fase).toBe('gracia');

    const l = periodoPagado({ status: 'active', currentPeriodEnd: fin(-GRACIA_DIAS) }, ahora)!;
    expect(l.fase).toBe('solo_lectura');
    expect(l.puedeEscribir).toBe(false);
    expect(l.graciaRestante).toBe(0);
  });
});
