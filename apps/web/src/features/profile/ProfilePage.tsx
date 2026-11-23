import { Eye, EyeOff, LogOut, ShieldOff } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Page, PageHeader } from '@/components/ui/page';
import { Input } from '@/components/ui/input';
import { Campo } from '@/components/ui/field';
import { LIMITES } from '@ventafacil/shared';
import { useValidacion } from '@/lib/useValidacion';
import { clave, correo, largo, requerido, todas } from '@/lib/validar';
import { useAuth } from '@/features/auth/AuthProvider';
import { BotonAyuda } from '@/features/tour/BotonAyuda';
import { ApiError } from '@/lib/api';
import { ModoSelector } from '@/theme/ModoSelector';

// Campo de contraseña con botón para mostrar/ocultar (reutilizado en el form).
function PasswordField({
  value,
  onChange,
  placeholder,
  error,
  onBlur,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  error?: string;
  onBlur?: () => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? 'text' : 'password'}
        className="pr-11"
        value={value}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-2 top-[22px] -translate-y-1/2 p-1.5 text-muted hover:text-fg"
        aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export function ProfilePage() {
  const { user, updateProfile, logout, logoutEverywhere } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmarTodos, setConfirmarTodos] = useState(false);

  const roleLabel = user?.role === 'admin' ? 'Administrador' : 'Vendedor';
  const wantsPasswordChange =
    newPassword.length > 0 || confirmPassword.length > 0 || currentPassword.length > 0;
  const nameChanged = name.trim() !== '' && name.trim() !== (user?.name ?? '');
  const emailChanged = email.trim().toLowerCase() !== (user?.email ?? '').toLowerCase();

  const v = useValidacion(
    {
      name: todas(requerido('El nombre'), largo(1, LIMITES.nombreMax)),
      email: correo,
      currentPassword: (x) =>
        wantsPasswordChange && x === '' ? 'Ingresa tu contraseña actual' : null,
      newPassword: (x) =>
        wantsPasswordChange ? (x === '' ? 'Escribe la nueva contraseña' : clave(x)) : null,
      confirmPassword: (x) =>
        wantsPasswordChange && x !== newPassword ? 'Las contraseñas no coinciden' : null,
    },
    { name, email, currentPassword, newPassword, confirmPassword },
  );

  async function onSave() {
    setError(null);
    setOk(false);

    if (!v.intentar()) return setError('Corrige los campos marcados en rojo.');
    if (!nameChanged && !wantsPasswordChange && !emailChanged)
      return setError('No hay cambios para guardar');

    setBusy(true);
    try {
      await updateProfile({
        name: nameChanged ? name.trim() : undefined,
        email: emailChanged ? email.trim() || null : undefined,
        currentPassword: wantsPasswordChange ? currentPassword : undefined,
        newPassword: wantsPasswordChange ? newPassword : undefined,
      });
      setOk(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  }

  async function onLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  // Cierra la sesión en todos los dispositivos. Es lo que se hace cuando sospechas que
  // alguien más entró con tu cuenta, así que echa también de éste.
  async function onLogoutEverywhere() {
    if (!confirmarTodos) return setConfirmarTodos(true);
    try {
      await logoutEverywhere();
      navigate('/login', { replace: true });
    } catch {
      setError('No se pudieron cerrar las sesiones');
    }
  }

  return (
    <Page className="mx-auto w-full max-w-lg lg:max-w-5xl">
      <PageHeader
        titulo="Mi perfil"
        descripcion="Tus datos, tu contraseña y las sesiones que tienes abiertas."
      />

      <div className="grid items-start gap-4 lg:grid-cols-[1.15fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-fg">
                {(user?.name ?? 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-semibold">{user?.name}</div>
                <div className="text-sm text-muted">{roleLabel}</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Campo etiqueta="Nombre" error={v.ver('name')}>
              <Input
                value={name}
                onBlur={() => v.tocar('name')}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
              />
            </Campo>

            <Campo
              etiqueta="Correo"
              ayuda={
                user?.emailVerified
                  ? 'Confirmado. Podrás recuperar tu contraseña si la olvidas.'
                  : 'Sin un correo confirmado no podrás recuperar tu contraseña.'
              }
              error={v.ver('email')}
            >
              <Input
                type="email"
                autoCapitalize="none"
                autoCorrect="off"
                value={email}
                onBlur={() => v.tocar('email')}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
              />
            </Campo>

            <div className="mt-1 border-t border-border pt-3">
              <p className="mb-2 text-sm font-semibold">Cambiar contraseña</p>
              <p className="mb-3 text-xs text-muted">Déjalo en blanco si no quieres cambiarla.</p>
              <div className="flex flex-col gap-2">
                <PasswordField
                  value={currentPassword}
                  error={v.ver('currentPassword')}
                  onBlur={() => v.tocar('currentPassword')}
                  onChange={setCurrentPassword}
                  placeholder="Contraseña actual"
                />
                <PasswordField
                  value={newPassword}
                  error={v.ver('newPassword')}
                  onBlur={() => v.tocar('newPassword')}
                  onChange={setNewPassword}
                  placeholder="Nueva contraseña (mín. 6)"
                />
                <PasswordField
                  value={confirmPassword}
                  error={v.ver('confirmPassword')}
                  onBlur={() => v.tocar('confirmPassword')}
                  onChange={setConfirmPassword}
                  placeholder="Repetir nueva contraseña"
                />
              </div>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}
            {ok && <p className="text-sm text-success">Cambios guardados.</p>}

            <Button disabled={busy} onClick={onSave}>
              {busy ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          {/* El modo de pantalla es de la PERSONA y de su aparato, no del negocio, así que su
          sitio natural es aquí: la única pantalla que ve todo el mundo. En Configuración
          sigue estando, pero esa ruta es sólo del dueño. */}
          <Card>
            <CardContent className="p-4">
              <ModoSelector />
            </CardContent>
          </Card>

          {/* La puerta de vuelta al recorrido guiado. Aquí, y no sólo en el pie del menú,
          porque en un teléfono no hay barra lateral: ésta es la única pantalla desde la
          que un vendedor puede volver a pedirlo. */}
          <Card>
            <CardContent className="p-4">
              <BotonAyuda />
            </CardContent>
          </Card>

          <Button variant="danger" onClick={onLogout}>
            <LogOut size={18} /> Cerrar sesión
          </Button>

          <Card>
            <CardContent className="flex flex-col gap-2 p-4">
              <p className="text-sm font-semibold">Sesiones en otros dispositivos</p>
              <p className="text-xs text-muted">
                Si crees que alguien más entró con tu cuenta, ciérralas todas. Tendrás que volver a
                entrar aquí también.
              </p>
              <Button variant="outline" onClick={onLogoutEverywhere}>
                <ShieldOff size={16} />
                {confirmarTodos
                  ? 'Confirmar: cerrar en todos'
                  : 'Cerrar sesión en todos los dispositivos'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Page>
  );
}
