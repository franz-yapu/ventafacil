import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AuthHero, AuthHeroMovil } from '@/components/AuthHero';
import { Marca, NombreDeMarca } from '@/components/Marca';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Marco común de las pantallas SIN sesión: login, registro, recuperar contraseña,
 * restablecer, verificar correo.
 *
 * Antes cada una resolvía por su cuenta el centrado, el ancho, el encabezado y el pie,
 * y ninguna se parecía a la de al lado. Como son las primeras pantallas que ve un
 * cliente —y a veces las únicas que ve un empleado que perdió el acceso— son las que
 * más barato salía dejar descuidadas y más caro costaba tener descuidadas.
 *
 * El logo y el nombre salen de la marca del negocio (`useMarca`), que en estas
 * pantallas se pide sin sesión al subdominio. Por eso el cliente ve SU logo desde el
 * primer momento y no el del proveedor.
 */
export function AuthShell({
  titulo,
  descripcion,
  children,
  pie,
  ancho = 'sm',
  legal = true,
}: {
  titulo: string;
  descripcion?: string;
  children: ReactNode;
  /** Enlaces propios de la pantalla (volver al login, crear cuenta…). */
  pie?: ReactNode;
  ancho?: 'sm' | 'md';
  /** El registro ya pide aceptar los términos con una casilla: repetirlos abajo sobra. */
  legal?: boolean;
}) {
  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <AuthHeroMovil
        cabecera={
          <>
            <Marca size="md" inverso />
            <NombreDeMarca className="text-[17px] font-semibold" />
          </>
        }
        titular="Tu punto de venta, simple y siempre listo."
      />
      <AuthHero
        cabecera={
          <>
            <Marca size="md" inverso />
            <NombreDeMarca className="text-[17px] font-semibold" />
          </>
        }
        titular={
          <>
            Tu punto de venta,
            <br />
            simple y siempre listo.
          </>
        }
        texto="Cobra, controla el inventario y cierra la caja desde cualquier equipo, con o sin internet."
        puntos={['Funciona sin conexión', 'Caja e inventario cuadrados', 'Reportes en tiempo real']}
      />
      <div
        className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-8"
        style={{
          background:
            'radial-gradient(900px 500px at 100% 0%, color-mix(in srgb, var(--color-primary) 9%, transparent), transparent 60%), var(--color-bg)',
        }}
      >
        <div className={ancho === 'md' ? 'w-full max-w-md' : 'w-full max-w-sm'}>
          <h1 className="mb-1 text-[22px] font-extrabold tracking-[-0.03em] md:hidden">{titulo}</h1>
          <div className="mb-5 hidden md:block">
            <h1 className="text-[28px] font-extrabold tracking-[-0.035em]">{titulo}</h1>
            {descripcion && <p className="mt-1.5 text-sm text-muted">{descripcion}</p>}
          </div>
          {descripcion && (
            <p className="mb-4 text-center text-[13px] text-muted md:hidden">{descripcion}</p>
          )}

          <Card className="shadow-[0_24px_60px_-28px_rgba(0,0,0,0.25)]">
            <CardContent className="p-6">{children}</CardContent>
          </Card>

          {pie && <div className="mt-4 text-center text-[13px] text-muted">{pie}</div>}

          {legal && <PieLegal />}
        </div>
      </div>
    </div>
  );
}

/**
 * Términos y privacidad, en todas las pantallas de entrada.
 *
 * No es adorno: quien acepta los términos al registrarse tiene que poder leerlos
 * después sin una cuenta abierta, y el enlace tiene que estar donde se le busca. Las
 * dos rutas son públicas a propósito (`/terminos`, `/privacidad`).
 */
export function PieLegal() {
  return (
    <p className="mt-6 text-center text-[12px] text-muted">
      Al continuar aceptas los{' '}
      <Link to="/terminos" className="font-semibold text-fg underline-offset-2 hover:underline">
        Términos y Condiciones
      </Link>{' '}
      y la{' '}
      <Link to="/privacidad" className="font-semibold text-fg underline-offset-2 hover:underline">
        Política de Privacidad
      </Link>
      .
    </p>
  );
}
