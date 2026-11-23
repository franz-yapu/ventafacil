// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, montar, screen } from './montar';
import { ModoProvider } from '@/theme/ModoProvider';
import { ModoSelector } from '@/theme/ModoSelector';

/**
 * El selector de modo de pantalla: pulsar una opción la marca (`aria-pressed`) y, en
 * automático, avisa de qué está siguiendo el sistema. Node 26 trae un `localStorage`
 * propio que tapa el de jsdom, así que se monta uno mínimo.
 */
beforeEach(() => {
  const datos = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, String(v)),
    removeItem: (k: string) => void datos.delete(k),
    clear: () => datos.clear(),
  });
  vi.stubGlobal(
    'matchMedia',
    (q: string) =>
      ({
        matches: false,
        media: q,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  );
});

describe('ModoSelector', () => {
  it('marca el modo elegido y avisa de lo que sigue en automático', () => {
    montar(
      <ModoProvider>
        <ModoSelector />
      </ModoProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Oscuro/ }));
    expect(screen.getByRole('button', { name: /Oscuro/ }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getByRole('button', { name: /Claro/ }).getAttribute('aria-pressed')).toBe(
      'false',
    );

    fireEvent.click(screen.getByRole('button', { name: /Automático/ }));
    expect(screen.getByText(/Ahora sigue a tu sistema/)).toBeTruthy();
  });
});
