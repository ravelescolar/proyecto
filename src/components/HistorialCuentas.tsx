import React, { useState } from 'react';
import {
  Search,
  FileText,
  Eye,
  Copy,
  Trash2,
  FileSpreadsheet,
  Plus,
  X,
  User,
  Car,
  Filter,
  RotateCcw
} from 'lucide-react';
import { CuentaDeCobro, CuentaStatus } from '../types';
import { formatCurrency } from '../utils/numberToWords';

interface HistorialCuentasProps {
  cuentas: CuentaDeCobro[];
  onView: (cuenta: CuentaDeCobro) => void;
  onEdit: (cuenta: CuentaDeCobro) => void;
  onDuplicate: (cuenta: CuentaDeCobro) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: CuentaStatus) => void;
  onNew: () => void;
}

export const HistorialCuentas: React.FC<HistorialCuentasProps> = ({
  cuentas,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  onStatusChange,
  onNew,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTarget, setSearchTarget] = useState<'all' | 'driver' | 'plate'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | CuentaStatus>('all');
  const [cuentaToDelete, setCuentaToDelete] = useState<CuentaDeCobro | null>(null);

  // Helper to normalize strings for accent-insensitive and case-insensitive matching
  const normalizeText = (text: string) =>
    (text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  // Helper to normalize vehicle plates (e.g. "WTL-890" -> "WTL890")
  const cleanPlateText = (text: string) =>
    (text || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  const filtered = cuentas.filter((c) => {
    const rawTerm = searchTerm.trim();
    let matchSearch = true;

    if (rawTerm) {
      const normQuery = normalizeText(rawTerm);
      const plateQuery = cleanPlateText(rawTerm);

      const driverMatches =
        normalizeText(c.driverName).includes(normQuery) ||
        Boolean(c.driverId && c.driverId.replace(/[^0-9]/g, '').includes(rawTerm.replace(/[^0-9]/g, '')));

      const plateMatches =
        (plateQuery.length > 0 && cleanPlateText(c.vehiclePlate).includes(plateQuery)) ||
        c.services.some((s) => plateQuery.length > 0 && cleanPlateText(s.plate).includes(plateQuery));

      const consecutiveMatches = normalizeText(c.consecutiveFormatted).includes(normQuery);

      if (searchTarget === 'driver') {
        matchSearch = driverMatches;
      } else if (searchTarget === 'plate') {
        matchSearch = plateMatches;
      } else {
        // 'all' checks driver, plate, consecutive, and general fields
        matchSearch = driverMatches || plateMatches || consecutiveMatches;
      }
    }

    const matchStatus = statusFilter === 'all' ? true : c.status === statusFilter;

    return matchSearch && matchStatus;
  });

  // Calculate stats
  const totalFacturado = cuentas
    .filter((c) => c.status !== 'anulada')
    .reduce((sum, c) => sum + c.totalAmount, 0);
  const totalEmitidas = cuentas.filter((c) => c.status === 'emitida').length;
  const totalPagadas = cuentas.filter((c) => c.status === 'pagada').length;

  const exportToCSV = () => {
    const headers = [
      'Consecutivo',
      'Fecha Emision',
      'Fecha Pactada Pago',
      'Placa',
      'Conductor',
      'Cedula',
      'Banco',
      'Tipo Cuenta',
      'N Cuenta',
      'Servicios',
      'Total COP',
      'Estado',
    ];

    const rows = filtered.map((c) => [
      `"${c.consecutiveFormatted}"`,
      `"${c.date}"`,
      `"${c.paymentDueDate || c.date}"`,
      `"${c.vehiclePlate}"`,
      `"${c.driverName}"`,
      `"${c.driverId}"`,
      `"${c.paymentData.bank}"`,
      `"${c.paymentData.accountType}"`,
      `"${c.paymentData.accountNumber}"`,
      `"${c.services.length}"`,
      `"${c.totalAmount}"`,
      `"${c.status}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Cuentas_Cobro_TRANSPORTES_RAVEL_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
            Total en Cuentas Activas
          </div>
          <div className="text-xl font-black text-emerald-950 font-mono-numbers mt-1">
            {formatCurrency(totalFacturado)}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {cuentas.length} cuentas registradas en total
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-orange-100 shadow-xs">
          <div className="text-[11px] font-bold text-orange-700 uppercase tracking-wider">
            Pendientes de Pago (Emitidas)
          </div>
          <div className="text-xl font-black text-orange-900 font-mono-numbers mt-1">
            {totalEmitidas} cuentas
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Requiere pago o revisión</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
            Cuentas Pagadas
          </div>
          <div className="text-xl font-black text-emerald-900 font-mono-numbers mt-1">
            {totalPagadas} cuentas
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Comprobante archivado</div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={
                searchTarget === 'driver'
                  ? 'Buscar por nombre o cédula del conductor...'
                  : searchTarget === 'plate'
                  ? 'Buscar por número de placa (ej: WTL-890 o WTL)...'
                  : 'Buscar por nombre de conductor o número de placa...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50/50 hover:bg-white transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                title="Limpiar búsqueda"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Target Filter Buttons (Todos, Conductor, Placa) */}
          <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl border border-slate-200/80 shrink-0">
            <button
              type="button"
              onClick={() => setSearchTarget('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                searchTarget === 'all'
                  ? 'bg-white text-emerald-950 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Filter className="w-3.5 h-3.5 text-emerald-600" />
              <span>Todos</span>
            </button>
            <button
              type="button"
              onClick={() => setSearchTarget('driver')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                searchTarget === 'driver'
                  ? 'bg-white text-emerald-950 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5 text-emerald-600" />
              <span>Conductor</span>
            </button>
            <button
              type="button"
              onClick={() => setSearchTarget('plate')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                searchTarget === 'plate'
                  ? 'bg-white text-emerald-950 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Car className="w-3.5 h-3.5 text-emerald-600" />
              <span>Placa</span>
            </button>
          </div>
        </div>

        {/* Secondary Bar: Status Filters, Export CSV, and New CTA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Status filter tabs */}
          <div className="flex items-center gap-1 p-1 bg-emerald-50/70 border border-emerald-100 rounded-lg">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-emerald-950 shadow-xs font-bold'
                  : 'text-emerald-800 hover:text-emerald-950'
              }`}
            >
              Todas ({cuentas.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('emitida')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                statusFilter === 'emitida'
                  ? 'bg-white text-orange-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-orange-800'
              }`}
            >
              Emitidas ({totalEmitidas})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pagada')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                statusFilter === 'pagada'
                  ? 'bg-white text-emerald-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-emerald-900'
              }`}
            >
              Pagadas ({totalPagadas})
            </button>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={exportToCSV}
              title="Exportar cuentas visibles a CSV"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-900 bg-white border border-emerald-200 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>CSV ({filtered.length})</span>
            </button>

            <button
              type="button"
              onClick={onNew}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>Nueva Cuenta</span>
            </button>
          </div>
        </div>

        {/* Search Results Summary Banner when filtering */}
        {(searchTerm.trim() !== '' || statusFilter !== 'all' || searchTarget !== 'all') && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-emerald-50/50 rounded-lg border border-emerald-100 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-emerald-950">
                Mostrando {filtered.length} de {cuentas.length} {cuentas.length === 1 ? 'cuenta' : 'cuentas'}
              </span>
              {searchTerm.trim() && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-emerald-900 font-medium">
                  {searchTarget === 'driver' ? 'Conductor: ' : searchTarget === 'plate' ? 'Placa: ' : 'Búsqueda: '}
                  <strong>"{searchTerm.trim()}"</strong>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSearchTarget('all');
                setStatusFilter('all');
              }}
              className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 underline transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restablecer filtros</span>
            </button>
          </div>
        )}
      </div>

      {/* Cuentas Table */}
      <div className="bg-white rounded-xl border border-emerald-100 shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 px-4 text-center">
            {searchTerm.trim() ? (
              <div className="max-w-md mx-auto space-y-3">
                <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  No se encontraron resultados
                </h4>
                <p className="text-xs text-slate-500">
                  No encontramos ninguna cuenta que coincida con{' '}
                  <strong className="text-slate-800">"{searchTerm.trim()}"</strong>
                  {searchTarget !== 'all' && ` en el filtro de ${searchTarget === 'driver' ? 'conductores' : 'placas'}`}.
                </p>
                <div className="pt-2 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Limpiar búsqueda</span>
                  </button>
                  <button
                    type="button"
                    onClick={onNew}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-white" />
                    <span>Nueva Cuenta</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <FileText className="w-10 h-10 mx-auto text-emerald-300 stroke-1" />
                <p className="text-sm font-semibold text-slate-600">No se encontraron cuentas de cobro</p>
                <p className="text-xs text-slate-400">Aún no hay cuentas registradas en este estado.</p>
                <button
                  type="button"
                  onClick={onNew}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-orange-500 rounded-lg hover:bg-orange-600 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-white" />
                  <span>Crear primera cuenta</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-emerald-50/70 border-b border-emerald-100 text-[11px] font-bold text-emerald-950 uppercase tracking-wider">
                  <th className="py-3 px-3 w-28">Consecutivo</th>
                  <th className="py-3 px-3 w-28">Fecha</th>
                  <th className="py-3 px-3 w-24">Placa</th>
                  <th className="py-3 px-4">Conductor y Cédula</th>
                  <th className="py-3 px-3">Servicios</th>
                  <th className="py-3 px-3 text-right">Total (COP)</th>
                  <th className="py-3 px-3 text-center w-28">Estado</th>
                  <th className="py-3 px-3 text-center w-36">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50/60">
                {filtered.map((cuenta) => (
                  <tr key={cuenta.id} className="hover:bg-emerald-50/30 transition-colors">
                    {/* Consecutivo */}
                    <td className="py-3 px-3 font-mono-numbers font-bold text-emerald-950 whitespace-nowrap">
                      {cuenta.consecutiveFormatted}
                    </td>

                    {/* Fecha */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="text-slate-700 font-mono-numbers">{cuenta.date}</div>
                      {cuenta.paymentDueDate && (
                        <div className="text-[10px] text-orange-800 font-medium font-mono-numbers">
                          Pago: {cuenta.paymentDueDate}
                        </div>
                      )}
                    </td>

                    {/* Placa */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-mono-numbers font-bold bg-orange-50 text-orange-950 px-2 py-0.5 rounded border border-orange-200">
                        {cuenta.vehiclePlate}
                      </span>
                    </td>

                    {/* Conductor */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 truncate max-w-[220px]">
                        {cuenta.driverName}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono-numbers">
                        CC: {cuenta.driverId}
                      </div>
                    </td>

                    {/* Servicios count and preview */}
                    <td className="py-3 px-3">
                      <div className="text-slate-800 font-medium">
                        {cuenta.services.length} {cuenta.services.length === 1 ? 'servicio' : 'servicios'}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                        {cuenta.services[0]?.clientDetail || 'Transporte terrestre'}
                      </div>
                    </td>

                    {/* Total */}
                    <td className="py-3 px-3 text-right font-mono-numbers font-black text-emerald-950 text-sm whitespace-nowrap">
                      {formatCurrency(cuenta.totalAmount)}
                    </td>

                    {/* Status dropdown */}
                    <td className="py-3 px-3 text-center">
                      <select
                        value={cuenta.status}
                        onChange={(e) => onStatusChange(cuenta.id, e.target.value as CuentaStatus)}
                        className={`text-[11px] font-bold px-2 py-1 rounded-md border text-center transition-colors cursor-pointer ${
                          cuenta.status === 'pagada'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : cuenta.status === 'anulada'
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : 'bg-orange-50 text-orange-800 border-orange-300'
                        }`}
                      >
                        <option value="emitida">Emitida</option>
                        <option value="pagada">Pagada</option>
                        <option value="anulada">Anulada</option>
                      </select>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onView(cuenta)}
                          title="Ver Documento Formal"
                          className="p-1.5 text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50 rounded-md transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onDuplicate(cuenta)}
                          title="Duplicar como Nueva Cuenta (Nuevo Consecutivo)"
                          className="p-1.5 text-slate-600 hover:text-orange-700 hover:bg-orange-50 rounded-md transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onEdit(cuenta)}
                          title="Editar Datos"
                          className="p-1.5 text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setCuentaToDelete(cuenta)}
                          title="Eliminar registro"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* In-App Delete Confirmation Modal (Avoids sandboxed iframe window.confirm blocks) */}
      {cuentaToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900">
              ¿Eliminar Cuenta {cuentaToDelete.consecutiveFormatted}?
            </h3>

            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Estás a punto de eliminar permanentemente la cuenta de cobro de{' '}
              <strong className="text-slate-900">{cuentaToDelete.driverName}</strong> (Placa {cuentaToDelete.vehiclePlate}) por un valor de{' '}
              <strong className="text-slate-900">{formatCurrency(cuentaToDelete.totalAmount)}</strong>.
            </p>

            <div className="mt-3 p-3 bg-rose-50/80 rounded-xl border border-rose-200 text-xs text-rose-800">
              ⚠️ Esta acción no se puede deshacer y se borrará del historial local.
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCuentaToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete(cuentaToDelete.id);
                  setCuentaToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Sí, Eliminar Cuenta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
