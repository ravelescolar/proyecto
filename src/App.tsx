/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { LogIn, AlertCircle } from 'lucide-react';
import { CuentaDeCobro, DriverProfile, AppSettings, CuentaStatus } from './types';
import {
  loadCuentas,
  saveCuenta,
  deleteCuenta,
  updateCuentaStatus,
  loadDriverProfiles,
  loadSettings,
  getNextConsecutive,
  startFirebaseSync,
  stopFirebaseSync,
  setSyncStatusListener,
  isCurrentUserAdmin,
} from './utils/storage';
import {
  auth,
  onAuthStateChanged,
  signInWithGoogle,
  signOutUser,
  User,
} from './lib/firebase';
import { Header } from './components/Header';
import { CuentaForm } from './components/CuentaForm';
import { DocumentPreview } from './components/DocumentPreview';
import { HistorialCuentas } from './components/HistorialCuentas';
import { ConductoresPlacas } from './components/ConductoresPlacas';
import { InformesAdmin } from './components/InformesAdmin';
import { SettingsModal } from './components/SettingsModal';
import { RavelLogo } from './components/RavelLogo';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [currentTab, setCurrentTab] = useState<'form' | 'preview' | 'history' | 'drivers' | 'reports'>('form');
  const [cuentas, setCuentas] = useState<CuentaDeCobro[]>([]);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [settings, setSettings] = useState<AppSettings>(loadSettings());

  // Currently viewed or edited Cuenta
  const [selectedCuenta, setSelectedCuenta] = useState<CuentaDeCobro | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const refreshData = useCallback(() => {
    const latestCuentas = [...loadCuentas()];
    setCuentas(latestCuentas);
    setDrivers([...loadDriverProfiles()]);
    setSettings({ ...loadSettings() });
    setIsAdmin(isCurrentUserAdmin());
    setSelectedCuenta((prev) => {
      if (!prev) return null;
      const updated = latestCuentas.find((c) => c.id === prev.id || c.consecutive === prev.consecutive);
      return updated || prev;
    });
  }, []);

  useEffect(() => {
    setSyncStatusListener((saving, err) => {
      setIsSyncing(saving);
      if (err) {
        setSyncError(err);
      }
    });
    return () => setSyncStatusListener(null);
  }, []);

  // Track Firebase Authentication state and attach Firestore listeners when authenticated
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);

      if (currentUser) {
        setIsSyncing(true);
        setSyncError(null);
        try {
          const adminRole = await startFirebaseSync(
            currentUser.uid,
            currentUser.email,
            refreshData
          );
          setIsAdmin(adminRole);
          refreshData();
        } catch (err) {
          console.error('Error syncing with Firestore:', err);
          setSyncError('Error al sincronizar con Firebase Cloud Firestore.');
        } finally {
          setIsSyncing(false);
        }
      } else {
        stopFirebaseSync();
        setIsAdmin(false);
        setCuentas([]);
        setDrivers([]);
      }
    });

    return () => {
      unsubscribe();
      stopFirebaseSync();
    };
  }, [refreshData]);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      console.error('Error signing in with Google:', err);
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        setAuthError(
          `El dominio "${domain}" aún no está autorizado en Firebase Auth. Ve a Firebase Console → Authentication → Settings → Authorized domains y agrega "${domain}".`
        );
      } else if (code === 'auth/popup-blocked') {
        setAuthError(
          'El navegador bloqueó la ventana emergente de Google. Por favor permite ventanas emergentes (pop-ups) para este sitio e intenta de nuevo.'
        );
      } else {
        setAuthError('No se pudo completar el inicio de sesión con Google. Por favor intenta nuevamente.');
      }
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    setSelectedCuenta(null);
    setCurrentTab('form');
  };

  // Generate / Save Cuenta
  const handleGenerate = (cuenta: CuentaDeCobro) => {
    const saved = saveCuenta(cuenta);
    refreshData();
    setSelectedCuenta(saved);
    setCurrentTab('preview');
  };

  // Edit an existing cuenta
  const handleEdit = (cuenta: CuentaDeCobro) => {
    if (cuenta.status === 'anulada' && !isAdmin) return;
    setSelectedCuenta(cuenta);
    setCurrentTab('form');
  };

  // Duplicate an existing cuenta with next unique consecutive
  const handleDuplicate = (cuenta: CuentaDeCobro) => {
    const next = getNextConsecutive();
    const duplicated: CuentaDeCobro = {
      ...cuenta,
      id: `cc-${next.number}`,
      ownerId: user?.uid,
      ownerEmail: user?.email || undefined,
      consecutive: next.number,
      consecutiveFormatted: next.formatted,
      date: new Date().toISOString().split('T')[0],
      paymentDueDate: cuenta.paymentDueDate || new Date().toISOString().split('T')[0],
      status: 'emitida',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      services: cuenta.services.map((s) => ({
        ...s,
        id: `srv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        date: new Date().toISOString().split('T')[0],
      })),
    };

    setSelectedCuenta(duplicated);
    setCurrentTab('form');
  };

  // Select driver from directory and start new cuenta
  const handleSelectDriverForCuenta = (driver: DriverProfile) => {
    const next = getNextConsecutive();
    const today = new Date().toISOString().split('T')[0];
    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + 5);

    const newCuenta: CuentaDeCobro = {
      id: `cc-${next.number}`,
      ownerId: user?.uid,
      ownerEmail: user?.email || undefined,
      consecutive: next.number,
      consecutiveFormatted: next.formatted,
      date: today,
      paymentDueDate: defaultDue.toISOString().split('T')[0],
      city: settings.defaultCity && settings.defaultCity !== 'Barranquilla' ? settings.defaultCity : 'Medellín',
      companyName: settings.companyName,
      companyNit: settings.companyNit,
      driverName: driver.driverName,
      driverId: driver.idNumber,
      vehiclePlate: driver.plate,
      driverPhone: driver.phone || '',
      services: [
        {
          id: `srv-${Date.now()}`,
          date: today,
          plate: driver.plate,
          clientDetail: driver.frequentClients[0] || 'Servicio de transporte terrestre',
          value: 0,
        },
      ],
      totalAmount: 0,
      amountInWords: 'CERO PESOS M/CTE.',
      legalConcept: settings.defaultConcept,
      paymentData: driver.paymentData,
      companyLogoUrl: settings.companyLogoUrl,
      status: 'emitida',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSelectedCuenta(newCuenta);
    setCurrentTab('form');
  };

  // Delete cuenta
  const handleDeleteCuenta = (id: string) => {
    deleteCuenta(id);
    refreshData();
    if (selectedCuenta?.id === id) {
      setSelectedCuenta(null);
      setCurrentTab('history');
    }
  };

  // Status Change
  const handleStatusChange = (id: string, status: CuentaStatus) => {
    updateCuentaStatus(id, status);
    refreshData();
    if (selectedCuenta && selectedCuenta.id === id) {
      setSelectedCuenta({ ...selectedCuenta, status });
    }
  };

  // New blank form
  const handleStartNew = () => {
    setSelectedCuenta(null);
    setCurrentTab('form');
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-white to-emerald-50/20 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-emerald-900">
            Conectando con Firebase Cloud Firestore...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/30 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-emerald-200 shadow-xl p-8 space-y-6 text-center">
          <div className="flex justify-center">
            <RavelLogo variant="badge" size="md" showSlogan={true} />
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Plataforma oficial de <strong>Transportes Ravel</strong> para generar, consultar y descargar cuentas de cobro en PDF.
          </p>

          {authError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-2.5 px-5 py-3 text-sm font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md hover:shadow-emerald-600/20 transition-all cursor-pointer active:scale-[0.99]"
          >
            <LogIn className="w-4 h-4 text-orange-300" />
            <span>Iniciar Sesión</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-white to-emerald-50/20 text-slate-800 flex flex-col font-sans">
      <Header
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        cuentasCount={cuentas.length}
        driversCount={drivers.length}
        settings={settings}
        userEmail={user.email}
        isAdmin={isAdmin}
        isSyncing={isSyncing}
        onSignOut={handleSignOut}
        hasActivePreview={Boolean(selectedCuenta)}
      />

      {syncError && (
        <div className="max-w-5xl w-full mx-auto mt-3 sm:mt-4 px-3 sm:px-4">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{syncError}</span>
            </div>
            <button
              type="button"
              onClick={() => setSyncError(null)}
              className="text-xs font-bold underline shrink-0"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 py-4 sm:py-6 px-3 sm:px-6 lg:px-8 pb-24 md:pb-8">
        {currentTab === 'form' && (
          <CuentaForm
            onGenerate={handleGenerate}
            onLoadPrevious={() => setCurrentTab('history')}
            initialCuenta={selectedCuenta}
            settings={settings}
            driverProfiles={drivers}
            isAdmin={isAdmin}
            userUid={user.uid}
          />
        )}

        {currentTab === 'preview' && selectedCuenta && (
          <DocumentPreview
            cuenta={selectedCuenta}
            onEdit={() => handleEdit(selectedCuenta)}
            onNew={handleStartNew}
            onStatusChange={(status) => handleStatusChange(selectedCuenta.id, status)}
          />
        )}

        {currentTab === 'history' && (
          <HistorialCuentas
            cuentas={cuentas}
            onView={(c) => {
              setSelectedCuenta(c);
              setCurrentTab('preview');
            }}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onDelete={handleDeleteCuenta}
            onStatusChange={handleStatusChange}
            onNew={handleStartNew}
            isAdmin={isAdmin}
          />
        )}

        {currentTab === 'drivers' && isAdmin && (
          <ConductoresPlacas
            drivers={drivers}
            onRefresh={refreshData}
            onSelectForCuenta={handleSelectDriverForCuenta}
          />
        )}

        {currentTab === 'reports' && isAdmin && (
          <InformesAdmin
            cuentas={cuentas}
            onView={(c) => {
              setSelectedCuenta(c);
              setCurrentTab('preview');
            }}
            onStatusChange={handleStatusChange}
          />
        )}
      </main>

      {/* Settings & Role Management Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsUpdated={refreshData}
        isAdmin={isAdmin}
        userUid={user.uid}
        userEmail={user.email}
      />
    </div>
  );
}
