import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AuthHero, AuthHeroMovil, AuthLayout, AuthTabs } from '@/components/AuthHero';
import { cn } from '@/lib/utils';
import { Marca, NombreDeMarca } from '@/components/Marca';

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
  tab,
}: {
  titulo: string;
  descripcion?: string;
  children: ReactNode;
  /** Enlaces propios de la pantalla (volver al login, crear cuenta…). */
  pie?: ReactNode;
  ancho?: 'sm' | 'md';
  /** El registro ya pide aceptar los términos con una casilla: repetirlos abajo sobra. */
  legal?: boolean;
  /** Muestra las pestañas Entrar / Crear cuenta. */
  tab?: 'entrar' | 'registro';
}) {
  const cab = (
    <>
      <Marca size="md" inverso />
      <NombreDeMarca className="text-[17px] font-semibold" />
    </>
  );
  return (
    <AuthLayout
      movil={
        <AuthHeroMovil
          cabecera={cab}
          titular={
            <>
              Tu punto de venta, <span className="auth-accent">siempre listo.</span>
            </>
          }
        />
      }
      hero={
        <AuthHero
          cabecera={cab}
          titular={
            <>
              Tu punto de venta, <span className="auth-accent">siempre listo.</span>
            </>
          }
          texto="Cobra, controla el inventario y cierra la caja desde cualquier equipo, con o sin internet."
          puntos={[
            'Funciona sin conexión',
            'Caja e inventario cuadrados',
            'Reportes en tiempo real',
          ]}
        />
      }
    >
      <div
        className={cn(
          'w-full rounded-[24px] border border-border bg-surface p-6 shadow-card md:p-10',
          ancho === 'md' ? 'max-w-[520px]' : 'max-w-[460px]',
        )}
      >
        {tab && <AuthTabs actual={tab} />}
        <div className="motion-safe:animate-rise">
          <h1 className="auth-display text-[34px] leading-[1.05] md:text-[38px]">{titulo}</h1>
          {descripcion && <p className="mb-5 mt-2 text-[15px] text-muted">{descripcion}</p>}
        </div>

        {children}

        {pie && <div className="mt-5 text-center text-[13px] text-muted">{pie}</div>}

        {legal && <PieLegal />}
      </div>
    </AuthLayout>
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
