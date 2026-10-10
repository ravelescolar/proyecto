import React, { useState } from 'react';
import {
  Download,
  Printer,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  PlusCircle,
  Check,
  ExternalLink,
  MessageCircle,
  Save
} from 'lucide-react';
import { CuentaDeCobro } from '../types';
import { formatCurrency } from '../utils/numberToWords';
import { formatDateColombian, formatPersonName, formatStatusChangeTimestamp } from '../utils/colombianFormatters';
import {
  printDocument,
  generatePdfFileName,
  downloadCuentaPDF,
  shareCuentaPDFViaWhatsApp
} from '../utils/pdfExport';
import { RavelLogo } from './RavelLogo';

interface DocumentPreviewProps {
  cuenta: CuentaDeCobro;
  onEdit: () => void;
  onNew: () => void;
  onSaveAndExit: () => void;
  onStatusChange?: (
    status: CuentaDeCobro['status'],
    extra?: { paymentReference?: string; adminCorrectionNote?: string }
  ) => void;
  isAdmin?: boolean;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  cuenta,
  onEdit,
  onNew,
  onSaveAndExit,
  onStatusChange,
  isAdmin = false,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [whatsAppStatus, setWhatsAppStatus] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const [paymentRefInput, setPaymentRefInput] = useState(cuenta.paymentReference || '');
  const [correctionNoteInput, setCorrectionNoteInput] = useState(cuenta.adminCorrectionNote || '');
  const [showAdminPanel, setShowAdminPanel] = useState(false);

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

  const handleShareWhatsAppPDF = async () => {
    setIsSharingWhatsApp(true);
    setWhatsAppStatus(null);
    try {
      const res = await shareCuentaPDFViaWhatsApp(cuenta);
      if (res.blobUrl) {
        setBlobUrl(res.blobUrl);
      }
      if (res.mode === 'native-file') {
        setWhatsAppStatus('¡PDF adjuntado y listo para enviar por WhatsApp!');
        setTimeout(() => setWhatsAppStatus(null), 5000);
      } else if (res.mode === 'fallback-whatsapp') {
        setDownloadSuccess(true);
        setWhatsAppStatus(
          'Se descargó el PDF y se abrió WhatsApp. Adjunta el archivo descargado en el chat.'
        );
        setTimeout(() => setWhatsAppStatus(null), 6000);
      }
    } catch (err) {
      console.error('Error sharing PDF via WhatsApp:', err);
    } finally {
      setIsSharingWhatsApp(false);
    }
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
          
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400">Estado:</span>
            {isAdmin && onStatusChange ? (
              <select
                value={cuenta.status}
                onChange={(e) => onStatusChange(e.target.value as CuentaDeCobro['status'])}
                className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                  cuenta.status === 'pagada'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : cuenta.status === 'anulada'
                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                    : 'bg-orange-50 text-orange-800 border-orange-300'
                }`}
              >
                <option value="emitida">Emitida (Pendiente Pago)</option>
                <option value="pagada">Pagada</option>
                <option value="anulada">Anulada</option>
              </select>
            ) : (
              <>
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
              </>
            )}
            {cuenta.statusUpdatedAt && (
              <span
                className="text-[11px] text-slate-500 font-mono-numbers"
                title={
                  cuenta.statusUpdatedByEmail
                    ? `Modificado por: ${cuenta.statusUpdatedByEmail}`
                    : 'Momento del cambio de estado'
                }
              >
                · Cambio: {formatStatusChangeTimestamp(cuenta.statusUpdatedAt)}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
          {/* Primary Mobile & Desktop CTA - Exportar PDF por WhatsApp */}
          <button
            type="button"
            onClick={handleShareWhatsAppPDF}
            disabled={isSharingWhatsApp}
            title="Genera el archivo PDF oficial y lo adjunta directamente para enviar por WhatsApp desde el celular"
            className="col-span-2 sm:col-span-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-extrabold text-white bg-[#25D366] hover:bg-[#1ebe5d] rounded-lg shadow-sm hover:shadow-emerald-500/20 transition-all active:scale-[0.98] whitespace-nowrap disabled:opacity-60 cursor-pointer"
          >
            {isSharingWhatsApp ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Preparando PDF para WhatsApp...</span>
              </>
            ) : (
              <>
                <MessageCircle className="w-4 h-4 text-white fill-white/20 shrink-0" />
                <span>Enviar PDF por WhatsApp</span>
              </>
            )}
          </button>

          {/* Secondary CTA - Warm Orange Download Button */}
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
            onClick={handleCopySummary}
            className="min-h-[40px] flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <span>{copySuccess ? '¡Copiado!' : 'Copiar Resumen'}</span>
          </button>

          <button
            type="button"
            onClick={onNew}
            className="min-h-[40px] flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-900 bg-emerald-100/70 hover:bg-emerald-200/80 border border-emerald-300 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-orange-600 shrink-0" />
            <span>Nueva Cuenta</span>
          </button>

          {/* Primary Save & Exit CTA */}
          <button
            type="button"
            onClick={onSaveAndExit}
            title="Deja guardada esta cuenta de cobro en el sistema y regresa a la página de inicio"
            className="col-span-2 sm:col-span-1 min-h-[42px] flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-extrabold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm hover:shadow-emerald-700/20 transition-all active:scale-[0.98] whitespace-nowrap cursor-pointer"
          >
            <Save className="w-4 h-4 text-orange-300 shrink-0" />
            <span>Guardar y Salir</span>
          </button>
        </div>
      </div>

      {/* Admin Payment Reference & Correction Note Panel */}
      {isAdmin && (
        <div className="no-print mb-6 bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
              <span>Panel Administrativo de Tesorería y Correcciones</span>
            </span>
            <button
              type="button"
              onClick={() => {
                if (onStatusChange) {
                  onStatusChange(cuenta.status, {
                    paymentReference: paymentRefInput,
                    adminCorrectionNote: correctionNoteInput,
                  });
                }
              }}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Guardar Referencia y Nota
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                N° de Referencia de Transferencia / Comprobante de Pago:
              </label>
              <input
                type="text"
                placeholder="Ej: TRF-982341 o Nequi N° 58190"
                value={paymentRefInput}
                onChange={(e) => setPaymentRefInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-emerald-300 bg-white font-mono-numbers focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-orange-900 mb-1">
                Nota de Corrección para el Conductor (si hay errores):
              </label>
              <input
                type="text"
                placeholder="Ej: Por favor corregir el valor del segundo recorrido."
                value={correctionNoteInput}
                onChange={(e) => setCorrectionNoteInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-orange-300 bg-white focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Direct download or WhatsApp PDF share notice banner */}
      {(downloadSuccess || whatsAppStatus) && (
        <div className="no-print mb-4 p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {whatsAppStatus ? (
                <>
                  <strong>{whatsAppStatus}</strong> ({pdfFileName})
                </>
              ) : (
                <>
                  Archivo <strong>{pdfFileName}</strong> generado correctamente.
                </>
              )}
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
              <span>Guardar copia del PDF ({pdfFileName})</span>
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
                {formatPersonName(cuenta.driverName)}
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
                <span className="font-semibold text-slate-900">
                  {formatPersonName(cuenta.paymentData.accountHolder || cuenta.driverName)}
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
              <div className="text-sm font-black text-emerald-950 tracking-wide">
                {formatPersonName(cuenta.driverName)}
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

      {/* Bottom Save & Exit Action Bar (Hidden in Print) */}
      <div className="no-print mt-5 bg-white p-4 rounded-xl border border-emerald-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-emerald-950">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Cuenta de cobro <strong>{cuenta.consecutiveFormatted}</strong> generada. Presiona <strong>Guardar y Salir</strong> para conservarla y volver al inicio.
          </span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={onEdit}
            className="min-h-[42px] px-4 py-2 text-xs font-semibold text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
          >
            Volver a editar
          </button>

          <button
            type="button"
            onClick={onSaveAndExit}
            className="flex-1 sm:flex-initial min-h-[42px] flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-extrabold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            <Save className="w-4 h-4 text-orange-300 shrink-0" />
            <span>Guardar y Salir</span>
          </button>
        </div>
      </div>
    </div>
  );
};
