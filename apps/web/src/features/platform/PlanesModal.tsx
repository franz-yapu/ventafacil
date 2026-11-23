import { ahorroPct, enOferta } from '@ventafacil/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Tag } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Campo } from '@/components/ui/field';
import { useValidacion } from '@/lib/useValidacion';
import { entero, importe, largo, requerido, todas } from '@/lib/validar';
import { BannerSeccion, TarjetaTono, type Tono } from '@/features/platform/estilos';
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
export function PlanesModal(_: { onClose: () => void }) {
  const { data: planes, isLoading } = useQuery({
    queryKey: ['platform', 'plans'],
    queryFn: () => platformApi.get<PlanFila[]>('/platform/plans'),
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <BannerSeccion
        tono="primary"
        icon={Tag}
        titulo="Planes y precios"
        descripcion="Los cambios de precio y de oferta solo aplican a quien contrate desde ahora: los negocios que ya pagan mantienen su precio. Los cupos sí rigen para todos."
      />
      {isLoading && <div className="text-muted">Cargando…</div>}
      <div className="grid gap-4 lg:grid-cols-2">
        {planes?.map((p, i) => (
          <PlanForm key={p.code} plan={p} i={i} />
        ))}
      </div>
    </div>
  );
}

const PLAN_TONO: Record<string, Tono> = { basico: 'info', pro: 'primary', ilimitado: 'success' };

function PlanForm({ plan, i }: { plan: PlanFila; i: number }) {
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

  const v = useValidacion(
    {
      precio: todas(requerido('El precio'), importe({ max: 99999.99, permiteCero: false })),
      lista: todas(importe({ max: 99999.99 }), (x) =>
        x.trim() !== '' && Number(x.replace(',', '.')) <= Number(precio.replace(',', '.'))
          ? 'Debe ser mayor que el precio que se cobra'
          : null,
      ),
      rotulo: largo(0, 40),
      sucursales: entero({ max: 9999 }),
      usuarios: entero({ max: 9999 }),
      productos: entero({ max: 999999 }),
    },
    { precio, lista, rotulo, sucursales, usuarios, productos },
  );

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

  return (
    <TarjetaTono tono={PLAN_TONO[plan.code] ?? 'warning'} i={i + 1}>
      <form
        className="p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setGuardado(false);
          if (!v.intentar()) return;
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
          <Campo
            etiqueta={`Precio mensual base (${plan.currency}/mes; se muestra x12 al año)`}
            error={v.ver('precio')}
          >
            <Input
              inputMode="decimal"
              value={precio}
              onBlur={() => v.tocar('precio')}
              onChange={(e) => setPrecio(e.target.value)}
            />
          </Campo>
          <Campo etiqueta="Precio de lista (tachado)" opcional error={v.ver('lista')}>
            <Input
              inputMode="decimal"
              value={lista}
              placeholder="sin oferta"
              onBlur={() => v.tocar('lista')}
              onChange={(e) => setLista(e.target.value)}
            />
          </Campo>
          <Campo
            etiqueta="Rótulo de la oferta"
            opcional
            className="col-span-2 sm:col-span-3"
            error={v.ver('rotulo')}
          >
            <Input
              value={rotulo}
              maxLength={40}
              placeholder="Oferta de este mes"
              onBlur={() => v.tocar('rotulo')}
              onChange={(e) => setRotulo(e.target.value)}
            />
          </Campo>
          <Campo etiqueta="Sucursales" opcional error={v.ver('sucursales')}>
            <Input
              inputMode="numeric"
              value={sucursales}
              placeholder="sin límite"
              onBlur={() => v.tocar('sucursales')}
              onChange={(e) => setSucursales(e.target.value)}
            />
          </Campo>
          <Campo etiqueta="Usuarios" opcional error={v.ver('usuarios')}>
            <Input
              inputMode="numeric"
              value={usuarios}
              placeholder="sin límite"
              onBlur={() => v.tocar('usuarios')}
              onChange={(e) => setUsuarios(e.target.value)}
            />
          </Campo>
          <Campo etiqueta="Productos" opcional error={v.ver('productos')}>
            <Input
              inputMode="numeric"
              value={productos}
              placeholder="sin límite"
              onBlur={() => v.tocar('productos')}
              onChange={(e) => setProductos(e.target.value)}
            />
          </Campo>
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
    </TarjetaTono>
  );
}
