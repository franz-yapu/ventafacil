-- Aviso de vencimiento del plan pagado.
--
-- `renewal_notice_sent_at`: cuándo se mandó el correo de "tu plan vence pronto" para el
-- periodo en curso. Es lo que hace idempotente a la tarea diaria: sin esta marca, cada
-- pasada volvería a escribirle al mismo dueño. Se pone a NULL al contratar un ciclo nuevo,
-- para que el siguiente periodo vuelva a avisar.
--
-- Aditiva y sin riesgo: una columna nula, ninguna fila se reescribe.

ALTER TABLE "subscription" ADD COLUMN "renewal_notice_sent_at" timestamp with time zone;
