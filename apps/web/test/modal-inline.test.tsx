// @vitest-environment jsdom
import { montar as render } from './montar';
import { describe, expect, it } from 'vitest';
import { Modal } from '@/components/ui/modal';

describe('Modal en modo página (pestañas del panel)', () => {
  it('NO bloquea el scroll del cuerpo, para que la página se pueda desplazar', () => {
    document.body.style.overflow = '';
    const { unmount } = render(
      <Modal open inline onClose={() => undefined} title="Planes">
        <p>contenido</p>
      </Modal>,
    );
    expect(document.body.style.overflow).toBe('');
    unmount();
  });

  it('el modal normal sí lo bloquea y lo restaura al cerrarse', () => {
    document.body.style.overflow = '';
    const { unmount } = render(
      <Modal open onClose={() => undefined} title="Hoja">
        <p>contenido</p>
      </Modal>,
    );
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
