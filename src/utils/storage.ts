import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  writeBatch,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { AppSettings, CuentaDeCobro, DriverProfile, PaymentData, ServiceItem } from '../types';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';

const LEGACY_STORAGE_KEYS = {
  SETTINGS: 'ravel_cuentas_settings_v1',
  CUENTAS: 'ravel_cuentas_list_v1',
  DRIVERS: 'ravel_driver_profiles_v1',
};

// Validation Synchronicity Constants (matching firebase-blueprint.json & firestore.rules verbatim)
export const VALIDATION_LIMITS = {
  ID_MAX_LEN: 128,
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  PREFIX_MAX_LEN: 10,
  CONSECUTIVE_MIN: 1,
  CONSECUTIVE_MAX: 9999999,
  CONSECUTIVE_FMT_MAX_LEN: 30,
  DATE_MAX_LEN: 30,
  CITY_MAX_LEN: 100,
  COMPANY_NAME_MAX_LEN: 150,
  COMPANY_NIT_MAX_LEN: 50,
  COMPANY_ADDRESS_MAX_LEN: 200,
  COMPANY_PHONE_MAX_LEN: 50,
  COMPANY_EMAIL_MAX_LEN: 150,
  CONCEPT_MAX_LEN: 1000,
  LOGO_URL_MAX_LEN: 500000,
  SIGNATURE_URL_MAX_LEN: 500000,
  DRIVER_NAME_MAX_LEN: 150,
  DRIVER_ID_MAX_LEN: 50,
  PLATE_MAX_LEN: 20,
  PHONE_MAX_LEN: 50,
  BANK_MAX_LEN: 100,
  ACCOUNT_NUM_MAX_LEN: 100,
  ACCOUNT_TYPE_MAX_LEN: 50,
  ACCOUNT_HOLDER_MAX_LEN: 150,
  IDENTIFICATION_MAX_LEN: 50,
  FREQUENT_CLIENTS_MAX_ITEMS: 10,
  FREQUENT_CLIENT_MAX_LEN: 200,
  AMOUNT_WORDS_MAX_LEN: 500,
  NOTES_MAX_LEN: 1000,
  CLIENT_DETAIL_MAX_LEN: 300,
  MAX_AMOUNT: 999999999999,
} as const;

const VALID_ACCOUNT_TYPES: PaymentData['accountType'][] = [
  'Ahorros',
  'Corriente',
  'Nequi',
  'Daviplata',
  'Depósito de bajo monto',
  'Otro',
];

const VALID_STATUSES: CuentaDeCobro['status'][] = ['emitida', 'pagada', 'anulada'];

export function sanitizeId(rawId: string, fallbackPrefix = 'id'): string {
  const cleaned = (rawId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, VALIDATION_LIMITS.ID_MAX_LEN);
  if (!cleaned || !VALIDATION_LIMITS.ID_PATTERN.test(cleaned)) {
    return `${fallbackPrefix}-${Date.now()}`;
  }
  return cleaned;
}

function clampString(val: string | undefined | null, maxLen: number, fallback = ''): string {
  const str = (val ?? fallback).toString().trim();
  if (!str && fallback) return fallback.slice(0, maxLen);
  return str.slice(0, maxLen);
}

function clampNumber(val: number | undefined | null, min: number, max: number, fallback = 0): number {
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function sanitizeAccountType(val: string | undefined): PaymentData['accountType'] {
  if (val && VALID_ACCOUNT_TYPES.includes(val as PaymentData['accountType'])) {
    return val as PaymentData['accountType'];
  }
  return 'Ahorros';
}

function sanitizeStatus(val: string | undefined): CuentaDeCobro['status'] {
  if (val && VALID_STATUSES.includes(val as CuentaDeCobro['status'])) {
    return val as CuentaDeCobro['status'];
  }
  return 'emitida';
}

function timestampToIso(ts: unknown, fallback?: string): string {
  if (ts instanceof Timestamp) {
    return ts.toDate().toISOString();
  }
  if (typeof ts === 'string' && ts.trim()) {
    return ts;
  }
  return fallback || new Date().toISOString();
}

export const DEFAULT_SETTINGS: AppSettings = {
  prefix: 'CC-',
  nextConsecutive: 101,
  companyName: 'TRANSPORTES RAVEL',
  companyNit: '900.388.163-2',
  companyAddress: 'Cra. 53 #76-120, Barranquilla, Atlántico',
  companyPhone: '(+57) 300 812 4590',
  companyEmail: 'ravelescolar@gmail.com',
  defaultCity: 'Barranquilla',
  defaultConcept:
    'Por concepto de servicio de transporte terrestre de pasajeros prestado durante el período correspondiente, según la relación detallada de servicios adjunta.',
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

// In-memory state synchronized with Firebase Firestore
let cachedSettings: AppSettings = { ...DEFAULT_SETTINGS };
let cachedDrivers: DriverProfile[] = [];
let cachedCuentas: CuentaDeCobro[] = [];
let knownSettingExists = false;
const knownDriverIds = new Set<string>();
const knownCuentaIds = new Set<string>();
const knownServiceIdsByCuenta = new Map<string, Set<string>>();

let activeListeners: Unsubscribe[] = [];
const serviceListenersByCuenta = new Map<string, Unsubscribe>();
let onDataChangeCallback: (() => void) | null = null;
let onSyncStateCallback: ((isSaving: boolean, lastError: string | null) => void) | null = null;
let pendingWritesCount = 0;

function notifyDataChanged() {
  if (onDataChangeCallback) {
    onDataChangeCallback();
  }
}

function beginWrite() {
  pendingWritesCount += 1;
  if (onSyncStateCallback) {
    onSyncStateCallback(pendingWritesCount > 0, null);
  }
}

function endWrite(errMessage: string | null = null) {
  pendingWritesCount = Math.max(0, pendingWritesCount - 1);
  if (onSyncStateCallback) {
    onSyncStateCallback(pendingWritesCount > 0, errMessage);
  }
}

export function setSyncStatusListener(
  cb: ((isSaving: boolean, lastError: string | null) => void) | null
) {
  onSyncStateCallback = cb;
}

export function formatConsecutive(prefix: string, num: number): string {
  const pad = num.toString().padStart(4, '0');
  return `${prefix || 'CC-'}${pad}`;
}

export function loadSettings(): AppSettings {
  return cachedSettings;
}

export function loadDriverProfiles(): DriverProfile[] {
  return cachedDrivers;
}

export function loadCuentas(): CuentaDeCobro[] {
  return cachedCuentas;
}

export function getNextConsecutive(): { number: number; formatted: string } {
  const settings = loadSettings();
  return {
    number: settings.nextConsecutive,
    formatted: formatConsecutive(settings.prefix, settings.nextConsecutive),
  };
}

export function findDriverByPlate(plateQuery: string): DriverProfile | undefined {
  if (!plateQuery) return undefined;
  const cleanQuery = plateQuery.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!cleanQuery) return undefined;

  const profiles = loadDriverProfiles();
  return profiles.find((p) => p.plate.replace(/[^A-Z0-9]/g, '') === cleanQuery);
}

// ============================================================================
// Firestore Serialization & Deserialization
// ============================================================================

function buildSettingsFirestorePayload(uid: string, s: AppSettings) {
  return {
    ownerId: uid,
    prefix: clampString(s.prefix, VALIDATION_LIMITS.PREFIX_MAX_LEN, 'CC-'),
    nextConsecutive: Math.round(
      clampNumber(
        s.nextConsecutive,
        VALIDATION_LIMITS.CONSECUTIVE_MIN,
        VALIDATION_LIMITS.CONSECUTIVE_MAX,
        101
      )
    ),
    companyName: clampString(
      s.companyName,
      VALIDATION_LIMITS.COMPANY_NAME_MAX_LEN,
      DEFAULT_SETTINGS.companyName
    ),
    companyNit: clampString(
      s.companyNit,
      VALIDATION_LIMITS.COMPANY_NIT_MAX_LEN,
      DEFAULT_SETTINGS.companyNit
    ),
    companyAddress: clampString(s.companyAddress, VALIDATION_LIMITS.COMPANY_ADDRESS_MAX_LEN, ''),
    companyPhone: clampString(s.companyPhone, VALIDATION_LIMITS.COMPANY_PHONE_MAX_LEN, ''),
    companyEmail: clampString(s.companyEmail, VALIDATION_LIMITS.COMPANY_EMAIL_MAX_LEN, ''),
    defaultCity: clampString(
      s.defaultCity,
      VALIDATION_LIMITS.CITY_MAX_LEN,
      DEFAULT_SETTINGS.defaultCity
    ),
    defaultConcept: clampString(
      s.defaultConcept,
      VALIDATION_LIMITS.CONCEPT_MAX_LEN,
      DEFAULT_SETTINGS.defaultConcept
    ),
    companyLogoUrl: clampString(s.companyLogoUrl, VALIDATION_LIMITS.LOGO_URL_MAX_LEN, ''),
  };
}

function buildDriverFirestorePayload(uid: string, d: DriverProfile) {
  const cleanClients = (d.frequentClients || [])
    .map((c) => clampString(c, VALIDATION_LIMITS.FREQUENT_CLIENT_MAX_LEN, ''))
    .filter((c) => c.length >= 1)
    .slice(0, VALIDATION_LIMITS.FREQUENT_CLIENTS_MAX_ITEMS);

  return {
    ownerId: uid,
    plate: clampString(d.plate.toUpperCase(), VALIDATION_LIMITS.PLATE_MAX_LEN, 'SIN-PLACA'),
    driverName: clampString(d.driverName, VALIDATION_LIMITS.DRIVER_NAME_MAX_LEN, 'CONDUCTOR'),
    idNumber: clampString(d.idNumber, VALIDATION_LIMITS.DRIVER_ID_MAX_LEN, ''),
    phone: clampString(d.phone, VALIDATION_LIMITS.PHONE_MAX_LEN, ''),
    paymentBank: clampString(d.paymentData?.bank, VALIDATION_LIMITS.BANK_MAX_LEN, 'Bancolombia'),
    paymentAccountNumber: clampString(
      d.paymentData?.accountNumber,
      VALIDATION_LIMITS.ACCOUNT_NUM_MAX_LEN,
      ''
    ),
    paymentAccountType: sanitizeAccountType(d.paymentData?.accountType),
    paymentAccountHolder: clampString(
      d.paymentData?.accountHolder || d.driverName,
      VALIDATION_LIMITS.ACCOUNT_HOLDER_MAX_LEN,
      ''
    ),
    paymentIdentification: clampString(
      d.paymentData?.identification || d.idNumber,
      VALIDATION_LIMITS.IDENTIFICATION_MAX_LEN,
      ''
    ),
    frequentClients: cleanClients,
    totalAccountsGenerated: Math.round(
      clampNumber(d.totalAccountsGenerated, 0, 999999, 1)
    ),
    lastUsedAt: clampString(
      d.lastUsedAt || new Date().toISOString(),
      VALIDATION_LIMITS.DATE_MAX_LEN,
      new Date().toISOString()
    ),
  };
}

function buildCuentaFirestorePayload(uid: string, c: CuentaDeCobro) {
  return {
    ownerId: uid,
    consecutive: Math.round(
      clampNumber(
        c.consecutive,
        VALIDATION_LIMITS.CONSECUTIVE_MIN,
        VALIDATION_LIMITS.CONSECUTIVE_MAX,
        1
      )
    ),
    consecutiveFormatted: clampString(
      c.consecutiveFormatted,
      VALIDATION_LIMITS.CONSECUTIVE_FMT_MAX_LEN,
      'CC-0001'
    ),
    date: clampString(
      c.date,
      VALIDATION_LIMITS.DATE_MAX_LEN,
      new Date().toISOString().split('T')[0]
    ),
    paymentDueDate: clampString(
      c.paymentDueDate || c.date,
      VALIDATION_LIMITS.DATE_MAX_LEN,
      new Date().toISOString().split('T')[0]
    ),
    city: clampString(c.city, VALIDATION_LIMITS.CITY_MAX_LEN, 'Barranquilla'),
    companyName: clampString(
      c.companyName,
      VALIDATION_LIMITS.COMPANY_NAME_MAX_LEN,
      DEFAULT_SETTINGS.companyName
    ),
    companyNit: clampString(
      c.companyNit,
      VALIDATION_LIMITS.COMPANY_NIT_MAX_LEN,
      DEFAULT_SETTINGS.companyNit
    ),
    driverName: clampString(c.driverName, VALIDATION_LIMITS.DRIVER_NAME_MAX_LEN, 'CONDUCTOR'),
    driverId: clampString(c.driverId, VALIDATION_LIMITS.DRIVER_ID_MAX_LEN, '0'),
    vehiclePlate: clampString(
      c.vehiclePlate.toUpperCase(),
      VALIDATION_LIMITS.PLATE_MAX_LEN,
      'SIN-PLACA'
    ),
    driverPhone: clampString(c.driverPhone, VALIDATION_LIMITS.PHONE_MAX_LEN, ''),
    totalAmount: clampNumber(c.totalAmount, 0, VALIDATION_LIMITS.MAX_AMOUNT, 0),
    amountInWords: clampString(
      c.amountInWords,
      VALIDATION_LIMITS.AMOUNT_WORDS_MAX_LEN,
      'CERO PESOS M/CTE.'
    ),
    legalConcept: clampString(
      c.legalConcept,
      VALIDATION_LIMITS.CONCEPT_MAX_LEN,
      DEFAULT_SETTINGS.defaultConcept
    ),
    paymentBank: clampString(c.paymentData?.bank, VALIDATION_LIMITS.BANK_MAX_LEN, 'Bancolombia'),
    paymentAccountNumber: clampString(
      c.paymentData?.accountNumber,
      VALIDATION_LIMITS.ACCOUNT_NUM_MAX_LEN,
      '0'
    ),
    paymentAccountType: sanitizeAccountType(c.paymentData?.accountType),
    paymentAccountHolder: clampString(
      c.paymentData?.accountHolder || c.driverName,
      VALIDATION_LIMITS.ACCOUNT_HOLDER_MAX_LEN,
      ''
    ),
    paymentIdentification: clampString(
      c.paymentData?.identification || c.driverId,
      VALIDATION_LIMITS.IDENTIFICATION_MAX_LEN,
      ''
    ),
    signatureDataUrl: clampString(c.signatureDataUrl, VALIDATION_LIMITS.SIGNATURE_URL_MAX_LEN, ''),
    companyLogoUrl: clampString(c.companyLogoUrl, VALIDATION_LIMITS.LOGO_URL_MAX_LEN, ''),
    notes: clampString(c.notes, VALIDATION_LIMITS.NOTES_MAX_LEN, ''),
    status: sanitizeStatus(c.status),
  };
}

function buildServiceItemFirestorePayload(
  uid: string,
  cuentaId: string,
  s: ServiceItem,
  orderIndex: number,
  defaultPlate: string
) {
  return {
    ownerId: uid,
    cuentaId,
    orderIndex: Math.round(clampNumber(orderIndex, 0, 1000, 0)),
    date: clampString(
      s.date,
      VALIDATION_LIMITS.DATE_MAX_LEN,
      new Date().toISOString().split('T')[0]
    ),
    plate: clampString(
      (s.plate || defaultPlate || 'SIN-PLACA').toUpperCase(),
      VALIDATION_LIMITS.PLATE_MAX_LEN,
      'SIN-PLACA'
    ),
    clientDetail: clampString(s.clientDetail, VALIDATION_LIMITS.CLIENT_DETAIL_MAX_LEN, ''),
    value: clampNumber(s.value, 0, VALIDATION_LIMITS.MAX_AMOUNT, 0),
  };
}

// ============================================================================
// Real-Time Synchronization & Initial Bootstrap in Firestore
// ============================================================================

export function stopFirebaseSync(): void {
  activeListeners.forEach((unsub) => unsub());
  activeListeners = [];
  serviceListenersByCuenta.forEach((unsub) => unsub());
  serviceListenersByCuenta.clear();
  knownSettingExists = false;
  knownDriverIds.clear();
  knownCuentaIds.clear();
  knownServiceIdsByCuenta.clear();
}

async function seedOrMigrateInitialUserData(uid: string): Promise<void> {
  // Use where('ownerId', '==', uid) queries so we NEVER trigger allow get on a non-existent doc!
  let settingsSnap;
  let driversSnap;
  let cuentasSnap;

  try {
    [settingsSnap, driversSnap, cuentasSnap] = await Promise.all([
      getDocs(query(collection(db, 'settings'), where('ownerId', '==', uid))),
      getDocs(query(collection(db, 'drivers'), where('ownerId', '==', uid))),
      getDocs(query(collection(db, 'cuentas'), where('ownerId', '==', uid))),
    ]);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'settings/drivers/cuentas');
  }

  if (!settingsSnap.empty) {
    knownSettingExists = true;
  }
  driversSnap.forEach((d) => knownDriverIds.add(d.id));
  cuentasSnap.forEach((c) => knownCuentaIds.add(c.id));

  // If user already has any data in Firestore, only ensure settings/{uid} exists if missing
  if (!settingsSnap.empty || !driversSnap.empty || !cuentasSnap.empty) {
    if (settingsSnap.empty) {
      let maxConsecutive = 100;
      cuentasSnap.forEach((c) => {
        const num = Number(c.data().consecutive) || 100;
        if (num > maxConsecutive) maxConsecutive = num;
      });
      const initialSettingsPayload = buildSettingsFirestorePayload(uid, {
        ...DEFAULT_SETTINGS,
        nextConsecutive: maxConsecutive + 1,
      });
      try {
        await setDoc(doc(db, 'settings', uid), {
          ...initialSettingsPayload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        knownSettingExists = true;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `settings/${uid}`);
      }
    }
    return;
  }

  // Brand-new account in Firestore: migrate from legacy localStorage if present, or seed defaults
  let initialSettings: AppSettings = { ...DEFAULT_SETTINGS };
  let initialDrivers: DriverProfile[] = INITIAL_DRIVERS.map((d, idx) => ({
    ...d,
    id: sanitizeId(`${uid.slice(0, 8)}-drv-${idx + 1}`, 'drv'),
  }));
  let initialCuentas: CuentaDeCobro[] = INITIAL_CUENTAS.map((c, idx) => ({
    ...c,
    id: sanitizeId(`${uid.slice(0, 8)}-cc-${100 + idx}`, 'cc'),
  }));

  try {
    const rawSettings = localStorage.getItem(LEGACY_STORAGE_KEYS.SETTINGS);
    if (rawSettings) {
      initialSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) };
    }
    const rawDrivers = localStorage.getItem(LEGACY_STORAGE_KEYS.DRIVERS);
    if (rawDrivers) {
      const parsedDrivers = JSON.parse(rawDrivers);
      if (Array.isArray(parsedDrivers) && parsedDrivers.length > 0) {
        initialDrivers = parsedDrivers.map((d: DriverProfile, idx: number) => ({
          ...d,
          id: sanitizeId(`${uid.slice(0, 8)}-${d.id || `drv-${idx + 1}`}`, 'drv'),
        }));
      }
    }
    const rawCuentas = localStorage.getItem(LEGACY_STORAGE_KEYS.CUENTAS);
    if (rawCuentas) {
      const parsedCuentas = JSON.parse(rawCuentas);
      if (Array.isArray(parsedCuentas) && parsedCuentas.length > 0) {
        initialCuentas = parsedCuentas.map((c: CuentaDeCobro, idx: number) => ({
          ...c,
          id: sanitizeId(`${uid.slice(0, 8)}-${c.id || `cc-${idx + 1}`}`, 'cc'),
        }));
      }
    }
  } catch {
    // Ignore legacy localStorage parse errors
  }

  try {
    const batch = writeBatch(db);
    const settingsPayload = buildSettingsFirestorePayload(uid, initialSettings);
    batch.set(doc(db, 'settings', uid), {
      ...settingsPayload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    for (const drv of initialDrivers) {
      const drvId = sanitizeId(drv.id, 'drv');
      const drvPayload = buildDriverFirestorePayload(uid, { ...drv, id: drvId });
      batch.set(doc(db, 'drivers', drvId), {
        ...drvPayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      knownDriverIds.add(drvId);
    }

    for (const cta of initialCuentas) {
      const ctaId = sanitizeId(cta.id, 'cc');
      const ctaPayload = buildCuentaFirestorePayload(uid, { ...cta, id: ctaId });
      batch.set(doc(db, 'cuentas', ctaId), {
        ...ctaPayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      knownCuentaIds.add(ctaId);

      const srvSet = new Set<string>();
      const srvList = cta.services || [];
      srvList.forEach((srv, index) => {
        const srvId = sanitizeId(srv.id || `srv-${index + 1}`, 'srv');
        srvSet.add(srvId);
        const srvPayload = buildServiceItemFirestorePayload(
          uid,
          ctaId,
          srv,
          index,
          ctaPayload.vehiclePlate
        );
        batch.set(doc(db, 'cuentas', ctaId, 'services', srvId), {
          ...srvPayload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      knownServiceIdsByCuenta.set(ctaId, srvSet);
    }

    await batch.commit();
    knownSettingExists = true;

    try {
      localStorage.removeItem(LEGACY_STORAGE_KEYS.SETTINGS);
      localStorage.removeItem(LEGACY_STORAGE_KEYS.DRIVERS);
      localStorage.removeItem(LEGACY_STORAGE_KEYS.CUENTAS);
    } catch {
      // Ignore storage cleanup errors
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'initial_seed_batch');
  }
}

function attachServicesListenerForCuenta(uid: string, cuentaId: string) {
  if (serviceListenersByCuenta.has(cuentaId)) return;

  const servicesPath = `cuentas/${cuentaId}/services`;
  const srvQuery = query(
    collection(db, 'cuentas', cuentaId, 'services'),
    where('ownerId', '==', uid)
  );

  const unsub = onSnapshot(
    srvQuery,
    (srvSnap) => {
      const srvSet = new Set<string>();
      const rawServices: { item: ServiceItem; orderIndex: number }[] = [];
      srvSnap.forEach((sDoc) => {
        srvSet.add(sDoc.id);
        const sData = sDoc.data();
        rawServices.push({
          orderIndex: Number(sData.orderIndex) || 0,
          item: {
            id: sDoc.id,
            date: sData.date || '',
            plate: sData.plate || '',
            clientDetail: sData.clientDetail || '',
            value: Number(sData.value) || 0,
          },
        });
      });
      knownServiceIdsByCuenta.set(cuentaId, srvSet);
      rawServices.sort((a, b) => a.orderIndex - b.orderIndex);
      const services = rawServices.map((r) => r.item);

      const idx = cachedCuentas.findIndex((c) => c.id === cuentaId);
      if (idx >= 0) {
        const updated = [...cachedCuentas];
        updated[idx] = {
          ...updated[idx],
          services,
        };
        cachedCuentas = updated;
        notifyDataChanged();
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, servicesPath);
    }
  );

  serviceListenersByCuenta.set(cuentaId, unsub);
}

export async function startFirebaseSync(uid: string, onUpdate: () => void): Promise<void> {
  stopFirebaseSync();
  onDataChangeCallback = onUpdate;

  try {
    await seedOrMigrateInitialUserData(uid);
  } catch (err) {
    console.error('Warning during initial seed check:', err);
  }

  // 1. Listen to user settings via where('ownerId', '==', uid) query (uses allow list, safe even if empty)
  const settingsQuery = query(collection(db, 'settings'), where('ownerId', '==', uid));
  const unsubSettings = onSnapshot(
    settingsQuery,
    (querySnap) => {
      if (!querySnap.empty) {
        knownSettingExists = true;
        const data = querySnap.docs[0].data();
        cachedSettings = {
          prefix: data.prefix || DEFAULT_SETTINGS.prefix,
          nextConsecutive: Number(data.nextConsecutive) || DEFAULT_SETTINGS.nextConsecutive,
          companyName: data.companyName || DEFAULT_SETTINGS.companyName,
          companyNit: data.companyNit || DEFAULT_SETTINGS.companyNit,
          companyAddress: data.companyAddress ?? DEFAULT_SETTINGS.companyAddress,
          companyPhone: data.companyPhone ?? DEFAULT_SETTINGS.companyPhone,
          companyEmail: data.companyEmail ?? DEFAULT_SETTINGS.companyEmail,
          defaultCity: data.defaultCity || DEFAULT_SETTINGS.defaultCity,
          defaultConcept: data.defaultConcept || DEFAULT_SETTINGS.defaultConcept,
          companyLogoUrl: data.companyLogoUrl || undefined,
        };
        notifyDataChanged();
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'settings');
    }
  );

  // 2. Listen to `/drivers` owned by uid
  const driversQuery = query(collection(db, 'drivers'), where('ownerId', '==', uid));
  const unsubDrivers = onSnapshot(
    driversQuery,
    (querySnap) => {
      knownDriverIds.clear();
      const list: DriverProfile[] = [];
      querySnap.forEach((docSnap) => {
        knownDriverIds.add(docSnap.id);
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          plate: d.plate || '',
          driverName: d.driverName || '',
          idNumber: d.idNumber || '',
          phone: d.phone || '',
          paymentData: {
            bank: d.paymentBank || 'Bancolombia',
            accountNumber: d.paymentAccountNumber || '',
            accountType: sanitizeAccountType(d.paymentAccountType),
            accountHolder: d.paymentAccountHolder || d.driverName || '',
            identification: d.paymentIdentification || d.idNumber || '',
          },
          frequentClients: Array.isArray(d.frequentClients) ? d.frequentClients : [],
          totalAccountsGenerated: Number(d.totalAccountsGenerated) || 1,
          lastUsedAt: d.lastUsedAt || timestampToIso(d.updatedAt),
        });
      });
      list.sort((a, b) => (b.lastUsedAt || '').localeCompare(a.lastUsedAt || ''));
      cachedDrivers = list;
      notifyDataChanged();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'drivers');
    }
  );

  // 3. Listen to `/cuentas` owned by uid and attach real-time listeners to each cuenta's `/services`
  const cuentasQuery = query(collection(db, 'cuentas'), where('ownerId', '==', uid));
  const unsubCuentas = onSnapshot(
    cuentasQuery,
    (querySnap) => {
      const currentDocsIds = new Set<string>();
      const loadedCuentas: CuentaDeCobro[] = [];

      for (const docSnap of querySnap.docs) {
        const cuentaId = docSnap.id;
        currentDocsIds.add(cuentaId);
        knownCuentaIds.add(cuentaId);
        const c = docSnap.data();

        // Keep existing loaded services in memory while real-time service listener updates
        const existingInCache = cachedCuentas.find((item) => item.id === cuentaId);
        const services = existingInCache ? existingInCache.services : [];

        loadedCuentas.push({
          id: cuentaId,
          consecutive: Number(c.consecutive) || 1,
          consecutiveFormatted: c.consecutiveFormatted || 'CC-0001',
          date: c.date || '',
          paymentDueDate: c.paymentDueDate || c.date || '',
          city: c.city || 'Barranquilla',
          companyName: c.companyName || DEFAULT_SETTINGS.companyName,
          companyNit: c.companyNit || DEFAULT_SETTINGS.companyNit,
          driverName: c.driverName || '',
          driverId: c.driverId || '',
          vehiclePlate: c.vehiclePlate || '',
          driverPhone: c.driverPhone || '',
          services,
          totalAmount: Number(c.totalAmount) || 0,
          amountInWords: c.amountInWords || 'CERO PESOS M/CTE.',
          legalConcept: c.legalConcept || DEFAULT_SETTINGS.defaultConcept,
          paymentData: {
            bank: c.paymentBank || 'Bancolombia',
            accountNumber: c.paymentAccountNumber || '',
            accountType: sanitizeAccountType(c.paymentAccountType),
            accountHolder: c.paymentAccountHolder || c.driverName || '',
            identification: c.paymentIdentification || c.driverId || '',
          },
          signatureDataUrl: c.signatureDataUrl || undefined,
          companyLogoUrl: c.companyLogoUrl || undefined,
          notes: c.notes || undefined,
          status: sanitizeStatus(c.status),
          createdAt: timestampToIso(c.createdAt),
          updatedAt: timestampToIso(c.updatedAt),
        });

        attachServicesListenerForCuenta(uid, cuentaId);
      }

      // Clean up listeners for deleted cuentas
      serviceListenersByCuenta.forEach((unsub, cId) => {
        if (!currentDocsIds.has(cId)) {
          unsub();
          serviceListenersByCuenta.delete(cId);
        }
      });

      loadedCuentas.sort((a, b) => b.consecutive - a.consecutive);
      cachedCuentas = loadedCuentas;
      notifyDataChanged();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'cuentas');
    }
  );

  activeListeners.push(unsubSettings, unsubDrivers, unsubCuentas);
}

// ============================================================================
// Mutations (Write to Firestore + Optimistic Memory Cache Update)
// ============================================================================

export function saveSettings(settings: AppSettings): void {
  cachedSettings = { ...settings };
  notifyDataChanged();

  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const path = `settings/${uid}`;
  const payload = buildSettingsFirestorePayload(uid, settings);

  beginWrite();
  (async () => {
    try {
      const snap = await getDocs(query(collection(db, 'settings'), where('ownerId', '==', uid)));
      const existsInDb = !snap.empty || knownSettingExists;

      if (existsInDb) {
        const { ownerId: _ignoreOwner, ...mutableFields } = payload;
        await updateDoc(doc(db, 'settings', uid), {
          ...mutableFields,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(doc(db, 'settings', uid), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      knownSettingExists = true;
      endWrite(null);
    } catch (error) {
      endWrite('Error al guardar la configuración en Firebase');
      handleFirestoreError(
        error,
        knownSettingExists ? OperationType.UPDATE : OperationType.CREATE,
        path
      );
    }
  })();
}

export function saveDriverProfile(
  driver: Partial<DriverProfile> & { plate: string; driverName: string }
): DriverProfile {
  const uid = auth.currentUser?.uid || 'anon';
  const profiles = [...loadDriverProfiles()];
  const normalizedPlate = driver.plate.trim().toUpperCase();

  const existingIndex = profiles.findIndex(
    (p) =>
      (driver.id && p.id === driver.id) ||
      p.plate.replace(/[^A-Z0-9]/g, '') === normalizedPlate.replace(/[^A-Z0-9]/g, '')
  );

  let updatedProfile: DriverProfile;

  if (existingIndex >= 0) {
    const current = profiles[existingIndex];
    const newClients = driver.frequentClients || [];
    const mergedClients = Array.from(new Set([...newClients, ...current.frequentClients]))
      .filter(Boolean)
      .slice(0, VALIDATION_LIMITS.FREQUENT_CLIENTS_MAX_ITEMS);

    updatedProfile = {
      ...current,
      ...driver,
      id: sanitizeId(current.id, 'drv'),
      plate: normalizedPlate,
      frequentClients: mergedClients,
      lastUsedAt: new Date().toISOString(),
    };
    profiles[existingIndex] = updatedProfile;
  } else {
    const newId = sanitizeId(
      driver.id || `${uid.slice(0, 8)}-drv-${Date.now()}`,
      'drv'
    );
    updatedProfile = {
      id: newId,
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
      frequentClients: (driver.frequentClients || [])
        .filter(Boolean)
        .slice(0, VALIDATION_LIMITS.FREQUENT_CLIENTS_MAX_ITEMS),
      totalAccountsGenerated: 1,
      lastUsedAt: new Date().toISOString(),
    };
    profiles.unshift(updatedProfile);
  }

  cachedDrivers = profiles;
  notifyDataChanged();

  if (auth.currentUser?.uid) {
    const authUid = auth.currentUser.uid;
    const docId = updatedProfile.id;
    const path = `drivers/${docId}`;
    const payload = buildDriverFirestorePayload(authUid, updatedProfile);
    const existsInDb = knownDriverIds.has(docId);

    beginWrite();
    (async () => {
      try {
        if (existsInDb) {
          const { ownerId: _ignoreOwner, ...mutableFields } = payload;
          await updateDoc(doc(db, 'drivers', docId), {
            ...mutableFields,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(doc(db, 'drivers', docId), {
            ...payload,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          knownDriverIds.add(docId);
        }
        endWrite(null);
      } catch (error) {
        endWrite('Error al guardar el conductor en Firebase');
        handleFirestoreError(
          error,
          existsInDb ? OperationType.UPDATE : OperationType.CREATE,
          path
        );
      }
    })();
  }

  return updatedProfile;
}

export function deleteDriverProfile(id: string): void {
  const cleanId = sanitizeId(id, 'drv');
  cachedDrivers = cachedDrivers.filter((p) => p.id !== id && p.id !== cleanId);
  notifyDataChanged();

  if (!auth.currentUser?.uid) return;
  const path = `drivers/${cleanId}`;

  beginWrite();
  (async () => {
    try {
      await deleteDoc(doc(db, 'drivers', cleanId));
      knownDriverIds.delete(cleanId);
      endWrite(null);
    } catch (error) {
      endWrite('Error al eliminar el conductor de Firebase');
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  })();
}

export function saveCuenta(cuenta: CuentaDeCobro): CuentaDeCobro {
  const uid = auth.currentUser?.uid || 'anon';
  const cuentaId = sanitizeId(
    cuenta.id.startsWith(uid.slice(0, 8)) ? cuenta.id : `${uid.slice(0, 8)}-${cuenta.id}`,
    'cc'
  );
  const sanitizedServices: ServiceItem[] = (cuenta.services || []).map((s, idx) => ({
    ...s,
    id: sanitizeId(s.id || `srv-${idx + 1}`, 'srv'),
    plate: (s.plate || cuenta.vehiclePlate || 'SIN-PLACA').toUpperCase(),
    value: Number(s.value) || 0,
  }));

  const normalizedCuenta: CuentaDeCobro = {
    ...cuenta,
    id: cuentaId,
    services: sanitizedServices,
    updatedAt: new Date().toISOString(),
  };

  const cuentas = [...loadCuentas()];
  const existingIdx = cuentas.findIndex((c) => c.id === cuenta.id || c.id === cuentaId);
  const isExisting = existingIdx >= 0;

  if (isExisting) {
    cuentas[existingIdx] = normalizedCuenta;
  } else {
    cuentas.unshift(normalizedCuenta);
    const settings = loadSettings();
    if (normalizedCuenta.consecutive >= settings.nextConsecutive) {
      const updatedSettings = {
        ...settings,
        nextConsecutive: normalizedCuenta.consecutive + 1,
      };
      saveSettings(updatedSettings);
    }
  }

  cachedCuentas = cuentas;
  notifyDataChanged();

  // Also update driver profile in Firestore
  const clientNames = normalizedCuenta.services
    .map((s) => s.clientDetail.trim())
    .filter(Boolean);
  saveDriverProfile({
    plate: normalizedCuenta.vehiclePlate,
    driverName: normalizedCuenta.driverName,
    idNumber: normalizedCuenta.driverId,
    phone: normalizedCuenta.driverPhone,
    paymentData: normalizedCuenta.paymentData,
    frequentClients: clientNames,
  });

  if (!auth.currentUser?.uid) return normalizedCuenta;
  const authUid = auth.currentUser.uid;
  const path = `cuentas/${cuentaId}`;
  const existsInDb = knownCuentaIds.has(cuentaId);

  beginWrite();
  (async () => {
    try {
      const batch = writeBatch(db);
      const cuentaRef = doc(db, 'cuentas', cuentaId);
      const cuentaPayload = buildCuentaFirestorePayload(authUid, normalizedCuenta);

      if (existsInDb) {
        const { ownerId: _ignoreOwner, ...mutableFields } = cuentaPayload;
        batch.update(cuentaRef, {
          ...mutableFields,
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.set(cuentaRef, {
          ...cuentaPayload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      const prevSrvIds = knownServiceIdsByCuenta.get(cuentaId) || new Set<string>();
      const currentSrvIds = new Set<string>();

      normalizedCuenta.services.forEach((srv, idx) => {
        const srvId = sanitizeId(srv.id, 'srv');
        currentSrvIds.add(srvId);
        const srvRef = doc(db, 'cuentas', cuentaId, 'services', srvId);
        const srvPayload = buildServiceItemFirestorePayload(
          authUid,
          cuentaId,
          srv,
          idx,
          cuentaPayload.vehiclePlate
        );

        if (prevSrvIds.has(srvId)) {
          const {
            ownerId: _ignoreOwner,
            cuentaId: _ignoreCuenta,
            ...mutableSrvFields
          } = srvPayload;
          batch.update(srvRef, {
            ...mutableSrvFields,
            updatedAt: serverTimestamp(),
          });
        } else {
          batch.set(srvRef, {
            ...srvPayload,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      });

      // Delete any removed service rows
      prevSrvIds.forEach((oldSrvId) => {
        if (!currentSrvIds.has(oldSrvId)) {
          batch.delete(doc(db, 'cuentas', cuentaId, 'services', oldSrvId));
        }
      });

      await batch.commit();
      knownCuentaIds.add(cuentaId);
      knownServiceIdsByCuenta.set(cuentaId, currentSrvIds);
      attachServicesListenerForCuenta(authUid, cuentaId);
      endWrite(null);
    } catch (error) {
      endWrite('Error al guardar la cuenta de cobro en Firebase');
      handleFirestoreError(
        error,
        existsInDb ? OperationType.UPDATE : OperationType.CREATE,
        path
      );
    }
  })();

  return normalizedCuenta;
}

export function deleteCuenta(id: string): void {
  const target = cachedCuentas.find((c) => c.id === id);
  const cuentaId = target ? target.id : sanitizeId(id, 'cc');
  cachedCuentas = cachedCuentas.filter((c) => c.id !== id && c.id !== cuentaId);
  notifyDataChanged();

  if (!auth.currentUser?.uid) return;
  const path = `cuentas/${cuentaId}`;

  beginWrite();
  (async () => {
    try {
      const batch = writeBatch(db);
      const srvIds = knownServiceIdsByCuenta.get(cuentaId) || new Set<string>();
      srvIds.forEach((srvId) => {
        batch.delete(doc(db, 'cuentas', cuentaId, 'services', srvId));
      });
      batch.delete(doc(db, 'cuentas', cuentaId));
      await batch.commit();
      knownCuentaIds.delete(cuentaId);
      knownServiceIdsByCuenta.delete(cuentaId);
      const srvUnsub = serviceListenersByCuenta.get(cuentaId);
      if (srvUnsub) {
        srvUnsub();
        serviceListenersByCuenta.delete(cuentaId);
      }
      endWrite(null);
    } catch (error) {
      endWrite('Error al eliminar la cuenta en Firebase');
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  })();
}

export function updateCuentaStatus(id: string, status: CuentaDeCobro['status']): void {
  const cuentas = [...loadCuentas()];
  const item = cuentas.find((c) => c.id === id);
  if (!item) return;

  if (item.status === 'anulada') {
    return;
  }

  const validStatus = sanitizeStatus(status);
  item.status = validStatus;
  item.updatedAt = new Date().toISOString();
  cachedCuentas = cuentas;
  notifyDataChanged();

  if (!auth.currentUser?.uid) return;
  const path = `cuentas/${item.id}`;

  beginWrite();
  (async () => {
    try {
      await updateDoc(doc(db, 'cuentas', item.id), {
        status: validStatus,
        updatedAt: serverTimestamp(),
      });
      endWrite(null);
    } catch (error) {
      endWrite('Error al actualizar el estado en Firebase');
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  })();
}

export function exportAllData(): string {
  const backup = {
    exportedAt: new Date().toISOString(),
    version: '2.0-firebase',
    settings: loadSettings(),
    cuentas: loadCuentas(),
    drivers: loadDriverProfiles(),
  };
  return JSON.stringify(backup, null, 2);
}

export function importAllData(jsonData: string): boolean {
  try {
    const parsed = JSON.parse(jsonData);
    if (parsed.settings) {
      saveSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });
    }
    if (Array.isArray(parsed.drivers)) {
      parsed.drivers.forEach((d: DriverProfile) => {
        if (d.plate && d.driverName) {
          saveDriverProfile(d);
        }
      });
    }
    if (Array.isArray(parsed.cuentas)) {
      parsed.cuentas.forEach((c: CuentaDeCobro) => {
        if (c.vehiclePlate && c.driverName) {
          saveCuenta(c);
        }
      });
    }
    return true;
  } catch (e) {
    console.error('Error importing data to Firebase', e);
    return false;
  }
}
