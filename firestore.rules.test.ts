/**
 * Suite de Verificación de Seguridad para Firestore Rules ("The Dirty Dozen")
 * Verifica que los 12 vectores de ataque definidos en security_spec.md retornen PERMISSION_DENIED.
 */

export interface AuthContext {
  uid: string;
  email: string;
  email_verified: boolean;
}

export interface RuleEvaluationContext {
  auth: AuthContext | null;
  requestTime: string;
  path: string;
  idParams: Record<string, string>;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  existingData?: Record<string, unknown> | null;
  incomingData?: Record<string, unknown> | null;
  parentCuentaDataAfter?: Record<string, unknown> | null;
}

const ID_REGEX = /^[a-zA-Z0-9_-]+$/;
const VALID_ACCOUNT_TYPES = [
  'Ahorros',
  'Corriente',
  'Nequi',
  'Daviplata',
  'Depósito de bajo monto',
  'Otro',
];
const VALID_STATUSES = ['emitida', 'pagada', 'anulada'];

function isValidId(id: string | undefined): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && ID_REGEX.test(id);
}

function hasExactKeys(data: Record<string, unknown>, requiredKeys: string[]): boolean {
  const keys = Object.keys(data);
  return (
    keys.length === requiredKeys.length &&
    requiredKeys.every((k) => Object.prototype.hasOwnProperty.call(data, k))
  );
}

function isValidDriverProfile(data: Record<string, unknown>, auth: AuthContext): boolean {
  const required = [
    'ownerId',
    'plate',
    'driverName',
    'idNumber',
    'phone',
    'paymentBank',
    'paymentAccountNumber',
    'paymentAccountType',
    'paymentAccountHolder',
    'paymentIdentification',
    'frequentClients',
    'totalAccountsGenerated',
    'lastUsedAt',
    'createdAt',
    'updatedAt',
  ];
  if (!hasExactKeys(data, required)) return false;
  if (typeof data.ownerId !== 'string' || !isValidId(data.ownerId) || data.ownerId !== auth.uid) return false;
  if (typeof data.plate !== 'string' || data.plate.length < 1 || data.plate.length > 20) return false;
  if (typeof data.driverName !== 'string' || data.driverName.length < 1 || data.driverName.length > 150) return false;
  if (typeof data.idNumber !== 'string' || data.idNumber.length > 50) return false;
  if (typeof data.phone !== 'string' || data.phone.length > 50) return false;
  if (typeof data.paymentBank !== 'string' || data.paymentBank.length < 1 || data.paymentBank.length > 100) return false;
  if (typeof data.paymentAccountNumber !== 'string' || data.paymentAccountNumber.length > 100) return false;
  if (
    typeof data.paymentAccountType !== 'string' ||
    data.paymentAccountType.length < 1 ||
    data.paymentAccountType.length > 50 ||
    !VALID_ACCOUNT_TYPES.includes(data.paymentAccountType)
  ) {
    return false;
  }
  if (typeof data.paymentAccountHolder !== 'string' || data.paymentAccountHolder.length > 150) return false;
  if (typeof data.paymentIdentification !== 'string' || data.paymentIdentification.length > 50) return false;
  if (!Array.isArray(data.frequentClients) || data.frequentClients.length > 10) return false;
  if (
    data.frequentClients.length > 0 &&
    (typeof data.frequentClients[0] !== 'string' || data.frequentClients[0].length > 200)
  ) {
    return false;
  }
  if (
    typeof data.totalAccountsGenerated !== 'number' ||
    !Number.isInteger(data.totalAccountsGenerated) ||
    data.totalAccountsGenerated < 0 ||
    data.totalAccountsGenerated > 999999
  ) {
    return false;
  }
  if (typeof data.lastUsedAt !== 'string' || data.lastUsedAt.length < 1 || data.lastUsedAt.length > 50) return false;
  return true;
}

function isValidCuentaDeCobro(data: Record<string, unknown>, auth: AuthContext): boolean {
  const required = [
    'ownerId',
    'consecutive',
    'consecutiveFormatted',
    'date',
    'paymentDueDate',
    'city',
    'companyName',
    'companyNit',
    'driverName',
    'driverId',
    'vehiclePlate',
    'driverPhone',
    'totalAmount',
    'amountInWords',
    'legalConcept',
    'paymentBank',
    'paymentAccountNumber',
    'paymentAccountType',
    'paymentAccountHolder',
    'paymentIdentification',
    'signatureDataUrl',
    'companyLogoUrl',
    'notes',
    'status',
    'createdAt',
    'updatedAt',
  ];
  if (!hasExactKeys(data, required)) return false;
  if (typeof data.ownerId !== 'string' || !isValidId(data.ownerId) || data.ownerId !== auth.uid) return false;
  if (
    typeof data.consecutive !== 'number' ||
    !Number.isInteger(data.consecutive) ||
    data.consecutive < 1 ||
    data.consecutive > 9999999
  ) {
    return false;
  }
  if (typeof data.consecutiveFormatted !== 'string' || data.consecutiveFormatted.length < 1 || data.consecutiveFormatted.length > 30) return false;
  if (typeof data.date !== 'string' || data.date.length < 1 || data.date.length > 30) return false;
  if (typeof data.paymentDueDate !== 'string' || data.paymentDueDate.length < 1 || data.paymentDueDate.length > 30) return false;
  if (typeof data.city !== 'string' || data.city.length < 1 || data.city.length > 100) return false;
  if (typeof data.companyName !== 'string' || data.companyName.length < 1 || data.companyName.length > 150) return false;
  if (typeof data.companyNit !== 'string' || data.companyNit.length < 1 || data.companyNit.length > 50) return false;
  if (typeof data.driverName !== 'string' || data.driverName.length < 1 || data.driverName.length > 150) return false;
  if (typeof data.driverId !== 'string' || data.driverId.length < 1 || data.driverId.length > 50) return false;
  if (typeof data.vehiclePlate !== 'string' || data.vehiclePlate.length < 1 || data.vehiclePlate.length > 20) return false;
  if (typeof data.driverPhone !== 'string' || data.driverPhone.length > 50) return false;
  if (typeof data.totalAmount !== 'number' || data.totalAmount < 0 || data.totalAmount > 999999999999) return false;
  if (typeof data.amountInWords !== 'string' || data.amountInWords.length < 1 || data.amountInWords.length > 500) return false;
  if (typeof data.legalConcept !== 'string' || data.legalConcept.length < 1 || data.legalConcept.length > 1000) return false;
  if (typeof data.paymentBank !== 'string' || data.paymentBank.length < 1 || data.paymentBank.length > 100) return false;
  if (typeof data.paymentAccountNumber !== 'string' || data.paymentAccountNumber.length < 1 || data.paymentAccountNumber.length > 100) return false;
  if (
    typeof data.paymentAccountType !== 'string' ||
    !VALID_ACCOUNT_TYPES.includes(data.paymentAccountType)
  ) {
    return false;
  }
  if (typeof data.paymentAccountHolder !== 'string' || data.paymentAccountHolder.length > 150) return false;
  if (typeof data.paymentIdentification !== 'string' || data.paymentIdentification.length > 50) return false;
  if (typeof data.signatureDataUrl !== 'string' || data.signatureDataUrl.length > 500000) return false;
  if (typeof data.companyLogoUrl !== 'string' || data.companyLogoUrl.length > 500000) return false;
  if (typeof data.notes !== 'string' || data.notes.length > 1000) return false;
  if (typeof data.status !== 'string' || !VALID_STATUSES.includes(data.status)) return false;
  return true;
}

export function evaluateRule(ctx: RuleEvaluationContext): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!ctx.auth) return 'PERMISSION_DENIED';

  if (ctx.operation === 'get' || ctx.operation === 'list') {
    if (!ctx.existingData || ctx.existingData.ownerId !== ctx.auth.uid) {
      return 'PERMISSION_DENIED';
    }
    return 'ALLOW';
  }

  // Write operations require email_verified == true
  if (!ctx.auth.email_verified) return 'PERMISSION_DENIED';

  // Path variable validation
  for (const idVal of Object.values(ctx.idParams)) {
    if (!isValidId(idVal)) return 'PERMISSION_DENIED';
  }

  if (ctx.path.startsWith('/cuentas/') && ctx.path.includes('/services/')) {
    if (!ctx.parentCuentaDataAfter || ctx.parentCuentaDataAfter.ownerId !== ctx.auth.uid) {
      return 'PERMISSION_DENIED';
    }
    if (ctx.parentCuentaDataAfter.status === 'anulada') {
      return 'PERMISSION_DENIED';
    }
  }

  if (ctx.operation === 'create') {
    if (!ctx.incomingData) return 'PERMISSION_DENIED';
    if (ctx.incomingData.createdAt !== ctx.requestTime || ctx.incomingData.updatedAt !== ctx.requestTime) {
      return 'PERMISSION_DENIED';
    }
    if (ctx.path.startsWith('/drivers/')) {
      return isValidDriverProfile(ctx.incomingData, ctx.auth) ? 'ALLOW' : 'PERMISSION_DENIED';
    }
    if (ctx.path.startsWith('/cuentas/') && !ctx.path.includes('/services/')) {
      return isValidCuentaDeCobro(ctx.incomingData, ctx.auth) ? 'ALLOW' : 'PERMISSION_DENIED';
    }
  }

  if (ctx.operation === 'update') {
    if (!ctx.existingData || !ctx.incomingData) return 'PERMISSION_DENIED';
    if (ctx.existingData.ownerId !== ctx.auth.uid) return 'PERMISSION_DENIED';
    if (ctx.incomingData.ownerId !== ctx.existingData.ownerId) return 'PERMISSION_DENIED';
    if (ctx.incomingData.createdAt !== ctx.existingData.createdAt) return 'PERMISSION_DENIED';
    if (ctx.incomingData.updatedAt !== ctx.requestTime) return 'PERMISSION_DENIED';

    if (ctx.path.startsWith('/cuentas/') && !ctx.path.includes('/services/')) {
      if (ctx.existingData.status === 'anulada') return 'PERMISSION_DENIED';
      return isValidCuentaDeCobro(ctx.incomingData, ctx.auth) ? 'ALLOW' : 'PERMISSION_DENIED';
    }
    if (ctx.path.startsWith('/drivers/')) {
      return isValidDriverProfile(ctx.incomingData, ctx.auth) ? 'ALLOW' : 'PERMISSION_DENIED';
    }
    if (ctx.path.startsWith('/settings/')) {
      if (ctx.incomingData.ownerId !== ctx.idParams.userId) return 'PERMISSION_DENIED';
      return 'ALLOW';
    }
  }

  return 'PERMISSION_DENIED';
}

const NOW = '2026-10-06T21:30:00Z';
const ATTACKER: AuthContext = { uid: 'attacker-uid', email: 'attacker@test.com', email_verified: true };

const baseCuenta: Record<string, unknown> = {
  ownerId: 'attacker-uid',
  consecutive: 101,
  consecutiveFormatted: 'CC-0101',
  date: '2026-10-06',
  paymentDueDate: '2026-10-11',
  city: 'Barranquilla',
  companyName: 'TRANSPORTES RAVEL',
  companyNit: '900.388.163-2',
  driverName: 'CARLOS MARTINEZ',
  driverId: '72345890',
  vehiclePlate: 'WDF-452',
  driverPhone: '3001234567',
  totalAmount: 450000,
  amountInWords: 'CUATROCIENTOS CINCUENTA MIL PESOS M/CTE.',
  legalConcept: 'Transporte escolar',
  paymentBank: 'Bancolombia',
  paymentAccountNumber: '123456789',
  paymentAccountType: 'Ahorros',
  paymentAccountHolder: 'CARLOS MARTINEZ',
  paymentIdentification: '72345890',
  signatureDataUrl: '',
  companyLogoUrl: '',
  notes: '',
  status: 'emitida',
  createdAt: NOW,
  updatedAt: NOW,
};

const baseDriver: Record<string, unknown> = {
  ownerId: 'attacker-uid',
  plate: 'WDF-452',
  driverName: 'CARLOS MARTINEZ',
  idNumber: '72345890',
  phone: '3001234567',
  paymentBank: 'Bancolombia',
  paymentAccountNumber: '123456789',
  paymentAccountType: 'Ahorros',
  paymentAccountHolder: 'CARLOS MARTINEZ',
  paymentIdentification: '72345890',
  frequentClients: ['Ruta Norte'],
  totalAccountsGenerated: 1,
  lastUsedAt: NOW,
  createdAt: NOW,
  updatedAt: NOW,
};

export function runDirtyDozenSecurityTests(): void {
  const dirtyDozen: { name: string; context: RuleEvaluationContext }[] = [
    {
      name: '1. Identity Spoofing en creacion de Cuenta',
      context: {
        auth: ATTACKER,
        requestTime: NOW,
        path: '/cuentas/cc-101',
        idParams: { cuentaId: 'cc-101' },
        operation: 'create',
        incomingData: { ...baseCuenta, ownerId: 'victim-uid' },
      },
    },
    {
      name: '2. Unverified Email Write Attack',
      context: {
        auth: { ...ATTACKER, email_verified: false },
        requestTime: NOW,
        path: '/drivers/drv-1',
        idParams: { driverId: 'drv-1' },
        operation: 'create',
        incomingData: baseDriver,
      },
    },
    {
      name: '3. Shadow Field / Ghost Key Injection en Update',
      context: {
        auth: ATTACKER,
        requestTime: NOW,
        path: '/cuentas/cc-101',
        idParams: { cuentaId: 'cc-101' },
        operation: 'update',
        existingData: baseCuenta,
        incomingData: { ...baseCuenta, isApprovedByAdmin: true },
      },
    },
    {
      name: '4. Terminal State Bypass (anulada -> pagada)',
      context: {
        auth: ATTACKER,
        requestTime: NOW,
        path: '/cuentas/cc-101',
        idParams: { cuentaId: 'cc-101' },
        operation: 'update',
        existingData: { ...baseCuenta, status: 'anulada' },
        incomingData: { ...baseCuenta, status: 'pagada' },
      },
    },
    {
      name: '5. Orphaned Subcollection Write',
      context: {
        auth: ATTACKER,
        requestTime: NOW,
        path: '/cuentas/cc-missing/services/srv-1',
        idParams: { cuentaId: 'cc-missing', serviceId: 'srv-1' },
        operation: 'create',
        parentCuentaDataAfter: null,
        incomingData: {
          ownerId: 'attacker-uid',
          cuentaId: 'cc-missing',
          orderIndex: 0,
          date: '2026-10-06',
          plate: 'WDF-452',
          clientDetail: 'Ruta 1',
          value: 100000,
          createdAt: NOW,
          updatedAt: NOW,
        },
      },
    },
    {
      name: '6. Cross-Tenant Subcollection Hijack',
      context: {
        auth: ATTACKER,
        requestTime: NOW,
        path: '/cuentas/cc-victim/services/srv-1',
        idParams: { cuentaId: 'cc-victim', serviceId: 'srv-1' },
        operation: 'create',
        parentCuentaDataAfter: { ...baseCuenta, ownerId: 'victim-uid' },
        incomingData: {
          ownerId: 'attacker-uid',
          cuentaId: 'cc-victim',
          orderIndex: 0,
          date: '2026-10-06',
          plate: 'WDF-452',
          clientDetail: 'Ruta 1',
          value: 100000,
          createdAt: NOW,
          updatedAt: NOW,
        },
      },
    },
    {
      name: '7. Immortal Field Mutation (createdAt tamper)',
      context: {
        auth: ATTACKER,
        requestTime: NOW,
        path: '/drivers/drv-1',
        idParams: { driverId: 'drv-1' },
        operation: 'update',
        existingData: baseDriver,
        incomingData: { ...baseDriver, createdAt: '1999-01-01T00:00:00Z' },
      },
    },
    {
      name: '8. Client Timestamp Forgery (updatedAt != request.time)',
      context: {
        auth: ATTACKER,
        requestTime: NOW,
        path: '/drivers/drv-1',
        idParams: { driverId: 'drv-1' },
        operation: 'update',
        existingData: baseDriver,
        incomingData: { ...baseDriver, updatedAt: '2099-01-01T00:00:00Z' },
      },
    },
    {
      name: '9. Denial-of-Wallet Array Overflow (> 10 frequentClients)',
      context: {
        auth: ATTACKER,
        requestTime: NOW,
        path: '/drivers/drv-1',
        idParams: { driverId: 'drv-1' },
        operation: 'create',
        incomingData: {
          ...baseDriver,
          frequentClients: Array.from({ length: 12 }, (_, i) => `Ruta ${i}`),
        },
      },
    },
    {
      name: '10. Path ID Poisoning (special chars in ID)',
      context: {
        auth: ATTACKER,
        requestTime: NOW,
        path: '/drivers/bad$id!',
        idParams: { driverId: 'bad$id!' },
        operation: 'create',
        incomingData: baseDriver,
      },
    },
    {
      name: '11. Value Poisoning on Whitelisted Key (invalid status enum)',
      context: {
        auth: ATTACKER,
        requestTime: NOW,
        path: '/cuentas/cc-101',
        idParams: { cuentaId: 'cc-101' },
        operation: 'update',
        existingData: baseCuenta,
        incomingData: { ...baseCuenta, status: 'hacked_status' },
      },
    },
    {
      name: '12. PII Blanket Read / Unauthorized List Scraping',
      context: {
        auth: ATTACKER,
        requestTime: NOW,
        path: '/drivers/drv-victim',
        idParams: { driverId: 'drv-victim' },
        operation: 'get',
        existingData: { ...baseDriver, ownerId: 'victim-uid' },
      },
    },
  ];

  for (const testCase of dirtyDozen) {
    const res = evaluateRule(testCase.context);
    if (res !== 'PERMISSION_DENIED') {
      throw new Error(`Security Test Failed: ${testCase.name} returned ${res}`);
    }
  }
}
