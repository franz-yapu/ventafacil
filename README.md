# VentaFácil — POS multi-sucursal, offline-first y multi-negocio

Sistema de **punto de venta para negocios medianos** (llantas, repuestos, comercios en general) pensado
para sitios con **internet lento o intermitente**: el vendedor sigue vendiendo sin conexión y todo se
sincroniza cuando vuelve la red. Cada negocio tiene su propia marca, usuarios, sucursales y datos
aislados de los demás, sobre una sola plataforma (SaaS).

> Estado: **beta**, en operación con un cliente. Rama de trabajo: `feat/saas`.

## Qué resuelve

- **Vender sin depender de la red.** El punto de venta es una PWA que guarda las ventas en el
  dispositivo (IndexedDB) con identificadores generados en el cliente y las sincroniza después, sin
  duplicados.
- **Varias ubicaciones, un solo dueño.** Inventario, caja y reportes por sucursal y comparativos entre
  ellas.
- **Cada cliente con su cara.** Colores, logo y textos configurables por negocio sin tocar código
  (*white-label*).
- **Control y trazabilidad.** Bitácora de auditoría (ventas, anulaciones, cambios de precio), caja por
  persona y roles de administrador y vendedor.
- **Recibos.** Impresión térmica (58/80 mm) y PDF.

## Funcionalidades

| Área | Detalle |
| --- | --- |
| Ventas (POS) | Venta rápida, offline, anulaciones, recibos con correlativo por negocio |
| Inventario | Productos con atributos por rubro (JSONB), stock por ubicación |
| Caja | Apertura/cierre y movimientos por persona |
| Clientes y reportes | Reportes por ubicación, exportación, panel de indicadores configurable |
| Multi-negocio | Registro self-service, identificación del negocio por subdominio, planes y suscripción con límites por plan |
| Plataforma | Panel de operador para administrar la cartera de negocios (token y secreto distintos al de los negocios) |
| Seguridad | JWT de acceso y refresco, límites de intentos y de tasa, **Row-Level Security** en PostgreSQL |
| Operación | Health check real, avisos, CI en GitHub Actions, staging local en Docker |

## Arquitectura

```
apps/
  web/        PWA React 18 + Vite + Tailwind + TanStack Query + Dexie (offline y cola de sincronización)
  api/        API Fastify 5 con módulos por dominio (ventas, inventario, caja, reportes, plataforma…)
packages/
  db/         Esquema Drizzle ORM, migraciones y seed
  shared/     Esquemas Zod y constantes compartidos entre web y API
```

Decisiones que vale la pena revisar (más en [`DECISIONS.md`](DECISIONS.md)):

- **Aislamiento por RLS.** La API se conecta con un rol sin privilegios para que PostgreSQL aplique las
  políticas por negocio; no las ignora como haría con un superusuario o con el dueño de las tablas.
- **Dos mundos de tokens**, firmados con secretos distintos: negocio y plataforma.
- **Los tipos se comparten**: el mismo esquema Zod valida en el navegador y en el servidor.
- **Las respuestas siempre tienen la misma forma** (`{ data, error }`) y los errores se escriben para
  quien los lee, no para quien programa. Referencia completa en [`docs/API.md`](docs/API.md), generada
  desde las rutas reales.
- **Las pruebas usan un PostgreSQL real**, no mocks: RLS, índices parciales y transacciones no se
  pueden simular.

## Stack

TypeScript · React 18 · Vite · Tailwind · TanStack Query · Dexie · vite-plugin-pwa ·
Fastify 5 · Drizzle ORM · PostgreSQL 16 · Zod · Vitest · pnpm + Turborepo · Docker · GitHub Actions

## Puesta en marcha

Requisitos: Node 22+, pnpm 11+, Docker.

```bash
pnpm install
cp .env.example .env            # trae valores de desarrollo
pnpm docker:up                  # PostgreSQL 16 en el puerto 5434

set -a && . ./.env && set +a
pnpm db:migrate
pnpm db:seed                    # negocio de demostración

pnpm --filter @ventafacil/api dev   # http://localhost:3000
pnpm --filter @ventafacil/web dev   # http://localhost:5173
```

Usuarios de la demostración (solo datos de ejemplo del seed): `admin / admin123` y
`vendedor / vende123`.

### Pruebas

```bash
pnpm typecheck
pnpm test        # necesita PostgreSQL (el docker de arriba sirve)
```

### Staging local con RLS

Un stack Docker que imita al servidor para ensayar despliegues, RLS y restauración de copias sin tocar
producción. Copia `.env.staging.example` a `.env.staging` y sigue [`STAGING.md`](STAGING.md).

## Comandos útiles

- `pnpm db:studio` — explorar la base con Drizzle Studio.
- `pnpm new-tenant "<Negocio>" <adminUser> <adminPass>` — crear un negocio nuevo.
- `pnpm db:generate` — generar migración tras cambiar el esquema.

## Más documentación

[`PLAN_PROYECTO_POS.md`](PLAN_PROYECTO_POS.md) (plan maestro) · [`DECISIONS.md`](DECISIONS.md) ·
[`CHANGELOG.md`](CHANGELOG.md) · [`docs/API.md`](docs/API.md)

## Licencia

Todos los derechos reservados © Franz Yapu. El código se publica para que pueda revisarse;
no se concede licencia de uso o redistribución sin autorización escrita.
