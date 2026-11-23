import { AlertTriangle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSubscription } from '@/features/subscription/SubscriptionProvider';

/**
 * Aviso fino sobre el contenido: prueba en curso o pago pendiente.
 *
 * En morosidad NO se corta el servicio (el POS sigue vendiendo), así que este banner
 * es todo lo que hay para que el negocio se entere antes de llegar a la suspensión.
 */
/** 14 de febrero de 2027 */
export function fechaCorta(iso: string): string {
  return new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

export function SubscriptionBanner() {
  const { sub } = useSubscription();
  if (!sub || sub.blocked) return null;

  const per = sub.periodo;
  if (per && per.fase !== 'al_dia') {
    const fin = sub.currentPeriodEnd ? fechaCorta(sub.currentPeriodEnd) : '';
    const urgente = per.fase !== 'por_vencer' || per.diasRestantes <= 3;
    const texto =
      per.fase === 'solo_lectura'
        ? `Tu plan venció el ${fin}. La cuenta está en modo SOLO LECTURA: puedes ver tus datos, pero no vender ni editar.`
        : per.fase === 'gracia'
          ? `Tu plan venció el ${fin}. Te quedan ${per.graciaRestante} ${per.graciaRestante === 1 ? 'día' : 'días'} para renovar antes de pasar a solo lectura.`
          : per.diasRestantes <= 0
            ? `Tu plan vence hoy (${fin}).`
            : `Tu plan vence el ${fin} (quedan ${per.diasRestantes} ${per.diasRestantes === 1 ? 'día' : 'días'}).`;
    return (
      <div
        role={urgente ? 'alert' : 'status'}
        className={`no-print flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-4 py-2 text-[13px] ${
          urgente ? 'bg-danger-bg text-danger' : 'bg-warning-bg text-warning'
        }`}
      >
        <AlertTriangle size={15} className="shrink-0" />
        <span className="font-medium">{texto}</span>
        <Link to="/suscripcion" className="font-semibold underline underline-offset-2">
          Renovar mi plan
        </Link>
      </div>
    );
  }

  if (sub.status === 'past_due') {
    return (
      <div className="no-print flex items-center gap-2 border-b border-border bg-danger-bg px-4 py-2 text-[13px] text-danger">
        <AlertTriangle size={15} className="shrink-0" />
        <span>Tu pago está pendiente. Regulariza para que no se suspenda el servicio.</span>
      </div>
    );
  }

  if (sub.status === 'trial' && sub.trialDaysLeft !== null) {
    const dias = sub.trialDaysLeft;
    return (
      <div
        className={`no-print flex items-center gap-2 border-b border-border px-4 py-2 text-[13px] ${
          dias <= 3 ? 'bg-warning-bg text-warning' : 'bg-surface text-fg'
        }`}
      >
        <Clock size={15} className={dias <= 3 ? 'shrink-0' : 'shrink-0 text-primary'} />
        <span>
          {dias <= 1 ? 'Tu prueba gratis termina hoy.' : `Te quedan ${dias} días de prueba gratis.`}{' '}
          Plan {sub.plan?.name}.
        </span>
      </div>
    );
  }

  return null;
}
