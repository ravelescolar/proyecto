import { AppSettings, CuentaDeCobro, DriverProfile } from '../types';

const STORAGE_KEYS = {
  SETTINGS: 'ravel_cuentas_settings_v1',
  CUENTAS: 'ravel_cuentas_list_v1',
  DRIVERS: 'ravel_driver_profiles_v1',
  DRAFT: 'ravel_cuenta_draft_v1',
};

export const DEFAULT_SETTINGS: AppSettings = {
  prefix: 'CC-',
  nextConsecutive: 101,
  companyName: 'TRANSPORTES RAVEL',
  companyNit: '900.388.163-2',
  companyAddress: 'Cra. 53 #76-120, Barranquilla, Atlántico',
  companyPhone: '(+57) 300 812 4590',
  companyEmail: 'ravelescolar@gmail.com',
  defaultCity: 'Barranquilla',
  defaultConcept: 'Por concepto de servicio de transporte terrestre de pasajeros prestado durante el período correspondiente, según la relación detallada de servicios adjunta.',
};

export const INITIAL_DRIVERS: DriverProfile[] = [
  {
    id: 'drv-1',
    plate: 'WDF-452',
    driverName: 'CARLOS ALBERTO MARTÍNEZ R.',
    idNumber: '72.345.890',
    phone: '3012345678',
    paymentData: {
      bank: 'Bancolombia',
      accountNumber: '459-823410-12',
      accountType: 'Ahorros',
      accountHolder: 'Carlos Alberto Martínez R.',
      identification: '72.345.890',
    },
    frequentClients: [
      'Colegio San José - Ruta Escolar Primaria',
      'Servicio Expreso Ruta 17 - Vía al Mar',
      'Colegio Biffi La Salle - Recorrido Tarde',
      'Universidad del Norte - Traslado de Docentes',
    ],
    totalAccountsGenerated: 12,
    lastUsedAt: '2026-09-20T10:00:00Z',
  },
  {
    id: 'drv-2',
    plate: 'TZO-891',
    driverName: 'JOSÉ LUIS RODRÍGUEZ POLO',
    idNumber: '8.765.432',
    phone: '3109876543',
    paymentData: {
      bank: 'Daviplata',
      accountNumber: '3109876543',
      accountType: 'Daviplata',
      accountHolder: 'José Luis Rodríguez Polo',
      identification: '8.765.432',
    },
    frequentClients: [
      'Colegio Alemán - Ruta Norte',
      'Servicio Corporativo Argencat',
      'Colegio Marymount - Ruta Escolar',
    ],
    totalAccountsGenerated: 8,
    lastUsedAt: '2026-09-22T14:30:00Z',
  },
  {
    id: 'drv-3',
    plate: 'SYK-104',
    driverName: 'WILSON ENRIQUE HERRERA G.',
    idNumber: '1.045.678.901',
    phone: '3157654321',
    paymentData: {
      bank: 'Nequi',
      accountNumber: '3157654321',
      accountType: 'Nequi',
      accountHolder: 'Wilson Enrique Herrera G.',
      identification: '1.045.678.901',
    },
    frequentClients: [
      'Colegio Real Royal School - Ruta 4',
      'Servicio Especial de Pasajeros Barranquilla - Cartagena',
      'Clínica Portoazul - Transporte de Personal',
    ],
    totalAccountsGenerated: 5,
    lastUsedAt: '2026-09-25T09:15:00Z',
  },
];

export const INITIAL_CUENTAS: CuentaDeCobro[] = [
  {
    id: 'cc-0100',
    consecutive: 100,
    consecutiveFormatted: 'CC-0100',
    date: '2026-09-22',
    paymentDueDate: '2026-09-28',
    city: 'Barranquilla',
    companyName: 'TRANSPORTES RAVEL',
    companyNit: '900.388.163-2',
    driverName: 'CARLOS ALBERTO MARTÍNEZ R.',
    driverId: '72.345.890',
    vehiclePlate: 'WDF-452',
    driverPhone: '3012345678',
    services: [
      {
        id: 'srv-1',
        date: '2026-09-15',
        plate: 'WDF-452',
        clientDetail: 'Colegio San José - Ruta Escolar Mañana y Tarde',
        value: 480000,
      },
      {
        id: 'srv-2',
        date: '2026-09-18',
        plate: 'WDF-452',
        clientDetail: 'Servicio Expreso Ruta 17 - Vía al Mar',
        value: 280000,
      },
      {
        id: 'srv-3',
        date: '2026-09-20',
        plate: 'WDF-452',
        clientDetail: 'Universidad del Norte - Traslado de Docentes',
        value: 350000,
      },
    ],
    totalAmount: 1110000,
    amountInWords: 'UN MILLÓN CIENTO DIEZ MIL PESOS M/CTE.',
    legalConcept:
      'Por concepto de servicio de transporte terrestre de pasajeros prestado durante el período correspondiente, según la relación detallada de servicios adjunta.',
    paymentData: {
      bank: 'Bancolombia',
      accountNumber: '459-823410-12',
      accountType: 'Ahorros',
      accountHolder: 'Carlos Alberto Martínez R.',
      identification: '72.345.890',
    },
    status: 'emitida',
    createdAt: '2026-09-22T10:00:00Z',
    updatedAt: '2026-09-22T10:00:00Z',
  },
];

export function formatConsecutive(prefix: string, num: number): string {
  const pad = num.toString().padStart(4, '0');
  return `${prefix || 'CC-'}${pad}`;
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings', e);
  }
}

export function loadDriverProfiles(): DriverProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DRIVERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.DRIVERS, JSON.stringify(INITIAL_DRIVERS));
      return INITIAL_DRIVERS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DRIVERS;
  }
}

export function saveDriverProfile(driver: Partial<DriverProfile> & { plate: string; driverName: string }): DriverProfile {
  const profiles = loadDriverProfiles();
  const normalizedPlate = driver.plate.trim().toUpperCase();

  const existingIndex = profiles.findIndex(
    (p) => p.plate.replace(/[^A-Z0-9]/g, '') === normalizedPlate.replace(/[^A-Z0-9]/g, '')
  );

  let updatedProfile: DriverProfile;

  if (existingIndex >= 0) {
    const current = profiles[existingIndex];
    // Merge frequent clients uniquely
    const newClients = driver.frequentClients || [];
    const mergedClients = Array.from(new Set([...newClients, ...current.frequentClients])).filter(Boolean);

    updatedProfile = {
      ...current,
      ...driver,
      plate: normalizedPlate,
      frequentClients: mergedClients,
      lastUsedAt: new Date().toISOString(),
    };
    profiles[existingIndex] = updatedProfile;
  } else {
    updatedProfile = {
      id: `drv-${Date.now()}`,
      plate: normalizedPlate,
      driverName: driver.driverName || '',
      idNumber: driver.idNumber || '',
      phone: driver.phone || '',
      paymentData: driver.paymentData || {
        bank: 'Bancolombia',
        accountNumber: '',
        accountType: 'Ahorros',
        accountHolder: driver.driverName || '',
        identification: driver.idNumber || '',
      },
      frequentClients: driver.frequentClients || [],
      totalAccountsGenerated: 1,
      lastUsedAt: new Date().toISOString(),
    };
    profiles.unshift(updatedProfile);
  }

  try {
    localStorage.setItem(STORAGE_KEYS.DRIVERS, JSON.stringify(profiles));
  } catch (e) {
    console.error('Error saving driver profile', e);
  }

  return updatedProfile;
}

export function deleteDriverProfile(id: string): void {
  const profiles = loadDriverProfiles().filter((p) => p.id !== id);
  try {
    localStorage.setItem(STORAGE_KEYS.DRIVERS, JSON.stringify(profiles));
  } catch (e) {
    console.error('Error deleting profile', e);
  }
}

export function findDriverByPlate(plateQuery: string): DriverProfile | undefined {
  if (!plateQuery) return undefined;
  const cleanQuery = plateQuery.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!cleanQuery) return undefined;

  const profiles = loadDriverProfiles();
  return profiles.find((p) => p.plate.replace(/[^A-Z0-9]/g, '') === cleanQuery);
}

export function loadCuentas(): CuentaDeCobro[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUENTAS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CUENTAS, JSON.stringify(INITIAL_CUENTAS));
      return INITIAL_CUENTAS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_CUENTAS;
  }
}

export function saveCuenta(cuenta: CuentaDeCobro): void {
  const cuentas = loadCuentas();
  const existingIdx = cuentas.findIndex((c) => c.id === cuenta.id);

  if (existingIdx >= 0) {
    cuentas[existingIdx] = { ...cuenta, updatedAt: new Date().toISOString() };
  } else {
    cuentas.unshift(cuenta);
    // Increment consecutive in settings if it matches next
    const settings = loadSettings();
    if (cuenta.consecutive >= settings.nextConsecutive) {
      settings.nextConsecutive = cuenta.consecutive + 1;
      saveSettings(settings);
    }
  }

  try {
    localStorage.setItem(STORAGE_KEYS.CUENTAS, JSON.stringify(cuentas));
  } catch (e) {
    console.error('Error saving cuenta', e);
  }

  // Also update driver profile with plate, ID, payment data and clients
  const clientNames = cuenta.services.map((s) => s.clientDetail.trim()).filter(Boolean);
  saveDriverProfile({
    plate: cuenta.vehiclePlate,
    driverName: cuenta.driverName,
    idNumber: cuenta.driverId,
    phone: cuenta.driverPhone,
    paymentData: cuenta.paymentData,
    frequentClients: clientNames,
  });
}

export function deleteCuenta(id: string): void {
  const cuentas = loadCuentas().filter((c) => c.id !== id);
  try {
    localStorage.setItem(STORAGE_KEYS.CUENTAS, JSON.stringify(cuentas));
  } catch (e) {
    console.error('Error deleting cuenta', e);
  }
}

export function updateCuentaStatus(id: string, status: CuentaDeCobro['status']): void {
  const cuentas = loadCuentas();
  const item = cuentas.find((c) => c.id === id);
  if (item) {
    item.status = status;
    item.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.CUENTAS, JSON.stringify(cuentas));
  }
}

export function getNextConsecutive(): { number: number; formatted: string } {
  const settings = loadSettings();
  return {
    number: settings.nextConsecutive,
    formatted: formatConsecutive(settings.prefix, settings.nextConsecutive),
  };
}

export function exportAllData(): string {
  const backup = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    settings: loadSettings(),
    cuentas: loadCuentas(),
    drivers: loadDriverProfiles(),
  };
  return JSON.stringify(backup, null, 2);
}

export function importAllData(jsonData: string): boolean {
  try {
    const parsed = JSON.parse(jsonData);
    if (parsed.settings) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(parsed.settings));
    if (Array.isArray(parsed.cuentas)) localStorage.setItem(STORAGE_KEYS.CUENTAS, JSON.stringify(parsed.cuentas));
    if (Array.isArray(parsed.drivers)) localStorage.setItem(STORAGE_KEYS.DRIVERS, JSON.stringify(parsed.drivers));
    return true;
  } catch (e) {
    console.error('Error importing data', e);
    return false;
  }
}
