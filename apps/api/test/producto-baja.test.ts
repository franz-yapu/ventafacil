import { db, schema } from '@ventafacil/db';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auth, createTenant, makeApp, resetDb, type Tenant } from './helpers.js';

/**
 * Baja, reactivación y eliminación de productos, y los límites de los campos.
 *
 * Lo que se fija: que un producto dado de baja desaparezca de las listas (productos e
 * inventario) sin perder historial, que se pueda reactivar, que sólo se pueda ELIMINAR si
 * no cuelga nada, y que el servidor rechace importes negativos o por encima del tope.
 */

let app: FastifyInstance;
let t: Tenant;

const crear = (over: Record<string, unknown> = {}) =>
  app.inject({
    method: 'POST',
    url: '/api/v1/products',
    headers: auth(t.adminToken),
    payload: { name: 'Producto de prueba', price: '10.00', locationId: t.locationId, ...over },
  });

const lista = async (q = '') =>
  (
    await app.inject({ method: 'GET', url: `/api/v1/products${q}`, headers: auth(t.adminToken) })
  ).json().data.items as { id: string; name: string }[];

beforeAll(async () => {
  app = await makeApp();
  await resetDb();
  t = await createTenant(app, 'baja-a');
});
afterAll(async () => app.close());

describe('límites de los campos', () => {
  it('rechaza precio negativo, con letras y por encima del tope', async () => {
    for (const price of ['-5', 'abc', '10000.00', '1.234']) {
      const res = await crear({ price });
      expect(res.statusCode, `price=${price}`).toBe(400);
    }
  });

  it('acepta el tope exacto y rechaza nombres vacíos o larguísimos', async () => {
    expect((await crear({ name: 'En el tope', price: '9999.99' })).statusCode).toBe(201);
    expect((await crear({ name: '   ' })).statusCode).toBe(400);
    expect((await crear({ name: 'x'.repeat(121) })).statusCode).toBe(400);
  });

  it('rechaza stock inicial negativo o desmesurado', async () => {
    expect((await crear({ name: 'Stock neg', initialStock: -1 })).statusCode).toBe(400);
    expect((await crear({ name: 'Stock enorme', initialStock: 10_000_000 })).statusCode).toBe(400);
  });
});

describe('baja y reactivación', () => {
  it('un producto de baja sale de la lista y del inventario, y vuelve al reactivarlo', async () => {
    const p = (await crear({ name: 'Mal escrito', initialStock: 3 })).json().data;
    expect((await lista()).some((x) => x.id === p.id)).toBe(true);

    const baja = await app.inject({
      method: 'PATCH',
      url: `/api/v1/products/${p.id}`,
      headers: auth(t.adminToken),
      payload: { isActive: false },
    });
    expect(baja.statusCode, baja.body).toBe(200);

    expect((await lista()).some((x) => x.id === p.id)).toBe(false);
    expect((await lista('?estado=baja')).some((x) => x.id === p.id)).toBe(true);
    const inv = await app.inject({ method: 'GET', url: '/api/v1/inventory', headers: auth(t.adminToken) });
    expect((inv.json().data as { productId: string }[]).some((r) => r.productId === p.id)).toBe(false);

    const alta = await app.inject({
      method: 'PATCH',
      url: `/api/v1/products/${p.id}`,
      headers: auth(t.adminToken),
      payload: { isActive: true },
    });
    expect(alta.statusCode).toBe(200);
    expect((await lista()).some((x) => x.id === p.id)).toBe(true);

    const acciones = await db.select().from(schema.auditLog).where(eq(schema.auditLog.entityId, p.id));
    expect(acciones.map((a) => a.action)).toEqual(expect.arrayContaining(['deactivate', 'reactivate']));
  });
});

describe('eliminar', () => {
  const borrar = (id: string) =>
    app.inject({ method: 'DELETE', url: `/api/v1/products/${id}`, headers: auth(t.adminToken) });

  it('borra un producto sin ventas ni stock', async () => {
    const p = (await crear({ name: 'Duplicado' })).json().data;
    const res = await borrar(p.id);
    expect(res.statusCode, res.body).toBe(200);
    expect((await lista()).some((x) => x.id === p.id)).toBe(false);
    const [fila] = await db.select().from(schema.product).where(eq(schema.product.id, p.id));
    expect(fila).toBeUndefined();
  });

  it('NO borra uno con stock y explica por qué', async () => {
    const p = (await crear({ name: 'Con stock', initialStock: 5 })).json().data;
    const res = await borrar(p.id);
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toMatch(/5 unidades en stock/);
    expect(res.json().error).toMatch(/baja/);
  });

  it('NO borra uno con ventas (el producto sembrado del tenant tiene una)', async () => {
    const res = await borrar(t.productId);
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toMatch(/venta/);
  });

  it('sin sesión no se puede eliminar', async () => {
    const p = (await crear({ name: 'Intocable' })).json().data;
    const res = await app.inject({ method: 'DELETE', url: `/api/v1/products/${p.id}` });
    expect(res.statusCode).toBe(401);
    expect((await lista()).some((x) => x.id === p.id)).toBe(true);
  });
});
