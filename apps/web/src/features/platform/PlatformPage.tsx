import { importe } from '@/features/subscription/PlanCard';
import type { EffectiveStatus, PeriodoPagado, SubscriptionStatus } from '@ventafacil/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  History,
  ReceiptText,
  Building2,
  CalendarClock,
  CircleDollarSign,
  Copy,
  KeyRound,
  LogOut,
  Search,
  ShieldCheck,
  Tag,
  TrendingUp,
  UserCog,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AvisoModal, ConfirmarModal } from '@/components/ConfirmarModal';
import { Input } from '@/components/ui/input';
import { Campo } from '@/components/ui/field';
import { LIMITES, MENSAJE_SLUG, validarSlug } from '@ventafacil/shared';
import { useValidacion } from '@/lib/useValidacion';
import { largo, requerido, todas } from '@/lib/validar';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { MiCuentaModal } from '@/features/platform/MiCuentaModal';
import { OperadoresModal } from '@/features/platform/OperadoresModal';
import { PlanesModal } from '@/features/platform/PlanesModal';
import { usePlatformAuth } from '@/features/platform/PlatformAuthProvider';
import type { PlanInfo } from '@/features/subscription/SubscriptionProvider';
import { platformApi } from '@/lib/api';
import { retraso, TarjetaTono, TONO, type Tono } from '@/features/platform/estilos';

/** Cuánto falta para el próximo corte. Lo calcula el servidor: manda su reloj. */
interface Vence {
  concepto: 'prueba' | 'periodo';
  fecha: string;
  dias: number;
}

interface TenantRow {
  id: string;
  name: string;
  slug: string | null;
  createdAt: string;
  planCode: string | null;
  planName: string | null;
  priceMonthly: string | null;
  currency: string | null;
  status: EffectiveStatus | null;
  blocked: boolean;
  trialEndsAt: string | null;
  suspendedReason: string | null;
  vence: Vence | null;
  currentPeriodEnd: string | null;
  cycleStartedAt: string | null;
  billingMonths: number;
  billedAmount: string | null;
  periodo: PeriodoPagado | null;
}

interface TenantDetail {
  business: { id: string; name: string; slug: string | null; createdAt: string };
  subscription: {
    planCode: string;
    status: EffectiveStatus;
    trialEndsAt: string | null;
    suspendedReason: string | null;
    currentPeriodEnd: string | null;
    cycleStartedAt: string | null;
    billingMonths: number;
    billedAmount: string | null;
  } | null;
  blocked: boolean;
  vence: Vence | null;
  periodo: PeriodoPagado | null;
  usage: {
    users: number;
    locations: number;
    products: number;
    sales: number;
    lastSaleAt: string | null;
    movimientos: Movimiento[];
  };
}

interface Movimiento {
  fecha: string;
  tipo: 'venta' | 'anulacion' | 'accion';
  detalle: string;
  usuario: string | null;
}

interface TenantUser {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: 'admin' | 'seller';
  isActive: boolean;
  emailVerifiedAt: string | null;
  locationName: string | null;
}

interface Metrics {
  mrr: string;
  mrrEnRiesgo: string;
  porEstado: Record<string, number>;
  altasDelMes: number;
  bajasDelMes: number;
  totalNegocios: number;
  conSuscripcion: number;
  porVencer: number;
  enGracia: number;
  soloLectura: number;
}

const ESTADO: Record<string, { label: string; tone: BadgeTone }> = {
  trial: { label: 'En prueba', tone: 'info' },
  trial_expired: { label: 'Prueba vencida', tone: 'danger' },
  active: { label: 'Activa', tone: 'success' },
  past_due: { label: 'Morosa', tone: 'warning' },
  suspended: { label: 'Suspendida', tone: 'danger' },
  cancelled: { label: 'Cancelada', tone: 'neutral' },
};

function EstadoBadge({ status }: { status: EffectiveStatus | null }) {
  if (!status) return <Badge tone="neutral">Sin suscripción</Badge>;
  const e = ESTADO[status] ?? { label: status, tone: 'neutral' as BadgeTone };
  return <Badge tone={e.tone}>{e.label}</Badge>;
}

/**
 * "Le quedan 3 días" en vez de una fecha que hay que restar mentalmente.
 *
 * El color acompaña a la urgencia porque este texto se lee de reojo en una lista larga:
 * vencido en rojo, una semana o menos en ámbar, el resto en gris.
 */
function cuentaAtras(v: Vence | null): { texto: string; tone: BadgeTone } | null {
  if (!v) return null;
  const que = v.concepto === 'prueba' ? 'Prueba' : 'Periodo';
  if (v.dias < 0) {
    const d = Math.abs(v.dias);
    return { texto: `${que} vencida hace ${d} ${d === 1 ? 'día' : 'días'}`, tone: 'danger' };
  }
  if (v.dias === 0) return { texto: `${que} vence hoy`, tone: 'danger' };
  return {
    texto: `${que}: ${v.dias} ${v.dias === 1 ? 'día' : 'días'}`,
    tone: v.dias <= 7 ? 'warning' : 'neutral',
  };
}

const fecha = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

/** Estado del plan pagado: "Vence en 12 días", "Venció hace 3 días (gracia)", "Solo lectura". */
function PeriodoBadge({ periodo }: { periodo: PeriodoPagado | null }) {
  if (!periodo || periodo.fase === 'al_dia') return null;
  if (periodo.fase === 'solo_lectura') return <Badge tone="danger">Solo lectura</Badge>;
  if (periodo.fase === 'gracia') {
    return <Badge tone="danger">Venció hace {periodo.diasVencido} d · gracia</Badge>;
  }
  return (
    <Badge tone={periodo.diasRestantes <= 3 ? 'danger' : 'warning'}>
      {periodo.diasRestantes <= 0 ? 'Vence hoy' : `Vence en ${periodo.diasRestantes} d`}
    </Badge>
  );
}

function VenceBadge({ vence }: { vence: Vence | null }) {
  const c = cuentaAtras(vence);
  if (!c) return null;
  return <Badge tone={c.tone}>{c.texto}</Badge>;
}

/**
 * Resumen de estados para el subtítulo. Antes sólo decía activos y en prueba, así que
 * de 24 negocios el subtítulo describía 3: los suspendidos y las bajas desaparecían
 * justo del sitio donde se miran.
 */
function resumenEstados(porEstado: Record<string, number>): string {
  const etiquetas: Array<[string, string]> = [
    ['active', 'activos'],
    ['trial', 'en prueba'],
    ['past_due', 'morosos'],
    ['trial_expired', 'prueba vencida'],
    ['suspended', 'suspendidos'],
    ['cancelled', 'de baja'],
  ];
  const partes = etiquetas
    .filter(([k]) => (porEstado[k] ?? 0) > 0)
    .map(([k, txt]) => `${porEstado[k]} ${txt}`);
  return partes.length ? partes.join(' · ') : 'sin suscripciones';
}

function Tile({
  label,
  value,
  hint,
  tono,
  icon: Icon,
  i,
}: {
  label: string;
  value: string;
  hint?: string;
  tono: Tono;
  icon: typeof Building2;
  i: number;
}) {
  const c = TONO[tono];
  return (
    <div
      style={retraso(i)}
      className="rounded-theme border border-border bg-surface p-4 motion-safe:animate-rise"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.09em] text-muted">
          <span className={`h-1.5 w-1.5 rounded-full ${c.barra}`} />
          {label}
        </div>
        <Icon size={15} className="text-muted" />
      </div>
      <div className="mt-1 text-2xl font-bold tracking-[-0.02em]">{value}</div>
      {hint && <div className="mt-0.5 text-[13px] text-muted">{hint}</div>}
    </div>
  );
}

const ESTADO_TONO: Record<string, Tono> = {
  active: 'success',
  trial: 'info',
  past_due: 'warning',
  trial_expired: 'danger',
  suspended: 'danger',
  cancelled: 'danger',
};

/** Cuánto del periodo en curso (o de la prueba) ya pasó, de 0 a 100. */
function avance(t: TenantRow): { pct: number; desde: string | null; hasta: string | null } | null {
  const fin = t.status === 'trial' ? t.trialEndsAt : t.currentPeriodEnd;
  const ini = t.status === 'trial' ? t.createdAt : t.cycleStartedAt;
  if (!fin || !ini) return null;
  const a = new Date(ini).getTime();
  const b = new Date(fin).getTime();
  if (b <= a) return null;
  return { pct: Math.max(0, Math.min(100, ((Date.now() - a) / (b - a)) * 100)), desde: ini, hasta: fin };
}

/** Tarjeta de un negocio: color por estado, barra de periodo y entrada con retraso. */
function NegocioCard({ t, i, onAbrir }: { t: TenantRow; i: number; onAbrir: () => void }) {
  const tono: Tono = t.status ? (ESTADO_TONO[t.status] ?? 'info') : 'warning';
  const c = TONO[tono];
  const av = avance(t);
  const barra = av && av.pct > 90 ? TONO.danger.barra : av && av.pct > 75 ? TONO.warning.barra : c.barra;
  return (
    <button
      onClick={onAbrir}
      style={retraso(i)}
      className="group relative flex flex-col gap-3 rounded-theme border border-field bg-surface p-4 text-left transition-[border-color,background-color] duration-150 hover:border-primary/50 hover:bg-muted/[0.04] active:scale-[.995] motion-safe:animate-rise"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-track text-base font-bold text-fg">
          {t.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-bold tracking-[-0.01em]">{t.name}</div>
          <div className="truncate text-[12px] text-muted">{t.slug ?? 'sin subdominio'}</div>
        </div>
        <EstadoBadge status={t.status} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-track px-2.5 py-[3px] text-[11px] font-bold text-muted">
          <Tag size={11} /> {t.planName ?? 'sin plan'}
        </span>
        {t.priceMonthly && (
          <span className="inline-flex items-center gap-1 rounded-full bg-track px-2.5 py-[3px] text-[11px] font-bold text-muted">
            <CircleDollarSign size={11} /> Bs. {importe(t.priceMonthly, 'anual')}/año
          </span>
        )}
        {t.periodo ? <PeriodoBadge periodo={t.periodo} /> : <VenceBadge vence={t.vence} />}
      </div>

      {av ? (
        <div>
          <div className="mb-1 flex items-center justify-between text-[11px] text-muted">
            <span className="inline-flex items-center gap-1">
              <CalendarClock size={11} /> {t.status === 'trial' ? 'Prueba' : 'Compró'} {fecha(av.desde)}
            </span>
            <span>vence {fecha(av.hasta)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-track">
            <div
              className={`h-full rounded-full ${barra} transition-[width] duration-700 ease-out`}
              style={{ width: `${av.pct}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="text-[12px] text-muted">
          {t.status ? 'Sin fechas de periodo' : 'Sin suscripción: nunca contrató un plan.'}
        </div>
      )}

      <div className="flex items-center justify-end gap-1 text-[12px] font-semibold text-muted opacity-70 transition-[opacity,color] group-hover:text-fg group-hover:opacity-100">
        Ver detalle
        <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-1" />
      </div>
    </button>
  );
}

const FILTROS = [
  { id: 'todos', label: 'Todos' },
  { id: 'active', label: 'Activos' },
  { id: 'trial', label: 'En prueba' },
  { id: 'porvencer', label: 'Por vencer' },
  { id: 'problema', label: 'Con problema' },
] as const;
type Filtro = (typeof FILTROS)[number]['id'];

/** Panel de plataforma: cartera de clientes, su estado y las acciones sobre ellos. */
export function PlatformPage() {
  const { admin, logout } = usePlatformAuth();
  const qc = useQueryClient();
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const soloPorVencer = filtro === 'porvencer';
  const navigate = useNavigate();
  const { id: negocioId } = useParams<{ id: string }>();
  const [pestana, setPestana] = useState<'negocios' | 'operadores' | 'planes' | 'cuenta'>(
    'negocios',
  );
  const irANegocios = () => {
    setPestana('negocios');
    if (negocioId) navigate('/plataforma');
  };
  const pestanas = [
    { id: 'negocios' as const, label: 'Negocios', icon: ShieldCheck, visible: true },
    { id: 'operadores' as const, label: 'Operadores', icon: Users, visible: !!admin?.isOwner },
    { id: 'planes' as const, label: 'Planes', icon: Tag, visible: !!admin?.isOwner },
    { id: 'cuenta' as const, label: 'Mi cuenta', icon: UserCog, visible: true },
  ].filter((p) => p.visible);

  const { data: metrics } = useQuery({
    queryKey: ['platform', 'metrics'],
    queryFn: () => platformApi.get<Metrics>('/platform/metrics'),
  });

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['platform', 'tenants', busqueda, soloPorVencer],
    queryFn: () => {
      const p = new URLSearchParams();
      if (busqueda) p.set('search', busqueda);
      if (soloPorVencer) p.set('estado', 'por-vencer');
      const qs = p.toString();
      return platformApi.get<TenantRow[]>(`/platform/tenants${qs ? `?${qs}` : ''}`);
    },
  });

  const visibles = (tenants ?? []).filter((t) => {
    if (filtro === 'active') return t.status === 'active';
    if (filtro === 'trial') return t.status === 'trial';
    if (filtro === 'problema')
      return !t.status || ['trial_expired', 'past_due', 'suspended', 'cancelled'].includes(t.status);
    return true;
  });

  const { data: planes } = useQuery({
    queryKey: ['plans'],
    queryFn: () => platformApi.get<PlanInfo[]>('/plans'),
    staleTime: 60 * 60_000,
  });

  return (
    <div className="min-h-full bg-bg">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-theme focus:bg-surface focus:px-3 focus:py-2">Saltar al contenido</a>
      {/*
        En móvil la cabecera se apila, y no por gusto.

        En una fila, los tres botones más la identidad del operador sumaban 99 px más que
        la pantalla de un teléfono: "Salir" quedaba entero fuera, sin forma de llegar a él
        —era la única pantalla del producto con desborde horizontal—. `flex-wrap` con los
        botones a la derecha resuelve el caso sin cambiar nada en escritorio.
      */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-fg text-bg">
            <ShieldCheck size={18} />
          </div>
          <div className="min-w-0">
            <h1 className="text-[15px] font-bold tracking-[-0.02em]">Plataforma</h1>
            {/* El correo se recorta en vez de empujar: es identificación, no acción. */}
            <div className="truncate text-[12px] text-muted">
              {admin?.email}
              {admin?.isOwner && ' · principal'}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={logout} className="h-9 px-3 text-[13px]">
            <LogOut size={15} /> Salir
          </Button>
        </div>
      </header>

      <nav aria-label="Secciones" className="flex gap-1 overflow-x-auto border-b border-border bg-surface px-4">
        {pestanas.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setPestana(p.id);
              if (negocioId) navigate('/plataforma');
            }}
            aria-current={!negocioId && pestana === p.id ? 'page' : undefined}
            className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13px] font-semibold ${
              !negocioId && pestana === p.id ? 'border-primary text-fg' : 'border-transparent text-muted hover:text-fg'
            }`}
          >
            <p.icon size={15} /> {p.label}
          </button>
        ))}
      </nav>

      <main id="contenido">
      {!negocioId && pestana === 'operadores' && (
        <div className="p-4">
          <OperadoresModal onClose={irANegocios} />
        </div>
      )}
      {!negocioId && pestana === 'planes' && (
        <div className="p-4">
          <PlanesModal onClose={irANegocios} />
        </div>
      )}
      {!negocioId && pestana === 'cuenta' && (
        <div className="p-4">
          <MiCuentaModal onClose={irANegocios} />
        </div>
      )}

      {!negocioId && pestana === 'negocios' && (
      <div className="flex flex-col gap-4 p-4">
        {metrics && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Tile i={0} tono="success" icon={TrendingUp} label="MRR" value={`Bs. ${metrics.mrr}`} hint="suscripciones al día" />
            <Tile
              i={1}
              tono="warning"
              icon={AlertTriangle}
              label="En riesgo"
              value={`Bs. ${metrics.mrrEnRiesgo}`}
              hint="morosas, aún operando"
            />
            <Tile
              i={2}
              tono="primary"
              icon={Building2}
              label="Negocios"
              value={String(metrics.totalNegocios)}
              hint={resumenEstados(metrics.porEstado)}
            />
            <Tile
              i={3}
              tono="info"
              icon={Users}
              label="Este mes"
              value={`+${metrics.altasDelMes} / −${metrics.bajasDelMes}`}
              hint="altas y bajas"
            />
            <Tile
              i={4}
              tono="danger"
              icon={CalendarClock}
              label="Por vencer"
              value={String(metrics.porVencer + metrics.enGracia + metrics.soloLectura)}
              hint={`${metrics.porVencer} a ≤15 días · ${metrics.enGracia} en gracia · ${metrics.soloLectura} solo lectura`}
            />
          </div>
        )}

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o subdominio…"
            aria-label="Buscar negocio"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar negocios">
          {FILTROS.map((f) => {
            const activo = filtro === f.id;
            return (
              <button
                key={f.id}
                role="tab"
                aria-selected={activo}
                onClick={() => setFiltro(f.id)}
                className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-[transform,background-color,color,border-color] duration-150 active:scale-95 ${
                  activo
                    ? 'border-primary bg-primary text-primary-fg shadow-sm'
                    : 'border-field bg-surface text-muted hover:border-primary/40 hover:text-fg'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {isLoading && <div className="p-4 text-muted">Cargando…</div>}
        {visibles.length === 0 && !isLoading && (
          <div className="rounded-theme border border-dashed border-border p-8 text-center text-muted">
            No hay negocios que coincidan.
          </div>
        )}
        <div key={filtro + busqueda} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map((t, i) => (
            <NegocioCard key={t.id} t={t} i={i} onAbrir={() => navigate(`/plataforma/negocios/${t.id}`)} />
          ))}
        </div>
      </div>
      )}

      {negocioId && (
        <NegocioPagina
          id={negocioId}
          planes={planes ?? []}
          onVolver={() => navigate('/plataforma')}
          onGuardado={() => {
            qc.invalidateQueries({ queryKey: ['platform'] });
          }}
        />
      )}
      </main>
    </div>
  );
}

/** Detalle de un negocio con sus acciones: cambiar plan, suspender, reactivar. */
function TenantModal({
  id,
  planes,
  onClose,
  onGuardado,
  pagina,
}: {
  id: string;
  planes: PlanInfo[];
  onClose: () => void;
  onGuardado: () => void;
  /** Se pinta como sección de una pantalla, no como hoja flotante. */
  pagina?: boolean;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['platform', 'tenant', id],
    queryFn: () => platformApi.get<TenantDetail>(`/platform/tenants/${id}`),
  });

  const [plan, setPlan] = useState<string>('');
  const [estado, setEstado] = useState<string>('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);

  // El estado efectivo `trial_expired` no se puede ELEGIR: se deduce de la fecha.
  // Ofrecerlo en el desplegable dejaría guardar un estado que el servidor no acepta.
  const estadosElegibles: SubscriptionStatus[] = [
    'trial',
    'active',
    'past_due',
    'suspended',
    'cancelled',
  ];

  const eliminar = useMutation({
    mutationFn: () =>
      platformApi.del<{ eliminado: boolean; copia: string; filas: number }>(
        `/platform/tenants/${id}`,
      ),
    onSuccess: (r) => {
      setConfirmandoBorrado(false);
      setBorrado(r.copia);
      onGuardado();
    },
    onError: (e: Error) => setError(e.message),
  });
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  /** Ruta de la copia, una vez eliminado: se enseña en un modal y se cierra al aceptar. */
  const [borrado, setBorrado] = useState<string | null>(null);

  const guardar = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      platformApi.patch(`/platform/tenants/${id}/subscription`, body),
    onSuccess: () => {
      onGuardado();
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  const sub = data?.subscription;
  const planActual = plan || sub?.planCode || '';
  const estadoActual = estado || (sub?.status === 'trial_expired' ? 'trial' : sub?.status) || '';

  /*
    Confirmar y avisar se pintan SOLOS, no apilados sobre la ficha: dos modales abiertos
    se pelean el foco y el Escape, y el de abajo seguiría atrapando el tabulador.
  */
  if (borrado) {
    return (
      <AvisoModal
        titulo="Negocio eliminado"
        onCerrar={() => {
          setBorrado(null);
          onClose();
        }}
      >
        <p>Se eliminó «{data?.business.name}» con todos sus datos.</p>
        <p className="mt-2">Copia de seguridad guardada en:</p>
        <code className="mt-1 block break-all rounded bg-surface/60 px-2 py-1 text-[12px]">
          {borrado}
        </code>
      </AvisoModal>
    );
  }
  if (confirmandoBorrado) {
    return (
      <ConfirmarModal
        titulo="Eliminar negocio"
        tono="peligro"
        confirmar="Eliminar con copia"
        pendiente={eliminar.isPending}
        textoPendiente="Respaldando y eliminando…"
        error={error}
        mensaje={
          <>
            <p className="font-semibold">¿Eliminar «{data?.business.name}» y todos sus datos?</p>
            <p className="mt-1">
              Antes se guarda una copia de seguridad. Después no se puede deshacer desde el panel.
            </p>
          </>
        }
        onConfirmar={() => {
          setError(null);
          eliminar.mutate();
        }}
        onCancelar={() => setConfirmandoBorrado(false)}
      />
    );
  }

  return (
    <Modal
      open
      inline={pagina}
      onClose={onClose}
      title={pagina ? 'Datos, plan y usuarios' : (data?.business.name ?? 'Negocio')}
    >
      {isLoading && <div className="text-muted">Cargando…</div>}
      {data && (
        <div className="flex flex-col gap-4">
          <div className={`flex items-center justify-between ${pagina ? 'hidden' : ''}`}>
            <span className="text-[13px] text-muted">{data.business.slug ?? 'sin subdominio'}</span>
            <div className="flex items-center gap-2">
              {data.periodo ? <PeriodoBadge periodo={data.periodo} /> : <VenceBadge vence={data.vence} />}
              <EstadoBadge status={sub?.status ?? null} />
            </div>
          </div>

          {sub?.status === 'active' && sub.currentPeriodEnd && (
            <dl className="grid grid-cols-2 gap-2 rounded-theme border border-border p-3 text-[13px]">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.06em] text-muted">Compró el</dt>
                <dd className="font-semibold">{fecha(sub.cycleStartedAt)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.06em] text-muted">Termina el</dt>
                <dd
                  className={`font-semibold ${
                    data.periodo && data.periodo.fase !== 'al_dia' ? 'text-danger' : ''
                  }`}
                >
                  {fecha(sub.currentPeriodEnd)}
                  {data.periodo &&
                    (data.periodo.diasRestantes >= 0
                      ? ` (${data.periodo.diasRestantes} d)`
                      : ` (hace ${data.periodo.diasVencido} d)`)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.06em] text-muted">Contrató</dt>
                <dd className="font-semibold">
                  {sub.billingMonths} {sub.billingMonths === 1 ? 'mes' : 'meses'}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.06em] text-muted">Pagó</dt>
                <dd className="font-semibold">{sub.billedAmount ? `Bs. ${sub.billedAmount}` : '—'}</dd>
              </div>
            </dl>
          )}

          {data.vence && sub?.status !== 'active' && (
            <div className="text-[13px] text-muted">
              {data.vence.concepto === 'prueba' ? 'La prueba termina' : 'El periodo termina'} el{' '}
              {new Date(data.vence.fecha).toLocaleDateString('es-BO', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </div>
          )}

          <div className={`grid grid-cols-2 gap-2 text-[13px] ${pagina ? 'hidden' : ''}`}>
            <Dato label="Usuarios" valor={data.usage.users} />
            <Dato label="Sucursales" valor={data.usage.locations} />
            <Dato label="Productos" valor={data.usage.products} />
            <Dato label="Ventas" valor={data.usage.sales} />
          </div>
          <div className={`text-[13px] text-muted ${pagina ? 'hidden' : ''}`}>
            Última venta:{' '}
            {data.usage.lastSaleAt
              ? new Date(data.usage.lastSaleAt).toLocaleDateString('es-BO')
              : 'nunca'}
          </div>

          <DatosDelNegocio
            id={id}
            nombre={data.business.name}
            slug={data.business.slug}
            onGuardado={onGuardado}
          />

          <UsuariosDelNegocio id={id} />

          {sub?.suspendedReason && (
            <div className="rounded-theme bg-danger-bg p-3 text-[13px] text-danger">
              Motivo de la suspensión: {sub.suspendedReason}
            </div>
          )}

          <div>
            <label className="mb-1 block text-[13px] font-semibold">Plan</label>
            <Select aria-label="Plan" value={planActual} onChange={(e) => setPlan(e.target.value)}>
              {/* Sólo cuando no hay plan: si lo hay, el desplegable ya viene con el
                  suyo puesto y una opción "sin cambios" sobra y confunde. */}
              {!sub && <option value="">— elegir plan —</option>}
              {planes.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name} · Bs. {importe(p.priceMonthly, 'anual')}/año
                </option>
              ))}
              {/* El plan interno no está en /plans, pero un negocio puede tenerlo. */}
              {sub && !planes.some((p) => p.code === sub.planCode) && (
                <option value={sub.planCode}>{sub.planCode} (interno)</option>
              )}
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-[13px] font-semibold">Estado</label>
            <Select aria-label="Estado" value={estadoActual} onChange={(e) => setEstado(e.target.value)}>
              {estadosElegibles.map((s) => (
                <option key={s} value={s}>
                  {ESTADO[s]?.label ?? s}
                </option>
              ))}
            </Select>
          </div>

          {estadoActual === 'suspended' && (
            <div>
              <label className="mb-1 block text-[13px] font-semibold">Motivo</label>
              <Input
                value={motivo || sub?.suspendedReason || ''}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Falta de pago de agosto"
              />
              <p className="mt-1 text-[12px] text-muted">
                Queda en la bitácora de la plataforma. El negocio no lo ve.
              </p>
            </div>
          )}

          {error && <p className="text-[13px] text-danger">{error}</p>}

          {(sub?.status === 'trial_expired' || sub?.status === 'cancelled') && (
            <div className="rounded-theme border border-danger/40 p-3 text-[13px]">
              <div className="font-semibold text-danger">Negocio expirado</div>
              <p className="mt-1 text-muted">
                Se puede eliminar. Antes se guarda una copia de seguridad de todos sus datos.
              </p>
              <Button
                variant="outline"
                className="mt-2 text-danger"
                disabled={eliminar.isPending}
                onClick={() => {
                  setError(null);
                  setConfirmandoBorrado(true);
                }}
              >
                {eliminar.isPending ? 'Respaldando y eliminando…' : 'Eliminar negocio (con copia)'}
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              {pagina ? 'Volver' : 'Cancelar'}
            </Button>
            <Button
              className="flex-1"
              disabled={guardar.isPending}
              onClick={() => {
                setError(null);
                const body: Record<string, unknown> = {};
                if (planActual && planActual !== sub?.planCode) body.planCode = planActual;
                if (estadoActual && estadoActual !== sub?.status) body.status = estadoActual;
                if (estadoActual === 'suspended') {
                  body.suspendedReason = motivo || sub?.suspendedReason || null;
                }
                if (Object.keys(body).length === 0) return onClose();
                guardar.mutate(body);
              }}
            >
              {guardar.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Dato({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="rounded-theme border border-border p-2">
      <div className="text-[11px] uppercase tracking-[0.06em] text-muted">{label}</div>
      <div className="text-base font-bold">{valor}</div>
    </div>
  );
}

/**
 * Renombrar el negocio y mudarlo de subdominio.
 *
 * Van juntos pero no pesan igual: el nombre es cosmético, el subdominio es la dirección
 * por la que el cliente entra cada mañana. Cambiarlo tumba la anterior en el acto, así
 * que el aviso está al lado del campo y no escondido en una confirmación.
 */
function DatosDelNegocio({
  id,
  nombre,
  slug,
  onGuardado,
}: {
  id: string;
  nombre: string;
  slug: string | null;
  onGuardado: () => void;
}) {
  const qc = useQueryClient();
  const [abierto, setAbierto] = useState(false);
  const [n, setN] = useState(nombre);
  const [s, setS] = useState(slug ?? '');
  const vd = useValidacion(
    {
      n: todas(requerido('El nombre'), largo(1, LIMITES.nombreMax)),
      s: (x: string) => {
        const t = x.trim().toLowerCase();
        if (t === '') return t === (slug ?? '') ? null : 'La dirección es obligatoria';
        const p = validarSlug(t);
        return p ? MENSAJE_SLUG[p] : null;
      },
    },
    { n, s },
  );
  const [error, setError] = useState<string | null>(null);
  const [nuevaUrl, setNuevaUrl] = useState<string | null>(null);

  const guardar = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      platformApi.patch<{ url: string | null }>(`/platform/tenants/${id}`, body),
    onSuccess: (res) => {
      setError(null);
      setNuevaUrl(s !== (slug ?? '') ? res.url : null);
      qc.invalidateQueries({ queryKey: ['platform', 'tenant', id] });
      onGuardado();
    },
    onError: (e: Error) => setError(e.message),
  });

  if (!abierto) {
    return (
      <Button variant="outline" className="h-9 text-[13px]" onClick={() => setAbierto(true)}>
        Editar nombre y subdominio
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-theme border border-border p-3">
      <Campo etiqueta="Nombre del negocio" error={vd.ver('n')}>
        <Input value={n} onBlur={() => vd.tocar('n')} onChange={(e) => setN(e.target.value)} />
      </Campo>
      <Campo
        etiqueta="Subdominio"
        ayuda="Si lo cambias, la dirección actual deja de funcionar de inmediato. Avísale al cliente antes."
        error={vd.ver('s')}
      >
        <Input
          value={s}
          onBlur={() => vd.tocar('s')}
          onChange={(e) => setS(e.target.value.toLowerCase())}
          placeholder="mi-negocio"
        />
      </Campo>
      {error && <p className="text-[13px] text-danger">{error}</p>}
      {nuevaUrl && <p className="text-[13px] text-success">Nueva dirección: {nuevaUrl}</p>}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => setAbierto(false)}>
          Cerrar
        </Button>
        <Button
          className="flex-1"
          disabled={guardar.isPending}
          onClick={() => {
            if (!vd.intentar()) return;
            const body: Record<string, unknown> = {};
            if (n !== nombre) body.name = n;
            if (s !== (slug ?? '')) body.slug = s;
            if (!Object.keys(body).length) return setError('No cambiaste nada.');
            guardar.mutate(body);
          }}
        >
          {guardar.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </div>
  );
}

/**
 * Los usuarios del negocio, con el rescate de acceso.
 *
 * Es la pantalla de la llamada de soporte: "no puedo entrar". Primero se le dice cuál
 * era su usuario — la mitad de las veces el problema es ése — y sólo si hace falta se
 * le genera una contraseña.
 */
function UsuariosDelNegocio({ id }: { id: string }) {
  const [abierto, setAbierto] = useState(false);
  const { data: usuarios, isLoading } = useQuery({
    queryKey: ['platform', 'tenant', id, 'users'],
    queryFn: () => platformApi.get<TenantUser[]>(`/platform/tenants/${id}/users`),
    enabled: abierto,
  });

  if (!abierto) {
    return (
      <Button variant="outline" className="h-9 text-[13px]" onClick={() => setAbierto(true)}>
        <Users size={15} /> Ver usuarios y dar acceso
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-theme border border-border p-3">
      <div className="text-[13px] font-semibold">Usuarios del negocio</div>
      {isLoading && <div className="text-[13px] text-muted">Cargando…</div>}
      <ul className="divide-y divide-border">
        {usuarios?.map((u) => (
          <li key={u.id} className="py-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-semibold">{u.username}</span>
                  <Badge tone={u.role === 'admin' ? 'info' : 'neutral'}>
                    {u.role === 'admin' ? 'Admin' : 'Vendedor'}
                  </Badge>
                  {!u.isActive && <Badge tone="danger">Inactivo</Badge>}
                </div>
                <div className="truncate text-[12px] text-muted">
                  {u.name}
                  {u.locationName ? ` · ${u.locationName}` : ''}
                </div>
                <div className="truncate text-[12px] text-muted">
                  {u.email ?? 'sin correo'}
                  {u.email && !u.emailVerifiedAt && ' (sin verificar)'}
                </div>
              </div>
              <RescateAcceso tenantId={id} userId={u.id} />
            </div>
          </li>
        ))}
      </ul>
      <p className="text-[12px] text-muted">
        Un usuario sin correo verificado no puede recuperar su contraseña solo: es el caso en el que
        hace falta darle una desde aquí.
      </p>
    </div>
  );
}

/**
 * Genera una contraseña temporal y la enseña UNA vez.
 *
 * No se puede volver a consultar: en la base sólo queda el hash, igual que con
 * cualquier otra contraseña. Si se cierra el panel sin copiarla, se genera otra.
 */
function RescateAcceso({ tenantId, userId }: { tenantId: string; userId: string }) {
  const [resultado, setResultado] = useState<{
    tempPassword: string;
    username: string;
    correoEnviado: boolean;
    email: string | null;
  } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generar = useMutation({
    mutationFn: () =>
      platformApi.post<{
        tempPassword: string;
        username: string;
        correoEnviado: boolean;
        email: string | null;
      }>(`/platform/tenants/${tenantId}/users/${userId}/password`),
    onSuccess: (r) => {
      setError(null);
      setResultado(r);
    },
    onError: (e: Error) => setError(e.message),
  });

  if (resultado) {
    return (
      <div className="w-44 shrink-0 rounded-theme bg-success-bg p-2">
        <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-success">
          Contraseña temporal
        </div>
        <div className="mt-1 select-all font-mono text-[13px] font-bold">
          {resultado.tempPassword}
        </div>
        <Button
          variant="ghost"
          className="mt-1 h-7 px-1 text-[11px]"
          onClick={() => {
            navigator.clipboard?.writeText(resultado.tempPassword);
            setCopiado(true);
          }}
        >
          <Copy size={11} /> {copiado ? 'Copiada' : 'Copiar'}
        </Button>
        <p className="mt-1 text-[11px] text-muted">
          {resultado.correoEnviado
            ? `Enviada también a ${resultado.email}.`
            : 'No tiene correo: dísela tú.'}{' '}
          No se puede volver a ver.
        </p>
      </div>
    );
  }

  return (
    <div className="shrink-0 text-right">
      <Button
        variant="outline"
        className="h-8 px-2 text-[12px]"
        disabled={generar.isPending}
        onClick={() => generar.mutate()}
      >
        <KeyRound size={12} /> {generar.isPending ? 'Generando…' : 'Clave temporal'}
      </Button>
      {error && <p className="mt-1 text-[11px] text-danger">{error}</p>}
    </div>
  );
}


const MOV: Record<Movimiento['tipo'], { etiqueta: string; tono: Tono; icon: typeof History }> = {
  venta: { etiqueta: 'Venta', tono: 'success', icon: ReceiptText },
  anulacion: { etiqueta: 'Anulación', tono: 'danger', icon: ReceiptText },
  accion: { etiqueta: 'Actividad', tono: 'info', icon: History },
};

/** URL pública del negocio a partir de la del panel (`admin.x.com` → `slug.x.com`). */
function urlDelNegocio(slug: string): string {
  const { protocol, hostname, port } = window.location;
  const base = hostname.endsWith('localhost')
    ? 'localhost'
    : hostname.split('.').slice(1).join('.') || hostname;
  return `${protocol}//${slug}.${base}${port ? `:${port}` : ''}`;
}

/**
 * Pantalla propia de un negocio: resumen, últimos 5 movimientos y, debajo, todo lo que se
 * puede hacer con él (editar, ver usuarios y restablecer claves, plan, estado, eliminar).
 */
function NegocioPagina({
  id,
  planes,
  onVolver,
  onGuardado,
}: {
  id: string;
  planes: PlanInfo[];
  onVolver: () => void;
  onGuardado: () => void;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['platform', 'tenant', id],
    queryFn: () => platformApi.get<TenantDetail>(`/platform/tenants/${id}`),
  });
  const sub = data?.subscription;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <button
        onClick={onVolver}
        className="inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft size={15} /> Volver a negocios
      </button>

      {isLoading && <div className="text-muted">Cargando…</div>}
      {error && <div className="text-danger">No se pudo cargar el negocio.</div>}

      {data && (
        <>
          <div
            className="flex flex-wrap items-center gap-3 rounded-theme border border-border bg-surface p-4 motion-safe:animate-rise"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-track text-lg font-bold">
              {data.business.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-bold tracking-[-0.02em]">{data.business.name}</h2>
              <div className="text-[13px] text-muted">
                {data.business.slug ?? 'sin subdominio'} · cliente desde {fecha(data.business.createdAt)}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {data.periodo ? <PeriodoBadge periodo={data.periodo} /> : <VenceBadge vence={data.vence} />}
              <EstadoBadge status={sub?.status ?? null} />
              {data.business.slug && (
                <a
                  href={urlDelNegocio(data.business.slug)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center gap-1 rounded-theme border border-field bg-surface px-2.5 text-[12px] font-semibold transition-colors hover:bg-muted/10"
                >
                  <ExternalLink size={13} /> Abrir negocio
                </a>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ['Usuarios', data.usage.users, 'info'],
                ['Sucursales', data.usage.locations, 'primary'],
                ['Productos', data.usage.products, 'warning'],
                ['Ventas', data.usage.sales, 'success'],
              ] as const
            ).map(([label, valor, t], i) => (
              <TarjetaTono key={label} tono={t} i={i + 1} className="p-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.09em] text-muted">{label}</div>
                <div className="text-2xl font-bold tracking-[-0.02em]">{valor}</div>
              </TarjetaTono>
            ))}
          </div>

          <TarjetaTono tono="info" i={5} className="p-4">
            <div className="mb-3 flex items-center gap-2 text-[13px] font-bold">
              <History size={15} /> Últimos 5 movimientos
              <span className="ml-auto text-[12px] font-normal text-muted">
                Última venta:{' '}
                {data.usage.lastSaleAt ? new Date(data.usage.lastSaleAt).toLocaleDateString('es-BO') : 'nunca'}
              </span>
            </div>
            {data.usage.movimientos.length === 0 ? (
              <p className="text-[13px] text-muted">Todavía no hay movimientos.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.usage.movimientos.map((m, i) => {
                  const d = MOV[m.tipo];
                  return (
                    <li
                      key={i}
                      style={retraso(i + 6)}
                      className="flex items-center gap-3 rounded-theme px-1 py-2 motion-safe:animate-rise"
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-track ${d.tono === 'danger' ? 'text-danger' : 'text-muted'}`}>
                        <d.icon size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold">
                          {d.etiqueta} · {m.detalle}
                        </div>
                        <div className="text-[12px] text-muted">{m.usuario ?? 'Sistema'}</div>
                      </div>
                      <time className="shrink-0 text-right text-[12px] text-muted">
                        {new Date(m.fecha).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })}
                        <br />
                        {new Date(m.fecha).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                      </time>
                    </li>
                  );
                })}
              </ul>
            )}
          </TarjetaTono>
        </>
      )}

      <TenantModal pagina id={id} planes={planes} onClose={onVolver} onGuardado={onGuardado} />
    </div>
  );
}
