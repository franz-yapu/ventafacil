import { ahorroPct, enOferta } from '@ventafacil/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Tag } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { platformApi } from '@/lib/api';

interface PlanFila {
  code: string;
  name: string;
  priceMonthly: string;
  regularPrice: string | null;
  offerLabel: string | null;
  currency: string;
  maxLocations: number | null;
  maxUsers: number | null;
  maxProducts: number | null;
  isPublic: boolean;
}

/** Cupo vacío = sin límite. */
const aCupo = (v: string): number | null => (v.trim() === '' ? null : Number(v));

/**
 * Catálogo de planes: SOLO precio, oferta y cupos. Un cambio de precio afecta a los
 * negocios que contraten desde ahora; quien ya paga conserva su precio. Los cupos rigen
 * para todos.
 */
export function PlanesModal({ onClose }: { onClose: () => void }) {
  const { data: planes, isLoading } = useQuery({
    queryKey: ['platform', 'plans'],
    queryFn: () => platformApi.get<PlanFila[]>('/platform/plans'),
  });

  return (
    <Modal open onClose={onClose} title="Planes y precios">
      <div className="flex flex-col gap-4">
        <p className="text-[13px] text-muted">
          Los cambios de precio y de oferta solo aplican a quien contrate desde ahora: los negocios
          que ya pagan mantienen su precio. Los cupos sí rigen para todos.
        </p>
        {isLoading && <div className="text-muted">Cargando…</div>}
        {planes?.map((p) => (
          <PlanForm key={p.code} plan={p} />
        ))}
        <Button onClick={onClose}>Cerrar</Button>
      </div>
    </Modal>
  );
}

function PlanForm({ plan }: { plan: PlanFila }) {
  const qc = useQueryClient();
  const [precio, setPrecio] = useState(plan.priceMonthly);
  const [lista, setLista] = useState(plan.regularPrice ?? '');
  const [rotulo, setRotulo] = useState(plan.offerLabel ?? '');
  const [sucursales, setSucursales] = useState(plan.maxLocations?.toString() ?? '');
  const [usuarios, setUsuarios] = useState(plan.maxUsers?.toString() ?? '');
  const [productos, setProductos] = useState(plan.maxProducts?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  const vista = { priceMonthly: precio, regularPrice: lista || null };
  const oferta = enOferta(vista);

  const guardar = useMutation({
    mutationFn: () =>
      platformApi.patch(`/platform/plans/${plan.code}`, {
        priceMonthly: precio,
        regularPrice: lista.trim() === '' ? null : lista,
        offerLabel: rotulo.trim() === '' ? null : rotulo.trim(),
        maxLocations: aCupo(sucursales),
        maxUsers: aCupo(usuarios),
        maxProducts: aCupo(productos),
      }),
    onSuccess: () => {
      setError(null);
      setGuardado(true);
      qc.invalidateQueries({ queryKey: ['platform', 'plans'] });
      qc.invalidateQueries({ queryKey: ['plans'] });
      setTimeout(() => setGuardado(false), 2500);
    },
    onError: (e: Error) => setError(e.message),
  });

  const campo = 'flex flex-col gap-1 text-[12px] font-semibold text-muted';

  return (
    <form
      className="rounded-theme border border-border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setGuardado(false);
        guardar.mutate();
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold">{plan.name}</h3>
          {!plan.isPublic && <Badge tone="neutral">Interno</Badge>}
          {oferta && (
            <Badge tone="success">
              <Tag size={11} /> Oferta −{ahorroPct(vista)}%
            </Badge>
          )}
        </div>
        <span className="text-[12px] text-muted">{plan.code}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className={campo}>
          Precio que se cobra ({plan.currency}/mes)
          <Input inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} />
        </label>
        <label className={campo}>
          Precio de lista (tachado)
          <Input
            inputMode="decimal"
            value={lista}
            placeholder="sin oferta"
            onChange={(e) => setLista(e.target.value)}
          />
        </label>
        <label className={`${campo} col-span-2 sm:col-span-3`}>
          Rótulo de la oferta
          <Input
            value={rotulo}
            maxLength={40}
            placeholder="Oferta de este mes"
            onChange={(e) => setRotulo(e.target.value)}
          />
        </label>
        <label className={campo}>
          Sucursales
          <Input
            inputMode="numeric"
            value={sucursales}
            placeholder="sin límite"
            onChange={(e) => setSucursales(e.target.value)}
          />
        </label>
        <label className={campo}>
          Usuarios
          <Input
            inputMode="numeric"
            value={usuarios}
            placeholder="sin límite"
            onChange={(e) => setUsuarios(e.target.value)}
          />
        </label>
        <label className={campo}>
          Productos
          <Input
            inputMode="numeric"
            value={productos}
            placeholder="sin límite"
            onChange={(e) => setProductos(e.target.value)}
          />
        </label>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span role="status" className="text-[13px]">
          {error && <span className="text-danger">{error}</span>}
          {guardado && <span className="text-success">Guardado</span>}
        </span>
        <Button type="submit" className="h-9 px-4 text-[13px]" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </form>
  );
}
