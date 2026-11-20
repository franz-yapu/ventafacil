# Pendientes para el 9 de octubre de 2026 — VentaFácil SaaS

## Estado al cerrar el 8 de octubre
- **Beta en vivo en vertexall.com** con https (certificado comodín por Cloudflare):
  registro `https://app.vertexall.com/registro`, panel `https://admin.vertexall.com`,
  cada negocio `https://<slug>.vertexall.com`.
- Stack en el servidor: `~/vf-saas-prueba/` (fuera de Coolify), límite 2 núcleos.
- DNS de vertexall.com ya en Cloudflare (todo en "Solo DNS").
- Código: rama `feat/saas`, todo subido a GitHub, 972 tests en verde.

## ✅ EL CORREO — HECHO el 12-oct-2026
Resend verificado (sa-east-1), DMARC puesto, clave en ~/vf-saas-prueba/.env, probado con el negocio `fran`.
"Olvidé mi contraseña" probado OK. Queda solo rotar la clave (se pegó en el chat).
Backups del SaaS: para más adelante (plan: NAS de casa con restic).

### (lo que estaba planeado)
Hoy no sale ningún correo (verificar cuenta, recuperar contraseña): `RESEND_API_KEY` es falsa.
1. Crear cuenta en Resend y añadir el dominio `vertexall.com` (o un subdominio de envío).
2. Poner en Cloudflare los registros que pida Resend (SPF/DKIM/DMARC), en "Solo DNS".
3. Poner la clave real en `~/vf-saas-prueba/.env` (RESEND_API_KEY, EMAIL_FROM) y reiniciar el api.
4. Probar: registro → llega el correo de verificación; "olvidé mi contraseña" → llega el enlace.
5. Opcional: correo de contacto/soporte @vertexall.com con Cloudflare Email Routing → Gmail.

## Después
- Copias de seguridad diarias de la base del SaaS, fuera del servidor (NAS de casa).
- Abogado + datos legales en `packages/shared/src/legal.ts`.
- Borrar negocios de prueba (ferretería, panaderías, librerías, "Carrera 3").

## Más adelante (no urgente)
- **Página profesional de artículos de VertexAll** (p. ej. `vertexall.com/articulos`): estructura de cada
  proyecto, tecnologías, formas de despliegue, cómo es nuestra estructura de proyecto, cómo usamos la IA…
  Primer artículo ya hecho: `~/Documentos/vertexall-articulos/despliegue-vertexall.html`.

## 📅 Aplazado a NOVIEMBRE 2026 (decisión de Franz, 12-oct)
- Copias de seguridad diarias de la base del SaaS → NAS de casa (restic).
- Abogado + datos legales en `packages/shared/src/legal.ts`.
- Rotar la clave de Resend (se pegó en el chat).
- Página de artículos de VertexAll (sigue siendo no urgente).

Negocios de prueba (12-oct): ✅ BORRADOS ferretería, panaderías x2, librerías x2 y carrera-simultanea.
Se conservan `llantas-el-rapido` (semilla) y `fran`. Copia previa: `~/vf-saas-prueba/antes-borrar-pruebas-20261012.dump` (servidor).
