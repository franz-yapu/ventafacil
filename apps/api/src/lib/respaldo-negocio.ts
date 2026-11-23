import { db, withTenant } from '@ventafacil/db';
import { sql } from 'drizzle-orm';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Copia de seguridad de UN negocio, previa a borrarlo.
 *
 * Es un JSON con la fila de `business`, su suscripción y todas las tablas que cuelgan de
 * él (las que llevan `business_id`, más `sale_item`, que cuelga de `sale`). Se escribe en
 * `BACKUP_DIR` (por defecto `./backups/negocios`) ANTES del borrado: si la copia falla,
 * el borrado no ocurre. Las tablas se descubren en el catálogo, así una tabla nueva con
 * `business_id` entra sola en la copia sin acordarse de tocar esto.
 */
export async function respaldarNegocio(businessId: string): Promise<{ archivo: string; filas: number }> {
  const tablasRes = await db.execute(sql`
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'business_id'
      and table_name not in ('platform_audit_log', 'subscription')
    order by table_name`);
  const tablas = (tablasRes as unknown as { table_name: string }[]).map((r) => r.table_name);

  const [biz] = (await db.execute(
    sql`select to_jsonb(b) as j from business b where id = ${businessId}`,
  )) as unknown as { j: unknown }[];
  const [sus] = (await db.execute(
    sql`select to_jsonb(s) as j from subscription s where business_id = ${businessId}`,
  )) as unknown as { j: unknown }[];

  let filas = 0;
  const datos: Record<string, unknown[]> = {};
  await withTenant(businessId, async (tx) => {
    for (const t of tablas) {
      const r = (await tx.execute(
        sql`select to_jsonb(x) as j from ${sql.identifier(t)} x where x.business_id = ${businessId}`,
      )) as unknown as { j: unknown }[];
      datos[t] = r.map((f) => f.j);
      filas += r.length;
    }
    const items = (await tx.execute(
      sql`select to_jsonb(i) as j from sale_item i join sale s on s.id = i.sale_id where s.business_id = ${businessId}`,
    )) as unknown as { j: unknown }[];
    datos.sale_item = items.map((f) => f.j);
    filas += items.length;
  });

  const dir = process.env.BACKUP_DIR ?? join(process.cwd(), 'backups', 'negocios');
  await mkdir(dir, { recursive: true });
  const slug = (biz?.j as { slug?: string } | undefined)?.slug ?? businessId;
  const archivo = join(dir, `${slug}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  await writeFile(
    archivo,
    JSON.stringify({ version: 1, creado: new Date().toISOString(), business: biz?.j ?? null, subscription: sus?.j ?? null, tablas: datos }),
    { mode: 0o600 },
  );
  return { archivo, filas };
}
