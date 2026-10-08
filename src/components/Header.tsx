import React from 'react';
import {
  Clock,
  Car,
  Settings,
  Plus,
  LogOut,
  Cloud
} from 'lucide-react';
import { AppSettings } from '../types';
import { RavelLogo } from './RavelLogo';

interface HeaderProps {
  currentTab: 'form' | 'preview' | 'history' | 'drivers';
  onSelectTab: (tab: 'form' | 'preview' | 'history' | 'drivers') => void;
  onOpenSettings: () => void;
  cuentasCount: number;
  driversCount: number;
  settings: AppSettings;
  userEmail?: string | null;
  isSyncing?: boolean;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onOpenSettings,
  cuentasCount,
  driversCount,
  settings,
  userEmail,
  isSyncing,
  onSignOut,
}) => {
  return (
    <header className="no-print bg-white/95 backdrop-blur-md border-b border-emerald-100 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div
            onClick={() => onSelectTab('form')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <RavelLogo
              variant="badge"
              size="sm"
              showSlogan={false}
              customLogoUrl={settings.companyLogoUrl}
              className="transition-transform group-hover:scale-105"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight text-emerald-950 font-serif">
                  {settings.companyName || 'TRANSPORTES RAVEL'}
                </span>
                <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded">
                  NIT: {settings.companyNit || '900.388.163-2'}
                </span>
                <span
                  className={`hidden md:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border ${
                    isSyncing
                      ? 'bg-orange-50 text-orange-800 border-orange-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                  title={userEmail ? `Sincronizado en Firebase (${userEmail})` : 'Sincronizado en Firebase'}
                >
                  <Cloud className={`w-3 h-3 ${isSyncing ? 'text-orange-500 animate-pulse' : 'text-emerald-600'}`} />
                  <span>
                    {isSyncing
                      ? 'Guardando en la nube...'
                      : userEmail
                      ? `Nube: ${userEmail}`
                      : 'Sincronizado en Firebase'}
                  </span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                donde quieras llegar · Transporte Terrestre y Escolar
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => onSelectTab('form')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                currentTab === 'form'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-emerald-900 hover:bg-emerald-50'
              }`}
            >
              <Plus className={`w-4 h-4 ${currentTab === 'form' ? 'text-orange-300' : 'text-orange-500'}`} />
              <span>Nueva Cuenta</span>
            </button>

            <button
              onClick={() => onSelectTab('history')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                currentTab === 'history'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-emerald-900 hover:bg-emerald-50'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Historial</span>
              <span
                className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  currentTab === 'history'
                    ? 'bg-emerald-800 text-orange-200 font-bold'
                    : 'bg-emerald-100 text-emerald-800 font-semibold'
                }`}
              >
                {cuentasCount}
              </span>
            </button>

            <button
              onClick={() => onSelectTab('drivers')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                currentTab === 'drivers'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-emerald-900 hover:bg-emerald-50'
              }`}
            >
              <Car className="w-4 h-4" />
              <span>Vehículos & Placas</span>
              <span
                className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  currentTab === 'drivers'
                    ? 'bg-emerald-800 text-orange-200 font-bold'
                    : 'bg-emerald-100 text-emerald-800 font-semibold'
                }`}
              >
                {driversCount}
              </span>
            </button>

            <div className="h-6 w-px bg-emerald-100 mx-1 hidden sm:block"></div>

            <button
              onClick={onOpenSettings}
              title="Configuración general"
              className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>

            {onSignOut && (
              <button
                onClick={onSignOut}
                title={userEmail ? `Cerrar sesión (${userEmail})` : 'Cerrar sesión'}
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};
