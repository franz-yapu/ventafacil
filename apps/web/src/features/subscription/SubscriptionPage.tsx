import { LIMIT_LABELS, type LimitKey } from '@ventafacil/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { importe, PlanCard, type Periodo } from '@/features/subscription/PlanCard';
import { Page, PageHeader } from '@/components/ui/page';
import type { PlanInfo } from '@/features/subscription/SubscriptionProvider';
import { useSubscription } from '@/features/subscription/SubscriptionProvider';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const ETIQUETA_ESTADO: Record<string, string> = {
  trial: 'En prueba',
  trial_expired: 'Prueba vencida',
  active: 'Activa',
  past_due: 'Pago pendiente',
  suspended: 'Suspendida',
  cancelled: 'Cancelada',
};

/** Barra de uso de un cupo. Sin tope, se muestra el número y ya. */
function Cupo({ nombre, used, limit }: { nombre: string; used: number; limit: number | null }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  // Se avisa a partir del 80%: llegar al tope en plena carga de productos frustra.
  const apretado = limit !== null && used / limit >= 0.8;

  return (
    <div>
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="capitalize">{nombre}</span>
        <span className={cn('font-semibold', apretado && 'text-warning')}>
          {used}
          {limit === null ? ' · sin límite' : ` / ${limit}`}
        </span>
      </div>
      {limit !== null && (
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-track">
          <div
            className={cn('h-full rounded-full', apretado ? 'bg-warning' : 'bg-primary')}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

/** Qué plan tiene el negocio, cuánto de su cupo lleva usado y qué otros planes hay. */
export function SubscriptionPage() {
  const { sub, loading } = useSubscription();
  const [periodo, setPeriodo] = useState<Periodo>('anual');

  const { data: planes } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get<PlanInfo[]>('/plans'),
    staleTime: 60 * 60_000,
  });

  if (loading) return <div className="p-6 text-muted">Cargando…</div>;

  return (
    <Page>
      <PageHeader
        titulo="Mi plan"
        descripcion="Tu suscripción y cuánto llevas usado de cada cupo."
      />

      <Card>
        <CardContent className="p-4">
          {sub?.plan ? (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <div className="text-lg font-bold">{sub.plan.name}</div>
                  <div className="text-[13px] text-muted">{sub.plan.description}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">
                    {sub.plan.currency} {importe(sub.plan.priceMonthly, 'anual')}
                    <span className="font-normal text-muted"> /año</span>
                  </div>
                  <div className="text-[13px] text-muted">
                    {ETIQUETA_ESTADO[sub.status ?? ''] ?? sub.status}
                    {sub.status === 'trial' && sub.trialDaysLeft !== null
                      ? ` · ${sub.trialDaysLeft} día(s)`
                      : ''}
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {(Object.keys(sub.usage) as LimitKey[]).map((k) => (
                  <Cupo
                    key={k}
                    nombre={LIMIT_LABELS[k]}
                    used={sub.usage[k].used}
                    limit={sub.usage[k].limit}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="text-sm text-muted">
              Este negocio no tiene una suscripción asociada: opera sin límites.
            </div>
          )}
        </CardContent>
      </Card>

      {planes && planes.length > 0 && (
        <>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Planes disponibles</h2>
            <div role="group" aria-label="Periodo de pago" className="inline-flex rounded-full bg-fg/[0.07] p-1">
              {(['anual', 'mensual'] as Periodo[]).map((per) => (
                <button
                  key={per}
                  type="button"
                  aria-pressed={periodo === per}
                  onClick={() => setPeriodo(per)}
                  className={cn(
                    'min-h-9 rounded-full px-4 text-[13px] font-semibold capitalize transition-colors',
                    periodo === per ? 'bg-surface text-fg shadow-sm' : 'text-muted',
                  )}
                >
                  {per}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {planes.map((p) => (
              <PlanCard
                key={p.code}
                plan={p}
                periodo={periodo}
                actual={p.code === sub?.plan?.code}
                precioFijo={p.code === sub?.plan?.code ? sub.plan.priceMonthly : undefined}
              />
            ))}
          </div>
          <p className="text-[13px] text-muted">
            Para cambiar de plan, contáctanos. El cobro automático llegará más adelante.
          </p>
        </>
      )}
    </Page>
  );
}
