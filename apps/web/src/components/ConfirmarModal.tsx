import { AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

interface Props {
  titulo: string;
  /** Qué va a pasar, en una o dos frases. */
  mensaje: ReactNode;
  confirmar?: string;
  cancelar?: string;
  /** `peligro` pinta de rojo (borrar, dar de baja); `normal` es para acciones reversibles. */
  tono?: 'peligro' | 'normal';
  /** Con la petición en vuelo no se puede cerrar ni confirmar dos veces. */
  pendiente?: boolean;
  /** Texto del botón mientras `pendiente`. */
  textoPendiente?: string;
  /** Error de la última tentativa: se enseña dentro, sin cerrar el modal. */
  error?: string | null;
  onConfirmar: () => void;
  onCancelar: () => void;
}

/**
 * Confirmación como modal de la app, en lugar de `window.confirm`.
 *
 * El diálogo del navegador no se puede estilar, no sale en capturas ni en pruebas, y en
 * móvil parece una alerta del sistema ajena a la app. Éste usa el mismo `Modal` que el
 * resto, con foco atrapado y Escape.
 */
export function ConfirmarModal({
  titulo,
  mensaje,
  confirmar = 'Confirmar',
  cancelar = 'Cancelar',
  tono = 'normal',
  pendiente,
  textoPendiente,
  error,
  onConfirmar,
  onCancelar,
}: Props) {
  const peligro = tono === 'peligro';
  return (
    <Modal open onClose={pendiente ? () => undefined : onCancelar} title={titulo}>
      <div className="flex flex-col gap-4">
        <div
          className={`flex gap-3 rounded-theme p-3 ${peligro ? 'bg-danger-bg text-danger' : 'bg-info-bg text-info'}`}
        >
          {peligro ? (
            <AlertTriangle size={20} className="mt-0.5 shrink-0" />
          ) : (
            <HelpCircle size={20} className="mt-0.5 shrink-0" />
          )}
          <div className="text-[13px] leading-[1.5]">{mensaje}</div>
        </div>
        {error && <p className="text-[13px] text-danger">{error}</p>}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" disabled={pendiente} onClick={onCancelar}>
            {cancelar}
          </Button>
          <Button
            variant={peligro ? 'danger' : 'primary'}
            className="flex-1"
            disabled={pendiente}
            onClick={onConfirmar}
          >
            {pendiente ? (textoPendiente ?? 'Procesando…') : confirmar}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** Aviso de resultado (éxito) como modal, en lugar de `window.alert`. */
export function AvisoModal({
  titulo,
  children,
  boton = 'Entendido',
  onCerrar,
}: {
  titulo: string;
  children: ReactNode;
  boton?: string;
  onCerrar: () => void;
}) {
  return (
    <Modal open onClose={onCerrar} title={titulo}>
      <div className="flex flex-col gap-4">
        <div className="flex gap-3 rounded-theme bg-success-bg p-3 text-success">
          <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
          <div className="min-w-0 break-words text-[13px] leading-[1.5]">{children}</div>
        </div>
        <Button onClick={onCerrar}>{boton}</Button>
      </div>
    </Modal>
  );
}
