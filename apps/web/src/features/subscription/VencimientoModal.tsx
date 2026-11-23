import { MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { fechaCorta } from '@/features/subscription/SubscriptionBanner';
import { useSubscription } from '@/features/subscription/SubscriptionProvider';
import { enlaceWhatsapp } from '@/lib/contacto';

/** Cada cuánto vuelve a salir mientras el plan siga vencido. */
const REPETIR_MS = 10 * 60_000;
/** Segundos que hay que esperar antes de poder cerrarlo. */
const ESPERA_S = 6;

/**
 * Modal INSISTENTE para un plan pagado ya vencido.
 *
 * Sale al entrar y vuelve a salir cada 10 minutos mientras no se renueve, durante los 7
 * días de gracia y también en sólo lectura. No se puede cerrar de inmediato: hay que esperar
 * unos segundos, a propósito. Es molesto por diseño — es la última advertencia antes de
 * perder la posibilidad de vender —, pero no bloquea: la caja sigue funcionando por detrás.
 */
export function VencimientoModal() {
  const { sub } = useSubscription();
  const fase = sub?.periodo?.fase;
  const vencido = fase === 'gracia' || fase === 'solo_lectura';

  const [abierto, setAbierto] = useState(false);
  const [espera, setEspera] = useState(ESPERA_S);

  // Abre al detectar el vencimiento y reabre cada REPETIR_MS.
  useEffect(() => {
    if (!vencido) {
      setAbierto(false);
      return;
    }
    setAbierto(true);
    const t = setInterval(() => setAbierto(true), REPETIR_MS);
    return () => clearInterval(t);
  }, [vencido]);

  // Cuenta atrás cada vez que se abre.
  useEffect(() => {
    if (!abierto) return;
    setEspera(ESPERA_S);
    const t = setInterval(() => setEspera((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [abierto]);

  if (!vencido || !sub?.periodo) return null;
  const per = sub.periodo;
  const fin = sub.currentPeriodEnd ? fechaCorta(sub.currentPeriodEnd) : '';
  const soloLectura = fase === 'solo_lectura';
  const mensaje = `Hola, quiero renovar mi plan ${sub.plan?.name ?? ''} de VentaFácil.`;

  return (
    <Modal
      open={abierto}
      onClose={() => espera === 0 && setAbierto(false)}
      title={soloLectura ? 'Tu cuenta está en solo lectura' : 'Tu plan venció'}
      footer={
        <div className="flex flex-col gap-2">
          <a href={enlaceWhatsapp(mensaje)} target="_blank" rel="noreferrer">
            <Button className="w-full">
              <MessageCircle size={16} /> Renovar por WhatsApp
            </Button>
          </a>
          <Link to="/suscripcion" onClick={() => espera === 0 && setAbierto(false)}>
            <Button variant="outline" className="w-full">
              Ver mi plan
            </Button>
          </Link>
          <Button variant="outline" disabled={espera > 0} onClick={() => setAbierto(false)}>
            {espera > 0 ? `Cerrar (${espera})` : 'Cerrar y seguir'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3 text-[14px]">
        <p>
          Tu plan <strong>{sub.plan?.name}</strong> venció el <strong>{fin}</strong>
          {per.diasVencido > 0 ? ` (hace ${per.diasVencido} ${per.diasVencido === 1 ? 'día' : 'días'})` : ''}.
        </p>
        {soloLectura ? (
          <p className="rounded-theme bg-danger-bg p-3 text-danger">
            Pasaron los 7 días de gracia. Puedes ver tus ventas, productos y reportes, pero{' '}
            <strong>no puedes vender, crear ni editar</strong> hasta renovar.
          </p>
        ) : (
          <p className="rounded-theme bg-warning-bg p-3 text-warning">
            Te quedan <strong>{per.graciaRestante} {per.graciaRestante === 1 ? 'día' : 'días'}</strong> de
            gracia. Después la cuenta pasa a solo lectura y no podrás vender ni editar.
          </p>
        )}
        <p className="text-muted">Renueva ahora para no interrumpir tu negocio.</p>
      </div>
    </Modal>
  );
}
