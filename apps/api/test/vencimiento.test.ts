import { db, schema } from '@ventafacil/db';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAccessCache } from '../src/lib/subscription.js';
import { auth, createTenant, makeApp, resetDb, type Tenant } from './helpers.js';

// El correo no sale: se captura lo que se habría mandado.
const enviados: { to: string; subject: string; text: string }[] = [];
vi.mock('../src/lib/mailer.js', async (orig) => ({
  ...(await orig<typeof import('../src/lib/mailer.js')>()),
  enviarCorreo: vi.fn(async (c: { to: string; subject: string; text: string }) => {
    enviados.push(c);
    return { enviado: true, driver: 'resend' };
  }),
}));
const { enviarAvisosDeVencimiento } = await import('../src/lib/avisos-vencimiento.js');

/**
 * Vencimiento del plan pagado: aviso por correo (una vez por periodo), periodo de gracia
 * de 7 días con escritura, y después SÓLO LECTURA.
 */

const PLAN = 'test_venc';
const DIA = 86_400_000;
const log = { info() {}, warn() {}, error() {} } as never;

let app: FastifyInstance;
let t: Tenant;

async function plan(finEnDias: number | null, status: 'active' | 'trial' = 'active') {
  const fin = finEnDias === null ? null : new Date(Date.now() + finEnDias * DIA);
  await db
    .insert(schema.subscription)
    .values({ businessId: t.businessId, planCode: PLAN, status, currentPeriodEnd: fin })
    .onConflictDoUpdate({
      target: schema.subscription.businessId,
      set: { status, currentPeriodEnd: fin, renewalNoticeSentAt: null },
    });
  clearAccessCache();
}

const crearProducto = () =>
  app.inject({
    method: 'POST',
    url: '/api/v1/products',
    headers: auth(t.adminToken),
    payload: { name: `P${Math.random()}`, price: '10.00', locationId: t.locationId },
  });
const listar = () =>
  app.inject({ method: 'GET', url: '/api/v1/products', headers: auth(t.adminToken) });

beforeAll(async () => {
  app = await makeApp();
  await resetDb();
  await db
    .insert(schema.plan)
    .values({
      code: PLAN,
      name: 'Venc (test)',
      description: 'lab',
      priceMonthly: '1.00',
      maxLocations: null,
      maxUsers: null,
      maxProducts: null,
      features: [],
      isPublic: false,
      sortOrder: 120,
    })
    .onConflictDoNothing();
  await db
    .insert(schema.platformAdmin)
    .values({ email: 'operador@venc.test', name: 'Operador', passwordHash: 'x', isOwner: true })
    .onConflictDoNothing();
  t = await createTenant(app, 'venc-a');
  await db
    .update(schema.appUser)
    .set({ email: 'dueno@venc.test' })
    .where(eq(schema.appUser.id, t.adminId));
});
afterAll(async () => app.close());
beforeEach(() => {
  enviados.length = 0;
  clearAccessCache();
});

describe('modo según el vencimiento', () => {
  it('al día y por vencer: puede escribir', async () => {
    await plan(30);
    expect((await crearProducto()).statusCode).toBe(201);
    await plan(10);
    expect((await crearProducto()).statusCode).toBe(201);
  });

  it('vencido hace 3 días (gracia): sigue pudiendo escribir', async () => {
    await plan(-3);
    expect((await crearProducto()).statusCode).toBe(201);
  });

  it('vencido hace 8 días: puede leer pero NO escribir', async () => {
    await plan(-8);
    expect((await listar()).statusCode).toBe(200);
    const res = await crearProducto();
    expect(res.statusCode).toBe(402);
    expect(res.json().code).toBe('subscription_readonly');
  });

  it('en sólo lectura puede salir y ver su estado de suscripción', async () => {
    await plan(-8);
    const me = await app.inject({ method: 'GET', url: '/api/v1/subscription/me', headers: auth(t.adminToken) });
    expect(me.statusCode).toBe(200);
    expect(me.json().data.periodo.fase).toBe('solo_lectura');
    const sync = await app.inject({
      method: 'POST',
      url: '/api/v1/sales/sync',
      headers: auth(t.adminToken),
      payload: { sales: [] },
    });
    expect(sync.statusCode).not.toBe(402); // las ventas ya cobradas sin conexión pueden subir
  });

  it('la prueba gratis y el plan sin fecha no entran en este modo', async () => {
    await plan(-30, 'trial');
    expect((await crearProducto()).statusCode).toBe(201);
    await plan(null);
    expect((await crearProducto()).statusCode).toBe(201);
  });
});

describe('aviso por correo', () => {
  it('avisa a los admins del negocio y al operador, UNA sola vez', async () => {
    await plan(12);
    const r1 = await enviarAvisosDeVencimiento(log);
    expect(r1.avisados).toBe(1);
    expect(enviados.some((c) => c.to === 'dueno@venc.test' && /vence en 12 días/.test(c.subject))).toBe(true);
    expect(
      enviados.some((c) => c.to === 'operador@venc.test' && /pronto/.test(c.subject) && /venc-a/.test(c.text)),
    ).toBe(true);

    enviados.length = 0;
    const r2 = await enviarAvisosDeVencimiento(log);
    expect(r2.revisados).toBe(0); // ya avisado: no repite
    expect(enviados).toHaveLength(0);
  });

  it('no avisa si faltan más de 15 días, ni a la prueba gratis', async () => {
    await plan(16);
    expect((await enviarAvisosDeVencimiento(log)).revisados).toBe(0);
    await plan(5, 'trial');
    expect((await enviarAvisosDeVencimiento(log)).revisados).toBe(0);
  });

  it('al renovar (periodo nuevo) vuelve a avisar', async () => {
    await plan(10);
    await enviarAvisosDeVencimiento(log);
    await plan(10); // el helper reinicia la marca como hace la renovación
    enviados.length = 0;
    expect((await enviarAvisosDeVencimiento(log)).avisados).toBe(1);
  });

  it('un plan ya vencido sin aviso previo también se avisa, diciendo que venció', async () => {
    await plan(-2);
    await enviarAvisosDeVencimiento(log);
    expect(enviados.some((c) => /venció hace 2 días/.test(c.subject))).toBe(true);
  });
});
