export interface ServiceItem {
  id: string;
  date: string;
  plate: string;
  clientDetail: string;
  value: number;
}

export interface PaymentData {
  bank: string;
  accountNumber: string;
  accountType: 'Ahorros' | 'Corriente' | 'Nequi' | 'Daviplata' | 'Depósito de bajo monto' | 'Otro';
  accountHolder: string;
  identification: string;
}

export interface DriverProfile {
  id: string;
  plate: string;
  driverName: string;
  idNumber: string;
  phone?: string;
  paymentData: PaymentData;
  frequentClients: string[];
  totalAccountsGenerated: number;
  lastUsedAt: string;
}

export type CuentaStatus = 'emitida' | 'pagada' | 'anulada';

export interface CuentaDeCobro {
  id: string;
  consecutive: number;
  consecutiveFormatted: string;
  date: string;
  paymentDueDate: string;
  city: string;
  companyName: string;
  companyNit: string;
  driverName: string;
  driverId: string;
  vehiclePlate: string;
  driverPhone?: string;
  services: ServiceItem[];
  totalAmount: number;
  amountInWords: string;
  legalConcept: string;
  paymentData: PaymentData;
  signatureDataUrl?: string;
  companyLogoUrl?: string;
  notes?: string;
  status: CuentaStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  prefix: string;
  nextConsecutive: number;
  companyName: string;
  companyNit: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  defaultCity: string;
  defaultConcept: string;
  companyLogoUrl?: string;
  companySlogan?: string;
}
