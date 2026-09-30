/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CuentaDeCobro, DriverProfile, AppSettings, CuentaStatus } from './types';
import {
  loadCuentas,
  saveCuenta,
  deleteCuenta,
  updateCuentaStatus,
  loadDriverProfiles,
  loadSettings,
  getNextConsecutive,
  formatConsecutive
} from './utils/storage';
import { Header } from './components/Header';
import { CuentaForm } from './components/CuentaForm';
import { DocumentPreview } from './components/DocumentPreview';
import { HistorialCuentas } from './components/HistorialCuentas';
import { ConductoresPlacas } from './components/ConductoresPlacas';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'form' | 'preview' | 'history' | 'drivers'>('form');
  const [cuentas, setCuentas] = useState<CuentaDeCobro[]>([]);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [settings, setSettings] = useState<AppSettings>(loadSettings());

  // Currently viewed or edited Cuenta
  const [selectedCuenta, setSelectedCuenta] = useState<CuentaDeCobro | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Initialize data on mount
  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setCuentas(loadCuentas());
    setDrivers(loadDriverProfiles());
    setSettings(loadSettings());
  };

  // Generate / Save Cuenta
  const handleGenerate = (cuenta: CuentaDeCobro) => {
    saveCuenta(cuenta);
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-white to-emerald-50/20 text-slate-800 flex flex-col font-sans">
      <Header
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'form' && currentTab !== 'form') {
            // Keep existing form state or open empty
          }
          setCurrentTab(tab);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        cuentasCount={cuentas.length}
        driversCount={drivers.length}
        settings={settings}
      />

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
          />
        )}
      </main>

      {/* Settings & Backup Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsUpdated={refreshData}
      />
    </div>
  );
}
