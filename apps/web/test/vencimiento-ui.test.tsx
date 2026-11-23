// @vitest-environment jsdom
import { act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { montar, screen } from './montar';

let sub: unknown = null;
vi.mock('@/features/subscription/SubscriptionProvider', () => ({
  useSubscription: () => ({ sub, loading: false, has: () => true }),
}));

const { SubscriptionBanner } = await import('@/features/subscription/SubscriptionBanner');
const { VencimientoModal } = await import('@/features/subscription/VencimientoModal');

const base = {
  plan: { name: 'Básico' },
  status: 'active',
  blocked: false,
  currentPeriodEnd: '2027-02-14T12:00:00Z',
};
const periodo = (fase: string, extra = {}) => ({
  fase,
  diasRestantes: 0,
  diasVencido: 0,
  graciaRestante: 0,
  puedeEscribir: fase !== 'solo_lectura',
  ...extra,
});

const en = (ui: React.ReactElement) => montar(<MemoryRouter>{ui}</MemoryRouter>);

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('banner del plan pagado', () => {
  it('por vencer: avisa con la fecha y los días', () => {
    sub = { ...base, periodo: periodo('por_vencer', { diasRestantes: 12 }) };
    en(<SubscriptionBanner />);
    expect(screen.getByText(/Tu plan vence el .* \(quedan 12 días\)/)).toBeTruthy();
  });

  it('al día: no muestra nada', () => {
    sub = { ...base, periodo: periodo('al_dia', { diasRestantes: 40 }) };
    const { container } = en(<SubscriptionBanner />);
    expect(container.textContent).toBe('');
  });

  it('solo lectura: lo dice claro', () => {
    sub = { ...base, periodo: periodo('solo_lectura', { diasRestantes: -9, diasVencido: 9 }) };
    en(<SubscriptionBanner />);
    expect(screen.getByText(/SOLO LECTURA/)).toBeTruthy();
  });
});

describe('modal insistente de plan vencido', () => {
  it('no sale si el plan está al día o por vencer', () => {
    sub = { ...base, periodo: periodo('por_vencer', { diasRestantes: 5 }) };
    en(<VencimientoModal />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('en gracia sale, no se puede cerrar al instante y vuelve a salir a los 10 minutos', () => {
    sub = {
      ...base,
      periodo: periodo('gracia', { diasVencido: 2, graciaRestante: 5, diasRestantes: -2 }),
    };
    en(<VencimientoModal />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText(/5 días/)).toBeTruthy();

    const cerrar = screen.getByRole('button', { name: /Cerrar \(/ }) as HTMLButtonElement;
    expect(cerrar.disabled).toBe(true);

    act(() => void vi.advanceTimersByTime(7000));
    const listo = screen.getByRole('button', { name: /Cerrar y seguir/ }) as HTMLButtonElement;
    expect(listo.disabled).toBe(false);
    act(() => listo.click());
    expect(screen.queryByRole('dialog')).toBeNull();

    act(() => void vi.advanceTimersByTime(10 * 60_000));
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('en solo lectura el mensaje cambia', () => {
    sub = { ...base, periodo: periodo('solo_lectura', { diasVencido: 9, diasRestantes: -9 }) };
    en(<VencimientoModal />);
    expect(screen.getByText(/no puedes vender, crear ni editar/)).toBeTruthy();
  });
});
