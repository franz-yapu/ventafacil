import { Check, Eye, EyeOff } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthShell } from '@/components/AuthShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Aviso } from '@/features/auth/Aviso';
import { api, ApiError } from '@/lib/api';

/** Pantalla a la que lleva el enlace del correo: poner una contraseña nueva. */
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [repetir, setRepetir] = useState('');
  const [ver, setVer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const [errs, setErrs] = useState<{ p?: string; r?: string }>({});
  const validarCampos = (p: string, r: string) => ({
    p:
      p === ''
        ? 'Escribe la contraseña nueva'
        : p.length < 8
          ? 'Mínimo 8 caracteres'
          : p.length > 100
            ? 'Máximo 100 caracteres'
            : undefined,
    r: r === '' ? 'Repite la contraseña' : r !== p ? 'Las contraseñas no coinciden' : undefined,
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const f = validarCampos(password, repetir);
    setErrs(f);
    if (f.p || f.r) return;

    setEnviando(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setListo(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cambiar la contraseña');
    } finally {
      setEnviando(false);
    }
  }

  if (!token) {
    return (
      <Aviso titulo="Enlace incompleto">
        Abre el enlace tal como llegó al correo, sin recortarlo.
      </Aviso>
    );
  }

  if (listo) {
    return (
      <AuthShell titulo="Contraseña cambiada" descripcion="Todo listo">
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success-bg text-success">
            <Check size={26} />
          </div>
          <h2 className="text-[17px] font-bold tracking-[-0.01em]">Contraseña cambiada</h2>
          <p className="text-[13px] text-muted">
            Ya puedes entrar con la nueva. Las sesiones que tenías abiertas en otros dispositivos se
            cerraron.
          </p>
          <Link to="/login" className="w-full">
            <Button className="mt-1 w-full" size="lg">
              Entrar
            </Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell titulo="Nueva contraseña" descripcion="Elige tu contraseña nueva">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="nueva" className="mb-1.5 block text-[13px] font-semibold">
            Contraseña nueva
          </label>
          <div className="relative">
            <Input
              id="nueva"
              type={ver ? 'text' : 'password'}
              className="pr-11"
              autoFocus
              autoComplete="new-password"
              value={password}
              aria-invalid={errs.p ? true : undefined}
              onBlur={() => setErrs(validarCampos(password, repetir))}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
            <button
              type="button"
              onClick={() => setVer((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[8px] p-1.5 text-muted transition-colors hover:bg-muted/10 hover:text-fg"
              aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {ver ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errs.p && (
            <p role="alert" className="mt-1 text-xs text-danger">
              {errs.p}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="repetir" className="mb-1.5 block text-[13px] font-semibold">
            Repítela
          </label>
          <Input
            id="repetir"
            type={ver ? 'text' : 'password'}
            autoComplete="new-password"
            value={repetir}
            aria-invalid={errs.r ? true : undefined}
            onBlur={() => setErrs(validarCampos(password, repetir))}
            onChange={(e) => setRepetir(e.target.value)}
            placeholder="La misma otra vez"
          />
          {errs.r && (
            <p role="alert" className="mt-1 text-xs text-danger">
              {errs.r}
            </p>
          )}
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
          {enviando ? 'Guardando…' : 'Cambiar contraseña'}
        </Button>
      </form>
    </AuthShell>
  );
}
