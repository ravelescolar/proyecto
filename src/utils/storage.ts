import {
  collection,
  doc,
  getDoc,
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
import {
  AdminMember,
  AppSettings,
  CuentaDeCobro,
  DriverProfile,
  PaymentData,
  ServiceItem,
} from '../types';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';

const LEGACY_STORAGE_KEYS = {
  SETTINGS: 'ravel_cuentas_settings_v1',
  CUENTAS: 'ravel_cuentas_list_v1',
  DRIVERS: 'ravel_driver_profiles_v1',
};

export const PRIMARY_ADMIN_EMAIL = 'ravelescolar@gmail.com';
export const GLOBAL_SETTINGS_DOC_ID = 'global';

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
  LOGO_URL_MAX_LEN: 950000,
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
  nextConsecutive: 1,
  companyName: 'TRANSPORTES RAVEL',
  companyNit: '900.388.163-2',
  companyAddress: 'Medellín, Antioquia',
  companyPhone: '(+57) 300 812 4590',
  companyEmail: 'ravelescolar@gmail.com',
  defaultCity: 'Medellín',
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
      'Servicio Especial de Pasajeros Medellín - Rionegro',
      'Clínica Portoazul - Transporte de Personal',
    ],
    totalAccountsGenerated: 5,
    lastUsedAt: '2026-09-25T09:15:00Z',
  },
];

export const INITIAL_CUENTAS: CuentaDeCobro[] = [
  {
    id: 'cc-1',
    consecutive: 1,
    consecutiveFormatted: 'CC-0001',
    date: '2026-09-22',
    paymentDueDate: '2026-09-28',
    city: 'Medellín',
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
let cachedAdmins: AdminMember[] = [];
let cachedIsAdmin = false;
let knownGlobalSettingExists = false;
const knownDriverIds = new Set<string>();
const knownCuentaIds = new Set<string>();
const deletedDriverIds = new Set<string>();
const deletedCuentaIds = new Set<string>();
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
  const uid = auth.currentUser?.uid;
  if (!cachedIsAdmin && uid) {
    return cachedDrivers.filter((d) => d.ownerId === uid);
  }
  return cachedDrivers;
}

export function loadCuentas(): CuentaDeCobro[] {
  const uid = auth.currentUser?.uid;
  if (!cachedIsAdmin && uid) {
    return cachedCuentas.filter((c) => c.ownerId === uid);
  }
  return cachedCuentas;
}

export function loadAdmins(): AdminMember[] {
  return cachedAdmins;
}

export function isCurrentUserAdmin(): boolean {
  return cachedIsAdmin;
}

export function getNextConsecutive(): { number: number; formatted: string } {
  const settings = loadSettings();
  const baseNext = Math.max(1, Number(settings.nextConsecutive) || 1);
  // Find the first available consecutive >= baseNext that isn't already used by an existing cuenta
  const used = new Set(cachedCuentas.map((c) => c.consecutive));
  let candidate = baseNext;
  while (used.has(candidate)) {
    candidate += 1;
  }
  return {
    number: candidate,
    formatted: formatConsecutive(settings.prefix, candidate),
  };
}

export function findDriverByPlate(plateQuery: string): DriverProfile | undefined {
  if (!plateQuery) return undefined;
  const cleanQuery = plateQuery.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!cleanQuery) return undefined;

  const uid = auth.currentUser?.uid;
  const profiles = loadDriverProfiles();
  return profiles.find(
    (p) =>
      p.plate.replace(/[^A-Z0-9]/g, '') === cleanQuery &&
      (cachedIsAdmin || !uid || p.ownerId === uid)
  );
}

// ============================================================================
// Firestore Serialization & Deserialization
// ============================================================================

function buildSettingsFirestorePayload(uid: string, s: AppSettings) {
  const rawLogo = (s.companyLogoUrl || '').trim();
  // Only store valid complete data URLs or HTTP URLs that fit within the limit; never truncate a base64 image in half
  const validLogo =
    rawLogo.length <= VALIDATION_LIMITS.LOGO_URL_MAX_LEN &&
    (rawLogo.startsWith('data:image/') || rawLogo.startsWith('http'))
      ? rawLogo
      : '';

  return {
    ownerId: uid,
    prefix: clampString(s.prefix, VALIDATION_LIMITS.PREFIX_MAX_LEN, 'CC-'),
    nextConsecutive: Math.round(
      clampNumber(
        s.nextConsecutive,
        VALIDATION_LIMITS.CONSECUTIVE_MIN,
        VALIDATION_LIMITS.CONSECUTIVE_MAX,
        1
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
    companyLogoUrl: validLogo,
  };
}

function buildDriverFirestorePayload(uid: string, d: DriverProfile) {
  const cleanClients = (d.frequentClients || [])
    .map((c) => clampString(c, VALIDATION_LIMITS.FREQUENT_CLIENT_MAX_LEN, ''))
    .filter((c) => c.length >= 1)
    .slice(0, VALIDATION_LIMITS.FREQUENT_CLIENTS_MAX_ITEMS);

  return {
    ownerId: d.ownerId || uid,
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
    totalAccountsGenerated: Math.round(clampNumber(d.totalAccountsGenerated, 0, 999999, 1)),
    lastUsedAt: clampString(
      d.lastUsedAt || new Date().toISOString(),
      VALIDATION_LIMITS.DATE_MAX_LEN,
      new Date().toISOString()
    ),
  };
}

function buildCuentaFirestorePayload(uid: string, email: string | null | undefined, c: CuentaDeCobro) {
  const ownerEmail = clampString(
    c.ownerEmail || email || '',
    VALIDATION_LIMITS.COMPANY_EMAIL_MAX_LEN,
    ''
  );
  const statusUpdatedAt = clampString(
    c.statusUpdatedAt || '',
    50,
    ''
  );
  const statusUpdatedByEmail = clampString(
    c.statusUpdatedByEmail || '',
    VALIDATION_LIMITS.COMPANY_EMAIL_MAX_LEN,
    ''
  );
  const paymentReference = clampString(c.paymentReference || '', 100, '');
  const paymentReceiptUrl = clampString(c.paymentReceiptUrl || '', 500000, '');
  const adminCorrectionNote = clampString(c.adminCorrectionNote || '', 1000, '');

  return {
    ownerId: c.ownerId || uid,
    ...(ownerEmail ? { ownerEmail } : {}),
    ...(statusUpdatedAt ? { statusUpdatedAt } : {}),
    ...(statusUpdatedByEmail ? { statusUpdatedByEmail } : {}),
    ...(paymentReference ? { paymentReference } : {}),
    ...(paymentReceiptUrl ? { paymentReceiptUrl } : {}),
    ...(adminCorrectionNote ? { adminCorrectionNote } : {}),
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
    city: clampString(c.city, VALIDATION_LIMITS.CITY_MAX_LEN, 'Medellín'),
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
  ownerUid: string,
  cuentaId: string,
  s: ServiceItem,
  orderIndex: number,
  defaultPlate: string
) {
  return {
    ownerId: ownerUid,
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
  knownGlobalSettingExists = false;
  cachedIsAdmin = false;
  cachedAdmins = [];
  cachedDrivers = [];
  cachedCuentas = [];
  knownDriverIds.clear();
  knownCuentaIds.clear();
  deletedDriverIds.clear();
  deletedCuentaIds.clear();
  knownServiceIdsByCuenta.clear();
}

async function resolveAdminRole(uid: string, email: string | null | undefined): Promise<boolean> {
  if (email && email.toLowerCase().trim() === PRIMARY_ADMIN_EMAIL) {
    return true;
  }
  try {
    const adminSnap = await getDocs(query(collection(db, 'admins'), where('uid', '==', uid)));
    return !adminSnap.empty;
  } catch {
    return false;
  }
}

async function ensureGlobalSettingsInitialized(uid: string, isAdmin: boolean): Promise<void> {
  // Query settings where companyNit == '900.388.163-2' or ownerId == uid to find existing settings safely via allow list
  try {
    const [globalSnap, userSettingsSnap, cuentasSnap] = await Promise.all([
      getDocs(query(collection(db, 'settings'), where('companyNit', '==', '900.388.163-2'))),
      getDocs(query(collection(db, 'settings'), where('ownerId', '==', uid))),
      getDocs(
        isAdmin
          ? collection(db, 'cuentas')
          : query(collection(db, 'cuentas'), where('ownerId', '==', uid))
      ),
    ]);

    const hasGlobalDoc = globalSnap.docs.some((d) => d.id === GLOBAL_SETTINGS_DOC_ID);
    if (hasGlobalDoc) {
      knownGlobalSettingExists = true;
      // If no cuentas exist at all or the legacy default (101) was still set without a 100-series cuenta, reset global nextConsecutive to 1
      const globalDocSnap = globalSnap.docs.find((d) => d.id === GLOBAL_SETTINGS_DOC_ID);
      if (globalDocSnap) {
        const gData = globalDocSnap.data();
        const currentNext = Number(gData.nextConsecutive) || 1;
        const hasHighCuentas = cuentasSnap.docs.some((c) => (Number(c.data().consecutive) || 0) >= 100);
        if (currentNext >= 101 && !hasHighCuentas) {
          const maxExistingConsecutive = cuentasSnap.docs.reduce(
            (max, c) => Math.max(max, Number(c.data().consecutive) || 0),
            0
          );
          const targetNext = Math.max(1, maxExistingConsecutive + 1);
          try {
            await updateDoc(doc(db, 'settings', GLOBAL_SETTINGS_DOC_ID), {
              nextConsecutive: targetNext,
              updatedAt: serverTimestamp(),
            });
          } catch {
            // Ignore if standard user cannot lower nextConsecutive
          }
        }
      }
    }

    cuentasSnap.forEach((c) => knownCuentaIds.add(c.id));

    if (!hasGlobalDoc) {
      let maxNextConsecutive = 1;
      let baseSettings: AppSettings = { ...DEFAULT_SETTINGS, nextConsecutive: 1 };

      if (!userSettingsSnap.empty) {
        const legacyData = userSettingsSnap.docs[0].data();
        baseSettings = {
          prefix: legacyData.prefix || DEFAULT_SETTINGS.prefix,
          nextConsecutive: 1,
          companyName: legacyData.companyName || DEFAULT_SETTINGS.companyName,
          companyNit: legacyData.companyNit || DEFAULT_SETTINGS.companyNit,
          companyAddress: legacyData.companyAddress ?? DEFAULT_SETTINGS.companyAddress,
          companyPhone: legacyData.companyPhone ?? DEFAULT_SETTINGS.companyPhone,
          companyEmail: legacyData.companyEmail ?? DEFAULT_SETTINGS.companyEmail,
          defaultCity:
            !legacyData.defaultCity || legacyData.defaultCity === 'Barranquilla'
              ? DEFAULT_SETTINGS.defaultCity
              : legacyData.defaultCity,
          defaultConcept: legacyData.defaultConcept || DEFAULT_SETTINGS.defaultConcept,
          companyLogoUrl: legacyData.companyLogoUrl || undefined,
        };
      }

      cuentasSnap.forEach((c) => {
        const num = Number(c.data().consecutive) || 0;
        if (num < 100 && num + 1 > maxNextConsecutive) {
          maxNextConsecutive = num + 1;
        }
      });

      const payload = buildSettingsFirestorePayload(uid, {
        ...baseSettings,
        nextConsecutive: maxNextConsecutive,
      });

      await setDoc(doc(db, 'settings', GLOBAL_SETTINGS_DOC_ID), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      knownGlobalSettingExists = true;
    }
  } catch (error) {
    console.warn('Global settings check notice:', error);
  }
}

async function seedInitialAdminDataIfNeeded(
  uid: string,
  email: string | null | undefined,
  isAdmin: boolean
): Promise<void> {
  await ensureGlobalSettingsInitialized(uid, isAdmin);

  // Only seed example drivers/cuentas if the user is an Admin, has never seeded before, and the database is completely empty
  if (!isAdmin) return;

  try {
    const [settingsSnap, driversSnap, cuentasSnap] = await Promise.all([
      getDocs(collection(db, 'settings')),
      getDocs(collection(db, 'drivers')),
      getDocs(collection(db, 'cuentas')),
    ]);

    driversSnap.forEach((d) => knownDriverIds.add(d.id));
    cuentasSnap.forEach((c) => knownCuentaIds.add(c.id));

    // If settings already existed or any drivers/cuentas exist, do NOT re-seed initial sample cuentas
    if (settingsSnap.size > 1 || !driversSnap.empty || !cuentasSnap.empty) {
      return;
    }

    const batch = writeBatch(db);
    const initialDrivers: DriverProfile[] = INITIAL_DRIVERS.map((d, idx) => ({
      ...d,
      id: sanitizeId(`${uid.slice(0, 8)}-drv-${idx + 1}`, 'drv'),
    }));
    const initialCuentas: CuentaDeCobro[] = INITIAL_CUENTAS.map((c) => ({
      ...c,
      id: `cc-${c.consecutive}`,
    }));

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
      const ctaId = sanitizeId(`cc-${cta.consecutive}`, 'cc');
      const ctaPayload = buildCuentaFirestorePayload(uid, email, { ...cta, id: ctaId });
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

    try {
      localStorage.removeItem(LEGACY_STORAGE_KEYS.SETTINGS);
      localStorage.removeItem(LEGACY_STORAGE_KEYS.DRIVERS);
      localStorage.removeItem(LEGACY_STORAGE_KEYS.CUENTAS);
    } catch {
      // Ignore storage cleanup errors
    }
  } catch (error) {
    console.warn('Seed check notice:', error);
  }
}

function attachServicesListenerForCuenta(
  currentUid: string,
  cuentaOwnerId: string,
  isAdmin: boolean,
  cuentaId: string
) {
  if (serviceListenersByCuenta.has(cuentaId)) return;

  const servicesPath = `cuentas/${cuentaId}/services`;
  // Admin can list all services in the subcollection; standard user queries by their own ownerId
  const srvQuery = isAdmin
    ? collection(db, 'cuentas', cuentaId, 'services')
    : query(
        collection(db, 'cuentas', cuentaId, 'services'),
        where('ownerId', '==', cuentaOwnerId || currentUid)
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

export async function startFirebaseSync(
  uid: string,
  email: string | null | undefined,
  onUpdate: () => void
): Promise<boolean> {
  stopFirebaseSync();
  onDataChangeCallback = onUpdate;

  const isAdmin = await resolveAdminRole(uid, email);
  cachedIsAdmin = isAdmin;

  try {
    await seedInitialAdminDataIfNeeded(uid, email, isAdmin);
  } catch (err) {
    console.error('Warning during initial seed check:', err);
  }

  // 1. Listen to corporate settings via query(collection(db, 'settings'), where('companyNit', '==', '900.388.163-2'))
  // This uses `allow list` safely even if /settings/global is being created, and prioritizes the `global` doc
  const settingsQuery = query(
    collection(db, 'settings'),
    where('companyNit', '==', '900.388.163-2')
  );
  const unsubSettings = onSnapshot(
    settingsQuery,
    (querySnap) => {
      if (!querySnap.empty) {
        const globalDoc =
          querySnap.docs.find((d) => d.id === GLOBAL_SETTINGS_DOC_ID) || querySnap.docs[0];
        if (globalDoc.id === GLOBAL_SETTINGS_DOC_ID) {
          knownGlobalSettingExists = true;
        }
        const data = globalDoc.data();
        // Find if any settings doc has a valid companyLogoUrl if globalDoc's is empty
        let resolvedLogoUrl: string | undefined = data.companyLogoUrl || undefined;
        if (!resolvedLogoUrl) {
          for (const d of querySnap.docs) {
            const candidate = d.data().companyLogoUrl;
            if (typeof candidate === 'string' && candidate.length > 20) {
              resolvedLogoUrl = candidate;
              break;
            }
          }
        }

        const rawConsecutive = Number(data.nextConsecutive) || 1;

        cachedSettings = {
          prefix: data.prefix || DEFAULT_SETTINGS.prefix,
          nextConsecutive: Math.max(1, rawConsecutive),
          companyName: data.companyName || DEFAULT_SETTINGS.companyName,
          companyNit: data.companyNit || DEFAULT_SETTINGS.companyNit,
          companyAddress: data.companyAddress ?? DEFAULT_SETTINGS.companyAddress,
          companyPhone: data.companyPhone ?? DEFAULT_SETTINGS.companyPhone,
          companyEmail: data.companyEmail ?? DEFAULT_SETTINGS.companyEmail,
          defaultCity:
            !data.defaultCity || data.defaultCity === 'Barranquilla'
              ? DEFAULT_SETTINGS.defaultCity
              : data.defaultCity,
          defaultConcept: data.defaultConcept || DEFAULT_SETTINGS.defaultConcept,
          companyLogoUrl: resolvedLogoUrl,
        };
        notifyDataChanged();
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'settings');
    }
  );

  // 2. Listen to `/drivers`: Admin sees all drivers across the company; standard user sees their own drivers
  const driversQuery = isAdmin
    ? collection(db, 'drivers')
    : query(collection(db, 'drivers'), where('ownerId', '==', uid));

  const unsubDrivers = onSnapshot(
    driversQuery,
    (querySnap) => {
      knownDriverIds.clear();
      const rawList: DriverProfile[] = [];
      querySnap.forEach((docSnap) => {
        if (deletedDriverIds.has(docSnap.id)) return;
        knownDriverIds.add(docSnap.id);
        const d = docSnap.data();
        rawList.push({
          id: docSnap.id,
          ownerId: d.ownerId || uid,
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
      rawList.sort((a, b) => (b.lastUsedAt || '').localeCompare(a.lastUsedAt || ''));

      // Deduplicate by (plate + person to pay) so the same vehicle with the same payee never appears twice
      const uniqueMap = new Map<string, DriverProfile>();
      for (const item of rawList) {
        const key = getVehiclePayeeKey(item);
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, item);
        } else {
          const existing = uniqueMap.get(key)!;
          existing.frequentClients = Array.from(
            new Set([...existing.frequentClients, ...item.frequentClients])
          )
            .filter(Boolean)
            .slice(0, VALIDATION_LIMITS.FREQUENT_CLIENTS_MAX_ITEMS);
        }
      }

      cachedDrivers = Array.from(uniqueMap.values());
      notifyDataChanged();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'drivers');
    }
  );

  // 3. Listen to `/cuentas`: Admin sees ALL cuentas from all users; standard user sees only their own cuentas
  const cuentasQuery = isAdmin
    ? collection(db, 'cuentas')
    : query(collection(db, 'cuentas'), where('ownerId', '==', uid));

  const unsubCuentas = onSnapshot(
    cuentasQuery,
    (querySnap) => {
      const currentDocsIds = new Set<string>();
      const loadedCuentas: CuentaDeCobro[] = [];

      for (const docSnap of querySnap.docs) {
        const cuentaId = docSnap.id;
        if (deletedCuentaIds.has(cuentaId)) continue;
        currentDocsIds.add(cuentaId);
        knownCuentaIds.add(cuentaId);
        const c = docSnap.data();

        // Keep existing loaded services in memory while real-time service listener updates
        const existingInCache = cachedCuentas.find((item) => item.id === cuentaId);
        const services = existingInCache ? existingInCache.services : [];

        loadedCuentas.push({
          id: cuentaId,
          ownerId: c.ownerId || uid,
          ownerEmail: c.ownerEmail || undefined,
          consecutive: Number(c.consecutive) || 1,
          consecutiveFormatted: c.consecutiveFormatted || 'CC-0001',
          date: c.date || '',
          paymentDueDate: c.paymentDueDate || c.date || '',
          city: c.city || 'Medellín',
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
          statusUpdatedAt: c.statusUpdatedAt ? timestampToIso(c.statusUpdatedAt) : undefined,
          statusUpdatedByEmail: c.statusUpdatedByEmail || undefined,
          createdAt: timestampToIso(c.createdAt),
          updatedAt: timestampToIso(c.updatedAt),
        });

        attachServicesListenerForCuenta(uid, c.ownerId || uid, isAdmin, cuentaId);
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

  // 4. If Admin, also listen to `/admins` collection so the admin can manage authorized administrators
  if (isAdmin) {
    const unsubAdmins = onSnapshot(
      collection(db, 'admins'),
      (snap) => {
        const list: AdminMember[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            uid: docSnap.id,
            email: d.email || '',
            role: 'admin',
            addedBy: d.addedBy || '',
            createdAt: timestampToIso(d.createdAt),
            updatedAt: timestampToIso(d.updatedAt),
          });
        });
        cachedAdmins = list;
        notifyDataChanged();
      },
      (error) => {
        console.warn('Error listening to admins collection:', error);
      }
    );
    activeListeners.push(unsubAdmins);
  }

  return isAdmin;
}

// ============================================================================
// Admin Management (Grant / Revoke Admin Role by UID)
// ============================================================================

export async function addAdminMember(targetUid: string, targetEmail: string): Promise<void> {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid || !cachedIsAdmin) {
    throw new Error('Solo el administrador puede agregar otros administradores.');
  }

  const cleanUid = sanitizeId(targetUid.trim(), '');
  const cleanEmail = clampString(targetEmail.trim().toLowerCase(), 150, '');
  if (!cleanUid || cleanEmail.length < 3) {
    throw new Error('Debes ingresar un UID válido y el correo electrónico del administrador.');
  }

  beginWrite();
  try {
    await setDoc(doc(db, 'admins', cleanUid), {
      uid: cleanUid,
      email: cleanEmail,
      role: 'admin',
      addedBy: currentUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    endWrite(null);
  } catch (error) {
    endWrite('Error al registrar administrador en Firebase');
    handleFirestoreError(error, OperationType.CREATE, `admins/${cleanUid}`);
  }
}

export async function removeAdminMember(targetUid: string): Promise<void> {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid || !cachedIsAdmin) return;

  const cleanUid = sanitizeId(targetUid, '');
  beginWrite();
  try {
    await deleteDoc(doc(db, 'admins', cleanUid));
    endWrite(null);
  } catch (error) {
    endWrite('Error al eliminar administrador en Firebase');
    handleFirestoreError(error, OperationType.DELETE, `admins/${cleanUid}`);
  }
}

// ============================================================================
// Mutations (Write to Firestore + Optimistic Memory Cache Update)
// ============================================================================

/**
 * Increments the global consecutive counter in `/settings/global`.
 * Standard users are permitted by Firestore rules to update `ownerId`, `nextConsecutive` (non-decreasing), and `updatedAt`.
 */
function incrementGlobalConsecutiveInFirestore(newNextConsecutive: number): void {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const safeNext = Math.round(
    clampNumber(
      newNextConsecutive,
      VALIDATION_LIMITS.CONSECUTIVE_MIN,
      VALIDATION_LIMITS.CONSECUTIVE_MAX,
      1
    )
  );

  cachedSettings = {
    ...cachedSettings,
    nextConsecutive: Math.max(cachedSettings.nextConsecutive, safeNext),
  };
  notifyDataChanged();

  beginWrite();
  (async () => {
    try {
      const globalSnap = await getDocs(
        query(collection(db, 'settings'), where('companyNit', '==', '900.388.163-2'))
      );
      const globalDoc = globalSnap.docs.find((d) => d.id === GLOBAL_SETTINGS_DOC_ID);

      if (globalDoc) {
        knownGlobalSettingExists = true;
        const existingData = globalDoc.data();
        const remoteNext = Number(existingData.nextConsecutive) || 1;
        if (remoteNext >= safeNext) {
          cachedSettings = {
            ...cachedSettings,
            nextConsecutive: Math.max(cachedSettings.nextConsecutive, remoteNext),
          };
          notifyDataChanged();
          endWrite(null);
          return;
        }

        // Write full normalized document with setDoc (without merge) so any legacy/extra fields in Firestore are cleaned up while preserving createdAt
        const fullPayload = buildSettingsFirestorePayload(uid, {
          ...cachedSettings,
          nextConsecutive: safeNext,
        });
        await setDoc(doc(db, 'settings', GLOBAL_SETTINGS_DOC_ID), {
          ...fullPayload,
          createdAt: existingData.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        const payload = buildSettingsFirestorePayload(uid, {
          ...cachedSettings,
          nextConsecutive: safeNext,
        });
        await setDoc(doc(db, 'settings', GLOBAL_SETTINGS_DOC_ID), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        knownGlobalSettingExists = true;
      }
      endWrite(null);
    } catch (error) {
      console.warn('Notice syncing global consecutive:', error);
      endWrite(null);
    }
  })();
}

export function saveSettings(settings: AppSettings): void {
  cachedSettings = { ...settings };
  notifyDataChanged();

  const uid = auth.currentUser?.uid;
  if (!uid) return;

  // Only Administrators can modify full corporate settings on `/settings/global`
  if (!cachedIsAdmin) {
    incrementGlobalConsecutiveInFirestore(settings.nextConsecutive);
    return;
  }

  const path = `settings/${GLOBAL_SETTINGS_DOC_ID}`;
  const payload = buildSettingsFirestorePayload(uid, settings);

  beginWrite();
  (async () => {
    const globalRef = doc(db, 'settings', GLOBAL_SETTINGS_DOC_ID);
    try {
      // 1. Try updateDoc first so Firestore keeps `existing().createdAt` intact
      try {
        await updateDoc(globalRef, {
          ...payload,
          updatedAt: serverTimestamp(),
        });
        knownGlobalSettingExists = true;
        endWrite(null);
        return;
      } catch {
        // 2. If updateDoc failed (e.g. document doesn't exist yet or has legacy schema fields), recreate cleanly
        try {
          await deleteDoc(globalRef);
        } catch {}
        await setDoc(globalRef, {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        knownGlobalSettingExists = true;
        endWrite(null);
        return;
      }
    } catch (error) {
      // 3. Final fallback: write to Admin's own `/settings/{uid}` document which is also read by the settings query
      try {
        const userSettingsRef = doc(db, 'settings', uid);
        try {
          await updateDoc(userSettingsRef, {
            ...payload,
            updatedAt: serverTimestamp(),
          });
        } catch {
          await setDoc(userSettingsRef, {
            ...payload,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        endWrite(null);
      } catch {
        endWrite('Error al guardar la configuración en Firebase');
        handleFirestoreError(
          error,
          knownGlobalSettingExists ? OperationType.UPDATE : OperationType.CREATE,
          path
        );
      }
    }
  })();
}

/**
 * Normalizes a name or ID so we can compare whether two vehicle profiles have the same "persona a pagar" (payee).
 */
export function normalizePayeeText(val: string | undefined): string {
  return (val || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .trim();
}

export function getPayeeName(driver: {
  driverName?: string;
  paymentData?: Partial<PaymentData>;
}): string {
  return normalizePayeeText(driver.paymentData?.accountHolder || driver.driverName || '');
}

export function getPayeeId(driver: {
  idNumber?: string;
  paymentData?: Partial<PaymentData>;
}): string {
  return normalizePayeeText(driver.paymentData?.identification || driver.idNumber || '');
}

export function isSamePayee(
  a: { driverName?: string; idNumber?: string; paymentData?: Partial<PaymentData> },
  b: { driverName?: string; idNumber?: string; paymentData?: Partial<PaymentData> }
): boolean {
  const idA = getPayeeId(a);
  const idB = getPayeeId(b);
  const nameA = getPayeeName(a);
  const nameB = getPayeeName(b);

  if (idA && idB && idA === idB) return true;
  if (nameA && nameB && nameA === nameB) return true;
  return false;
}

export function getVehiclePayeeKey(driver: {
  plate: string;
  driverName?: string;
  idNumber?: string;
  paymentData?: Partial<PaymentData>;
}): string {
  const cleanPlate = (driver.plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const payeeIdentity = getPayeeId(driver) || getPayeeName(driver) || 'DEFAULT';
  return `${cleanPlate}__${payeeIdentity}`;
}

export function findMatchingVehicleByPlateAndPayee(
  profiles: DriverProfile[],
  candidate: {
    id?: string;
    plate: string;
    driverName?: string;
    idNumber?: string;
    paymentData?: Partial<PaymentData>;
  }
): DriverProfile | undefined {
  const cleanPlate = (candidate.plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!cleanPlate) return undefined;

  return profiles.find((p) => {
    if (candidate.id && p.id === candidate.id) return false;
    const pPlate = p.plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (pPlate !== cleanPlate) return false;
    return isSamePayee(p, candidate);
  });
}

export function saveDriverProfile(
  driver: Partial<DriverProfile> & { plate: string; driverName: string }
): DriverProfile {
  const uid = auth.currentUser?.uid || 'anon';
  const profiles = [...loadDriverProfiles()];
  const normalizedPlate = driver.plate.trim().toUpperCase();
  const cleanPlate = normalizedPlate.replace(/[^A-Z0-9]/g, '');

  // A vehicle is unique per (Placa + Persona a pagar), unless explicitly editing by id
  const existingIndex = profiles.findIndex((p) => {
    if (driver.id && p.id === driver.id) return true;
    const pPlate = p.plate.replace(/[^A-Z0-9]/g, '');
    if (pPlate !== cleanPlate) return false;
    return isSamePayee(p, driver);
  });

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
      ownerId: current.ownerId || uid,
      plate: normalizedPlate,
      frequentClients: mergedClients,
      totalAccountsGenerated: (current.totalAccountsGenerated || 1) + (driver.id ? 0 : 1),
      lastUsedAt: new Date().toISOString(),
    };
    profiles[existingIndex] = updatedProfile;
  } else {
    const deterministicKey = getVehiclePayeeKey(driver).replace(/[^A-Za-z0-9_-]/g, '-');
    const newId = sanitizeId(
      driver.id || `drv-${uid.slice(0, 6)}-${deterministicKey}`,
      'drv'
    );
    updatedProfile = {
      id: newId,
      ownerId: uid,
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
            ownerId: authUid,
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
  deletedDriverIds.add(id);
  deletedDriverIds.add(cleanId);
  cachedDrivers = cachedDrivers.filter((p) => p.id !== id && p.id !== cleanId);
  notifyDataChanged();

  if (!auth.currentUser?.uid) return;
  const path = `drivers/${cleanId}`;

  beginWrite();
  (async () => {
    try {
      await deleteDoc(doc(db, 'drivers', cleanId));
      if (id !== cleanId) {
        try {
          await deleteDoc(doc(db, 'drivers', id));
        } catch {}
      }
      knownDriverIds.delete(cleanId);
      knownDriverIds.delete(id);
      endWrite(null);
    } catch (error) {
      deletedDriverIds.delete(id);
      deletedDriverIds.delete(cleanId);
      endWrite('Error al eliminar el conductor de Firebase');
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  })();
}

/**
 * Saves or updates a Cuenta de Cobro with an IRREPETIBLE (globally unique) consecutive.
 * For new cuentas, the Firestore document ID is deterministically `cc-{consecutive}`.
 * If another user has already claimed `cc-{consecutive}`, we automatically resolve the next free consecutive
 * so two users can never create two cuentas with the same consecutive number.
 */
export function saveCuenta(cuenta: CuentaDeCobro): CuentaDeCobro {
  const uid = auth.currentUser?.uid || 'anon';
  const email = auth.currentUser?.email || '';

  const cuentas = [...loadCuentas()];
  const existingIdx = cuentas.findIndex((c) => c.id === cuenta.id);
  const isExisting = existingIdx >= 0 && knownCuentaIds.has(cuenta.id);

  // Enforce unique consecutive in memory for new accounts
  let assignedConsecutive = Math.round(
    clampNumber(
      cuenta.consecutive,
      VALIDATION_LIMITS.CONSECUTIVE_MIN,
      VALIDATION_LIMITS.CONSECUTIVE_MAX,
      1
    )
  );

  if (!isExisting) {
    const usedConsecutives = new Set(cuentas.map((c) => c.consecutive));
    while (
      usedConsecutives.has(assignedConsecutive) ||
      knownCuentaIds.has(`cc-${assignedConsecutive}`)
    ) {
      assignedConsecutive += 1;
    }
  }

  const settings = loadSettings();
  const formattedConsecutive = isExisting
    ? cuenta.consecutiveFormatted
    : formatConsecutive(settings.prefix, assignedConsecutive);

  // Deterministic ID `cc-{consecutive}` for new cuentas guarantees global uniqueness in Firestore
  const cuentaId = isExisting
    ? sanitizeId(cuenta.id, 'cc')
    : sanitizeId(`cc-${assignedConsecutive}`, 'cc');

  const preservedOwnerId = isExisting ? cuentas[existingIdx].ownerId || uid : uid;
  const preservedOwnerEmail = isExisting
    ? cuentas[existingIdx].ownerEmail || email
    : email;

  const sanitizedServices: ServiceItem[] = (cuenta.services || []).map((s, idx) => ({
    ...s,
    id: sanitizeId(s.id || `srv-${idx + 1}`, 'srv'),
    plate: (s.plate || cuenta.vehiclePlate || 'SIN-PLACA').toUpperCase(),
    value: Number(s.value) || 0,
  }));

  const normalizedCuenta: CuentaDeCobro = {
    ...cuenta,
    id: cuentaId,
    ownerId: preservedOwnerId,
    ownerEmail: preservedOwnerEmail || undefined,
    consecutive: assignedConsecutive,
    consecutiveFormatted: formattedConsecutive,
    services: sanitizedServices,
    status: isExisting
      ? cachedIsAdmin
        ? sanitizeStatus(cuenta.status)
        : cuentas[existingIdx].status
      : 'emitida',
    statusUpdatedAt: isExisting ? cuentas[existingIdx].statusUpdatedAt : undefined,
    statusUpdatedByEmail: isExisting ? cuentas[existingIdx].statusUpdatedByEmail : undefined,
    updatedAt: new Date().toISOString(),
  };

  if (isExisting) {
    cuentas[existingIdx] = normalizedCuenta;
  } else {
    cuentas.unshift(normalizedCuenta);
    if (assignedConsecutive >= settings.nextConsecutive) {
      cachedSettings = {
        ...cachedSettings,
        nextConsecutive: assignedConsecutive + 1,
      };
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

  beginWrite();
  (async () => {
    let finalCuentaId = cuentaId;
    let finalConsecutive = assignedConsecutive;
    let finalCuenta = normalizedCuenta;

    try {
      // If creating a new cuenta, verify that `cc-{consecutive}` does not already exist in Firestore
      // (in case another user created one milliseconds ago)
      if (!isExisting) {
        let attempts = 0;
        while (attempts < 15) {
          try {
            // Refresh global settings consecutive if needed
            const globalSnap = await getDoc(doc(db, 'settings', GLOBAL_SETTINGS_DOC_ID));
            if (globalSnap.exists()) {
              const remoteNext = Number(globalSnap.data().nextConsecutive) || 1;
              if (remoteNext > finalConsecutive && attempts > 0) {
                finalConsecutive = remoteNext;
              }
            }
          } catch {
            // Ignore read error on global settings
          }

          finalCuentaId = sanitizeId(`cc-${finalConsecutive}`, 'cc');
          const finalFormatted = formatConsecutive(settings.prefix, finalConsecutive);
          finalCuenta = {
            ...normalizedCuenta,
            id: finalCuentaId,
            consecutive: finalConsecutive,
            consecutiveFormatted: finalFormatted,
          };

          try {
            const batch = writeBatch(db);
            const cuentaRef = doc(db, 'cuentas', finalCuentaId);
            const cuentaPayload = buildCuentaFirestorePayload(authUid, email, finalCuenta);

            batch.set(cuentaRef, {
              ...cuentaPayload,
              ownerId: authUid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });

            const currentSrvIds = new Set<string>();
            finalCuenta.services.forEach((srv, idx) => {
              const srvId = sanitizeId(srv.id, 'srv');
              currentSrvIds.add(srvId);
              const srvRef = doc(db, 'cuentas', finalCuentaId, 'services', srvId);
              const srvPayload = buildServiceItemFirestorePayload(
                authUid,
                finalCuentaId,
                srv,
                idx,
                cuentaPayload.vehiclePlate
              );
              batch.set(srvRef, {
                ...srvPayload,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            });

            await batch.commit();

            // Successfully created unique `cc-{finalConsecutive}`!
            knownCuentaIds.add(finalCuentaId);
            knownServiceIdsByCuenta.set(finalCuentaId, currentSrvIds);
            attachServicesListenerForCuenta(authUid, authUid, cachedIsAdmin, finalCuentaId);

            // If the consecutive was bumped during collision resolution, update local cache & global counter
            if (finalConsecutive !== assignedConsecutive) {
              cachedCuentas = cachedCuentas.map((c) =>
                c.id === cuentaId ? finalCuenta : c
              );
              notifyDataChanged();
            }
            incrementGlobalConsecutiveInFirestore(finalConsecutive + 1);
            endWrite(null);
            return;
          } catch (createErr) {
            // Collision on `cc-{finalConsecutive}` (already exists and owned by another user) -> try next consecutive
            attempts += 1;
            finalConsecutive += 1;
            if (attempts >= 15) {
              throw createErr;
            }
          }
        }
      } else {
        // Updating an existing cuenta (Owner or Admin)
        const batch = writeBatch(db);
        const cuentaRef = doc(db, 'cuentas', finalCuentaId);
        const cuentaPayload = buildCuentaFirestorePayload(
          preservedOwnerId,
          preservedOwnerEmail,
          finalCuenta
        );
        const { ownerId: _ignoreOwner, ...mutableFields } = cuentaPayload;

        batch.update(cuentaRef, {
          ...mutableFields,
          updatedAt: serverTimestamp(),
        });

        const prevSrvIds = knownServiceIdsByCuenta.get(finalCuentaId) || new Set<string>();
        const currentSrvIds = new Set<string>();

        finalCuenta.services.forEach((srv, idx) => {
          const srvId = sanitizeId(srv.id, 'srv');
          currentSrvIds.add(srvId);
          const srvRef = doc(db, 'cuentas', finalCuentaId, 'services', srvId);
          const srvPayload = buildServiceItemFirestorePayload(
            preservedOwnerId,
            finalCuentaId,
            srv,
            idx,
            cuentaPayload.vehiclePlate
          );

          if (prevSrvIds.has(srvId)) {
            const {
              ownerId: _ignoreSrvOwner,
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

        prevSrvIds.forEach((oldSrvId) => {
          if (!currentSrvIds.has(oldSrvId)) {
            batch.delete(doc(db, 'cuentas', finalCuentaId, 'services', oldSrvId));
          }
        });

        await batch.commit();
        knownCuentaIds.add(finalCuentaId);
        knownServiceIdsByCuenta.set(finalCuentaId, currentSrvIds);
        attachServicesListenerForCuenta(authUid, preservedOwnerId, cachedIsAdmin, finalCuentaId);
        endWrite(null);
      }
    } catch (error) {
      endWrite('Error al guardar la cuenta de cobro en Firebase');
      handleFirestoreError(
        error,
        isExisting ? OperationType.UPDATE : OperationType.CREATE,
        `cuentas/${finalCuentaId}`
      );
    }
  })();

  return normalizedCuenta;
}

export function deleteCuenta(id: string): void {
  const target = cachedCuentas.find((c) => c.id === id);
  const cuentaId = target ? target.id : sanitizeId(id, 'cc');

  // Immediately unsubscribe from the services listener so it cannot re-insert the cuenta into cachedCuentas
  const srvUnsub = serviceListenersByCuenta.get(cuentaId);
  if (srvUnsub) {
    srvUnsub();
    serviceListenersByCuenta.delete(cuentaId);
  }
  const srvUnsubRaw = serviceListenersByCuenta.get(id);
  if (srvUnsubRaw) {
    srvUnsubRaw();
    serviceListenersByCuenta.delete(id);
  }

  deletedCuentaIds.add(id);
  deletedCuentaIds.add(cuentaId);
  cachedCuentas = cachedCuentas.filter((c) => c.id !== id && c.id !== cuentaId);
  notifyDataChanged();

  if (!auth.currentUser?.uid) return;
  const path = `cuentas/${cuentaId}`;

  beginWrite();
  (async () => {
    try {
      // 1. Delete known services and any services currently in Firestore subcollection
      const srvIdsToDelete = new Set<string>(knownServiceIdsByCuenta.get(cuentaId) || []);
      if (target?.services) {
        target.services.forEach((s) => {
          if (s.id) srvIdsToDelete.add(s.id);
        });
      }

      try {
        const srvSnap = await getDocs(collection(db, 'cuentas', cuentaId, 'services'));
        srvSnap.forEach((sDoc) => srvIdsToDelete.add(sDoc.id));
      } catch {
        // Ignore subcollection list warning if empty or already removed
      }

      for (const srvId of srvIdsToDelete) {
        try {
          await deleteDoc(doc(db, 'cuentas', cuentaId, 'services', srvId));
        } catch {
          // Ignore individual service delete error
        }
      }

      // 2. Delete the parent cuenta document in Firestore
      await deleteDoc(doc(db, 'cuentas', cuentaId));
      if (id !== cuentaId) {
        try {
          await deleteDoc(doc(db, 'cuentas', id));
        } catch {}
      }

      knownCuentaIds.delete(cuentaId);
      knownCuentaIds.delete(id);
      knownServiceIdsByCuenta.delete(cuentaId);
      knownServiceIdsByCuenta.delete(id);
      endWrite(null);
    } catch (error) {
      deletedCuentaIds.delete(id);
      deletedCuentaIds.delete(cuentaId);
      endWrite('Error al eliminar la cuenta en Firebase');
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  })();
}

export function updateCuentaStatus(
  id: string,
  status: CuentaDeCobro['status'],
  extra?: { paymentReference?: string; paymentReceiptUrl?: string; adminCorrectionNote?: string }
): void {
  // Only Administrators can modify the status of Cuentas de Cobro
  if (!cachedIsAdmin) {
    return;
  }

  const cuentas = [...loadCuentas()];
  const item = cuentas.find((c) => c.id === id);
  if (!item) return;

  const validStatus = sanitizeStatus(status);
  const nowIso = new Date().toISOString();
  const adminEmail = clampString(
    auth.currentUser?.email || PRIMARY_ADMIN_EMAIL,
    VALIDATION_LIMITS.COMPANY_EMAIL_MAX_LEN,
    PRIMARY_ADMIN_EMAIL
  );

  item.status = validStatus;
  item.statusUpdatedAt = nowIso;
  item.statusUpdatedByEmail = adminEmail;
  if (extra?.paymentReference !== undefined) item.paymentReference = clampString(extra.paymentReference, 100, '');
  if (extra?.paymentReceiptUrl !== undefined) item.paymentReceiptUrl = clampString(extra.paymentReceiptUrl, 500000, '');
  if (extra?.adminCorrectionNote !== undefined) item.adminCorrectionNote = clampString(extra.adminCorrectionNote, 1000, '');
  item.updatedAt = nowIso;
  cachedCuentas = cuentas;
  notifyDataChanged();

  if (!auth.currentUser?.uid) return;
  const path = `cuentas/${item.id}`;

  beginWrite();
  (async () => {
    try {
      const updatePayload: Record<string, any> = {
        status: validStatus,
        statusUpdatedAt: nowIso,
        statusUpdatedByEmail: adminEmail,
        updatedAt: serverTimestamp(),
      };
      if (extra?.paymentReference !== undefined) updatePayload.paymentReference = clampString(extra.paymentReference, 100, '');
      if (extra?.paymentReceiptUrl !== undefined) updatePayload.paymentReceiptUrl = clampString(extra.paymentReceiptUrl, 500000, '');
      if (extra?.adminCorrectionNote !== undefined) updatePayload.adminCorrectionNote = clampString(extra.adminCorrectionNote, 1000, '');

      await updateDoc(doc(db, 'cuentas', item.id), updatePayload);
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
    version: '3.0-multi-role-firebase',
    settings: loadSettings(),
    cuentas: loadCuentas(),
    drivers: loadDriverProfiles(),
  };
  return JSON.stringify(backup, null, 2);
}

export function importAllData(jsonData: string): boolean {
  try {
    const parsed = JSON.parse(jsonData);
    if (parsed.settings && cachedIsAdmin) {
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
