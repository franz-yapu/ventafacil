import { ahorroPct, enOferta, LIMIT_LABELS, limitLabel, type LimitKey } from '@ventafacil/shared';
import { Check, Tag } from 'lucide-react';
import type { PlanInfo } from '@/features/subscription/SubscriptionProvider';
import { cn } from '@/lib/utils';

/** "3 sucursales" · "Sucursales sin límite". */
function cupo(key: LimitKey, max: number | null): string {
  if (max === null) return `${LIMIT_LABELS[key]} sin límite`;
  return `${max} ${limitLabel(key, max)}`;
}

/**
 * Tarjeta de plan. Cuando hay oferta es lo primero que se ve: sello con el rótulo y el
 * ahorro, precio de lista tachado y el precio de oferta grande. Regla 60-30-10: la
 * superficie neutra lleva el 90 %, y el acento (color primario) se reserva para el sello,
 * el precio y la marca del plan actual.
 */
export function PlanCard({
  plan,
  actual = false,
  precioFijo,
}: {
  plan: PlanInfo;
  actual?: boolean;
  /** Si el negocio ya paga otro importe (precio que se le mantiene), se muestra aparte. */
  precioFijo?: string;
}) {
  const oferta = enOferta(plan);
  const pct = ahorroPct(plan);

  return (
    <article
      className={cn(
        'relative flex flex-col overflow-hidden rounded-theme border bg-surface p-5 transition-[transform,box-shadow] duration-200 ease-out',
        'motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-lg',
        oferta || actual ? 'border-primary' : 'border-border',
      )}
      aria-label={`Plan ${plan.name}`}
    >
      {oferta && (
        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-primary px-4 py-1.5 text-[12px] font-bold uppercase tracking-[0.06em] text-primary-fg">
          <span className="inline-flex items-center gap-1.5">
            <Tag size={13} aria-hidden="true" />
            {plan.offerLabel || 'Oferta'}
          </span>
          {pct > 0 && <span>−{pct}%</span>}
        </div>
      )}

      <div className={cn('flex items-center justify-between', oferta && 'mt-8')}>
        <h3 className="text-base font-bold tracking-[-0.01em]">{plan.name}</h3>
        {actual && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[12px] font-semibold text-primary">
            <Check size={12} aria-hidden="true" /> Tu plan
          </span>
        )}
      </div>

      <div className="mt-3">
        {oferta && (
          <div className="text-[13px] text-muted">
            Precio de lista{' '}
            <s className="tabular-nums" aria-label={`antes ${plan.regularPrice}`}>
              {plan.currency} {plan.regularPrice}
            </s>
          </div>
        )}
        <div className="flex items-baseline gap-1">
          <span className="text-[34px] font-extrabold leading-none tracking-[-0.03em] tabular-nums">
            {plan.currency} {precioFijo ?? plan.priceMonthly}
          </span>
          <span className="text-[13px] text-muted">/mes</span>
        </div>
        {oferta && (
          <p className="mt-1.5 text-[12px] font-semibold text-primary">
            Contrata ahora y este precio se mantiene.
          </p>
        )}
      </div>

      <p className="mt-3 text-[13px] text-muted">{plan.description}</p>
      <ul className="mt-4 space-y-1.5 border-t border-border pt-4 text-[13px]">
        {(['locations', 'users', 'products'] as LimitKey[]).map((k) => {
          const max = k === 'locations' ? plan.maxLocations : k === 'users' ? plan.maxUsers : plan.maxProducts;
          return (
            <li key={k} className="flex items-center gap-2">
              <Check size={14} className="shrink-0 text-primary" aria-hidden="true" />
              {cupo(k, max)}
            </li>
          );
        })}
        {plan.features?.includes('reportes_avanzados') && (
          <li className="flex items-center gap-2">
            <Check size={14} className="shrink-0 text-primary" aria-hidden="true" />
            Panel de análisis
          </li>
        )}
      </ul>
    </article>
  );
}
