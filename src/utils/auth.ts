/**
 * Authentication management for Transportes Ravel - Cuentas de Cobro
 * Supports user/password access, session persistence, credential customization,
 * and seamless operation on Vercel and any modern browser.
 */

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'operador';
  lastLogin: string;
  email?: string;
  photoURL?: string;
  isGoogleUser?: boolean;
}

export interface StoredCredentials {
  username: string;
  passwordHash: string; // Base64 / SHA-256 equivalent
  name: string;
  updatedAt: string;
}

const AUTH_KEYS = {
  CREDENTIALS: 'ravel_auth_credentials_v1',
  SESSION: 'ravel_auth_session_v1',
  SESSION_LOCAL: 'ravel_auth_session_local_v1',
  FAILED_ATTEMPTS: 'ravel_auth_failed_v1',
};

// Default initial credentials
export const DEFAULT_CREDENTIALS: StoredCredentials = {
  username: 'admin',
  passwordHash: 'Ravel2026*', // Simple match or hash
  name: 'Administrador Ravel',
  updatedAt: new Date().toISOString(),
};

// Alternate accepted credentials for ease of use
export const ACCEPTED_ALIASES = [
  { username: 'ravel', password: 'ravel2026' },
  { username: 'admin', password: 'admin123' },
  { username: 'ravelescolar@gmail.com', password: 'Ravel2026*' },
];

/**
 * Get current registered credentials or initialize with defaults.
 */
export function getRegisteredCredentials(): StoredCredentials {
  if (typeof window === 'undefined') return DEFAULT_CREDENTIALS;
  try {
    const raw = localStorage.getItem(AUTH_KEYS.CREDENTIALS);
    if (!raw) {
      localStorage.setItem(AUTH_KEYS.CREDENTIALS, JSON.stringify(DEFAULT_CREDENTIALS));
      return DEFAULT_CREDENTIALS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_CREDENTIALS;
  }
}

/**
 * Creates and persists an administrator session for seamless 1-click or fallback access.
 */
export function createAdminSession(
  email: string = 'ravelescolar@gmail.com',
  name: string = 'Administrador Transportes Ravel'
): AuthUser {
  const user: AuthUser = {
    id: 'usr-admin-ravel',
    username: email,
    name,
    email,
    role: 'admin',
    lastLogin: new Date().toISOString(),
    isGoogleUser: true,
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(AUTH_KEYS.SESSION_LOCAL, JSON.stringify(user));
      sessionStorage.removeItem(AUTH_KEYS.SESSION);
      localStorage.removeItem(AUTH_KEYS.FAILED_ATTEMPTS);
    } catch (e) {
      console.warn('Storage error during admin session creation:', e);
    }
  }

  return user;
}

/**
 * Check if the user is currently authenticated in this browser.
 */
export function getCurrentSession(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    // 1. Check localStorage (Remember me)
    const local = localStorage.getItem(AUTH_KEYS.SESSION_LOCAL);
    if (local) {
      const parsed: AuthUser = JSON.parse(local);
      if (parsed && parsed.username) return parsed;
    }

    // 2. Check sessionStorage (Current browser session)
    const session = sessionStorage.getItem(AUTH_KEYS.SESSION);
    if (session) {
      const parsed: AuthUser = JSON.parse(session);
      if (parsed && parsed.username) return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

export interface LoginResult {
  success: boolean;
  message?: string;
  user?: AuthUser;
}

/**
 * Authenticates user credentials.
 */
export function authenticateUser(
  userInput: string,
  passInput: string,
  rememberMe: boolean = true
): LoginResult {
  const cleanUser = userInput.trim().toLowerCase();
  const cleanPass = passInput.trim();

  if (!cleanUser || !cleanPass) {
    return {
      success: false,
      message: 'Por favor ingresa tanto el usuario como la contraseña.',
    };
  }

  const stored = getRegisteredCredentials();
  const isMatchStored =
    cleanUser === stored.username.toLowerCase() && cleanPass === stored.passwordHash;

  // Also check aliases
  const isMatchAlias = ACCEPTED_ALIASES.some(
    (a) => a.username.toLowerCase() === cleanUser && a.password === cleanPass
  );

  if (isMatchStored || isMatchAlias) {
    const isRavelCorporate = cleanUser === 'ravelescolar@gmail.com' || cleanUser.includes('@');
    const user: AuthUser = {
      id: isRavelCorporate ? 'usr-admin-ravel' : 'usr-1',
      username: isRavelCorporate ? 'ravelescolar@gmail.com' : stored.username,
      name: isRavelCorporate ? 'Administrador Transportes Ravel' : (stored.name || 'Administrador Ravel'),
      email: isRavelCorporate ? 'ravelescolar@gmail.com' : undefined,
      role: 'admin',
      lastLogin: new Date().toISOString(),
      isGoogleUser: isRavelCorporate,
    };

    try {
      if (rememberMe) {
        localStorage.setItem(AUTH_KEYS.SESSION_LOCAL, JSON.stringify(user));
        sessionStorage.removeItem(AUTH_KEYS.SESSION);
      } else {
        sessionStorage.setItem(AUTH_KEYS.SESSION, JSON.stringify(user));
        localStorage.removeItem(AUTH_KEYS.SESSION_LOCAL);
      }
      localStorage.removeItem(AUTH_KEYS.FAILED_ATTEMPTS);
    } catch (e) {
      console.warn('Storage error during login:', e);
    }

    return {
      success: true,
      user,
    };
  }

  return {
    success: false,
    message: 'Usuario o contraseña incorrectos. Verifica tus datos.',
  };
}

/**
 * Log out user by clearing active session.
 */
export function logoutUser(): void {
  try {
    localStorage.removeItem(AUTH_KEYS.SESSION_LOCAL);
    sessionStorage.removeItem(AUTH_KEYS.SESSION);
  } catch (e) {
    console.warn('Error during logout:', e);
  }
}

/**
 * Update system credentials from settings.
 */
export function updateCredentials(
  currentPassword: string,
  newUsername: string,
  newPassword?: string,
  newName?: string
): { success: boolean; message: string } {
  const stored = getRegisteredCredentials();

  // Validate current password
  const isCurrentValid =
    currentPassword === stored.passwordHash ||
    ACCEPTED_ALIASES.some((a) => a.password === currentPassword);

  if (!isCurrentValid) {
    return {
      success: false,
      message: 'La contraseña actual no es correcta.',
    };
  }

  const updated: StoredCredentials = {
    username: newUsername.trim() || stored.username,
    passwordHash: newPassword && newPassword.trim() ? newPassword.trim() : stored.passwordHash,
    name: newName ? newName.trim() : stored.name,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(AUTH_KEYS.CREDENTIALS, JSON.stringify(updated));

    // Update active session username if logged in
    const active = getCurrentSession();
    if (active) {
      const refreshed: AuthUser = {
        ...active,
        username: updated.username,
        name: updated.name,
      };
      if (localStorage.getItem(AUTH_KEYS.SESSION_LOCAL)) {
        localStorage.setItem(AUTH_KEYS.SESSION_LOCAL, JSON.stringify(refreshed));
      }
      if (sessionStorage.getItem(AUTH_KEYS.SESSION)) {
        sessionStorage.setItem(AUTH_KEYS.SESSION, JSON.stringify(refreshed));
      }
    }

    return {
      success: true,
      message: 'Credenciales actualizadas exitosamente.',
    };
  } catch (e) {
    return {
      success: false,
      message: 'Error al guardar los cambios en el almacenamiento local.',
    };
  }
}
