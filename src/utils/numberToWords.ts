/**
 * Converts a numeric monetary value to formal Spanish text representation in Colombian Pesos.
 * e.g., 1500000 -> "UN MILLÓN QUINIENTOS MIL PESOS M/CTE."
 */

const UNIDADES: string[] = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
const DECENAS_ESPECIALES: Record<number, string> = {
  10: 'DIEZ',
  11: 'ONCE',
  12: 'DOCE',
  13: 'TRECE',
  14: 'CATORCE',
  15: 'QUINCE',
  16: 'DIECISÉIS',
  17: 'DIECISIETE',
  18: 'DIECIOCHO',
  19: 'DIECINUEVE',
  20: 'VEINTE',
  21: 'VEINTIÚN',
  22: 'VEINTIDÓS',
  23: 'VEINTITRÉS',
  24: 'VEINTICUATRO',
  25: 'VEINTICINCO',
  26: 'VEINTISÉIS',
  27: 'VEINTISIETE',
  28: 'VEINTIOCHO',
  29: 'VEINTINUEVE',
};
const DECENAS: string[] = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const CENTENAS: string[] = [
  '',
  'CIENTO',
  'DOSCIENTOS',
  'TRESCIENTOS',
  'CUATROCIENTOS',
  'QUINIENTOS',
  'SEISCIENTOS',
  'SETECIENTOS',
  'OCHOCIENTOS',
  'NOVECIENTOS',
];

function convertGroup(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';

  const c = Math.floor(n / 100);
  const remainder = n % 100;
  let text = '';

  if (c > 0) {
    text += CENTENAS[c] + ' ';
  }

  if (remainder > 0) {
    if (remainder < 10) {
      text += UNIDADES[remainder];
    } else if (remainder <= 29) {
      text += DECENAS_ESPECIALES[remainder];
    } else {
      const d = Math.floor(remainder / 10);
      const u = remainder % 10;
      text += DECENAS[d];
      if (u > 0) {
        text += ' Y ' + UNIDADES[u];
      }
    }
  }

  return text.trim();
}

export function numberToWords(amount: number): string {
  if (!amount || isNaN(amount) || amount === 0) {
    return 'CERO PESOS M/CTE.';
  }

  const rounded = Math.round(Math.abs(amount));
  if (rounded === 1) {
    return 'UN PESO M/CTE.';
  }

  const billions = Math.floor(rounded / 1000000000000);
  const thousandsOfMillions = Math.floor((rounded % 1000000000000) / 1000000000);
  const millions = Math.floor((rounded % 1000000000) / 1000000);
  const thousands = Math.floor((rounded % 1000000) / 1000);
  const units = rounded % 1000;

  const parts: string[] = [];

  // Millions
  if (millions > 0) {
    if (millions === 1) {
      parts.push('UN MILLÓN');
    } else {
      parts.push(`${convertGroup(millions)} MILLONES`);
    }
  }

  // Thousands
  if (thousands > 0) {
    if (thousands === 1) {
      parts.push('MIL');
    } else {
      parts.push(`${convertGroup(thousands)} MIL`);
    }
  }

  // Units
  if (units > 0) {
    parts.push(convertGroup(units));
  }

  const result = parts.filter(Boolean).join(' ');

  // If ends in exact millions with no thousands or units (e.g. 1.000.000), use "DE PESOS"
  const suffix = (millions > 0 && thousands === 0 && units === 0) ? ' DE PESOS M/CTE.' : ' PESOS M/CTE.';

  return `${result}${suffix}`.replace(/\s+/g, ' ').trim().toUpperCase();
}

/**
 * Format currency with Colombian peso standard: $ 1.250.000
 */
export function formatCurrency(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '$ 0';
  }
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}
