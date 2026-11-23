-- Sincroniza el snapshot de drizzle con el esquema real; NO cambia la base de datos.
--
-- Las migraciones 0021 (ofertas y precio fijo) y 0022 (aviso de vencimiento) se escribieron
-- a mano y no dejaron snapshot, así que `drizzle-kit generate` seguía viendo como pendientes
-- `plan.regular_price`, `plan.offer_label`, `subscription.locked_price` y
-- `subscription.renewal_notice_sent_at`, que esas dos migraciones ya crean. Aplicarlas otra
-- vez fallaría con "column already exists". Esta migración no ejecuta nada: existe sólo para
-- que el snapshot 0023 refleje el estado actual y el CI deje de pedir una migración falsa.
SELECT 1;
