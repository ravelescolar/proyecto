import { AppSettings, CuentaDeCobro, DriverProfile } from '../types';
import {
  loadCuentas,
  loadDriverProfiles,
  loadSettings,
  saveSettings,
} from './storage';
import { getRegisteredCredentials } from './auth';

export type SyncState = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

type SyncListener = (state: SyncState, lastSyncText: string) => void;
const listeners: Set<SyncListener> = new Set();

let currentSyncState: SyncState = 'idle';
let lastSyncTimestamp: string = '';

export function subscribeToSyncStatus(listener: SyncListener): () => void {
  listeners.add(listener);
  listener(currentSyncState, lastSyncTimestamp);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(state: SyncState) {
  currentSyncState = state;
  listeners.forEach((fn) => fn(state, lastSyncTimestamp));
}

/**
 * Push current local database state to the web server
 */
export async function pushLocalDataToServer(): Promise<boolean> {
  notifyListeners('syncing');

  try {
    const cuentas = loadCuentas();
    const drivers = loadDriverProfiles();
    const settings = loadSettings();
    const credentials = getRegisteredCredentials();

    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cuentas,
        drivers,
        settings,
        credentials,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const json = await response.json();
    if (json.success) {
      lastSyncTimestamp = new Date().toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      notifyListeners('synced');
      return true;
    } else {
      throw new Error(json.error || 'Fallo de respuesta del servidor');
    }
  } catch (error) {
    console.warn('[cloudSync] Error pushing data to server:', error);
    notifyListeners(navigator.onLine ? 'error' : 'offline');
    return false;
  }
}

export interface CloudFetchResult {
  cuentas?: CuentaDeCobro[];
  drivers?: DriverProfile[];
  settings?: AppSettings;
  updated: boolean;
}

/**
 * Fetch latest data from the web server and update local storage if newer
 */
export async function pullDataFromServer(): Promise<CloudFetchResult> {
  notifyListeners('syncing');

  try {
    const response = await fetch('/api/sync', {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const json = await response.json();
    if (json.success && json.data) {
      const serverData = json.data;

      // Update local storage with server records
      if (Array.isArray(serverData.cuentas) && serverData.cuentas.length > 0) {
        localStorage.setItem('ravel_cuentas_list_v1', JSON.stringify(serverData.cuentas));
      }

      if (Array.isArray(serverData.drivers) && serverData.drivers.length > 0) {
        localStorage.setItem('ravel_driver_profiles_v1', JSON.stringify(serverData.drivers));
      }

      if (serverData.settings) {
        saveSettings(serverData.settings);
      }

      if (serverData.credentials) {
        localStorage.setItem('ravel_auth_credentials_v1', JSON.stringify(serverData.credentials));
      }

      lastSyncTimestamp = new Date().toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      notifyListeners('synced');

      return {
        cuentas: serverData.cuentas,
        drivers: serverData.drivers,
        settings: serverData.settings,
        updated: true,
      };
    }

    notifyListeners('synced');
    return { updated: false };
  } catch (error) {
    console.warn('[cloudSync] Error pulling from server:', error);
    notifyListeners(navigator.onLine ? 'error' : 'offline');
    return { updated: false };
  }
}
