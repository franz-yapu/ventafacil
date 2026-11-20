import { ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { AuthHero, AuthHeroMovil, AuthLayout, RECIBO_PLATAFORMA } from '@/components/AuthHero';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePlatformAuth } from '@/features/platform/PlatformAuthProvider';

/**
 * Entrada al panel de plataforma.
 *
 * A propósito NO se parece a la de los negocios ni lleva el tema del cliente: quien
 * llega aquí debe ver que está en otra puerta. El operador se crea por CLI en el
 * servidor (`pnpm --filter @ventafacil/db new-platform-admin`), así que aquí no hay
 * registro ni "¿olvidaste tu contraseña?".
 */
export function PlatformLoginPage() {
  const { login } = usePlatformAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo entrar');
    } finally {
      setEnviando(false);
    }
  }

  const cab = (
    <>
      <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-white text-[#15151c]">
        <ShieldCheck size={20} />
      </div>
      <span className="text-[17px] font-semibold">VentaFácil · Plataforma</span>
    </>
  );
  return (
    <AuthLayout
      movil={
        <AuthHeroMovil
          cabecera={cab}
          titular={
            <>
              Todos los negocios, <span className="auth-accent">un solo panel.</span>
            </>
          }
        />
      }
      hero={
        <AuthHero
          cabecera={cab}
          recibo={RECIBO_PLATAFORMA}
          anillo="PLANES · OFERTAS · SUSCRIPCIONES · BITÁCORA · "
          titular={
            <>
              Todos los negocios, <span className="auth-accent">un solo panel.</span>
            </>
          }
          texto="Altas, planes, precios, ofertas y estado de cada suscripción. Todo cambio queda en la bitácora de la plataforma."
          puntos={[
            'Ingresos y cartera en vivo',
            'Planes y ofertas editables',
            'Bitácora de cada cambio',
          ]}
        />
      }
    >
      <div className="w-full max-w-[460px] rounded-[24px] border border-border bg-surface p-6 shadow-card md:p-10">
        <div className="motion-safe:animate-rise">
          <h1 className="auth-display text-[38px] leading-[1.05]">Plataforma</h1>
          <p className="mb-6 mt-2 text-[15px] text-muted">Administración de todos los negocios</p>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold" htmlFor="pf-email">
              Correo del operador
            </label>
            <Input
              id="pf-email"
              type="email"
              autoFocus
              autoComplete="username"
              placeholder="operador@tudominio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-semibold" htmlFor="pf-pass">
              Contraseña
            </label>
            <Input
              id="pf-pass"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-theme bg-danger-bg px-3 py-2 text-[13px] font-medium text-danger"
            >
              {error}
            </p>
          )}

          <Button type="submit" size="lg" disabled={enviando}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>

        {/* No hay "¿olvidaste tu contraseña?" a propósito: los operadores no tienen
            recuperación por correo. Se la cambia otro principal, o el servidor. */}
        <p className="mt-5 text-center text-[12px] leading-relaxed text-muted">
          ¿Perdiste el acceso? Pídele a otro operador principal que te ponga una contraseña nueva, o
          cámbiala desde el servidor.
        </p>
      </div>
    </AuthLayout>
  );
}
