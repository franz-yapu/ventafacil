import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Campo } from '@/components/ui/field';
import { useValidacion } from '@/lib/useValidacion';
import { correo as reglaCorreo, largo, requerido, todas } from '@/lib/validar';
import { LIMITES } from '@ventafacil/shared';
import { BannerSeccion, TarjetaTono } from '@/features/platform/estilos';
import { KeyRound, UserCog } from 'lucide-react';
import { usePlatformAuth } from '@/features/platform/PlatformAuthProvider';
import { platformApi } from '@/lib/api';

/**
 * La cuenta del propio operador: nombre, correo (que ES el usuario con el que entra) y
 * contraseña.
 *
 * El cambio de contraseña pide la actual aunque la sesión ya esté abierta. No es un
 * trámite: es lo único que separa "me dejé el panel abierto" de "me quitaron la cuenta".
 */
export function MiCuentaModal(_: { onClose: () => void }) {
  const { admin, logout, refrescar } = usePlatformAuth();
  const [nombre, setNombre] = useState(admin?.name ?? '');
  const [correo, setCorreo] = useState(admin?.email ?? '');
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  /**
   * Se está saliendo por haber cambiado el correo.
   *
   * Mientras dure, el modal no se puede cerrar. El correo viaja dentro del token, así que
   * al cambiarlo el que hay en la mano queda viejo y la salida es obligatoria: cancelar el
   * temporizador dejaría al operador con un token muerto y un 401 sin explicación en la
   * siguiente petición. Lo que sí se arregla es lo otro — que cerrando el modal en ese
   * segundo y medio te echaba sin que hubieras llegado a leer por qué.
   */
  const [, setSaliendo] = useState(false);

  const vp = useValidacion(
    {
      nombre: todas(requerido('El nombre'), largo(1, LIMITES.nombreMax)),
      correo: todas(requerido('El correo'), reglaCorreo),
    },
    { nombre, correo },
  );
  const vc = useValidacion(
    {
      actual: requerido('La contraseña actual'),
      nueva: (x: string) =>
        x === '' ? 'La contraseña nueva es obligatoria' : x.length < 12 ? 'Mínimo 12 caracteres' : x.length > 100 ? 'Máximo 100 caracteres' : null,
    },
    { actual, nueva },
  );

  const guardarPerfil = useMutation({
    mutationFn: (body: { name?: string; email?: string }) =>
      platformApi.patch<{ reloguear: boolean }>('/platform/me', body),
    onSuccess: (res) => {
      setError(null);
      refrescar();
      // El correo viaja dentro del token: si cambió, el que hay en la mano quedó viejo
      // y la próxima petición sería un 401 sin explicación. Mejor salir a propósito.
      if (res.reloguear) {
        setAviso('Correo cambiado. Vuelve a entrar con el nuevo.');
        setSaliendo(true);
        setTimeout(logout, 1500);
      } else {
        setAviso('Guardado.');
      }
    },
    onError: (e: Error) => {
      setAviso(null);
      setError(e.message);
    },
  });

  const cambiarPassword = useMutation({
    mutationFn: () => platformApi.patch('/platform/me/password', { actual, nueva }),
    onSuccess: () => {
      setError(null);
      setActual('');
      setNueva('');
      setAviso('Contraseña cambiada.');
    },
    onError: (e: Error) => {
      setAviso(null);
      setError(e.message);
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <BannerSeccion
        tono="success"
        icon={UserCog}
        titulo="Mi cuenta"
        descripcion={`${admin?.name ?? ''} · ${admin?.email ?? ''}`}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <TarjetaTono tono="info" i={1} className="flex flex-col gap-3 p-5">
          <div className="text-[13px] font-semibold">Mis datos</div>
          <Campo etiqueta="Nombre" error={vp.ver('nombre')}>
            <Input
              value={nombre}
              onBlur={() => vp.tocar('nombre')}
              onChange={(e) => setNombre(e.target.value)}
            />
          </Campo>
          <Campo
            etiqueta="Correo"
            ayuda="Es el usuario con el que entras al panel. Si lo cambias, tendrás que volver a entrar."
            error={vp.ver('correo')}
          >
            <Input
              type="email"
              autoCapitalize="none"
              autoCorrect="off"
              value={correo}
              onBlur={() => vp.tocar('correo')}
              onChange={(e) => setCorreo(e.target.value)}
            />
          </Campo>
          <Button
            variant="outline"
            disabled={guardarPerfil.isPending}
            onClick={() => {
              if (!vp.intentar()) return;
              const body: { name?: string; email?: string } = {};
              if (nombre !== admin?.name) body.name = nombre;
              if (correo !== admin?.email) body.email = correo;
              if (!Object.keys(body).length) return setAviso('No cambiaste nada.');
              guardarPerfil.mutate(body);
            }}
          >
            {guardarPerfil.isPending ? 'Guardando…' : 'Guardar datos'}
          </Button>
        </TarjetaTono>

        <TarjetaTono tono="warning" i={2} className="p-5">
          <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold">
            <KeyRound size={14} /> Cambiar contraseña
          </div>
          <div className="flex flex-col gap-3">
            <Campo etiqueta="Contraseña actual" error={vc.ver('actual')}>
              <Input
                type="password"
                value={actual}
                onBlur={() => vc.tocar('actual')}
                onChange={(e) => setActual(e.target.value)}
                autoComplete="current-password"
              />
            </Campo>
            <Campo etiqueta="Contraseña nueva" ayuda="Mínimo 12 caracteres." error={vc.ver('nueva')}>
              <Input
                type="password"
                value={nueva}
                onBlur={() => vc.tocar('nueva')}
                onChange={(e) => setNueva(e.target.value)}
                autoComplete="new-password"
              />
            </Campo>
            <Button
              variant="outline"
              disabled={cambiarPassword.isPending}
              onClick={() => vc.intentar() && cambiarPassword.mutate()}
            >
              {cambiarPassword.isPending ? 'Cambiando…' : 'Cambiar contraseña'}
            </Button>
          </div>
        </TarjetaTono>
      </div>
      {error && <p className="text-[13px] text-danger">{error}</p>}
      {aviso && <p className="text-[13px] text-success">{aviso}</p>}
    </div>
  );
}
