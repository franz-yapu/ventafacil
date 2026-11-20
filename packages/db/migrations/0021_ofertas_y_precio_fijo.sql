-- Ofertas y precio fijo por suscripción.
--
-- 1) `plan.regular_price` + `plan.offer_label`: precio de lista y rótulo de la oferta. Hay oferta
--    cuando el precio de lista es MAYOR que `price_monthly` (que es lo que se cobra).
-- 2) `subscription.locked_price`: el precio mensual que se le mantiene a ese negocio. Es lo que
--    permite cambiar el precio de un plan «solo para los nuevos»: quien ya contrató no ve subir
--    ni bajar su cuota.
--
-- Orden importante: PRIMERO se congela a los negocios actuales al precio que ven hoy, DESPUÉS se
-- cambian los precios del catálogo (mitad de precio como oferta del mes; Básico a 2 sucursales).
-- A partir de aquí el catálogo se edita desde el panel de plataforma y `seed-plans` ya no pisa
-- precios ni cupos.

ALTER TABLE "plan" ADD COLUMN "regular_price" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "plan" ADD COLUMN "offer_label" text;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "locked_price" numeric(12, 2);--> statement-breakpoint

UPDATE "subscription" s SET "locked_price" = p."price_monthly" FROM "plan" p WHERE p."code" = s."plan_code";--> statement-breakpoint

UPDATE "plan" SET "price_monthly" = '74.50',  "regular_price" = '85.50',  "offer_label" = 'Oferta de este mes', "max_locations" = 2 WHERE "code" = 'basico';--> statement-breakpoint
UPDATE "plan" SET "price_monthly" = '149.50', "regular_price" = '172.00', "offer_label" = 'Oferta de este mes' WHERE "code" = 'pro';--> statement-breakpoint
UPDATE "plan" SET "price_monthly" = '299.50', "regular_price" = '344.50', "offer_label" = 'Oferta de este mes' WHERE "code" = 'ilimitado';
