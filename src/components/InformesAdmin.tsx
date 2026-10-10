import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  FileSpreadsheet,
  Eye,
  RotateCcw,
  CheckCircle2,
  Clock,
  DollarSign,
  Car,
  User,
  MessageCircle
} from 'lucide-react';
import { CuentaDeCobro, CuentaStatus } from '../types';
import { formatCurrency } from '../utils/numberToWords';
import { formatDateColombian } from '../utils/colombianFormatters';
import { shareCuentaPDFViaWhatsApp } from '../utils/pdfExport';

interface InformesAdminProps {
  cuentas: CuentaDeCobro[];
  onView: (cuenta: CuentaDeCobro) => void;
  onStatusChange: (id: string, status: CuentaStatus) => void;
}

interface DueDateBucket {
  dueDate: string;
  formattedDate: string;
  totalAmount: number;
  pendienteAmount: number;
  pagadoAmount: number;
  count: number;
  pendienteCount: number;
  pagadoCount: number;
}

export const InformesAdmin: React.FC<InformesAdminProps> = ({
  cuentas,
  onView,
  onStatusChange,
}) => {
  // Filters by Fecha Pactada de Pago
  const [exactDueDate, setExactDueDate] = useState<string>('');
  const [startDueDate, setStartDueDate] = useState<string>('');
  const [endDueDate, setEndDueDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'emitida' | 'pagada'>('active');

  // Exclude 'anulada' cuentas from financial payment reports
  const validCuentas = useMemo(
    () => cuentas.filter((c) => c.status !== 'anulada'),
    [cuentas]
  );

  // Filtered cuentas based on Fecha Pactada de Pago & Status
  const filteredCuentas = useMemo(() => {
    return validCuentas.filter((c) => {
      const due = (c.paymentDueDate || c.date || '').trim();

      if (exactDueDate && due !== exactDueDate) {
        return false;
      }
      if (!exactDueDate) {
        if (startDueDate && due < startDueDate) return false;
        if (endDueDate && due > endDueDate) return false;
      }
      if (statusFilter === 'emitida' && c.status !== 'emitida') return false;
      if (statusFilter === 'pagada' && c.status !== 'pagada') return false;

      return true;
    });
  }, [validCuentas, exactDueDate, startDueDate, endDueDate, statusFilter]);

  // Group by Fecha Pactada de Pago (sorted chronologically ascending) for the Chart & Summary Table
  const dueDateBuckets = useMemo<DueDateBucket[]>(() => {
    const map = new Map<string, DueDateBucket>();

    filteredCuentas.forEach((c) => {
      const due = (c.paymentDueDate || c.date || 'Sin fecha').trim();
      const existing = map.get(due) || {
        dueDate: due,
        formattedDate: formatDateColombian(due) || due,
        totalAmount: 0,
        pendienteAmount: 0,
        pagadoAmount: 0,
        count: 0,
        pendienteCount: 0,
        pagadoCount: 0,
      };

      existing.totalAmount += c.totalAmount;
      existing.count += 1;

      if (c.status === 'emitida') {
        existing.pendienteAmount += c.totalAmount;
        existing.pendienteCount += 1;
      } else if (c.status === 'pagada') {
        existing.pagadoAmount += c.totalAmount;
        existing.pagadoCount += 1;
      }

      map.set(due, existing);
    });

    return Array.from(map.values()).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [filteredCuentas]);

  // Distinct available due dates across all active cuentas for quick selection pills
  const allAvailableDueDates = useMemo(() => {
    const set = new Set<string>();
    validCuentas.forEach((c) => {
      const d = (c.paymentDueDate || c.date || '').trim();
      if (d) set.add(d);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [validCuentas]);

  // KPI Totals for current filtered view
  const totalGeneral = filteredCuentas.reduce((sum, c) => sum + c.totalAmount, 0);
  const totalPorPagar = filteredCuentas
    .filter((c) => c.status === 'emitida')
    .reduce((sum, c) => sum + c.totalAmount, 0);
  const totalYaPagado = filteredCuentas
    .filter((c) => c.status === 'pagada')
    .reduce((sum, c) => sum + c.totalAmount, 0);

  const maxBucketAmount = useMemo(() => {
    if (dueDateBuckets.length === 0) return 1;
    return Math.max(...dueDateBuckets.map((b) => b.totalAmount), 1);
  }, [dueDateBuckets]);

  const clearFilters = () => {
    setExactDueDate('');
    setStartDueDate('');
    setEndDueDate('');
    setStatusFilter('active');
  };

  const exportReportCSV = () => {
    const headers = [
      'Fecha Pactada de Pago',
      'Consecutivo',
      'Placa',
      'Conductor / Beneficiario',
      'Cedula',
      'Banco',
      'Tipo Cuenta',
      'Numero de Cuenta',
      'Servicios',
      'Valor Total COP',
      'Estado',
    ];

    const rows = filteredCuentas.map((c) => [
      `"${c.paymentDueDate || c.date}"`,
      `"${c.consecutiveFormatted}"`,
      `"${c.vehiclePlate}"`,
      `"${c.paymentData.accountHolder || c.driverName}"`,
      `"${c.paymentData.identification || c.driverId}"`,
      `"${c.paymentData.bank}"`,
      `"${c.paymentData.accountType}"`,
      `"${c.paymentData.accountNumber}"`,
      `"${c.services.length}"`,
      `"${c.totalAmount}"`,
      `"${c.status}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Informe_Pagos_TRANSPORTES_RAVEL_${exactDueDate || new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-white to-orange-50/50 p-4 sm:p-5 rounded-2xl border border-emerald-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs shrink-0">
            <BarChart3 className="w-5 h-5 text-orange-300" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-emerald-950 font-serif">
              Informe Financiero por Fecha Pactada de Pago
            </h2>
            <p className="text-xs text-slate-600">
              Control administrativo de tesorería · Programación de pagos a conductores y contratistas
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={exportReportCSV}
          className="min-h-[40px] flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-950 bg-white hover:bg-emerald-50 border border-emerald-300 rounded-xl shadow-xs transition-colors cursor-pointer whitespace-nowrap"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Exportar Informe a Excel / CSV ({filteredCuentas.length})</span>
        </button>
      </div>

      {/* Filters by Fecha Pactada de Pago */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-100 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-900">
            <Calendar className="w-4 h-4 text-orange-500" />
            <span>Filtrar por Fecha Pactada de Pago</span>
          </div>

          {(exactDueDate || startDueDate || endDueDate || statusFilter !== 'active') && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Ver todas las fechas</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Exact Due Date Filter */}
          <div>
            <label className="block text-[11px] font-bold text-orange-900 mb-1">
              Fecha Pactada Exacta:
            </label>
            <input
              type="date"
              value={exactDueDate}
              onChange={(e) => {
                setExactDueDate(e.target.value);
                if (e.target.value) {
                  setStartDueDate('');
                  setEndDueDate('');
                }
              }}
              className="w-full px-3 py-2 text-xs font-mono-numbers font-bold rounded-lg border border-orange-300 bg-orange-50/30 focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Range Start */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Desde Fecha de Pago:
            </label>
            <input
              type="date"
              value={startDueDate}
              onChange={(e) => {
                setStartDueDate(e.target.value);
                setExactDueDate('');
              }}
              className="w-full px-3 py-2 text-xs font-mono-numbers rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Range End */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Hasta Fecha de Pago:
            </label>
            <input
              type="date"
              value={endDueDate}
              onChange={(e) => {
                setEndDueDate(e.target.value);
                setExactDueDate('');
              }}
              className="w-full px-3 py-2 text-xs font-mono-numbers rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Estado de Pago */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Estado de las Cuentas:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'active' | 'emitida' | 'pagada')}
              className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value="active">Todas las activas (Por pagar + Pagadas)</option>
              <option value="emitida">Solo Pendientes por Pagar (Emitidas)</option>
              <option value="pagada">Solo Pagadas</option>
            </select>
          </div>
        </div>

        {/* Quick Due Date Selector Chips */}
        {allAvailableDueDates.length > 0 && (
          <div className="pt-2">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
              Fechas pactadas de pago con cuentas registradas (clic para filtrar):
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setExactDueDate('')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  !exactDueDate && !startDueDate && !endDueDate
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50'
                }`}
              >
                Todas ({validCuentas.length})
              </button>
              {allAvailableDueDates.map((d) => {
                const isSelected = exactDueDate === d;
                const countForDate = validCuentas.filter(
                  (c) => (c.paymentDueDate || c.date) === d
                ).length;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setExactDueDate(isSelected ? '' : d);
                      setStartDueDate('');
                      setEndDueDate('');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono-numbers font-bold border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-orange-500 text-white border-orange-600 shadow-xs'
                        : 'bg-orange-50/60 text-orange-950 border-orange-200 hover:bg-orange-100'
                    }`}
                  >
                    {d} ({countForDate})
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-orange-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-orange-800 uppercase tracking-wider">
              Dinero Pendiente por Pagar
            </span>
            <Clock className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-orange-950 font-mono-numbers tabular-nums mt-1.5">
            {formatCurrency(totalPorPagar)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {filteredCuentas.filter((c) => c.status === 'emitida').length} cuentas en estado Emitida
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider">
              Dinero Ya Pagado
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-950 font-mono-numbers tabular-nums mt-1.5">
            {formatCurrency(totalYaPagado)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {filteredCuentas.filter((c) => c.status === 'pagada').length} cuentas en estado Pagada
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
              Total Programado (Filtro Actual)
            </span>
            <DollarSign className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono-numbers tabular-nums mt-1.5">
            {formatCurrency(totalGeneral)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {filteredCuentas.length} cuentas en {dueDateBuckets.length}{' '}
            {dueDateBuckets.length === 1 ? 'fecha de pago' : 'fechas de pago'}
          </p>
        </div>
      </div>

      {/* Interactive Chart: Dinero a Pagar por Fecha Pactada de Pago */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-emerald-100 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-emerald-50">
          <div>
            <h3 className="text-sm font-extrabold text-emerald-950 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-orange-500" />
              <span>Gráfica: Dinero que Debe Pagarse por Fecha Pactada de Pago</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Haz clic sobre cualquier barra o fecha para filtrar el detalle de cuentas de cobro de ese día
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-orange-900">
              <span className="w-3 h-3 rounded-xs bg-orange-500 inline-block"></span>
              Por Pagar (Pendiente)
            </span>
            <span className="flex items-center gap-1.5 text-emerald-900">
              <span className="w-3 h-3 rounded-xs bg-emerald-600 inline-block"></span>
              Pagado
            </span>
          </div>
        </div>

        {dueDateBuckets.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No hay cuentas registradas para las fechas de pago seleccionadas.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Horizontal Bar Chart with exact COP amounts */}
            <div className="space-y-3">
              {dueDateBuckets.map((bucket) => {
                const totalWidthPct = Math.max(
                  4,
                  Math.round((bucket.totalAmount / maxBucketAmount) * 100)
                );
                const pendienteRatio =
                  bucket.totalAmount > 0
                    ? (bucket.pendienteAmount / bucket.totalAmount) * 100
                    : 0;
                const pagadoRatio =
                  bucket.totalAmount > 0
                    ? (bucket.pagadoAmount / bucket.totalAmount) * 100
                    : 0;
                const isSelected = exactDueDate === bucket.dueDate;

                return (
                  <div
                    key={bucket.dueDate}
                    onClick={() =>
                      setExactDueDate(isSelected ? '' : bucket.dueDate)
                    }
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-orange-50/60 border-orange-300 shadow-xs'
                        : 'bg-slate-50/60 hover:bg-emerald-50/40 border-slate-200/80'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-numbers font-black text-xs sm:text-sm text-emerald-950">
                          {bucket.dueDate}
                        </span>
                        <span className="text-xs text-slate-500 hidden sm:inline">
                          ({bucket.formattedDate})
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-white border border-slate-200 rounded-md text-slate-700">
                          {bucket.count} {bucket.count === 1 ? 'cuenta' : 'cuentas'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-mono-numbers tabular-nums">
                        {bucket.pendienteAmount > 0 && (
                          <span className="font-extrabold text-orange-700">
                            Por pagar: {formatCurrency(bucket.pendienteAmount)}
                          </span>
                        )}
                        {bucket.pagadoAmount > 0 && (
                          <span className="font-bold text-emerald-700">
                            Pagado: {formatCurrency(bucket.pagadoAmount)}
                          </span>
                        )}
                        <span className="font-black text-slate-950 text-sm">
                          Total: {formatCurrency(bucket.totalAmount)}
                        </span>
                      </div>
                    </div>

                    {/* Stacked Progress / Bar */}
                    <div className="w-full h-5 bg-slate-200/70 rounded-lg overflow-hidden p-0.5">
                      <div
                        className="h-full rounded-md overflow-hidden flex transition-all duration-300"
                        style={{ width: `${totalWidthPct}%` }}
                      >
                        {bucket.pendienteAmount > 0 && (
                          <div
                            className="h-full bg-orange-500 transition-all"
                            style={{ width: `${pendienteRatio}%` }}
                            title={`Por pagar: ${formatCurrency(bucket.pendienteAmount)}`}
                          />
                        )}
                        {bucket.pagadoAmount > 0 && (
                          <div
                            className="h-full bg-emerald-600 transition-all"
                            style={{ width: `${pagadoRatio}%` }}
                            title={`Pagado: ${formatCurrency(bucket.pagadoAmount)}`}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Detailed Accounts Table for Selected Due Date(s) */}
      <div className="bg-white rounded-2xl border border-emerald-100 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-emerald-50/40">
          <div>
            <h3 className="text-sm font-extrabold text-emerald-950">
              Relación de Cuentas de Cobro a Pagar ({filteredCuentas.length})
            </h3>
            <p className="text-xs text-slate-500">
              {exactDueDate
                ? `Mostrando cuentas con fecha pactada de pago: ${exactDueDate}`
                : 'Mostrando todas las cuentas según el filtro actual'}
            </p>
          </div>
        </div>

        {filteredCuentas.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No se encontraron cuentas de cobro para este filtro de fecha pactada de pago.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  <th className="py-3 px-3">Fecha Pactada Pago</th>
                  <th className="py-3 px-3">Consecutivo</th>
                  <th className="py-3 px-3">Placa</th>
                  <th className="py-3 px-3">Beneficiario / Conductor</th>
                  <th className="py-3 px-3">Datos Bancarios para Pago</th>
                  <th className="py-3 px-3 text-right">Valor a Pagar</th>
                  <th className="py-3 px-3 text-center">Estado</th>
                  <th className="py-3 px-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCuentas.map((c) => (
                  <tr key={c.id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-orange-50 text-orange-950 border border-orange-200 font-mono-numbers font-bold">
                        <Calendar className="w-3 h-3 text-orange-600" />
                        {c.paymentDueDate || c.date}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono-numbers font-bold text-emerald-950 whitespace-nowrap">
                      {c.consecutiveFormatted}
                    </td>
                    <td className="py-3 px-3 font-mono-numbers font-bold text-slate-900 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Car className="w-3.5 h-3.5 text-emerald-600" />
                        {c.vehiclePlate}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 uppercase flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{c.paymentData.accountHolder || c.driverName}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono-numbers">
                        CC: {c.paymentData.identification || c.driverId}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-emerald-950">
                        {c.paymentData.bank} · {c.paymentData.accountType}
                      </div>
                      <div className="font-mono-numbers text-slate-700 font-semibold">
                        N° {c.paymentData.accountNumber}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono-numbers tabular-nums font-black text-sm text-emerald-950 whitespace-nowrap">
                      {formatCurrency(c.totalAmount)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <select
                        value={c.status}
                        onChange={(e) =>
                          onStatusChange(c.id, e.target.value as CuentaStatus)
                        }
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-md border text-center cursor-pointer ${
                          c.status === 'pagada'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-orange-50 text-orange-800 border-orange-300'
                        }`}
                      >
                        <option value="emitida">Pendiente Pago</option>
                        <option value="pagada">Pagada</option>
                        <option value="anulada">Anulada</option>
                      </select>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => shareCuentaPDFViaWhatsApp(c)}
                          title="Enviar PDF por WhatsApp"
                          className="p-1.5 text-[#1ebe5d] hover:text-white hover:bg-[#25D366] rounded-md transition-colors cursor-pointer"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onView(c)}
                          title="Ver documento formal"
                          className="p-1.5 text-emerald-800 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-emerald-50/80 border-t-2 border-emerald-200 font-bold">
                  <td colSpan={5} className="py-3 px-4 text-right uppercase text-emerald-950">
                    TOTAL FILTRADO ({filteredCuentas.length} CUENTAS):
                  </td>
                  <td className="py-3 px-3 text-right font-mono-numbers tabular-nums font-black text-sm text-emerald-950">
                    {formatCurrency(totalGeneral)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
