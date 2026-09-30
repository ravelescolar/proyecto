import React, { useState } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  Globe,
  Cloud,
  CheckCircle2
} from 'lucide-react';
import { RavelLogo } from './RavelLogo';
import { authenticateUser, AuthUser } from '../utils/auth';
import { signInWithGoogle } from '../lib/firebase';

interface LoginScreenProps {
  onLoginSuccess: (user: AuthUser) => void;
  companyName?: string;
  companyNit?: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  companyName = 'TRANSPORTES RAVEL',
  companyNit = '900.388.163-2',
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const fbUser = await signInWithGoogle();
      if (fbUser) {
        const authUser: AuthUser = {
          id: fbUser.uid,
          username: fbUser.email || 'Usuario Google',
          name: fbUser.displayName || 'Usuario Ravel',
          email: fbUser.email || undefined,
          photoURL: fbUser.photoURL || undefined,
          role: 'admin',
          lastLogin: new Date().toISOString(),
          isGoogleUser: true,
        };
        onLoginSuccess(authUser);
      }
    } catch (err: unknown) {
      console.error('Google Sign In Error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('popup-closed-by-user')) {
        setError('El inicio de sesión con Google fue cancelado.');
      } else {
        setError('No se pudo completar el acceso con Google. Intenta nuevamente.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const res = authenticateUser(username, password, rememberMe);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setError(res.message || 'Usuario o contraseña inválidos.');
        setLoading(false);
      }
    }, 250);
  };

  const handleFillDefaults = () => {
    setUsername('admin');
    setPassword('Ravel2026*');
    setError(null);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 text-slate-100 relative overflow-hidden font-sans">
      {/* Background Decorative Accents */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05)_0,transparent_70%)] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Main Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-emerald-100/50 text-slate-800">
          {/* Logo and Heading */}
          <div className="text-center mb-6">
            <div className="inline-flex justify-center mb-3">
              <RavelLogo variant="color" size="lg" showSlogan={true} />
            </div>

            <div className="flex items-center justify-center gap-1.5 mt-2">
              <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                NIT: {companyNit}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-emerald-950 tracking-tight mt-2 font-serif">
              Portal de Cuentas de Cobro
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Accede a tus cuentas sincronizadas en la nube desde cualquier dispositivo
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2 animate-in fade-in duration-200">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Cloud Access Highlight Button (Google Sign In) */}
          <div className="mb-5">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-sm shadow-md transition-all active:scale-[0.99] border border-slate-700 cursor-pointer disabled:opacity-60 group"
            >
              {googleLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <div className="text-left">
                <span className="block leading-tight">Acceder con Google</span>
                <span className="block text-[10px] text-emerald-300 font-normal">
                  Sincronizado en la nube (Multi-dispositivo)
                </span>
              </div>
            </button>

            <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 py-1.5 px-2 rounded-lg border border-emerald-200">
              <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Permite ver y editar desde cualquier celular o PC</span>
            </div>
          </div>

          <div className="relative flex py-2 items-center mb-4">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              O con usuario y contraseña
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Standard Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Usuario o Correo
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Ej: admin o ravel"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/50 hover:bg-white transition-all text-slate-900"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Contraseña
                </label>
              </div>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/50 hover:bg-white transition-all text-slate-900 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <span className="text-xs text-slate-600">Mantener sesión iniciada</span>
              </label>

              <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Acceso Seguro
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 text-sm font-extrabold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 rounded-xl shadow-lg shadow-emerald-700/20 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-70"
            >
              {loading ? (
                <span>Validando credenciales...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Ingresar con Usuario</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Credential Hint for First Access */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="p-3 bg-gradient-to-r from-emerald-50/70 to-orange-50/50 rounded-2xl border border-emerald-100 text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  Credenciales locales por defecto:
                </span>
                <button
                  type="button"
                  onClick={handleFillDefaults}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                >
                  Autocompletar
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono mt-1 text-slate-700">
                <div className="bg-white/80 px-2 py-1 rounded border border-slate-200">
                  <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">Usuario:</span>
                  <span className="font-bold text-slate-900">admin</span>
                </div>
                <div className="bg-white/80 px-2 py-1 rounded border border-slate-200">
                  <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">Contraseña:</span>
                  <span className="font-bold text-slate-900">Ravel2026*</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info for Vercel and Browser compatibility */}
        <div className="mt-6 text-center text-xs text-emerald-100/70 space-y-1">
          <div className="flex items-center justify-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 text-emerald-300">
              <Cloud className="w-3.5 h-3.5" />
              Base de Datos Cloud Firestore Activa
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-slate-300">
              <Globe className="w-3 h-3" />
              Multi-dispositivo Web
            </span>
          </div>
          <p className="text-[10px] text-emerald-200/50">
            © {new Date().getFullYear()} {companyName} · Todos los derechos reservados
          </p>
        </div>
      </div>
    </div>
  );
};
