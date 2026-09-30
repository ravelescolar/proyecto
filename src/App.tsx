/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { CuentaDeCobro, DriverProfile, AppSettings, CuentaStatus } from './types';
import {
  loadCuentas,
  saveCuenta,
  deleteCuenta,
  updateCuentaStatus,
  loadDriverProfiles,
  saveDriverProfile,
  deleteDriverProfile,
  loadSettings,
  saveSettings,
  getNextConsecutive,
  formatConsecutive,
  DEFAULT_SETTINGS
} from './utils/storage';
import {
  subscribeToCuentas,
  subscribeToDrivers,
  subscribeToSettings,
  saveCuentaCloud,
  deleteCuentaCloud,
  updateCuentaStatusCloud,
  saveDriverCloud,
  deleteDriverCloud,
  saveSettingsCloud,
  syncInitialDataToCloud,
} from './utils/firestoreService';
import { auth, signInWithGoogle, logOutFromFirebase, testConnection } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Header } from './components/Header';
import { CuentaForm } from './components/CuentaForm';
import { DocumentPreview } from './components/DocumentPreview';
import { HistorialCuentas } from './components/HistorialCuentas';
import { ConductoresPlacas } from './components/ConductoresPlacas';
import { SettingsModal } from './components/SettingsModal';
import { LoginScreen } from './components/LoginScreen';
import { AuthUser, getCurrentSession, logoutUser } from './utils/auth';
import { Cloud, CheckCircle2, RefreshCw, X, AlertCircle } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getCurrentSession());
  const [currentTab, setCurrentTab] = useState<'form' | 'preview' | 'history' | 'drivers'>('form');
  const [cuentas, setCuentas] = useState<CuentaDeCobro[]>([]);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [settings, setSettings] = useState<AppSettings>(loadSettings());

  // Cloud status states
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncBannerVisible, setSyncBannerVisible] = useState<boolean>(true);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Currently viewed or edited Cuenta
  const [selectedCuenta, setSelectedCuenta] = useState<CuentaDeCobro | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Initial connection check per skill guideline
  useEffect(() => {
    testConnection().then((connected) => {
      console.log('Firebase connection test status:', connected);
    });
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const user: AuthUser = {
          id: fbUser.uid,
          username: fbUser.email || 'Usuario Google',
          name: fbUser.displayName || 'Usuario Ravel',
          email: fbUser.email || undefined,
          photoURL: fbUser.photoURL || undefined,
          role: 'admin',
          lastLogin: new Date().toISOString(),
          isGoogleUser: true,
        };
        setCurrentUser(user);
        setIsCloudConnected(true);
      } else {
        // Fallback to local session if present
        const local = getCurrentSession();
        if (local) {
          setCurrentUser(local);
        }
        setIsCloudConnected(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Real-time Firestore synchronization when user is authenticated with Firebase
  useEffect(() => {
    if (!currentUser) return;

    if (isCloudConnected && auth.currentUser) {
      setIsSyncing(true);

      // Perform initial migration if cloud is empty
      const localCuentas = loadCuentas();
      const localDrivers = loadDriverProfiles();
      const localSettings = loadSettings();

      syncInitialDataToCloud(
        auth.currentUser.uid,
        auth.currentUser.email || undefined,
        localCuentas,
        localDrivers,
        localSettings
      ).then(() => {
        setIsSyncing(false);
      });

      // 1. Subscribe to Cuentas in Cloud
      const unsubCuentas = subscribeToCuentas(
        auth.currentUser.uid,
        auth.currentUser.email || undefined,
        (cloudCuentas) => {
          if (cloudCuentas && cloudCuentas.length > 0) {
            setCuentas(cloudCuentas);
          } else {
            // If cloud is fresh, maintain local accounts
            setCuentas(loadCuentas());
          }
        },
        (err) => console.warn('Cuentas sync issue:', err)
      );

      // 2. Subscribe to Drivers in Cloud
      const unsubDrivers = subscribeToDrivers(
        auth.currentUser.uid,
        auth.currentUser.email || undefined,
        (cloudDrivers) => {
          if (cloudDrivers && cloudDrivers.length > 0) {
            setDrivers(cloudDrivers);
          } else {
            setDrivers(loadDriverProfiles());
          }
        },
        (err) => console.warn('Drivers sync issue:', err)
      );

      // 3. Subscribe to Settings in Cloud
      const unsubSettings = subscribeToSettings(
        (cloudSettings) => {
          setSettings(cloudSettings);
        },
        (err) => console.warn('Settings sync issue:', err)
      );

      return () => {
        unsubCuentas();
        unsubDrivers();
        unsubSettings();
      };
    } else {
      // Local storage mode
      refreshData();
    }
  }, [currentUser?.id, isCloudConnected]);

  const refreshData = () => {
    setCuentas(loadCuentas());
    setDrivers(loadDriverProfiles());
    setSettings(loadSettings());
  };

  const handleLogout = async () => {
    try {
      if (isCloudConnected) {
        await logOutFromFirebase();
      }
    } catch (e) {
      console.warn('Logout error:', e);
    }
    logoutUser();
    setCurrentUser(null);
    setIsCloudConnected(false);
    setCurrentTab('form');
    setSelectedCuenta(null);
  };

  // Connect Google account for cloud synchronization
  const handleConnectGoogle = async () => {
    setIsSyncing(true);
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
        setCurrentUser(authUser);
        setIsCloudConnected(true);
        setSyncFeedback('¡Conectado exitosamente a la nube! Tus datos ahora se sincronizan en cualquier dispositivo.');
        setTimeout(() => setSyncFeedback(null), 5000);
      }
    } catch (error) {
      console.error('Failed to connect Google:', error);
      setSyncFeedback('No se pudo conectar con Google. Por favor intenta de nuevo.');
      setTimeout(() => setSyncFeedback(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Force manual full sync from local to cloud
  const handleForceSync = async () => {
    if (!currentUser) return;
    setIsSyncing(true);
    setSyncFeedback('Sincronizando todas las cuentas y conductores con la nube...');
    try {
      const targetUserId = auth.currentUser ? auth.currentUser.uid : currentUser.id;
      const targetEmail = auth.currentUser?.email || currentUser.email;

      // 1. Upload settings
      await saveSettingsCloud(settings, targetUserId);

      // 2. Upload cuentas
      for (const c of cuentas) {
        await saveCuentaCloud(c, targetUserId, targetEmail);
      }

      // 3. Upload drivers
      for (const d of drivers) {
        await saveDriverCloud(d, targetUserId);
      }

      setSyncFeedback('¡Sincronización completada! Todos tus datos están guardados en la nube.');
      setTimeout(() => setSyncFeedback(null), 4000);
    } catch (err) {
      console.error('Error during manual sync:', err);
      setSyncFeedback('Error al sincronizar con la nube. Verifica tu conexión.');
      setTimeout(() => setSyncFeedback(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Generate / Save Cuenta
  const handleGenerate = async (cuenta: CuentaDeCobro) => {
    // 1. Save in local storage (instant responsive UI & offline fallback)
    saveCuenta(cuenta);

    // 2. Save in Cloud Firestore if authenticated
    if (isCloudConnected && auth.currentUser) {
      try {
        await saveCuentaCloud(cuenta, auth.currentUser.uid, auth.currentUser.email || undefined);
        // Also update nextConsecutive in cloud settings
        const currentSet = loadSettings();
        await saveSettingsCloud(currentSet, auth.currentUser.uid);
      } catch (err) {
        console.error('Failed to save cuenta to cloud:', err);
      }
    }

    refreshData();
    setSelectedCuenta(cuenta);
    setCurrentTab('preview');
  };

  // Edit an existing cuenta
  const handleEdit = (cuenta: CuentaDeCobro) => {
    setSelectedCuenta(cuenta);
    setCurrentTab('form');
  };

  // Duplicate an existing cuenta with next consecutive
  const handleDuplicate = (cuenta: CuentaDeCobro) => {
    const next = getNextConsecutive();
    const duplicated: CuentaDeCobro = {
      ...cuenta,
      id: `cc-${next.number}-${Date.now()}`,
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
      id: `cc-${next.number}-${Date.now()}`,
      consecutive: next.number,
      consecutiveFormatted: next.formatted,
      date: today,
      paymentDueDate: defaultDue.toISOString().split('T')[0],
      city: settings.defaultCity || 'Barranquilla',
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
  const handleDeleteCuenta = async (id: string) => {
    deleteCuenta(id);
    if (isCloudConnected && auth.currentUser) {
      try {
        await deleteCuentaCloud(id);
      } catch (err) {
        console.error('Failed to delete cuenta from cloud:', err);
      }
    }
    refreshData();
    if (selectedCuenta?.id === id) {
      setSelectedCuenta(null);
      setCurrentTab('history');
    }
  };

  // Status Change
  const handleStatusChange = async (id: string, status: CuentaStatus) => {
    updateCuentaStatus(id, status);
    if (isCloudConnected && auth.currentUser) {
      try {
        await updateCuentaStatusCloud(id, status);
      } catch (err) {
        console.error('Failed to update status in cloud:', err);
      }
    }
    refreshData();
    if (selectedCuenta && selectedCuenta.id === id) {
      setSelectedCuenta({ ...selectedCuenta, status });
    }
  };

  // Save Driver handler for ConductoresPlacas
  const handleSaveDriver = async (driver: DriverProfile) => {
    if (isCloudConnected && auth.currentUser) {
      try {
        await saveDriverCloud(driver, auth.currentUser.uid);
      } catch (err) {
        console.error('Failed to save driver to cloud:', err);
      }
    }
  };

  // Delete Driver handler for ConductoresPlacas
  const handleDeleteDriver = async (id: string) => {
    if (isCloudConnected && auth.currentUser) {
      try {
        await deleteDriverCloud(id);
      } catch (err) {
        console.error('Failed to delete driver from cloud:', err);
      }
    }
  };

  // Settings updated handler
  const handleSettingsUpdated = async () => {
    const updated = loadSettings();
    setSettings(updated);
    if (isCloudConnected && auth.currentUser) {
      try {
        await saveSettingsCloud(updated, auth.currentUser.uid);
      } catch (err) {
        console.error('Failed to save settings to cloud:', err);
      }
    }
  };

  // New blank form
  const handleStartNew = () => {
    setSelectedCuenta(null);
    setCurrentTab('form');
  };

  // If user is not authenticated, render corporate Login Screen
  if (!currentUser) {
    return (
      <LoginScreen
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          if (user.isGoogleUser) {
            setIsCloudConnected(true);
          }
        }}
        companyName={settings.companyName}
        companyNit={settings.companyNit}
      />
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
        currentUser={currentUser}
        onLogout={handleLogout}
        isCloudConnected={isCloudConnected}
        isSyncing={isSyncing}
        onConnectGoogle={handleConnectGoogle}
        onSyncNow={handleForceSync}
      />

      {/* Cloud Status Informational Banner */}
      {syncBannerVisible && (
        <div className="no-print bg-emerald-900 text-emerald-100 text-xs px-4 py-2 border-b border-emerald-800">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {isCloudConnected ? (
                  <>
                    <strong className="font-semibold text-emerald-200">Alojamiento en la Web Activo:</strong> Tus cuentas y datos están guardados en la nube y sincronizados en tiempo real para ser vistos y editados desde cualquier otro celular, tablet o PC.
                  </>
                ) : (
                  <>
                    <strong className="font-semibold text-amber-300">Modo Local:</strong> Conecta tu cuenta de Google para guardar en la web y sincronizar en todos tus dispositivos.
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {!isCloudConnected && (
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded text-[11px] transition-colors cursor-pointer"
                >
                  Conectar con Google
                </button>
              )}
              {isCloudConnected && (
                <button
                  type="button"
                  onClick={handleForceSync}
                  title="Sincronizar ahora"
                  className="flex items-center gap-1 px-2 py-0.5 bg-emerald-800 hover:bg-emerald-700 rounded text-[11px] text-emerald-200 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Sincronizar</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSyncBannerVisible(false)}
                className="text-emerald-400 hover:text-white p-0.5 cursor-pointer"
                title="Cerrar aviso"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Temporary Feedback Message */}
      {syncFeedback && (
        <div className="no-print max-w-2xl mx-auto mt-3 px-4 w-full">
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs font-semibold text-emerald-900 shadow-sm flex items-center justify-between animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{syncFeedback}</span>
            </div>
            <button
              onClick={() => setSyncFeedback(null)}
              className="text-emerald-700 hover:text-emerald-950"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 py-6 px-4 sm:px-6 lg:px-8">
        {currentTab === 'form' && (
          <CuentaForm
            onGenerate={handleGenerate}
            onLoadPrevious={() => setCurrentTab('history')}
            initialCuenta={selectedCuenta}
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
          />
        )}

        {currentTab === 'drivers' && (
          <ConductoresPlacas
            drivers={drivers}
            onRefresh={refreshData}
            onSelectForCuenta={handleSelectDriverForCuenta}
            onSaveDriver={handleSaveDriver}
            onDeleteDriver={handleDeleteDriver}
          />
        )}
      </main>

      {/* Settings & Backup Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsUpdated={handleSettingsUpdated}
        isCloudConnected={isCloudConnected}
        onConnectGoogle={handleConnectGoogle}
        onForceSync={handleForceSync}
      />
    </div>
  );
}
