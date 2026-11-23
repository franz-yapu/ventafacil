import { db, schema, withTenant } from '@ventafacil/db';
import { AVISO_DIAS } from '@ventafacil/shared';
import { and, eq, isNotNull, isNull, lte } from 'drizzle-orm';
import type { FastifyBaseLogger } from 'fastify';
import { env } from '../env.js';
import { enviarCorreo, urlDelNegocio } from './mailer.js';
import { TZ } from './zona.js';

/**
 * Aviso por correo de que el plan pagado vence pronto.
 *
 * Se manda UNA vez por periodo, cuando faltan `AVISO_DIAS` días o menos: a los
 * administradores del negocio que tengan correo, y a ti (el operador) con un resumen.
 *
 * Es idempotente por `subscription.renewal_notice_sent_at`, no por la hora a la que corra:
 * se puede ejecutar cada pocas horas, reiniciar el API a mitad o dejar el servidor caído un
 * día entero, y cada negocio recibe su aviso una sola vez —y lo recibe al volver, que es lo
 * que no daría un cron a las 08:00 clavadas—. La marca se pone a NULL al contratar un ciclo
 * nuevo (ver `platform.ts`), así que el periodo siguiente vuelve a avisar.
 *
 * Sólo planes pagados (`status = 'active'` con `current_period_end`): la prueba gratis
 * tiene su propio aviso en pantalla y el plan interno no tiene fecha.
 */

const fecha = (d: Date) =>
  new Intl.DateTimeFormat('es-BO', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }).format(d);

export interface ResultadoAvisos {
  revisados: number;
  avisados: number;
}

export async function enviarAvisosDeVencimiento(
  log: FastifyBaseLogger,
  ahora: Date = new Date(),
): Promise<ResultadoAvisos> {
  const limite = new Date(ahora.getTime() + AVISO_DIAS * 86_400_000);
  const pendientes = await db
    .select({
      businessId: schema.subscription.businessId,
      fin: schema.subscription.currentPeriodEnd,
      negocio: schema.business.name,
      slug: schema.business.slug,
      plan: schema.plan.name,
    })
    .from(schema.subscription)
    .innerJoin(schema.business, eq(schema.business.id, schema.subscription.businessId))
    .innerJoin(schema.plan, eq(schema.plan.code, schema.subscription.planCode))
    .where(
      and(
        eq(schema.subscription.status, 'active'),
        isNotNull(schema.subscription.currentPeriodEnd),
        lte(schema.subscription.currentPeriodEnd, limite),
        isNull(schema.subscription.renewalNoticeSentAt),
      ),
    );

  const resumen: string[] = [];
  let avisados = 0;

  for (const p of pendientes) {
    const fin = p.fin!;
    const dias = Math.ceil((fin.getTime() - ahora.getTime()) / 86_400_000);
    const venc = dias < 0 ? `venció hace ${-dias} ${-dias === 1 ? 'día' : 'días'}` : dias === 0 ? 'vence hoy' : `vence en ${dias} ${dias === 1 ? 'día' : 'días'}`;

    // Los administradores de ESE negocio: sus filas están bajo RLS, de ahí `withTenant`.
    const admins = await withTenant(p.businessId, (tx) =>
      tx
        .select({ name: schema.appUser.name, email: schema.appUser.email })
        .from(schema.appUser)
        .where(
          and(
            eq(schema.appUser.businessId, p.businessId),
            eq(schema.appUser.role, 'admin'),
            eq(schema.appUser.isActive, true),
            isNotNull(schema.appUser.email),
          ),
        ),
    );

    let enviados = 0;
    for (const a of admins) {
      const r = await enviarCorreo(
        {
          to: a.email!,
          subject: `Tu plan de ${p.negocio} ${venc}`,
          text:
            `Hola ${a.name}:\n\n` +
            `Tu plan ${p.plan} de "${p.negocio}" ${venc} (${fecha(fin)}).\n\n` +
            (dias < 0
              ? `Tienes unos días para renovarlo y seguir vendiendo con normalidad; pasado ese plazo la cuenta queda en modo solo lectura (podrás ver tus datos, pero no vender ni editar).\n\n`
              : `Renuévalo antes de esa fecha para no interrumpir tus ventas. Si no se renueva, tendrás 7 días de gracia y luego la cuenta pasará a solo lectura.\n\n`) +
            `Para renovar, entra a "Mi plan" o escríbenos por WhatsApp:\n${p.slug ? urlDelNegocio(p.slug, '/suscripcion') : ''}\n`,
        },
        log,
      );
      if (r.enviado) enviados++;
    }

    resumen.push(`- ${p.negocio} (${p.slug ?? 'sin subdominio'}) · plan ${p.plan} · ${venc} · ${fecha(fin)} · correos a dueños: ${enviados}/${admins.length}`);

    // Se marca si llegó a alguien o si no hay a quién escribirle (el resumen para ti
    // sale igual). Si había destinatarios y TODOS fallaron, se deja sin marcar: la
    // siguiente pasada reintenta.
    if (enviados > 0 || admins.length === 0) {
      await db
        .update(schema.subscription)
        .set({ renewalNoticeSentAt: ahora })
        .where(eq(schema.subscription.businessId, p.businessId));
      avisados++;
    }
  }

  if (resumen.length > 0) {
    const operadores = env.alertEmail
      ? [env.alertEmail]
      : (
          await db
            .select({ email: schema.platformAdmin.email })
            .from(schema.platformAdmin)
            .where(eq(schema.platformAdmin.isActive, true))
        ).map((o) => o.email);
    for (const to of operadores) {
      await enviarCorreo(
        {
          to,
          subject: `VentaFácil: ${resumen.length} ${resumen.length === 1 ? 'plan vence' : 'planes vencen'} pronto`,
          text: `Planes que vencen en ${AVISO_DIAS} días o menos:\n\n${resumen.join('\n')}\n`,
        },
        log,
      );
    }
  }

  return { revisados: pendientes.length, avisados };
}

/**
 * Programa la revisión: una vez al arrancar (a los 30 s, sin frenar el arranque) y luego
 * cada 6 horas. Idempotente, así que la frecuencia sólo decide cuánto tarda en salir un
 * aviso. Un fallo se registra y no tumba el proceso.
 */
export function programarAvisosDeVencimiento(log: FastifyBaseLogger): () => void {
  const correr = () =>
    enviarAvisosDeVencimiento(log)
      .then((r) => r.revisados && log.info(r, 'avisos de vencimiento'))
      .catch((e) => log.error({ err: e }, 'falló la revisión de vencimientos'));
  const primero = setTimeout(correr, 30_000);
  const cada = setInterval(correr, 6 * 3_600_000);
  primero.unref();
  cada.unref();
  return () => {
    clearTimeout(primero);
    clearInterval(cada);
  };
}
