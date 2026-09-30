import React, { useState } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Globe
} from 'lucide-react';
import { RavelLogo } from './RavelLogo';
import { authenticateUser, AuthUser, DEFAULT_CREDENTIALS } from '../utils/auth';

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
              Ingresa tus credenciales para acceder al sistema
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2 animate-in fade-in duration-200">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
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
                  autoFocus
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Ej: admin o usuario"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
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
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 text-sm font-extrabold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 rounded-xl shadow-lg shadow-emerald-700/20 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-70"
            >
              {loading ? (
                <span>Validando credenciales...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Ingresar al Sistema</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Credential Hint for First Access */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="p-3.5 bg-gradient-to-r from-emerald-50/70 to-orange-50/50 rounded-2xl border border-emerald-100 text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  Credenciales de acceso inicial:
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

              <p className="text-[10px] text-slate-500 mt-2">
                ℹ️ Podrás cambiar el usuario y la contraseña en cualquier momento desde el menú de <strong>Configuración</strong> de la aplicación.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info for Vercel and Browser compatibility */}
        <div className="mt-6 text-center text-xs text-emerald-100/70 space-y-1">
          <div className="flex items-center justify-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 text-emerald-300">
              <Globe className="w-3 h-3" />
              Desplegable en Vercel
            </span>
            <span>•</span>
            <span>Almacenamiento Local Offline</span>
          </div>
          <p className="text-[10px] text-emerald-200/50">
            © {new Date().getFullYear()} {companyName} · Todos los derechos reservados
          </p>
        </div>
      </div>
    </div>
  );
};
