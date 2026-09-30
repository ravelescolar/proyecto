import jsPDF from 'jspdf';
import { CuentaDeCobro } from '../types';
import { formatCurrency } from './numberToWords';
import { formatDateColombian } from './colombianFormatters';

export interface PDFExportOptions {
  fileName?: string;
  onProgress?: (progress: number) => void;
}

/**
 * Formats a date string into DD-MM-YYYY (Día-Mes-Año) for Colombian file naming standards.
 */
export function formatDueDateForFileName(dateStr: string): string {
  if (!dateStr) {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    return `${d}-${m}-${y}`;
  }

  const clean = dateStr.trim();

  // If in YYYY-MM-DD format (standard ISO / HTML input value)
  const isoParts = clean.split('-');
  if (isoParts.length === 3 && isoParts[0].length === 4) {
    const [year, month, day] = isoParts;
    return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
  }

  // If already in DD-MM-YYYY or DD/MM/YYYY format
  const slashParts = clean.split('/');
  if (slashParts.length === 3 && slashParts[2].length === 4) {
    const [day, month, year] = slashParts;
    return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
  }

  if (isoParts.length === 3 && isoParts[2].length === 4) {
    const [day, month, year] = isoParts;
    return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
  }

  // Fallback regex match for YYYY/MM/DD or YYYY-MM-DD
  const match = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) {
    return `${match[3].padStart(2, '0')}-${match[2].padStart(2, '0')}-${match[1]}`;
  }

  return clean.replace(/[^0-9-]/g, '');
}

/**
 * Builds the exact PDF file name according to user specification:
 * [Día-Mes-Año fecha pactada de pago]_[Cédula persona a pagar]_[Nombre persona].pdf
 */
export function generatePdfFileName(
  paymentDueDate: string,
  identification: string,
  personName: string
): string {
  // Format date: Día-Mes-Año (DD-MM-YYYY)
  const cleanDate = formatDueDateForFileName(paymentDueDate);

  // Clean identification: remove dots/spaces or retain alphanumeric
  const cleanId = (identification || '0').replace(/[^a-zA-Z0-9]/g, '');

  // Clean name: replace spaces with underscores, remove accents/special chars
  const cleanName = (personName || 'BENEFICIARIO')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .toUpperCase();

  return `${cleanDate}_${cleanId}_${cleanName}.pdf`;
}

/**
 * Generates a high-precision, pristine vector PDF document directly using jsPDF.
 * This avoids html2canvas rendering errors with Tailwind v4 oklch colors and iframe restrictions.
 */
export function generateCuentaPdfDocument(cuenta: CuentaDeCobro): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 215.9 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 279.4 mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // ~187.9 mm
  let y = margin;

  // Colors
  const cEmerald = [6, 78, 59]; // #064e3b
  const cDark = [30, 41, 59]; // #1e293b
  const cGray = [100, 116, 139]; // #64748b
  const cLightBg = [240, 253, 244]; // #f0fdf4
  const cBorder = [203, 213, 225]; // #cbd5e1

  // 1. HEADER SECTION
  // Header box border
  doc.setDrawColor(6, 78, 59);
  doc.setLineWidth(0.8);
  doc.line(margin, y + 22, margin + contentWidth, y + 22);

  // Brand Name & Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(cEmerald[0], cEmerald[1], cEmerald[2]);
  doc.text(cuenta.companyName || 'TRANSPORTES RAVEL', margin, y + 7);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(cDark[0], cDark[1], cDark[2]);
  doc.text(`NIT: ${cuenta.companyNit || '900.388.163-2'}`, margin, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(cGray[0], cGray[1], cGray[2]);
  doc.text('SERVICIO ESPECIAL DE TRANSPORTE TERRESTRE Y ESCOLAR', margin, y + 16);
  doc.text('donde quieras llegar', margin, y + 19.5);

  // Right box: Consecutivo & Dates
  const rightBoxX = margin + contentWidth - 62;
  doc.setFillColor(6, 78, 59);
  doc.rect(rightBoxX, y, 62, 6.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('CUENTA DE COBRO', rightBoxX + 31, y + 4.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(cDark[0], cDark[1], cDark[2]);
  doc.text(`N° ${cuenta.consecutiveFormatted}`, rightBoxX + 31, y + 12.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(cGray[0], cGray[1], cGray[2]);
  doc.text(`${cuenta.city || 'Barranquilla'}, ${cuenta.date}`, rightBoxX + 31, y + 16.5, { align: 'center' });

  if (cuenta.paymentDueDate) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(194, 65, 12); // orange
    doc.text(`Pago: ${cuenta.paymentDueDate}`, rightBoxX + 31, y + 20.5, { align: 'center' });
  }

  y += 26;

  // 2. DEBTOR BOX
  doc.setFillColor(cLightBg[0], cLightBg[1], cLightBg[2]);
  doc.setDrawColor(cBorder[0], cBorder[1], cBorder[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 19, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(cGray[0], cGray[1], cGray[2]);
  doc.text('EMPRESA PAGADORA:', margin + 3, y + 4.5);
  doc.setTextColor(cDark[0], cDark[1], cDark[2]);
  doc.text(`${cuenta.companyName || 'TRANSPORTES RAVEL'} (NIT: ${cuenta.companyNit || '900.388.163-2'})`, margin + 36, y + 4.5);

  doc.setDrawColor(226, 232, 240);
  doc.line(margin + 2, y + 6.5, margin + contentWidth - 2, y + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(cGray[0], cGray[1], cGray[2]);
  doc.text('DEBE A:', margin + 3, y + 11.5);

  doc.setFontSize(10.5);
  doc.setTextColor(6, 78, 59);
  doc.text(cuenta.driverName.toUpperCase(), margin + 3, y + 16.5);

  doc.setFontSize(8.5);
  doc.setTextColor(cDark[0], cDark[1], cDark[2]);
  doc.text(`C.C. N° ${cuenta.driverId}`, margin + 115, y + 16.5);
  doc.text(`Placa: ${cuenta.vehiclePlate}`, margin + 160, y + 16.5);

  y += 23;

  // 3. LA SUMA DE & POR CONCEPTO DE
  // Suma de
  doc.setDrawColor(249, 115, 22); // orange border
  doc.setLineWidth(1.2);
  doc.line(margin, y, margin, y + 11);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(cGray[0], cGray[1], cGray[2]);
  doc.text('LA SUMA DE:', margin + 3, y + 3.5);

  doc.setFontSize(8.5);
  doc.setTextColor(cDark[0], cDark[1], cDark[2]);
  doc.text(cuenta.amountInWords, margin + 3, y + 7.5);

  doc.setFontSize(8);
  doc.setTextColor(6, 78, 59);
  doc.text(`Equivalente a: ${formatCurrency(cuenta.totalAmount)} COP`, margin + 3, y + 11);

  y += 14;

  // Concepto de
  doc.setDrawColor(6, 78, 59);
  doc.setLineWidth(1.2);
  doc.line(margin, y, margin, y + 11);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(cGray[0], cGray[1], cGray[2]);
  doc.text('POR CONCEPTO DE:', margin + 3, y + 3.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(cDark[0], cDark[1], cDark[2]);
  const splitConcept = doc.splitTextToSize(
    cuenta.legalConcept ||
      'Por concepto de servicio de transporte terrestre de pasajeros prestado durante el período correspondiente, según la relación detallada de servicios adjunta.',
    contentWidth - 6
  );
  doc.text(splitConcept, margin + 3, y + 7.5);

  y += Math.max(14, splitConcept.length * 3.8 + 6);

  // 4. DETAILED SERVICES TABLE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(6, 78, 59);
  doc.text('RELACIÓN DETALLADA DE SERVICIOS PRESTADOS', margin, y);

  y += 2.5;

  // Table header
  const thHeight = 6;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(cBorder[0], cBorder[1], cBorder[2]);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentWidth, thHeight, 'FD');

  doc.setFontSize(7);
  doc.setTextColor(cDark[0], cDark[1], cDark[2]);
  doc.text('#', margin + 3, y + 4.2);
  doc.text('FECHA', margin + 12, y + 4.2);
  doc.text('PLACA', margin + 36, y + 4.2);
  doc.text('CLIENTE / DESCRIPCIÓN DEL RECORRIDO', margin + 60, y + 4.2);
  doc.text('VALOR (COP)', margin + contentWidth - 4, y + 4.2, { align: 'right' });

  y += thHeight;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  cuenta.services.forEach((srv, idx) => {
    // Check page break if services are extensive
    if (y > pageHeight - 65) {
      doc.addPage();
      y = margin;
    }

    const rowHeight = 5.8;
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }

    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);

    doc.setTextColor(cGray[0], cGray[1], cGray[2]);
    doc.text(String(idx + 1), margin + 3, y + 4);

    doc.setTextColor(cDark[0], cDark[1], cDark[2]);
    doc.text(srv.date || cuenta.date, margin + 12, y + 4);

    doc.setFont('helvetica', 'bold');
    doc.text(srv.plate || cuenta.vehiclePlate, margin + 36, y + 4);

    doc.setFont('helvetica', 'normal');
    const truncatedDesc = srv.clientDetail.length > 55 ? srv.clientDetail.slice(0, 52) + '...' : srv.clientDetail;
    doc.text(truncatedDesc || 'Servicio de transporte terrestre', margin + 60, y + 4);

    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(srv.value), margin + contentWidth - 4, y + 4, { align: 'right' });

    y += rowHeight;
  });

  // Total Row
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(6, 78, 59);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, contentWidth, 7, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(6, 78, 59);
  doc.text('TOTAL A PAGAR:', margin + contentWidth - 45, y + 4.8);
  doc.text(formatCurrency(cuenta.totalAmount), margin + contentWidth - 4, y + 4.8, { align: 'right' });

  y += 11;

  // 5. BANKING INFORMATION
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(cBorder[0], cBorder[1], cBorder[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 20, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(194, 65, 12);
  doc.text('INFORMACIÓN BANCARIA PARA PAGO O TRANSFERENCIA', margin + 3, y + 4.5);

  doc.setFontSize(7);
  doc.setTextColor(cGray[0], cGray[1], cGray[2]);
  doc.text('BANCO:', margin + 3, y + 9);
  doc.text('TIPO DE CUENTA:', margin + 55, y + 9);
  doc.text('NÚMERO DE CUENTA:', margin + 110, y + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(cDark[0], cDark[1], cDark[2]);
  doc.text(cuenta.paymentData.bank || 'Bancolombia', margin + 3, y + 13);
  doc.text(cuenta.paymentData.accountType || 'Ahorros', margin + 55, y + 13);
  doc.text(cuenta.paymentData.accountNumber || 'Sin número', margin + 110, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(cGray[0], cGray[1], cGray[2]);
  doc.text('TITULAR:', margin + 3, y + 17.5);
  doc.text('CÉDULA / IDENTIFICACIÓN:', margin + 70, y + 17.5);
  doc.text('FECHA PACTADA DE PAGO:', margin + 130, y + 17.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(cDark[0], cDark[1], cDark[2]);
  doc.text((cuenta.paymentData.accountHolder || cuenta.driverName).toUpperCase(), margin + 16, y + 17.5);
  doc.text(cuenta.paymentData.identification || cuenta.driverId, margin + 106, y + 17.5);

  doc.setTextColor(194, 65, 12);
  doc.text(cuenta.paymentDueDate || cuenta.date, margin + 167, y + 17.5);

  y += 26;

  // 6. CLOSING / SOLICITANTE SECTION (Sin espacio para firmas)
  y = Math.min(y + 8, pageHeight - 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(cDark[0], cDark[1], cDark[2]);
  doc.text('Atentamente,', margin, y);

  y += 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(6, 78, 59);
  doc.text(cuenta.driverName.toUpperCase(), margin, y);

  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(cDark[0], cDark[1], cDark[2]);
  doc.text(`C.C. ${cuenta.driverId}`, margin, y);

  if (cuenta.driverPhone) {
    y += 4;
    doc.setFontSize(7.5);
    doc.setTextColor(cGray[0], cGray[1], cGray[2]);
    doc.text(`Tel: ${cuenta.driverPhone}`, margin, y);
  }

  return doc;
}

/**
 * Downloads the PDF directly with multiple fallbacks for iframes, browsers, and mobile devices.
 */
export async function downloadCuentaPDF(cuenta: CuentaDeCobro): Promise<{ success: boolean; blobUrl?: string }> {
  try {
    const fileName = generatePdfFileName(
      cuenta.paymentDueDate || cuenta.date,
      cuenta.paymentData.identification || cuenta.driverId,
      cuenta.paymentData.accountHolder || cuenta.driverName
    );

    const doc = generateCuentaPdfDocument(cuenta);
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    // 1. Direct browser download trigger
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      try {
        document.body.removeChild(link);
      } catch {}
    }, 1500);

    return { success: true, blobUrl };
  } catch (error) {
    console.error('Error generating direct vector PDF:', error);
    return { success: false };
  }
}

export function printDocument(): void {
  window.print();
}
