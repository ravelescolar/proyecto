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
