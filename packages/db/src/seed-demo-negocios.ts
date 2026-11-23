import argon2 from 'argon2';
import { eq, sql } from 'drizzle-orm';
import { db, queryClient } from './client.js';
import * as s from './schema.js';

/**
 * Tres negocios de demostración, ya llenos, SOLO para probar en local:
 * ferretería (1 sucursal), deportes y ropa (3), alimentos (5). 50 productos cada uno,
 * vendedores, compradores, ventas de los últimos 30 días y una caja por sucursal.
 *
 * Es idempotente a medias: si el subdominio ya existe, ese negocio se salta.
 * Correr: pnpm --filter @ventafacil/db exec tsx --env-file=../../.env src/seed-demo-negocios.ts
 */

// Generador pseudoaleatorio determinista: mismos datos en cada corrida.
let semilla = 20261123;
const rnd = () => {
  semilla = (semilla * 1664525 + 1013904223) % 4294967296;
  return semilla / 4294967296;
};
const entre = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const elegir = <T>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)]!;

/** "Nombre|costo|precio" agrupado por categoría. */
type Catalogo = Record<string, string[]>;

const FERRETERIA: Catalogo = {
  Herramientas: [
    'Martillo 16 oz|28|45', 'Martillo de goma|35|55', 'Destornillador plano 6"|8|15',
    'Destornillador estrella 6"|8|15', 'Juego de 6 destornilladores|45|75', 'Alicate universal 8"|22|38',
    'Alicate de punta 6"|20|35', 'Llave inglesa 10"|30|50', 'Llave francesa 12"|40|65',
    'Juego de llaves combinadas 12 pzs|120|190', 'Serrucho 20"|32|52', 'Sierra de arco con hoja|25|42',
    'Flexómetro 5 m|14|25', 'Nivel de burbuja 60 cm|25|42', 'Taladro percutor 650 W|280|420',
    'Amoladora angular 4½"|260|390',
  ],
  Electricidad: [
    'Cable 2.5 mm rollo 100 m|230|340', 'Cable 1.5 mm rollo 100 m|160|240', 'Interruptor simple|5|10',
    'Tomacorriente doble|7|14', 'Foco LED 9 W|6|12', 'Foco LED 15 W|10|18', 'Cinta aislante|3|6',
    'Tubo LED 18 W|18|32', 'Extensión eléctrica 5 m|28|48', 'Térmico 20 A|22|38',
  ],
  Plomería: [
    'Tubo PVC 1/2" 6 m|18|30', 'Tubo PVC 3/4" 6 m|26|42', 'Codo PVC 1/2"|1|2.5', 'Llave de paso 1/2"|15|28',
    'Grifo para lavamanos|35|60', 'Cinta teflón|1.5|4', 'Pegamento PVC 125 ml|9|16', 'Flotador para tanque|14|25',
  ],
  Pinturas: [
    'Pintura látex blanco 4 L|85|130', 'Pintura látex color 1 gal|95|145', 'Esmalte sintético 1/4 gal|45|72',
    'Thinner 1 L|10|18', 'Brocha 3"|6|12', 'Rodillo 9" con bandeja|14|26', 'Lija de agua #120|1.5|3.5',
    'Masilla 1 kg|11|19',
  ],
  Fijaciones: [
    'Clavos 2" (kg)|9|15', 'Clavos 3" (kg)|9|15', 'Tornillos drywall (caja)|18|30', 'Tarugos 6 mm (bolsa)|4|8',
    'Candado 40 mm|16|30', 'Bisagra 3"|3|6', 'Cadena galvanizada (m)|8|14', 'Cerradura de embutir|45|78',
  ],
};

const DEPORTES: Catalogo = {
  Camisetas: [
    'Camiseta Bolivia local|110|180', 'Camiseta Bolivia visita|110|180', 'Camiseta dry-fit hombre|45|85',
    'Camiseta dry-fit mujer|45|85', 'Camiseta de algodón básica|25|50', 'Polo deportivo|40|75',
    'Camiseta Bolívar réplica|95|160', 'Camiseta The Strongest réplica|95|160',
    'Camiseta Real Madrid réplica|105|175', 'Camiseta Barcelona réplica|105|175',
  ],
  'Ropa deportiva': [
    'Short deportivo|30|55', 'Pantalón buzo|60|110', 'Chamarra rompevientos|110|190', 'Polera con capucha|80|140',
    'Calzoneta de baño|25|45', 'Calentador térmico|55|95', 'Medias deportivas (par)|6|14',
    'Gorra deportiva|20|40', 'Buzo infantil|70|120',
  ],
  Calzado: [
    'Zapatilla running|180|320', 'Zapatilla casual|140|240', 'Botín de fútbol|150|260',
    'Zapatilla de básquet|190|330', 'Sandalia deportiva|45|85', 'Zapatilla infantil|90|160',
  ],
  Balones: [
    'Balón de fútbol N°5|70|125', 'Balón de fútbol N°4|60|105', 'Balón de básquet N°7|75|130',
    'Balón de vóley|65|115', 'Guantes de arquero|45|85', 'Canilleras|15|30', 'Bomba de inflar|10|22',
  ],
  Accesorios: [
    'Mochila deportiva|65|120', 'Botella 750 ml|10|22', 'Toalla deportiva|18|35', 'Muñequera|6|14',
    'Cuerda para saltar|9|20', 'Colchoneta de yoga|45|85', 'Pesas 2 kg (par)|35|65', 'Banda elástica|12|25',
    'Raqueta de ping pong|30|55', 'Pelotas de ping pong x3|4|9', 'Gafas de natación|22|42',
    'Gorro de natación|8|16', 'Silbato|3|8', 'Rodillera|18|35', 'Mancuerna 5 kg|50|90',
    'Termo 1 L|35|65', 'Riñonera deportiva|20|38', 'Guantes de gimnasio|18|35',
  ],
};

const ALIMENTOS: Catalogo = {
  Abarrotes: [
    'Arroz 1 kg|7|9.5', 'Azúcar 1 kg|5.5|7.5', 'Fideo 400 g|3.5|5.5', 'Harina 1 kg|5|7.5', 'Aceite 900 ml|13|17',
    'Sal 1 kg|2|3.5', 'Lenteja 500 g|6|9', 'Fréjol 500 g|8|12', 'Quinua real 500 g|14|20', 'Avena 400 g|5|8',
    'Atún en lata|9|13', 'Salsa de tomate 400 g|6|9.5', 'Mayonesa 400 g|9|13.5', 'Té (caja 25)|4|7',
  ],
  'Lácteos y huevos': [
    'Leche 1 L|6|8.5', 'Yogur 1 L|10|14', 'Queso criollo (kg)|38|55', 'Mantequilla 200 g|9|13',
    'Huevos (maple 30)|30|40', 'Leche en polvo 400 g|32|44', 'Queso fresco 250 g|10|15',
  ],
  Bebidas: [
    'Gaseosa 2 L|9|13', 'Jugo 1 L|7|11', 'Agua 2 L|4|6.5', 'Cerveza 620 ml|11|16', 'Gaseosa 500 ml|3.5|6',
    'Energizante 473 ml|9|14', 'Agua saborizada 600 ml|4|7', 'Café soluble 170 g|28|40',
  ],
  'Snacks y dulces': [
    'Galletas de agua|2|3.5', 'Galletas rellenas|2.5|4.5', 'Papas fritas 150 g|7|11', 'Chocolate en barra|5|8.5',
    'Caramelos (bolsa)|6|10', 'Maní salado 200 g|6|10', 'Alfajor|2|4', 'Cereal 300 g|15|22',
  ],
  'Carnes y embutidos': [
    'Pollo entero (kg)|17|23', 'Carne molida (kg)|42|55', 'Salchicha (paquete)|14|20', 'Jamón 200 g|13|19',
    'Chorizo (kg)|35|48', 'Mortadela 250 g|8|12',
  ],
  'Frutas y verduras': [
    'Papa (kg)|4|6', 'Cebolla (kg)|5|8', 'Tomate (kg)|6|9', 'Zanahoria (kg)|4|6.5', 'Plátano (kg)|5|8',
    'Manzana (kg)|9|14', 'Limón (kg)|6|10',
  ],
};

interface Demo {
  name: string;
  slug: string;
  prefijo: string;
  tema: { primary: string; secondary: string };
  plan: string;
  catalogo: Catalogo;
  /** Sucursales: la primera es la central. */
  sucursales: { nombre: string; direccion: string }[];
  /** Vendedores por sucursal (mismo orden que `sucursales`). */
  vendedores: string[][];
  /** Encargados (admin de sucursal) por índice de sucursal NO central. */
  encargados?: Record<number, string>;
  adminNombre: string;
  adminCorreo: string;
  compradores: string[];
  ventas: number;
  /** Máximo de unidades por línea (una ferretería vende de a 1-3; un almacén, más). */
  maxCantidad: number;
}

const NEGOCIOS: Demo[] = [
  {
    name: 'Ferretería El Martillo',
    slug: 'ferreteria-martillo',
    prefijo: 'FER-',
    tema: { primary: '#c2410c', secondary: '#334155' },
    plan: 'basico',
    catalogo: FERRETERIA,
    sucursales: [{ nombre: 'Central', direccion: 'Av. Ballivián 1250, La Paz' }],
    vendedores: [['Carlos Mamani']],
    adminNombre: 'Roberto Quispe',
    adminCorreo: 'admin@ferreteria-martillo.test',
    compradores: ['Constructora Andina', 'Juan Condori', 'Maestro Pedro Apaza', 'Electricista Luis Vargas', 'Taller Los Pinos', 'Marta Flores'],
    ventas: 90,
    maxCantidad: 4,
  },
  {
    name: 'Deportes Campeón',
    slug: 'deportes-campeon',
    prefijo: 'DEP-',
    tema: { primary: '#1d4ed8', secondary: '#16a34a' },
    plan: 'pro',
    catalogo: DEPORTES,
    sucursales: [
      { nombre: 'Casa Matriz', direccion: 'Calle Comercio 410, La Paz' },
      { nombre: 'Sucursal El Alto', direccion: 'Av. 6 de Marzo 2300, El Alto' },
      { nombre: 'Sucursal Sopocachi', direccion: 'Av. 20 de Octubre 2045, La Paz' },
    ],
    vendedores: [['Andrea Rojas'], ['Diego Choque'], ['Valeria Mendoza']],
    encargados: { 1: 'Mauricio Limachi' },
    adminNombre: 'Sofía Delgado',
    adminCorreo: 'admin@deportes-campeon.test',
    compradores: ['Club Atlético Norte', 'Escuela Fútbol Estrella', 'Pablo Rivera', 'Lucía Torrez', 'Colegio San Andrés', 'Gimnasio PowerFit'],
    ventas: 150,
    maxCantidad: 3,
  },
  {
    name: 'Alimentos del Valle',
    slug: 'alimentos-valle',
    prefijo: 'ALI-',
    tema: { primary: '#15803d', secondary: '#ca8a04' },
    plan: 'ilimitado',
    catalogo: ALIMENTOS,
    sucursales: [
      { nombre: 'Almacén Central', direccion: 'Av. Blanco Galindo km 4, Cochabamba' },
      { nombre: 'Mercado Norte', direccion: 'Puesto 18, Mercado Norte, Cochabamba' },
      { nombre: 'Tienda Cala Cala', direccion: 'Av. Oquendo 780, Cochabamba' },
      { nombre: 'Tienda Quillacollo', direccion: 'Plaza Bolívar 55, Quillacollo' },
      { nombre: 'Tienda Sacaba', direccion: 'Av. Villazón km 7, Sacaba' },
    ],
    vendedores: [
      ['Elena Gutiérrez', 'Marcos Salazar'],
      ['Rosa Camacho'],
      ['Jorge Arce'],
      ['Nelly Vásquez'],
      ['Iván Ramírez'],
    ],
    encargados: { 1: 'Silvia Altamirano', 4: 'Hugo Barrientos' },
    adminNombre: 'Gabriela Soliz',
    adminCorreo: 'admin@alimentos-valle.test',
    compradores: ['Restaurante El Fogón', 'Doña Teresa', 'Hotel Cochabamba', 'Panadería La Espiga', 'Comedor Popular Sur', 'Hogar de Niños San José', 'Juan Pérez'],
    ventas: 260,
    maxCantidad: 6,
  },
];

const normalizar = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');

async function sembrar(d: Demo, hashes: { admin: string; vend: string }) {
  const [existe] = await db.select({ id: s.business.id }).from(s.business).where(eq(s.business.slug, d.slug)).limit(1);
  if (existe) {
    console.log(`· ${d.slug}: ya existe, se salta`);
    return null;
  }
  const [plan] = await db.select().from(s.plan).where(eq(s.plan.code, d.plan)).limit(1);
  if (!plan) throw new Error(`Falta el plan ${d.plan}: corre seed-plans`);

  return db.transaction(async (tx) => {
    const [biz] = await tx
      .insert(s.business)
      .values({
        name: d.name,
        slug: d.slug,
        skuPrefix: d.prefijo,
        themeJson: { primary: d.tema.primary, secondary: d.tema.secondary, radius: '12px' },
        textsJson: { app_name: d.name, receipt_footer: '¡Gracias por su compra!' },
        termsAcceptedAt: new Date(),
        termsVersion: 'demo',
      })
      .returning();
    const businessId = biz!.id;

    // Suscripción pagada por 12 meses, comprada hace 2 meses.
    const inicio = new Date(Date.now() - 60 * 86_400_000);
    const fin = new Date(inicio);
    fin.setMonth(fin.getMonth() + 12);
    await tx.insert(s.subscription).values({
      businessId,
      planCode: d.plan,
      status: 'active',
      lockedPrice: plan.priceMonthly,
      billingMonths: 12,
      billedAmount: String(Number(plan.priceMonthly) * 12),
      cycleStartedAt: inicio,
      currentPeriodEnd: fin,
    });

    await tx.execute(sql`select set_config('app.business_id', ${businessId}, true)`);

    // Sucursales
    const locs = await tx
      .insert(s.location)
      .values(
        d.sucursales.map((x, i) => ({ businessId, name: x.nombre, address: x.direccion, isCentral: i === 0 })),
      )
      .returning();

    // Usuarios
    const [admin] = await tx
      .insert(s.appUser)
      .values({
        businessId,
        locationId: locs[0]!.id,
        name: d.adminNombre,
        username: 'admin',
        email: d.adminCorreo,
        passwordHash: hashes.admin,
        role: 'admin',
      })
      .returning();
    const vendedoresPorSuc: { id: string; locId: string }[][] = locs.map(() => []);
    const credenciales: string[] = [`admin / Admin2026!  (${d.adminNombre})`];
    let nVend = 0;
    for (let i = 0; i < locs.length; i++) {
      for (const nombre of d.vendedores[i] ?? []) {
        nVend++;
        const username = `vendedor${nVend}`;
        const [u] = await tx
          .insert(s.appUser)
          .values({
            businessId,
            locationId: locs[i]!.id,
            name: nombre,
            username,
            email: `${normalizar(nombre)}@${d.slug}.test`,
            passwordHash: hashes.vend,
            role: 'seller',
          })
          .returning();
        vendedoresPorSuc[i]!.push({ id: u!.id, locId: locs[i]!.id });
        credenciales.push(`${username} / Vende2026!  (${nombre} — ${locs[i]!.name})`);
      }
    }

    let nEnc = 0;
    for (const [iStr, nombre] of Object.entries(d.encargados ?? {})) {
      nEnc++;
      const i = Number(iStr);
      const username = `encargado${nEnc}`;
      await tx.insert(s.appUser).values({
        businessId,
        locationId: locs[i]!.id,
        name: nombre,
        username,
        email: `${normalizar(nombre)}@${d.slug}.test`,
        passwordHash: hashes.admin,
        role: 'admin',
      });
      credenciales.push(`${username} / Admin2026!  (${nombre} — encargado de ${locs[i]!.name}, NO es central)`);
    }

    // Categorías y productos (50)
    const cats = await tx
      .insert(s.category)
      .values(Object.keys(d.catalogo).map((name) => ({ businessId, name })))
      .returning();
    const catId = new Map(cats.map((c) => [c.name, c.id]));

    interface Prod { id: string; nombre: string; precio: number; costo: number }
    const productos: Prod[] = [];
    let n = 0;
    for (const [cat, items] of Object.entries(d.catalogo)) {
      for (const it of items) {
        n++;
        const [nombre, costo, precio] = it.split('|') as [string, string, string];
        const [p] = await tx
          .insert(s.product)
          .values({
            businessId,
            locationId: locs[0]!.id,
            sku: `${d.prefijo}${String(n).padStart(6, '0')}`,
            barcode: `775${String(entre(1_000_000_000, 9_999_999_999))}`,
            name: nombre,
            categoryId: catId.get(cat) ?? null,
            price: precio,
            cost: costo,
          })
          .returning();
        productos.push({ id: p!.id, nombre, precio: Number(precio), costo: Number(costo) });
      }
    }
    if (productos.length !== 50) throw new Error(`${d.slug}: ${productos.length} productos, se esperaban 50`);

    // Inventario: todos los productos en todas las sucursales.
    const stock = new Map<string, number>();
    const filasInv = [];
    for (const p of productos) {
      for (const [iLoc, l] of locs.entries()) {
        // La central surte todo; cada sucursal sólo trabaja ~65% del catálogo.
        if (iLoc > 0 && rnd() > 0.65) continue;
        const q = entre(25, 180);
        stock.set(`${p.id}:${l.id}`, q);
        filasInv.push({ businessId, productId: p.id, locationId: l.id, quantity: q, minStock: entre(5, 15) });
      }
    }
    await tx.insert(s.inventory).values(filasInv);

    // Compradores
    const clientes = await tx
      .insert(s.customer)
      .values(
        d.compradores.map((name, i) => ({
          businessId,
          name,
          phone: `7${String(1_000_000 + i * 137_311).slice(0, 7)}`,
        })),
      )
      .returning();

    // Ventas de los últimos 30 días, de más vieja a más nueva (el correlativo sigue el tiempo).
    const ahora = Date.now();
    const momentos = Array.from({ length: d.ventas }, () => ahora - rnd() * 30 * 86_400_000).sort((a, b) => a - b);
    let recibo = 0;
    for (const t of momentos) {
      const iLoc = entre(0, locs.length - 1);
      const loc = locs[iLoc]!;
      const vendedor = elegir(vendedoresPorSuc[iLoc]!.length ? vendedoresPorSuc[iLoc]! : [{ id: admin!.id, locId: loc.id }]);
      const surtido = productos.filter((p) => stock.has(`${p.id}:${loc.id}`));
      const lineas = Array.from({ length: entre(1, 4) }, () => elegir(surtido)).filter(
        (p, i, a) => a.findIndex((q) => q.id === p.id) === i,
      );
      const detalle = lineas.map((p) => {
        const disponible = stock.get(`${p.id}:${loc.id}`) ?? 0;
        const cantidad = Math.max(1, Math.min(entre(1, d.maxCantidad), disponible));
        return { p, cantidad, total: Math.round(p.precio * cantidad * 100) / 100 };
      });
      const subtotal = detalle.reduce((a, x) => a + x.total, 0);
      const descuento = rnd() < 0.12 ? Math.round(subtotal * 0.05 * 100) / 100 : 0;
      const cancelada = rnd() < 0.03;
      recibo++;
      const id = crypto.randomUUID();
      const fecha = new Date(t);
      await tx.insert(s.sale).values({
        id,
        businessId,
        locationId: loc.id,
        customerId: rnd() < 0.3 ? elegir(clientes).id : null,
        userId: vendedor.id,
        status: cancelada ? 'cancelled' : 'completed',
        subtotal: subtotal.toFixed(2),
        discount: descuento.toFixed(2),
        total: (subtotal - descuento).toFixed(2),
        paymentMethod: elegir(['cash', 'cash', 'cash', 'card', 'qr', 'transfer'] as const),
        receiptNumber: recibo,
        clientCreatedAt: fecha,
        syncedAt: fecha,
        cancelledReason: cancelada ? 'Error al cobrar' : null,
        cancelledBy: cancelada ? admin!.id : null,
      });
      await tx.insert(s.saleItem).values(
        detalle.map((x) => ({
          saleId: id,
          productId: x.p.id,
          productNameSnapshot: x.p.nombre,
          unitPriceSnapshot: x.p.precio.toFixed(2),
          unitCostSnapshot: x.p.costo.toFixed(2),
          quantity: x.cantidad,
          lineTotal: x.total.toFixed(2),
        })),
      );
      if (!cancelada) {
        for (const x of detalle) {
          const k = `${x.p.id}:${loc.id}`;
          stock.set(k, (stock.get(k) ?? 0) - x.cantidad);
        }
      }
    }
    // Stock final tras las ventas.
    for (const [k, q] of stock) {
      const [productId, locationId] = k.split(':') as [string, string];
      await tx.execute(
        sql`update inventory set quantity = ${q} where product_id = ${productId} and location_id = ${locationId}`,
      );
    }

    // Una caja abierta por sucursal, con el fondo inicial y un par de movimientos.
    for (let i = 0; i < locs.length; i++) {
      const u = vendedoresPorSuc[i]![0]?.id ?? admin!.id;
      const [caja] = await tx
        .insert(s.cashRegister)
        .values({
          businessId,
          locationId: locs[i]!.id,
          userId: u,
          openedAt: new Date(Date.now() - 3 * 3_600_000),
          openingAmount: '200.00',
        })
        .returning();
      await tx.insert(s.cashMovement).values([
        { businessId, cashRegisterId: caja!.id, userId: u, type: 'out', amount: '35.00', reason: 'Pago a proveedor de transporte' },
        { businessId, cashRegisterId: caja!.id, userId: u, type: 'in', amount: '100.00', reason: 'Cambio para la caja' },
      ]);
    }

    await tx.insert(s.businessCounter).values({ businessId, lastReceiptNumber: recibo, lastSku: n });

    return { credenciales, locs: locs.length, ventas: recibo };
  });
}

async function main() {
  const hashes = { admin: await argon2.hash('Admin2026!'), vend: await argon2.hash('Vende2026!') };
  for (const d of NEGOCIOS) {
    const r = await sembrar(d, hashes);
    if (!r) continue;
    console.log(`\n✓ ${d.name}  →  http://${d.slug}.localhost:5173   (${r.locs} sucursal(es), 50 productos, ${r.ventas} ventas, plan ${d.plan})`);
    for (const c of r.credenciales) console.log(`    ${c}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => queryClient.end());
