/** WhatsApp de ventas (Bolivia, +591). Solo dígitos, como lo pide wa.me. */
export const WHATSAPP_VENTAS = '59161139545';

/** Enlace que abre el chat con el mensaje ya escrito. */
export function enlaceWhatsapp(mensaje: string): string {
  return `https://wa.me/${WHATSAPP_VENTAS}?text=${encodeURIComponent(mensaje)}`;
}
