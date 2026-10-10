import React from 'react';
import {
  Home,
  Clock,
  Car,
  Settings,
  Plus,
  LogOut,
  Cloud,
  FileText,
  ShieldCheck,
  UserCheck,
  BarChart3
} from 'lucide-react';
import { AppSettings } from '../types';
import { RavelLogo } from './RavelLogo';

interface HeaderProps {
  currentTab: 'home' | 'form' | 'preview' | 'history' | 'drivers' | 'reports';
  onSelectTab: (tab: 'home' | 'form' | 'preview' | 'history' | 'drivers' | 'reports') => void;
  onOpenSettings: () => void;
  cuentasCount: number;
  driversCount: number;
  settings: AppSettings;
  userEmail?: string | null;
  isAdmin?: boolean;
  isSyncing?: boolean;
  onSignOut?: () => void;
  hasActivePreview?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onOpenSettings,
  cuentasCount,
  driversCount,
  settings,
  userEmail,
  isAdmin = false,
  isSyncing,
  onSignOut,
  hasActivePreview = false,
}) => {
  return (
    <>
      <header className="no-print bg-white/95 backdrop-blur-md border-b border-emerald-100 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
            {/* Brand Logo & Name */}
            <div
              onClick={() => onSelectTab('home')}
              className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group min-w-0"
            >
              <RavelLogo
                variant="badge"
                size="sm"
                showSlogan={false}
                customLogoUrl={settings.companyLogoUrl}
                className="transition-transform group-hover:scale-105 shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-extrabold tracking-tight text-emerald-950 font-serif truncate">
                    {settings.companyName || 'TRANSPORTES RAVEL'}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider shrink-0 border ${
                      isAdmin
                        ? 'bg-orange-50 text-orange-900 border-orange-300'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}
                    title={
                      isAdmin
                        ? 'Cuenta Administradora (Empresa de Transporte): Gestiona todas las cuentas de cobro'
                        : 'Cuenta Usuario / Conductor: Crea y consulta tus cuentas de cobro'
                    }
                  >
                    {isAdmin ? (
                      <>
                        <ShieldCheck className="w-3 h-3 text-orange-600 shrink-0" />
                        <span>Administrador</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>Usuario</span>
                      </>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium truncate">
                  <span className="font-mono font-semibold text-emerald-800">
                    NIT {settings.companyNit || '900.388.163-2'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={`inline-flex items-center gap-1 font-semibold truncate ${
                      isSyncing ? 'text-orange-700' : 'text-emerald-700'
                    }`}
                    title={userEmail ? `Sincronizado en Firebase (${userEmail})` : 'Sincronizado en Firebase'}
                  >
                    <Cloud className={`w-3 h-3 shrink-0 ${isSyncing ? 'text-orange-500 animate-pulse' : 'text-emerald-600'}`} />
                    <span className="truncate max-w-[120px] sm:max-w-[190px]">
                      {isSyncing
                        ? 'Guardando...'
                        : userEmail
                        ? userEmail
                        : 'En línea'}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop Navigation Links (Center Zone) */}
            <nav className="hidden md:flex items-center gap-1 lg:gap-2">
              <button
                type="button"
                onClick={() => onSelectTab('home')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  currentTab === 'home'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-emerald-900 hover:bg-emerald-50'
                }`}
              >
                <Home className={`w-4 h-4 ${currentTab === 'home' ? 'text-orange-300' : 'text-emerald-600'}`} />
                <span>Inicio</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectTab('form')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  currentTab === 'form'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-emerald-900 hover:bg-emerald-50'
                }`}
              >
                <Plus className={`w-4 h-4 ${currentTab === 'form' ? 'text-orange-300' : 'text-orange-500'}`} />
                <span>Nueva Cuenta</span>
              </button>

              {hasActivePreview && (
                <button
                  type="button"
                  onClick={() => onSelectTab('preview')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    currentTab === 'preview'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-700 hover:text-emerald-900 hover:bg-emerald-50'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Vista Previa</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onSelectTab('history')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  currentTab === 'history'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-emerald-900 hover:bg-emerald-50'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{isAdmin ? 'Todas las Cuentas' : 'Mis Cuentas'}</span>
                <span className="opacity-80 font-mono tabular-nums">({cuentasCount})</span>
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => onSelectTab('drivers')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    currentTab === 'drivers'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-700 hover:text-emerald-900 hover:bg-emerald-50'
                  }`}
                >
                  <Car className="w-4 h-4" />
                  <span>Vehículos y Placas</span>
                  <span className="opacity-80 font-mono tabular-nums">({driversCount})</span>
                </button>
              )}

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => onSelectTab('reports')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    currentTab === 'reports'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-orange-900 bg-orange-50/70 hover:bg-orange-100 border border-orange-200/80'
                  }`}
                >
                  <BarChart3
                    className={`w-4 h-4 ${
                      currentTab === 'reports' ? 'text-orange-300' : 'text-orange-600'
                    }`}
                  />
                  <span>Informes de Pago</span>
                </button>
              )}
            </nav>

            {/* Right Zone: Settings & Sign Out (Always reachable on Mobile & Desktop) */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={onOpenSettings}
                title={isAdmin ? 'Configuración de Empresa y Roles' : 'Información de Cuenta y Perfil'}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4" />
              </button>

              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  title={userEmail ? `Cerrar sesión (${userEmail})` : 'Cerrar sesión'}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav
        aria-label="Navegación móvil"
        className="no-print md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-emerald-100 shadow-lg"
      >
        <div
          className={`grid ${
            isAdmin
              ? hasActivePreview
                ? 'grid-cols-6'
                : 'grid-cols-5'
              : hasActivePreview
              ? 'grid-cols-4'
              : 'grid-cols-3'
          } items-center h-16 px-1`}
        >
          <button
            type="button"
            onClick={() => onSelectTab('home')}
            className={`flex flex-col items-center justify-center min-h-[48px] py-1 rounded-xl transition-colors cursor-pointer ${
              currentTab === 'home'
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-emerald-800 font-medium'
            }`}
          >
            <div
              className={`flex items-center justify-center w-8 h-6 rounded-full transition-colors ${
                currentTab === 'home' ? 'bg-emerald-100 text-emerald-800' : ''
              }`}
            >
              <Home className="w-4 h-4" />
            </div>
            <span className="text-[11px] tracking-tight mt-0.5 whitespace-nowrap">Inicio</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('form')}
            className={`flex flex-col items-center justify-center min-h-[48px] py-1 rounded-xl transition-colors cursor-pointer ${
              currentTab === 'form'
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-emerald-800 font-medium'
            }`}
          >
            <div
              className={`flex items-center justify-center w-8 h-6 rounded-full transition-colors ${
                currentTab === 'form' ? 'bg-emerald-100 text-emerald-800' : ''
              }`}
            >
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-[11px] tracking-tight mt-0.5 whitespace-nowrap">Nueva Cuenta</span>
          </button>

          {hasActivePreview && (
            <button
              type="button"
              onClick={() => onSelectTab('preview')}
              className={`flex flex-col items-center justify-center min-h-[48px] py-1 rounded-xl transition-colors cursor-pointer ${
                currentTab === 'preview'
                  ? 'text-emerald-700 font-bold'
                  : 'text-slate-500 hover:text-emerald-800 font-medium'
              }`}
            >
              <div
                className={`flex items-center justify-center w-8 h-6 rounded-full transition-colors ${
                  currentTab === 'preview' ? 'bg-emerald-100 text-emerald-800' : ''
                }`}
              >
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-[11px] tracking-tight mt-0.5 whitespace-nowrap">Documento</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onSelectTab('history')}
            className={`flex flex-col items-center justify-center min-h-[48px] py-1 rounded-xl transition-colors cursor-pointer ${
              currentTab === 'history'
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-emerald-800 font-medium'
            }`}
          >
            <div
              className={`flex items-center justify-center px-2.5 h-6 rounded-full gap-1 transition-colors ${
                currentTab === 'history' ? 'bg-emerald-100 text-emerald-800' : ''
              }`}
            >
              <Clock className="w-4 h-4" />
              <span className="text-[10px] font-mono tabular-nums font-bold">{cuentasCount}</span>
            </div>
            <span className="text-[11px] tracking-tight mt-0.5 whitespace-nowrap">
              {isAdmin ? 'Todas' : 'Mis Cuentas'}
            </span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => onSelectTab('drivers')}
              className={`flex flex-col items-center justify-center min-h-[48px] py-1 rounded-xl transition-colors cursor-pointer ${
                currentTab === 'drivers'
                  ? 'text-emerald-700 font-bold'
                  : 'text-slate-500 hover:text-emerald-800 font-medium'
              }`}
            >
              <div
                className={`flex items-center justify-center px-2.5 h-6 rounded-full gap-1 transition-colors ${
                  currentTab === 'drivers' ? 'bg-emerald-100 text-emerald-800' : ''
                }`}
              >
                <Car className="w-4 h-4" />
                <span className="text-[10px] font-mono tabular-nums font-bold">{driversCount}</span>
              </div>
              <span className="text-[11px] tracking-tight mt-0.5 whitespace-nowrap">Vehículos</span>
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => onSelectTab('reports')}
              className={`flex flex-col items-center justify-center min-h-[48px] py-1 rounded-xl transition-colors cursor-pointer ${
                currentTab === 'reports'
                  ? 'text-emerald-700 font-bold'
                  : 'text-slate-500 hover:text-emerald-800 font-medium'
              }`}
            >
              <div
                className={`flex items-center justify-center w-8 h-6 rounded-full transition-colors ${
                  currentTab === 'reports' ? 'bg-orange-100 text-orange-800' : ''
                }`}
              >
                <BarChart3 className="w-4 h-4 text-orange-600" />
              </div>
              <span className="text-[11px] tracking-tight mt-0.5 whitespace-nowrap">Informes</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
};
