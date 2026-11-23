import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { History, Package, Pencil, Plus, RotateCcw, Search, Trash2, Archive } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmarModal } from '@/components/ConfirmarModal';
import { Exportar } from '@/components/Exportar';
import { FotoDeProducto, Miniatura } from '@/features/products/FotoDeProducto';
import { ImportarProductos } from '@/features/products/ImportarProductos';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState, Page, PageHeader, SkeletonRows } from '@/components/ui/page';
import { Campo, Seccion } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/features/auth/AuthProvider';
import { HistoryModal } from '@/features/inventory/HistoryModal';
import { LIMITES } from '@ventafacil/shared';
import { api, ApiError } from '@/lib/api';
import { entero, importe, largo, requerido, todas, validar } from '@/lib/validar';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ImagenLista } from '@/lib/imagen';
import type { Location, Product } from '@/lib/types';
import { useInfiniteList } from '@/lib/useInfinite';
import { useBusiness } from '@/theme/ThemeProvider';

export function ProductsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const business = useBusiness();
  const [search, setSearch] = useState('');
  const [locationId, setLocationId] = useState('');
  const [estado, setEstado] = useState<'activos' | 'baja'>('activos');
  const [aviso, setAviso] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | null | 'new'>(null);
  const [history, setHistory] = useState<{ id: string; name: string } | null>(null);
  const isAdmin = user?.role === 'admin';
  const isCentral = !!user?.isCentral;
  /**
   * Quién puede dar de alta productos: cualquier ADMIN, no cualquiera de la central.
   *
   * La pantalla lo condicionaba a `isCentral`, que es dónde está la persona, no qué
   * puede hacer. Salían las dos equivocaciones opuestas a la vez: un VENDEDOR de la
   * sucursal central veía el botón "Nuevo" —y al guardar se llevaba un 403 del
   * servidor, que sí miraba el rol—, y un encargado de sucursal, que sí tiene permiso,
   * no lo veía.
   *
   * Es el mismo error que ya se corrigió en el API hace dos rondas: `isCentral` usado
   * como si fuera un permiso. Aquí quedaba el último resto, en el dibujo.
   */
  const puedeGestionarCatalogo = isAdmin;

  // Sólo la central filtra por ubicación; la sucursal siempre ve la suya.
  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get<Location[]>('/locations'),
    enabled: isCentral,
  });

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (locationId) params.set('locationId', locationId);
  if (estado === 'baja') params.set('estado', 'baja');
  const qs = params.toString();
  const { items, total, hasNextPage, fetchNextPage, isFetchingNextPage, isLoading } =
    useInfiniteList<Product>(
      ['products', 'admin', search, locationId, estado],
      `/products${qs ? `?${qs}` : ''}`,
    );
  const reload = () => {
    qc.invalidateQueries({ queryKey: ['products'] });
    qc.invalidateQueries({ queryKey: ['inventory'] });
  };

  /** Baja, reactivación o eliminación de un producto: abre el modal de confirmación. */
  const [pedido, setPedido] = useState<{
    p: Product;
    que: 'baja' | 'reactivar' | 'eliminar';
    /** Por qué no se pudo eliminar, cuando se ofrece la baja como alternativa. */
    motivo?: string;
  } | null>(null);
  const [gestionando, setGestionando] = useState(false);
  const [errorGestion, setErrorGestion] = useState<string | null>(null);

  function gestionar(p: Product, que: 'baja' | 'reactivar' | 'eliminar') {
    setAviso(null);
    setErrorGestion(null);
    setPedido({ p, que });
  }

  async function confirmarGestion() {
    if (!pedido) return;
    const { p, que } = pedido;
    setGestionando(true);
    setErrorGestion(null);
    try {
      if (que === 'eliminar') await api.del(`/products/${p.id}`);
      else await api.patch(`/products/${p.id}`, { isActive: que === 'reactivar' });
      reload();
      setPedido(null);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      // No se pudo eliminar (tiene ventas o stock): se ofrece la baja en el mismo modal.
      if (que === 'eliminar' && p.isActive) setPedido({ p, que: 'baja', motivo: msg });
      else setErrorGestion(msg);
    } finally {
      setGestionando(false);
    }
  }

  // Vacío por filtro y vacío de verdad no son lo mismo: uno se arregla borrando la
  // búsqueda y el otro dando de alta un producto. Decir lo mismo en los dos casos deja
  // a la persona buscando un botón que no le sirve.
  const filtrando = !!search || !!locationId || estado === 'baja';
  const vacio = !isLoading && items.length === 0;

  return (
    <Page>
      <PageHeader
        titulo="Productos"
        descripcion={
          puedeGestionarCatalogo
            ? 'El catálogo del negocio. El stock que ves es el de tu sucursal.'
            : 'El catálogo del negocio. Los da de alta un administrador.'
        }
        acciones={
          <>
            {/*
              `search` sí, `locationId` no: en esta pantalla la ubicación cambia de qué
              sucursal es el STOCK que se enseña, no qué productos salen —el catálogo es
              del negocio— y la exportación no lleva columna de stock.
            */}
            <Exportar seccion="productos" filtros={{ search }} />
            {puedeGestionarCatalogo && (
              <>
                <ImportarProductos onDone={reload} />
                <Button data-tour="productos-nuevo" onClick={() => setEditing('new')}>
                  <Plus size={18} /> Nuevo
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
          <Input
            className="pl-10"
            placeholder="Buscar por nombre o SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {isAdmin && (
          <Select
            filter
            className="max-w-[180px]"
            aria-label="Estado"
            value={estado}
            onChange={(e) => setEstado(e.target.value as 'activos' | 'baja')}
          >
            <option value="activos">Activos</option>
            <option value="baja">Dados de baja</option>
          </Select>
        )}
        {isCentral && (
          <Select
            filter
            className="max-w-xs"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
          >
            <option value="">Todas las ubicaciones</option>
            {locations?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        )}
      </div>

      {aviso && (
        <p role="alert" className="rounded-theme border border-danger/40 bg-danger/[0.05] p-3 text-sm text-danger">
          {aviso}
        </p>
      )}

      {isLoading && (
        <Card>
          <CardContent className="p-0">
            <SkeletonRows filas={6} />
          </CardContent>
        </Card>
      )}

      {vacio && (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icono={Package}
              titulo={filtrando ? 'Ningún producto coincide' : 'Aún no hay productos'}
              descripcion={
                filtrando
                  ? 'Prueba con otro nombre o SKU, o quita el filtro de ubicación.'
                  : puedeGestionarCatalogo
                    ? 'Da de alta el primero, o impórtalos de una vez desde un CSV.'
                    : 'Los productos los da de alta un administrador.'
              }
              accion={
                !filtrando &&
                puedeGestionarCatalogo && (
                  <Button onClick={() => setEditing('new')}>
                    <Plus size={18} /> Nuevo producto
                  </Button>
                )
              }
            />
          </CardContent>
        </Card>
      )}

      <Card className={cn('hidden', !isLoading && items.length > 0 && 'md:block')}>
        <CardContent className="overflow-x-auto p-0">
          <table className="ds-table w-full">
            <thead className="text-left text-muted">
              <tr>
                <th className="p-3">SKU</th>
                <th className="p-3">Nombre</th>
                <th className="p-3">Ubicación</th>
                <th className="p-3 text-right">Precio</th>
                {isAdmin && <th className="p-3 text-right">Costo unit.</th>}
                {isAdmin && <th className="p-3 text-right">Ganancia</th>}
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-mono text-xs">{p.sku}</td>
                  <td className="p-3">
                    <span className="flex items-center gap-2.5">
                      <Miniatura url={p.imageUrl} />
                      {p.name}
                    </span>
                  </td>
                  <td className="p-3 text-muted">{p.locationName ?? '—'}</td>
                  <td className="p-3 text-right font-medium">{money(p.price)}</td>
                  {isAdmin && (
                    <td className="p-3 text-right text-muted">{p.cost ? money(p.cost) : '—'}</td>
                  )}
                  {isAdmin && (
                    <td className="p-3 text-right">
                      {p.cost ? (
                        <span className="text-success">
                          {money(Number(p.price) - Number(p.cost))}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  )}
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setHistory({ id: p.id, name: p.name })}
                        className="text-muted hover:text-primary"
                        title="Historial"
                        aria-label={`Historial de ${p.name}`}
                      >
                        <History size={16} />
                      </button>
                      {p.canManage && (
                        <button
                          onClick={() => setEditing(p)}
                          className="text-muted hover:text-primary"
                          title="Editar"
                          aria-label={`Editar ${p.name}`}
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      {p.canManage && isAdmin && (
                        <>
                          <button
                            onClick={() => gestionar(p, p.isActive ? 'baja' : 'reactivar')}
                            className="text-muted hover:text-primary"
                            title={p.isActive ? 'Dar de baja' : 'Reactivar'}
                            aria-label={`${p.isActive ? 'Dar de baja' : 'Reactivar'} ${p.name}`}
                          >
                            {p.isActive ? <Archive size={16} /> : <RotateCcw size={16} />}
                          </button>
                          <button
                            onClick={() => gestionar(p, 'eliminar')}
                            className="text-muted hover:text-danger"
                            title="Eliminar"
                            aria-label={`Eliminar ${p.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Móvil: tarjetas apiladas en vez de tabla con scroll. */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {items.map((p) => (
          <div
            key={p.id}
            className="rounded-[14px] border border-border bg-surface p-[15px] shadow-card"
          >
            <div className="flex items-start gap-3">
              <Miniatura url={p.imageUrl} className="h-12 w-12" icono={16} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[14px] font-semibold">{p.name}</span>
                  <span className="shrink-0 text-[18px] font-extrabold tracking-[-0.02em]">
                    {money(p.price)}
                  </span>
                </div>
                <div className="mt-1 text-[12px] leading-[1.5] text-muted">
                  <span className="font-mono">{p.sku}</span> · {p.locationName ?? '—'}
                </div>
              </div>
            </div>
            {isAdmin && p.cost && (
              <div className="mt-1 text-[12px] text-muted">
                Costo {money(p.cost)} · Ganancia{' '}
                <span className="font-semibold text-success">
                  {money(Number(p.price) - Number(p.cost))}
                </span>
              </div>
            )}
            <div className="mt-3.5 flex gap-2">
              <button
                onClick={() => setHistory({ id: p.id, name: p.name })}
                className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[11px] border border-field bg-surface text-[13px] font-semibold"
              >
                <History size={16} /> Historial
              </button>
              {p.canManage && (
                <button
                  onClick={() => setEditing(p)}
                  className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[11px] border border-field bg-surface text-[13px] font-semibold"
                >
                  <Pencil size={16} /> Editar
                </button>
              )}
              {p.canManage && isAdmin && (
                <button
                  onClick={() => gestionar(p, p.isActive ? 'baja' : 'reactivar')}
                  className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[11px] border border-field bg-surface text-[13px] font-semibold"
                >
                  {p.isActive ? <Archive size={16} /> : <RotateCcw size={16} />}
                  {p.isActive ? 'Baja' : 'Reactivar'}
                </button>
              )}
              {p.canManage && isAdmin && (
                <button
                  onClick={() => gestionar(p, 'eliminar')}
                  aria-label={`Eliminar ${p.name}`}
                  className="flex h-11 w-11 items-center justify-center rounded-[11px] border border-field bg-surface text-danger"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {hasNextPage && (
        <Button
          variant="outline"
          className="self-center"
          disabled={isFetchingNextPage}
          onClick={() => fetchNextPage()}
        >
          {isFetchingNextPage ? 'Cargando…' : `Cargar más (${items.length}/${total})`}
        </Button>
      )}

      {editing && (
        <ProductForm
          product={editing === 'new' ? null : editing}
          schema={business?.productSchema ?? []}
          locations={locations ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            reload();
            setEditing(null);
          }}
        />
      )}
      {history && (
        <HistoryModal
          productId={history.id}
          title={`Historial · ${history.name}`}
          onClose={() => setHistory(null)}
        />
      )}
          {pedido && (
        <ConfirmarModal
          titulo={
            pedido.que === 'baja'
              ? 'Dar de baja el producto'
              : pedido.que === 'reactivar'
                ? 'Reactivar el producto'
                : 'Eliminar el producto'
          }
          tono={pedido.que === 'reactivar' ? 'normal' : 'peligro'}
          confirmar={
            pedido.que === 'baja' ? 'Dar de baja' : pedido.que === 'reactivar' ? 'Reactivar' : 'Eliminar'
          }
          pendiente={gestionando}
          error={errorGestion}
          mensaje={
            <>
              {pedido.motivo && <p className="mb-2 font-semibold">{pedido.motivo}</p>}
              {pedido.que === 'baja' && (
                <p>
                  {pedido.motivo ? '¿Darlo de baja ahora? ' : ''}
                  «{pedido.p.name}» deja de salir en ventas e inventario, pero conserva su
                  historial. Se puede reactivar.
                </p>
              )}
              {pedido.que === 'reactivar' && (
                <p>«{pedido.p.name}» volverá a salir en ventas e inventario.</p>
              )}
              {pedido.que === 'eliminar' && (
                <p>
                  ¿Eliminar «{pedido.p.name}» para siempre? Solo se puede si no tiene ventas ni
                  stock.
                </p>
              )}
            </>
          }
          onConfirmar={() => void confirmarGestion()}
          onCancelar={() => setPedido(null)}
        />
      )}
    </Page>
  );
}

// Importación CSV simple. Cabecera esperada: sku,name,price + columnas de atributos por rubro.
function ProductForm({
  product,
  schema,
  locations,
  onClose,
  onSaved,
}: {
  product: Product | null;
  schema: Array<{ key: string; label: string; type: string; required?: boolean }>;
  locations: Location[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !product;
  const [form, setForm] = useState({
    sku: product?.sku ?? '',
    name: product?.name ?? '',
    description: product?.description ?? '',
    price: product?.price ?? '',
    cost: product?.cost ?? '',
    costWholesale: product?.costWholesale ?? '',
    attributes: (product?.attributes ?? {}) as Record<string, unknown>,
    // Sólo al crear: la central decide sucursal dueña y stock inicial.
    locationId: locations[0]?.id ?? '',
    initialStock: '',
    minStock: '',
  });
  const [error, setError] = useState<string | null>(null);
  // Un campo muestra su error al salir de él, o todos al intentar guardar.
  const [tocados, setTocados] = useState<Set<string>>(new Set());
  const [intentado, setIntentado] = useState(false);
  const errores: Record<string, string | undefined> = {
    ...validar(
      {
        name: todas(requerido('El nombre'), largo(1, LIMITES.nombreMax)),
        description: largo(0, LIMITES.descripcionMax),
        price: todas(requerido('El precio de venta'), importe({ permiteCero: false })),
        cost: importe(),
        costWholesale: importe(),
        initialStock: entero(),
        minStock: entero(),
      },
      {
        name: form.name,
        description: form.description,
        price: form.price,
        cost: form.cost,
        costWholesale: form.costWholesale,
        initialStock: form.initialStock,
        minStock: form.minStock,
      },
    ),
  };
  for (const f of schema) {
    const v = String(form.attributes[f.key] ?? '');
    if (f.required && v.trim() === '') errores[`attr:${f.key}`] = `${f.label} es obligatorio`;
    else if (v.length > LIMITES.nombreMax) errores[`attr:${f.key}`] = `Máximo ${LIMITES.nombreMax} caracteres`;
  }
  const ver = (k: string) => (intentado || tocados.has(k) ? errores[k] : undefined);
  const tocar = (k: string) => setTocados((t) => new Set(t).add(k));
  const hayErrores = Object.keys(errores).length > 0;
  const [foto, setFoto] = useState<ImagenLista | null>(null);
  const [quitarFoto, setQuitarFoto] = useState(false);

  const margin = Number(form.price || 0) - Number(form.cost || 0);
  const marginPct = Number(form.price) > 0 ? (margin / Number(form.price)) * 100 : 0;

  /**
   * Lo que YA se creó en un intento anterior de este mismo formulario.
   *
   * Guardar son dos peticiones —el producto y su foto— y sólo la segunda puede fallar
   * dejando la primera hecha. Sin esta referencia, pulsar Guardar otra vez volvía a hacer
   * el POST: como el SKU se genera solo cuando se deja vacío, no hay ningún 409 que lo
   * detenga y la tienda acababa con **dos productos idénticos** —y dos filas de
   * inventario— contando los dos contra el cupo del plan. Con esto, el segundo intento
   * corrige el que ya existe en vez de crear otro.
   */
  const yaCreado = useRef<Product | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      const base = {
        // El SKU no se manda NUNCA desde aquí: lo pone el servidor al crear, y al editar
        // no se toca. El campo del formulario es de sólo lectura.
        name: form.name,
        description: form.description.trim(),
        price: form.price,
        cost: form.cost || null,
        costWholesale: form.costWholesale || null,
        attributes: form.attributes,
      };
      // Editando, o reintentando algo que ya se creó: en los dos casos se corrige, no se
      // crea. Va con los datos del formulario de AHORA, por si se cambió algo antes de
      // volver a pulsar Guardar.
      const existente = product ?? yaCreado.current;
      const guardado = existente
        ? await api.patch<Product>(`/products/${existente.id}`, base)
        : await api.post<Product>('/products', {
            ...base,
            locationId: form.locationId || undefined,
            initialStock: form.initialStock ? Number(form.initialStock) : 0,
            minStock: form.minStock ? Number(form.minStock) : null,
          });
      if (!product) yaCreado.current = guardado;

      /*
        La foto va DESPUÉS y en su propia petición, no dentro del formulario.

        Al crear no hay más remedio —el producto no tiene identificador hasta que existe—,
        y al editar se hace igual por coherencia. El orden importa: si la subida falla, el
        producto ya está guardado con todo lo demás, que es lo que costó escribir. Al revés,
        un fallo de red con la foto tiraría también el nombre y el precio.
      */
      if (foto) {
        try {
          await api.postBinary(`/products/${guardado.id}/image`, foto.blob);
        } catch (e) {
          /*
            Que el mensaje diga lo que de verdad pasó.

            Con «Error al guardar» a secas, quien lo lee entiende que no se guardó nada y
            vuelve a intentarlo creyendo que empieza de cero. El producto está guardado; lo
            único que falta es la foto.
          */
          const causa = e instanceof ApiError ? e.message : 'no se pudo subir';
          throw new Error(`El producto se guardó, pero la foto ${causa}. Vuelve a intentarlo.`);
        }
      } else if (quitarFoto && product?.imageUrl) {
        await api.del(`/products/${product.id}/image`);
      }
      return guardado;
    },
    onSuccess: onSaved,
    onError: (e) => setError(e instanceof ApiError ? e.message : (e as Error).message),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={product ? 'Editar producto' : 'Nuevo producto'}
      footer={
        <div className="flex flex-col gap-2">
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button
            onClick={() => {
              setIntentado(true);
              setError(null);
              if (hayErrores) {
                setError('Corrige los campos marcados en rojo.');
                setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0);
                return;
              }
              save.mutate();
            }}
            disabled={save.isPending}
          >
            {save.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <Seccion titulo="Producto">
          <Campo etiqueta="Nombre" ayuda="Como lo busca y lo reconoce quien vende." error={ver('name')}>
            <Input
              maxLength={LIMITES.nombreMax + 20}
              onBlur={() => tocar('name')}
              value={form.name}
              placeholder="Ej. Llanta 175/70R13"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Campo>
          {/* El SKU se MUESTRA, no se escribe: lo genera el sistema (correlativo por
              negocio). Escribible invitaba a duplicados y erratas que ya viajaron a recibos. */}
          <Campo
            etiqueta="Código (SKU)"
            ayuda={isNew ? 'Lo asigna el sistema al guardar.' : 'Lo asigna el sistema; no se edita.'}
          >
            <Input
              readOnly
              value={isNew ? '' : form.sku}
              placeholder={isNew ? 'Se genera solo al guardar' : undefined}
              className="text-muted"
            />
          </Campo>
          {isNew && (
            <Campo etiqueta="¿Dónde se guarda?" ayuda="La sucursal o central que recibe el stock inicial.">
              <Select
                value={form.locationId}
                onChange={(e) => setForm({ ...form, locationId: e.target.value })}
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                    {l.isCentral ? ' (Central)' : ''}
                  </option>
                ))}
              </Select>
            </Campo>
          )}
          <Campo etiqueta="Descripción" opcional ayuda="Talla, color, sabor, medida… lo que lo distingue de otro parecido." error={ver('description')}>
            <textarea
              rows={3}
              onBlur={() => tocar('description')}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="ds-field w-full resize-y rounded-theme border border-field bg-surface px-3 py-2 text-base aria-[invalid=true]:border-danger"
            />
          </Campo>
          <FotoDeProducto
            actual={product?.imageUrl}
            nueva={foto}
            onNueva={setFoto}
            quitar={quitarFoto}
            onQuitar={setQuitarFoto}
          />
        </Seccion>

        <Seccion titulo="Precios">
          <Campo etiqueta="Precio de venta" ayuda={`Lo que paga el cliente, en bolivianos (máx. ${LIMITES.importeMax}).`} error={ver('price')}>
            <Input
              onBlur={() => tocar('price')}
              inputMode="decimal"
              placeholder="0.00"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Costo unitario" opcional error={ver('cost')}>
              <Input
                onBlur={() => tocar('cost')}
                inputMode="decimal"
                placeholder="0.00"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
              />
            </Campo>
            <Campo etiqueta="Costo por mayor" opcional error={ver('costWholesale')}>
              <Input
                onBlur={() => tocar('costWholesale')}
                inputMode="decimal"
                placeholder="0.00"
                value={form.costWholesale}
                onChange={(e) => setForm({ ...form, costWholesale: e.target.value })}
              />
            </Campo>
          </div>
          {Number(form.cost) > 0 && (
            <div className="rounded-theme bg-muted/10 p-2.5 text-sm">
              Ganancia por unidad:{' '}
              <span className="font-semibold text-success">
                {money(margin)} ({marginPct.toFixed(0)}%)
              </span>
            </div>
          )}
        </Seccion>

        {isNew && (
          <Seccion titulo="Stock">
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Stock inicial" ayuda="Cuántas unidades hay hoy." error={ver('initialStock')}>
                <Input
                  onBlur={() => tocar('initialStock')}
                  inputMode="numeric"
                  placeholder="0"
                  value={form.initialStock}
                  onChange={(e) => setForm({ ...form, initialStock: e.target.value })}
                />
              </Campo>
              <Campo etiqueta="Stock mínimo" ayuda="Te avisamos al llegar a esta cantidad." error={ver('minStock')}>
                <Input
                  onBlur={() => tocar('minStock')}
                  inputMode="numeric"
                  placeholder="0"
                  value={form.minStock}
                  onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                />
              </Campo>
            </div>
          </Seccion>
        )}

        {schema.length > 0 && (
          <Seccion titulo="Detalles del rubro">
            {schema.map((f) => (
              <Campo key={f.key} etiqueta={f.label} opcional={!f.required} error={ver(`attr:${f.key}`)}>
                <Input
                  onBlur={() => tocar(`attr:${f.key}`)}
                  value={String(form.attributes[f.key] ?? '')}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      attributes: { ...form.attributes, [f.key]: e.target.value },
                    })
                  }
                />
              </Campo>
            ))}
          </Seccion>
        )}
      </div>
    </Modal>
  );
}
