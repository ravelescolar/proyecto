/**
 * Cloud Firestore Synchronization Service for Transportes Ravel
 * Enables multi-device real-time sync across web browsers, smartphones and PCs.
 */

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  getDocs,
  getDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { CuentaDeCobro, DriverProfile, AppSettings, CuentaStatus } from '../types';
import { DEFAULT_SETTINGS, INITIAL_DRIVERS, INITIAL_CUENTAS } from './storage';

// Boundary validation constants synchronized with firebase-blueprint.json & firestore.rules
export const BOUNDARIES = {
  ID_MAX: 128,
  CONSECUTIVE_FORMATTED_MAX: 32,
  DATE_MAX: 32,
  CITY_MAX: 100,
  COMPANY_NAME_MAX: 200,
  COMPANY_NIT_MAX: 100,
  DRIVER_NAME_MAX: 200,
  DRIVER_ID_MAX: 50,
  VEHICLE_PLATE_MAX: 20,
  PHONE_MAX: 30,
  CONCEPT_MAX: 2000,
  OBSERVATIONS_MAX: 2000,
  AMOUNT_IN_WORDS_MAX: 500,
  MAX_SERVICES: 50,
  MAX_FREQUENT_CLIENTS: 30,
  PREFIX_MAX: 20,
};

// ID Sanitizer Guard
export function sanitizeDocId(id: string): string {
  const cleaned = id.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, BOUNDARIES.ID_MAX);
  return cleaned || `doc_${Date.now()}`;
}

/**
 * Sanitize and validate CuentaDeCobro payload to strictly match Firestore schema and size rules
 */
export function sanitizeCuentaForCloud(cuenta: CuentaDeCobro, userId: string, userEmail?: string) {
  const safeId = sanitizeDocId(cuenta.id);
  const now = new Date().toISOString();

  return {
    id: safeId,
    consecutive: Number(cuenta.consecutive) || 1,
    consecutiveFormatted: (cuenta.consecutiveFormatted || `CC-${cuenta.consecutive}`).slice(0, BOUNDARIES.CONSECUTIVE_FORMATTED_MAX),
    date: (cuenta.date || now.split('T')[0]).slice(0, BOUNDARIES.DATE_MAX),
    paymentDueDate: (cuenta.paymentDueDate || now.split('T')[0]).slice(0, BOUNDARIES.DATE_MAX),
    city: (cuenta.city || 'Barranquilla').slice(0, BOUNDARIES.CITY_MAX),
    companyName: (cuenta.companyName || 'TRANSPORTES RAVEL').slice(0, BOUNDARIES.COMPANY_NAME_MAX),
    companyNit: (cuenta.companyNit || '900.388.163-2').slice(0, BOUNDARIES.COMPANY_NIT_MAX),
    driverName: (cuenta.driverName || 'Conductor').slice(0, BOUNDARIES.DRIVER_NAME_MAX),
    driverId: (cuenta.driverId || '0').slice(0, BOUNDARIES.DRIVER_ID_MAX),
    vehiclePlate: (cuenta.vehiclePlate || 'AAA-000').slice(0, BOUNDARIES.VEHICLE_PLATE_MAX),
    driverPhone: (cuenta.driverPhone || '').slice(0, BOUNDARIES.PHONE_MAX),
    services: (cuenta.services || []).slice(0, BOUNDARIES.MAX_SERVICES).map((s) => ({
      id: sanitizeDocId(s.id || `srv-${Date.now()}`),
      date: (s.date || now.split('T')[0]).slice(0, BOUNDARIES.DATE_MAX),
      plate: (s.plate || cuenta.vehiclePlate || '').slice(0, BOUNDARIES.VEHICLE_PLATE_MAX),
      clientDetail: (s.clientDetail || 'Servicio de transporte').slice(0, 500),
      value: Math.max(0, Number(s.value) || 0),
    })),
    legalConcept: (cuenta.legalConcept || '').slice(0, BOUNDARIES.CONCEPT_MAX),
    concept: (cuenta.legalConcept || '').slice(0, BOUNDARIES.CONCEPT_MAX),
    observations: (cuenta.notes || '').slice(0, BOUNDARIES.OBSERVATIONS_MAX),
    paymentData: {
      bank: (cuenta.paymentData?.bank || 'Bancolombia').slice(0, 100),
      accountNumber: (cuenta.paymentData?.accountNumber || '').slice(0, 64),
      accountType: cuenta.paymentData?.accountType || 'Ahorros',
      accountHolder: (cuenta.paymentData?.accountHolder || cuenta.driverName || '').slice(0, 200),
      identification: (cuenta.paymentData?.identification || cuenta.driverId || '').slice(0, 50),
    },
    totalAmount: Math.max(0, Number(cuenta.totalAmount) || 0),
    amountInWords: (cuenta.amountInWords || '').slice(0, BOUNDARIES.AMOUNT_IN_WORDS_MAX),
    totalAmountInWords: (cuenta.amountInWords || '').slice(0, BOUNDARIES.AMOUNT_IN_WORDS_MAX),
    signatureDataUrl: (cuenta.signatureDataUrl || '').slice(0, 50000),
    status: (['emitida', 'radicada', 'pagada', 'anulada'].includes(cuenta.status)
      ? cuenta.status
      : 'emitida') as CuentaStatus,
    createdAt: (cuenta.createdAt || now).slice(0, 64),
    updatedAt: now.slice(0, 64),
    userId: userId.slice(0, BOUNDARIES.ID_MAX),
    userEmail: (userEmail || auth.currentUser?.email || '').slice(0, 128),
    notes: (cuenta.notes || '').slice(0, 2000),
  };
}

/**
 * Sanitize DriverProfile for Firestore
 */
export function sanitizeDriverForCloud(driver: DriverProfile, userId: string) {
  const safeId = sanitizeDocId(driver.id);
  const now = new Date().toISOString();

  return {
    id: safeId,
    plate: (driver.plate || 'AAA-000').slice(0, BOUNDARIES.VEHICLE_PLATE_MAX),
    driverName: (driver.driverName || 'Conductor').slice(0, BOUNDARIES.DRIVER_NAME_MAX),
    idNumber: (driver.idNumber || '0').slice(0, BOUNDARIES.DRIVER_ID_MAX),
    phone: (driver.phone || '').slice(0, BOUNDARIES.PHONE_MAX),
    paymentData: {
      bank: (driver.paymentData?.bank || 'Bancolombia').slice(0, 100),
      accountNumber: (driver.paymentData?.accountNumber || '').slice(0, 64),
      accountType: driver.paymentData?.accountType || 'Ahorros',
      accountHolder: (driver.paymentData?.accountHolder || driver.driverName || '').slice(0, 200),
      identification: (driver.paymentData?.identification || driver.idNumber || '').slice(0, 50),
    },
    frequentClients: (driver.frequentClients || []).slice(0, BOUNDARIES.MAX_FREQUENT_CLIENTS).map((c) => c.slice(0, 200)),
    totalAccountsGenerated: Math.max(0, Number(driver.totalAccountsGenerated) || 0),
    lastUsedAt: (driver.lastUsedAt || now).slice(0, 64),
    createdAt: now.slice(0, 64),
    updatedAt: now.slice(0, 64),
    userId: userId.slice(0, BOUNDARIES.ID_MAX),
  };
}

/**
 * Sanitize AppSettings for Firestore
 */
export function sanitizeSettingsForCloud(settings: AppSettings, userId: string) {
  const now = new Date().toISOString();
  return {
    id: 'global',
    prefix: (settings.prefix || 'CC-').slice(0, BOUNDARIES.PREFIX_MAX),
    nextConsecutive: Math.max(1, Number(settings.nextConsecutive) || 101),
    companyName: (settings.companyName || 'TRANSPORTES RAVEL').slice(0, BOUNDARIES.COMPANY_NAME_MAX),
    companyNit: (settings.companyNit || '900.388.163-2').slice(0, BOUNDARIES.COMPANY_NIT_MAX),
    companyAddress: (settings.companyAddress || 'Barranquilla').slice(0, 200),
    companyPhone: (settings.companyPhone || '').slice(0, 50),
    companyEmail: (settings.companyEmail || 'ravelescolar@gmail.com').slice(0, 120),
    defaultCity: (settings.defaultCity || 'Barranquilla').slice(0, BOUNDARIES.CITY_MAX),
    defaultConcept: (settings.defaultConcept || '').slice(0, BOUNDARIES.CONCEPT_MAX),
    companyLogoUrl: (settings.companyLogoUrl || '').slice(0, 2000),
    companySlogan: (settings.companySlogan || '').slice(0, 200),
    updatedAt: now.slice(0, 64),
    updatedBy: userId.slice(0, BOUNDARIES.ID_MAX),
  };
}

/**
 * Subscribe to Cuentas in Firestore with real-time updates
 */
export function subscribeToCuentas(
  currentUserId: string,
  userEmail: string | undefined,
  onData: (cuentas: CuentaDeCobro[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const isAdmin = userEmail === 'ravelescolar@gmail.com';
  const cuentasCol = collection(db, 'cuentas');

  const q = isAdmin
    ? cuentasCol
    : query(cuentasCol, where('userId', '==', currentUserId));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: CuentaDeCobro[] = snapshot.docs.map((d) => {
        const raw = d.data();
        return {
          id: raw.id || d.id,
          consecutive: raw.consecutive || 1,
          consecutiveFormatted: raw.consecutiveFormatted || `CC-${raw.consecutive}`,
          date: raw.date || '',
          paymentDueDate: raw.paymentDueDate || '',
          city: raw.city || 'Barranquilla',
          companyName: raw.companyName || 'TRANSPORTES RAVEL',
          companyNit: raw.companyNit || '900.388.163-2',
          driverName: raw.driverName || '',
          driverId: raw.driverId || '',
          vehiclePlate: raw.vehiclePlate || '',
          driverPhone: raw.driverPhone || '',
          services: raw.services || [],
          totalAmount: raw.totalAmount || 0,
          amountInWords: raw.amountInWords || raw.totalAmountInWords || '',
          legalConcept: raw.legalConcept || raw.concept || '',
          paymentData: raw.paymentData || {
            bank: 'Bancolombia',
            accountNumber: '',
            accountType: 'Ahorros',
            accountHolder: raw.driverName || '',
            identification: raw.driverId || '',
          },
          signatureDataUrl: raw.signatureDataUrl || '',
          companyLogoUrl: raw.companyLogoUrl || '',
          notes: raw.notes || raw.observations || '',
          status: raw.status || 'emitida',
          createdAt: raw.createdAt || '',
          updatedAt: raw.updatedAt || '',
        };
      });

      // Sort by consecutive descending (latest first)
      list.sort((a, b) => b.consecutive - a.consecutive);
      onData(list);
    },
    (error) => {
      console.warn('Firestore subscription notice at cuentas:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Subscribe to Drivers directory in Firestore with real-time updates
 */
export function subscribeToDrivers(
  currentUserId: string,
  userEmail: string | undefined,
  onData: (drivers: DriverProfile[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const isAdmin = userEmail === 'ravelescolar@gmail.com';
  const driversCol = collection(db, 'drivers');

  const q = isAdmin
    ? driversCol
    : query(driversCol, where('userId', '==', currentUserId));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: DriverProfile[] = snapshot.docs.map((d) => {
        const raw = d.data();
        return {
          id: raw.id || d.id,
          plate: raw.plate || '',
          driverName: raw.driverName || '',
          idNumber: raw.idNumber || '',
          phone: raw.phone || '',
          paymentData: raw.paymentData || {
            bank: 'Bancolombia',
            accountNumber: '',
            accountType: 'Ahorros',
            accountHolder: raw.driverName || '',
            identification: raw.idNumber || '',
          },
          frequentClients: raw.frequentClients || [],
          totalAccountsGenerated: raw.totalAccountsGenerated || 0,
          lastUsedAt: raw.lastUsedAt || '',
        };
      });

      list.sort((a, b) => (b.lastUsedAt || '').localeCompare(a.lastUsedAt || ''));
      onData(list);
    },
    (error) => {
      console.warn('Firestore subscription notice at drivers:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Subscribe to Settings in Firestore
 */
export function subscribeToSettings(
  onData: (settings: AppSettings) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const settingsDoc = doc(db, 'settings', 'global');

  return onSnapshot(
    settingsDoc,
    (snap) => {
      if (snap.exists()) {
        const raw = snap.data();
        onData({
          prefix: raw.prefix || DEFAULT_SETTINGS.prefix,
          nextConsecutive: raw.nextConsecutive || DEFAULT_SETTINGS.nextConsecutive,
          companyName: raw.companyName || DEFAULT_SETTINGS.companyName,
          companyNit: raw.companyNit || DEFAULT_SETTINGS.companyNit,
          companyAddress: raw.companyAddress || DEFAULT_SETTINGS.companyAddress,
          companyPhone: raw.companyPhone || DEFAULT_SETTINGS.companyPhone,
          companyEmail: raw.companyEmail || DEFAULT_SETTINGS.companyEmail,
          defaultCity: raw.defaultCity || DEFAULT_SETTINGS.defaultCity,
          defaultConcept: raw.defaultConcept || DEFAULT_SETTINGS.defaultConcept,
          companyLogoUrl: raw.companyLogoUrl,
          companySlogan: raw.companySlogan,
        });
      }
    },
    (error) => {
      console.warn('Firestore subscription notice at settings/global:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Save / Update Cuenta in Cloud Firestore
 */
export async function saveCuentaCloud(cuenta: CuentaDeCobro, userId: string, userEmail?: string): Promise<void> {
  const payload = sanitizeCuentaForCloud(cuenta, userId, userEmail);
  const path = `cuentas/${payload.id}`;
  try {
    await setDoc(doc(db, 'cuentas', payload.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Update Cuenta status in Cloud Firestore
 */
export async function updateCuentaStatusCloud(cuentaId: string, status: CuentaStatus): Promise<void> {
  const safeId = sanitizeDocId(cuentaId);
  const path = `cuentas/${safeId}`;
  try {
    await updateDoc(doc(db, 'cuentas', safeId), {
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Delete Cuenta in Cloud Firestore
 */
export async function deleteCuentaCloud(cuentaId: string): Promise<void> {
  const safeId = sanitizeDocId(cuentaId);
  const path = `cuentas/${safeId}`;
  try {
    await deleteDoc(doc(db, 'cuentas', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Save Driver Profile in Cloud Firestore
 */
export async function saveDriverCloud(driver: DriverProfile, userId: string): Promise<void> {
  const payload = sanitizeDriverForCloud(driver, userId);
  const path = `drivers/${payload.id}`;
  try {
    await setDoc(doc(db, 'drivers', payload.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete Driver in Cloud Firestore
 */
export async function deleteDriverCloud(driverId: string): Promise<void> {
  const safeId = sanitizeDocId(driverId);
  const path = `drivers/${safeId}`;
  try {
    await deleteDoc(doc(db, 'drivers', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Save Settings in Cloud Firestore
 */
export async function saveSettingsCloud(settings: AppSettings, userId: string): Promise<void> {
  const payload = sanitizeSettingsForCloud(settings, userId);
  const path = 'settings/global';
  try {
    await setDoc(doc(db, 'settings', 'global'), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Initial Seeding & Migration:
 * When a user signs in for the first time or wants cloud sync,
 * if cloud is empty, seed initial data or existing local data so nothing is lost.
 */
export async function syncInitialDataToCloud(
  userId: string,
  userEmail?: string,
  localCuentas: CuentaDeCobro[] = [],
  localDrivers: DriverProfile[] = [],
  localSettings: AppSettings = DEFAULT_SETTINGS
): Promise<{ cuentasSynced: number; driversSynced: number }> {
  try {
    // 1. Check if settings exist in cloud, if not initialize
    const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
    if (!settingsSnap.exists()) {
      await saveSettingsCloud(localSettings, userId);
    }

    // 2. Check if user already has cuentas in cloud
    const cuentasQuery = query(collection(db, 'cuentas'), where('userId', '==', userId));
    const cuentasSnap = await getDocs(cuentasQuery);

    let cuentasSynced = 0;
    if (cuentasSnap.empty) {
      const toUpload = localCuentas.length > 0 ? localCuentas : INITIAL_CUENTAS;
      for (const c of toUpload) {
        await saveCuentaCloud(c, userId, userEmail);
        cuentasSynced++;
      }
    }

    // 3. Check drivers
    const driversQuery = query(collection(db, 'drivers'), where('userId', '==', userId));
    const driversSnap = await getDocs(driversQuery);

    let driversSynced = 0;
    if (driversSnap.empty) {
      const toUploadDrivers = localDrivers.length > 0 ? localDrivers : INITIAL_DRIVERS;
      for (const d of toUploadDrivers) {
        await saveDriverCloud(d, userId);
        driversSynced++;
      }
    }

    return { cuentasSynced, driversSynced };
  } catch (error) {
    console.warn('Initial cloud migration warning (may already be synced):', error);
    return { cuentasSynced: 0, driversSynced: 0 };
  }
}

/**
 * Convenience auto-authenticated helpers for storage integration
 */
export async function saveCuentaToCloud(cuenta: CuentaDeCobro): Promise<void> {
  if (!auth.currentUser) return;
  return saveCuentaCloud(cuenta, auth.currentUser.uid, auth.currentUser.email || undefined);
}

export async function deleteCuentaToCloud(cuentaId: string): Promise<void> {
  if (!auth.currentUser) return;
  return deleteCuentaCloud(cuentaId);
}
export const deleteCuentaFromCloud = deleteCuentaToCloud;

export async function saveDriverToCloud(driver: DriverProfile): Promise<void> {
  if (!auth.currentUser) return;
  return saveDriverCloud(driver, auth.currentUser.uid);
}

export async function deleteDriverToCloud(driverId: string): Promise<void> {
  if (!auth.currentUser) return;
  return deleteDriverCloud(driverId);
}
export const deleteDriverFromCloud = deleteDriverToCloud;

export async function saveSettingsToCloud(settings: AppSettings): Promise<void> {
  if (!auth.currentUser) return;
  return saveSettingsCloud(settings, auth.currentUser.uid);
}

