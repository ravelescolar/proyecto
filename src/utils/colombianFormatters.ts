export const COLOMBIAN_BANKS = [
  'Bancolombia',
  'Davivienda',
  'Banco de Bogotá',
  'BBVA Colombia',
  'Banco de Occidente',
  'Banco Popular',
  'Banco AV Villas',
  'Nequi',
  'Daviplata',
  'Scotiabank Colpatria',
  'Banco Caja Social',
  'Banco Agrario',
  'Nu Colombia',
  'Lulo Bank',
  'Dale',
  'Otro banco / Cooperativa',
];

export const ACCOUNT_TYPES = [
  'Ahorros',
  'Corriente',
  'Nequi',
  'Daviplata',
  'Depósito de bajo monto',
  'Otro',
] as const;

export function formatPlate(val: string): string {
  if (!val) return '';
  const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length > 3) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 6)}`;
  }
  return clean;
}

export function isValidPlate(plate: string): boolean {
  const clean = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
  // Typically 3 letters and 3 numbers (e.g. WDF452), or 3 letters and 2 numbers + letter for motorcycles
  return clean.length >= 5 && clean.length <= 6;
}

/**
 * Formats a person's name (Conductor or Beneficiario / Titular) into Title Case:
 * Initial capital letter and remaining letters lowercase for each word (e.g., "Carlos Alberto Martínez").
 * If preserveTrailingSpace is true, allows live typing between words without stripping trailing space.
 */
export function formatPersonName(val: string, preserveTrailingSpace = false): string {
  if (!val) return '';
  const hasTrailingSpace = preserveTrailingSpace && /\s$/.test(val);
  const words = val
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  const formatted = words.join(' ');
  return hasTrailingSpace && formatted.length > 0 ? `${formatted} ` : formatted;
}

export function formatDateColombian(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    return new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

/**
 * Formats an ISO timestamp of when a Cuenta de Cobro changed status into a readable Colombian date and time
 * e.g. "10/10/2026, 09:26 a. m."
 */
export function formatStatusChangeTimestamp(isoDateStr: string | undefined | null): string {
  if (!isoDateStr) return '';
  try {
    const d = new Date(isoDateStr);
    if (isNaN(d.getTime())) return isoDateStr;
    return d.toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoDateStr;
  }
}
