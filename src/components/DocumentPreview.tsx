import React, { useState } from 'react';
import {
  Download,
  Printer,
  Share2,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  PlusCircle,
  Check,
  ExternalLink
} from 'lucide-react';
import { CuentaDeCobro } from '../types';
import { formatCurrency } from '../utils/numberToWords';
import { formatDateColombian } from '../utils/colombianFormatters';
import { printDocument, generatePdfFileName, downloadCuentaPDF } from '../utils/pdfExport';
import { RavelLogo } from './RavelLogo';

interface DocumentPreviewProps {
  cuenta: CuentaDeCobro;
  onEdit: () => void;
  onNew: () => void;
  onStatusChange?: (status: CuentaDeCobro['status']) => void;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  cuenta,
  onEdit,
  onNew,
  onStatusChange,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const pdfFileName = generatePdfFileName(
    cuenta.paymentDueDate || cuenta.date,
    cuenta.paymentData.identification || cuenta.driverId,
    cuenta.paymentData.accountHolder || cuenta.driverName
  );

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    try {
      const res = await downloadCuentaPDF(cuenta);
      if (res.success && res.blobUrl) {
        setBlobUrl(res.blobUrl);
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 5000);
      } else {
        // Fallback: system print
        printDocument();
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
      printDocument();
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareWhatsApp = () => {
    const text = `📋 *CUENTA DE COBRO ${cuenta.consecutiveFormatted}*
🏢 *Empresa:* TRANSPORTES RAVEL (NIT: 900.388.163-2)
👤 *Persona a Pagar:* ${cuenta.paymentData.accountHolder || cuenta.driverName}
🆔 *Cédula:* ${cuenta.paymentData.identification || cuenta.driverId}
🚗 *Placa:* ${cuenta.vehiclePlate}
📅 *Fecha Emisión:* ${cuenta.date}
⏳ *Fecha Pactada de Pago:* ${cuenta.paymentDueDate || cuenta.date}
💰 *Total a Pagar:* ${formatCurrency(cuenta.totalAmount)}
📝 *Servicios:* ${cuenta.services.length} recorridos

💳 *DATOS DE PAGO:*
• Banco: ${cuenta.paymentData.bank}
• Tipo: ${cuenta.paymentData.accountType}
• N° de Cuenta: ${cuenta.paymentData.accountNumber}
• Titular: ${cuenta.paymentData.accountHolder || cuenta.driverName}

Generada a través del sistema oficial de Transportes Ravel.`;

    const encoded = encodeURIComponent(text);
    const phone = cuenta.driverPhone ? cuenta.driverPhone.replace(/[^0-9]/g, '') : '';
    const whatsappUrl = phone
      ? `https://api.whatsapp.com/send?phone=57${phone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;

    window.open(whatsappUrl, '_blank');
  };

  const handleCopySummary = () => {
    const text = `Cuenta de Cobro ${cuenta.consecutiveFormatted} - ${cuenta.driverName} - Placa ${cuenta.vehiclePlate} - Total: ${formatCurrency(cuenta.totalAmount)} - Banco: ${cuenta.paymentData.bank} (${cuenta.paymentData.accountType} N° ${cuenta.paymentData.accountNumber})`;
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  return (
    <div className="w-full max-w-5xl mx-auto pb-16">
      {/* Top Action Toolbar (Hidden in Print) */}
      <div className="no-print mb-4 sm:mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-emerald-100 shadow-xs">
        <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2.5">
          <button
            type="button"
            onClick={onEdit}
            className="min-h-[40px] flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Volver a editar</span>
          </button>
          
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Estado:</span>
            {cuenta.status === 'emitida' && (
              <span className="font-semibold text-orange-800">
                Emitida (Pendiente Pago)
              </span>
            )}
            {cuenta.status === 'pagada' && (
              <span className="font-semibold text-emerald-800">
                Pagada
              </span>
            )}
            {cuenta.status === 'anulada' && (
              <span className="font-semibold text-rose-800">
                Anulada
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
          {/* Primary CTA - Warm Orange Download Button (Full width on mobile top row) */}
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className={`col-span-2 sm:col-span-1 min-h-[42px] flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-extrabold rounded-lg shadow-sm transition-all active:scale-[0.98] whitespace-nowrap ${
              downloadSuccess
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'text-white bg-orange-500 hover:bg-orange-600 hover:shadow-orange-500/20'
            } disabled:opacity-60 cursor-pointer`}
          >
            {downloadSuccess ? (
              <>
                <Check className="w-4 h-4 text-white shrink-0" />
                <span>¡Descarga Iniciada!</span>
              </>
            ) : isExporting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Generando...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-white shrink-0" />
                <span>Descargar PDF</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            title="Compartir resumen por WhatsApp"
            className="min-h-[40px] flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={printDocument}
            className="min-h-[40px] flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Printer className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Imprimir</span>
          </button>

          {onStatusChange && cuenta.status !== 'anulada' && (
            <button
              type="button"
              onClick={() => onStatusChange(cuenta.status === 'pagada' ? 'emitida' : 'pagada')}
              className={`min-h-[40px] flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                cuenta.status === 'pagada'
                  ? 'border-orange-300 bg-orange-50 text-orange-800 hover:bg-orange-100'
                  : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{cuenta.status === 'pagada' ? 'Marcar Pendiente' : 'Marcar Pagada'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopySummary}
            className="min-h-[40px] flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <span>{copySuccess ? '¡Copiado!' : 'Copiar Resumen'}</span>
          </button>

          <button
            type="button"
            onClick={onNew}
            className="col-span-2 sm:col-span-1 min-h-[40px] flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-900 bg-emerald-100/70 hover:bg-emerald-200/80 border border-emerald-300 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-orange-600 shrink-0" />
            <span>Nueva Cuenta</span>
          </button>
        </div>
      </div>

      {/* Direct download notice banner for iframe / browser reliability */}
      {downloadSuccess && (
        <div className="no-print mb-4 p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Archivo <strong>{pdfFileName}</strong> generado correctamente.
            </span>
          </div>
          {blobUrl && (
            <a
              href={blobUrl}
              download={pdfFileName}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold text-emerald-800 hover:text-emerald-950 underline"
            >
              <span>¿No inició la descarga automática? Haz clic aquí para guardar</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

      {/* Printable Colombian Document Container */}
      <div className="bg-emerald-50/70 p-2 sm:p-6 rounded-2xl flex justify-center border border-emerald-100">
        <div
          id="printable-cuenta-document"
          className="print-document-container w-full max-w-[850px] bg-white p-4 sm:p-8 md:p-12 shadow-lg border border-slate-300 text-slate-900 rounded-sm relative"
        >
          {/* Header section with Company and Title */}
          <div className="border-b-2 border-emerald-900 pb-4 sm:pb-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-5">
              <div className="flex items-center gap-3 sm:gap-4">
                <RavelLogo
                  variant="badge"
                  size="sm"
                  showSlogan={true}
                  customLogoUrl={cuenta.companyLogoUrl}
                  className="shrink-0 sm:hidden"
                />
                <RavelLogo
                  variant="badge"
                  size="md"
                  showSlogan={true}
                  customLogoUrl={cuenta.companyLogoUrl}
                  className="shrink-0 hidden sm:inline-flex"
                />
                <div className="min-w-0">
                  <h1 className="text-base sm:text-xl font-black tracking-tight text-emerald-950 font-serif">
                    {cuenta.companyName || 'TRANSPORTES RAVEL'}
                  </h1>
                  <p className="text-xs font-bold text-emerald-800 tracking-wider mt-0.5">
                    NIT: {cuenta.companyNit || '900.388.163-2'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wide">
                    Servicio Especial de Transporte Terrestre de Pasajeros y Escolar
                  </p>
                </div>
              </div>

              {/* Consecutive & Date Box */}
              <div className="text-left sm:text-right border-t sm:border-t-0 sm:border-l-2 border-emerald-100 pt-3 sm:pt-0 sm:pl-6 flex sm:block items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="inline-block bg-emerald-700 text-white px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-extrabold tracking-wider rounded-xs font-mono-numbers">
                    CUENTA DE COBRO
                  </div>
                  <div className="text-lg sm:text-xl font-black text-emerald-950 tracking-wide mt-1 font-mono-numbers tabular-nums">
                    N° {cuenta.consecutiveFormatted}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-600 mt-0.5 sm:mt-1 font-medium">
                    {cuenta.city}, {formatDateColombian(cuenta.date)}
                  </p>
                  {cuenta.paymentDueDate && (
                    <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-orange-950 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-xs">
                      <span>Pactada de pago:</span>
                      <span className="font-mono-numbers">{formatDateColombian(cuenta.paymentDueDate)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Legal Debtor Statement */}
          <div className="mt-6 bg-emerald-50/40 border border-emerald-200/80 p-4 rounded-sm">
            <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
              EMPRESA PAGADORA:
            </div>
            <div className="text-sm font-bold text-slate-900">
              {cuenta.companyName || 'TRANSPORTES RAVEL'}{' '}
              <span className="font-semibold text-slate-600">
                (NIT: {cuenta.companyNit || '900.388.163-2'})
              </span>
            </div>

            <div className="my-2 border-t border-dashed border-emerald-200"></div>

            <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
              DEBE A:
            </div>
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
              <span className="text-base font-black text-emerald-950 tracking-tight">
                {cuenta.driverName.toUpperCase()}
              </span>
              <div className="flex items-center gap-4 text-xs font-medium text-slate-700">
                <span>
                  <strong className="text-slate-900">C.C. N°:</strong> {cuenta.driverId}
                </span>
                <span>
                  <strong className="text-slate-900">Placa Vehículo:</strong>{' '}
                  <span className="font-mono-numbers font-bold bg-orange-50 text-orange-950 px-1.5 py-0.5 border border-orange-200 rounded-xs">
                    {cuenta.vehiclePlate}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Total in words and statutory legal concept */}
          <div className="mt-5 space-y-3">
            <div className="border-l-4 border-orange-500 pl-3 py-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                LA SUMA DE:
              </div>
              <div className="text-sm font-extrabold text-slate-900 leading-snug">
                {cuenta.amountInWords}
              </div>
              <div className="text-xs font-semibold text-slate-600 mt-0.5">
                Equivalente en moneda legal a:{' '}
                <span className="font-bold text-emerald-950 text-sm font-mono-numbers">
                  {formatCurrency(cuenta.totalAmount)} COP
                </span>
              </div>
            </div>

            <div className="border-l-4 border-emerald-600 pl-3 py-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                POR CONCEPTO DE:
              </div>
              <p className="text-xs text-slate-800 leading-relaxed font-medium">
                {cuenta.legalConcept ||
                  'Por concepto de servicio de transporte terrestre de pasajeros prestado durante el período correspondiente, según la relación detallada de servicios adjunta.'}
              </p>
            </div>
          </div>

          {/* Itemized Services Table */}
          <div className="mt-6">
            <div className="text-xs font-black text-emerald-950 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>RELACIÓN DETALLADA DE SERVICIOS PRESTADOS</span>
              <span className="text-[11px] font-normal text-slate-500">
                {cuenta.services.length} {cuenta.services.length === 1 ? 'servicio' : 'servicios'}
              </span>
            </div>

            <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
              <table className="w-full text-left border-collapse border border-slate-300 text-xs min-w-[500px]">
                <thead>
                  <tr className="bg-emerald-50/80 text-emerald-950 font-bold uppercase text-[11px] tracking-wide border-b border-slate-300">
                    <th className="py-2 px-2 text-center w-9 border-r border-slate-300">#</th>
                    <th className="py-2 px-2.5 w-24 border-r border-slate-300">Fecha</th>
                    <th className="py-2 px-2.5 w-20 border-r border-slate-300 text-center">Placa</th>
                    <th className="py-2 px-2.5 border-r border-slate-300">Cliente / Detalle del Recorrido</th>
                    <th className="py-2 px-2.5 text-right w-28">Valor (COP)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {cuenta.services.map((srv, idx) => (
                    <tr key={srv.id || idx} className="hover:bg-slate-50/50">
                      <td className="py-2 px-2 text-center text-slate-500 font-mono-numbers tabular-nums border-r border-slate-300">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-2.5 text-slate-700 whitespace-nowrap border-r border-slate-300 font-mono-numbers tabular-nums">
                        {srv.date}
                      </td>
                      <td className="py-2 px-2.5 text-center border-r border-slate-300 font-mono-numbers font-bold text-slate-800 whitespace-nowrap">
                        {srv.plate || cuenta.vehiclePlate}
                      </td>
                      <td className="py-2 px-2.5 text-slate-900 border-r border-slate-300">
                        {srv.clientDetail || 'Servicio de transporte terrestre'}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono-numbers tabular-nums font-semibold text-slate-950 whitespace-nowrap">
                        {formatCurrency(srv.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-emerald-50/70 font-bold border-t-2 border-emerald-300">
                    <td colSpan={4} className="py-2.5 px-3 text-right uppercase text-emerald-950 tracking-wider border-r border-slate-300 text-xs">
                      TOTAL A PAGAR:
                    </td>
                    <td className="py-2.5 px-2.5 text-right text-sm font-black font-mono-numbers tabular-nums text-emerald-950 bg-emerald-100/60 whitespace-nowrap">
                      {formatCurrency(cuenta.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Payment Details Section */}
          <div className="mt-6 border border-emerald-200 rounded-xs bg-emerald-50/30 p-4">
            <div className="text-[11px] font-black text-emerald-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-orange-500" />
              INFORMACIÓN BANCARIA PARA PAGO O CONSIGNACIÓN
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Banco:</span>
                <span className="font-bold text-slate-900">{cuenta.paymentData.bank || 'No especificado'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Tipo de Cuenta:</span>
                <span className="font-semibold text-slate-900">{cuenta.paymentData.accountType}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Número de Cuenta:</span>
                <span className="font-black text-slate-950 font-mono-numbers">
                  {cuenta.paymentData.accountNumber || 'Sin número'}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Titular:</span>
                <span className="font-semibold text-slate-900 uppercase">
                  {cuenta.paymentData.accountHolder || cuenta.driverName}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Cédula / Identificación:</span>
                <span className="font-mono-numbers font-semibold text-slate-900">
                  {cuenta.paymentData.identification || cuenta.driverId}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold text-orange-800">Fecha Pactada de Pago:</span>
                <span className="font-mono-numbers font-bold text-orange-950">
                  {cuenta.paymentDueDate ? formatDateColombian(cuenta.paymentDueDate) : formatDateColombian(cuenta.date)}
                </span>
              </div>
            </div>
          </div>

          {/* Closing / Solicitante Section (Sin espacio para firmas) */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="text-left">
              <p className="text-xs text-slate-600 font-medium mb-1.5">
                Atentamente,
              </p>
              <div className="text-sm font-black text-emerald-950 uppercase tracking-wide">
                {cuenta.driverName}
              </div>
              <div className="text-xs text-slate-800 font-bold mt-0.5 font-mono-numbers">
                C.C. {cuenta.driverId}
              </div>
              {cuenta.driverPhone && (
                <div className="text-xs text-slate-500 mt-0.5">
                  Tel: {cuenta.driverPhone}
                </div>
              )}
            </div>

            {/* Note & Stamp */}
            <div className="mt-8 pt-3 border-t border-dotted border-slate-300 text-[10px] text-slate-400 text-center flex flex-col sm:flex-row items-center justify-between gap-1">
              <span>Documento soporte de pago · Servicio de transporte terrestre automotor de pasajeros</span>
              <span>Generado: {new Date(cuenta.createdAt).toLocaleDateString('es-CO')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
