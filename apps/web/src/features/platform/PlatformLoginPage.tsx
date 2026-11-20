import { ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
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

  return (
    <div className="flex min-h-full">
      {/* Panel oscuro: marca de plataforma, nunca el logo de un cliente. Quien llega aquí
          tiene que ver de un vistazo que ésta no es la puerta de ningún negocio. */}
      <div className="hidden w-[42%] shrink-0 flex-col bg-fg p-10 text-bg md:flex xl:p-14">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-bg text-fg">
            <ShieldCheck size={20} />
          </div>
          <span className="text-[17px] font-semibold">VentaFácil · Plataforma</span>
        </div>
        <div className="mt-auto">
          <p className="text-[32px] font-bold leading-[1.15] tracking-[-0.035em]">
            Todos los negocios,
            <br />
            un solo panel.
          </p>
          <div className="my-[18px] h-[3px] w-16 rounded-sm bg-primary" />
          <p className="max-w-[320px] text-sm leading-relaxed opacity-80">
            Altas, planes, precios, ofertas y estado de cada suscripción. Todo cambio queda en la
            bitácora de la plataforma.
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-8">
        <div className="w-full max-w-sm motion-safe:animate-rise">
          <div className="mb-6 flex items-center gap-3 md:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-fg text-bg">
              <ShieldCheck size={24} />
            </div>
            <h1 className="text-[22px] font-bold tracking-[-0.02em]">Plataforma</h1>
          </div>
          <div className="hidden md:block">
            <h1 className="text-[26px] font-bold tracking-[-0.03em]">Plataforma</h1>
            <p className="mb-6 mt-1.5 text-sm text-muted">Administración de todos los negocios</p>
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
            ¿Perdiste el acceso? Pídele a otro operador principal que te ponga una contraseña nueva,
            o cámbiala desde el servidor.
          </p>
        </div>
      </div>
    </div>
  );
}
