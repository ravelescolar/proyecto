import React from 'react';
import {
  Plus,
  Clock,
  FileText,
  CheckCircle2,
  Car,
  BarChart3,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  Calendar,
  Eye,
  Edit2,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { CuentaDeCobro, DriverProfile, AppSettings, CuentaStatus } from '../types';
import { formatCurrency } from '../utils/numberToWords';
import { formatDateColombian, formatPersonName, formatStatusChangeTimestamp } from '../utils/colombianFormatters';

interface InicioDashboardProps {
  cuentas: CuentaDeCobro[];
  drivers: DriverProfile[];
  settings: AppSettings;
  userEmail?: string | null;
  userName?: string | null;
  isAdmin: boolean;
  onNewCuenta: () => void;
  onViewCuenta: (cuenta: CuentaDeCobro) => void;
  onEditCuenta: (cuenta: CuentaDeCobro) => void;
  onGoToHistory: () => void;
  onGoToDrivers: () => void;
  onGoToReports: () => void;
  onStatusChange?: (id: string, status: CuentaStatus) => void;
}

export const InicioDashboard: React.FC<InicioDashboardProps> = ({
  cuentas,
  drivers,
  settings,
  userEmail,
  userName,
  isAdmin,
  onNewCuenta,
  onViewCuenta,
  onEditCuenta,
  onGoToHistory,
  onGoToDrivers,
  onGoToReports,
  onStatusChange,
}) => {
  const validCuentas = cuentas.filter((c) => c.status !== 'anulada');
  const emitidas = cuentas.filter((c) => c.status === 'emitida');
  const pagadas = cuentas.filter((c) => c.status === 'pagada');

  const totalPorPagar = emitidas.reduce((sum, c) => sum + c.totalAmount, 0);
  const totalPagado = pagadas.reduce((sum, c) => sum + c.totalAmount, 0);
  const totalGeneral = validCuentas.reduce((sum, c) => sum + c.totalAmount, 0);

  const recentCuentas = [...cuentas]
    .sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || a.date).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || b.date).getTime();
      return dateB - dateA;
    })
    .slice(0, 6);

  const displayName =
    userName ||
    (userEmail ? userEmail.split('@')[0] : isAdmin ? 'Administrador' : 'Usuario');

  const cuentasWithCorrection = cuentas.filter((c) => Boolean(c.adminCorrectionNote));

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Admin Correction Alert Banner */}
      {cuentasWithCorrection.length > 0 && (
        <div className="bg-orange-50 border border-orange-300 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-orange-900 uppercase tracking-wider">
            <AlertCircle className="w-4 h-4 text-orange-600 shrink-0" />
            <span>Notas de Corrección del Administrador ({cuentasWithCorrection.length})</span>
          </div>
          <div className="space-y-2">
            {cuentasWithCorrection.map((c) => (
              <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white rounded-xl border border-orange-200 text-xs">
                <div>
                  <span className="font-mono-numbers font-bold text-emerald-950">
                    Cuenta {c.consecutiveFormatted} ({c.driverName}):
                  </span>{' '}
                  <span className="text-slate-800 font-medium">{c.adminCorrectionNote}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onEditCuenta(c)}
                  className="px-3 py-1.5 font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
                >
                  Corregir Ahora
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Welcome Hero Banner */}
      <div className="bg-white rounded-2xl border border-emerald-200/80 shadow-xs p-5 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
            {isAdmin ? (
              <>
                <ShieldCheck className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Panel Principal · Cuenta Administradora</span>
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Página de Inicio · Portal de Usuario</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span className="font-mono text-slate-500 normal-case">
              {userEmail || 'En línea'}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-emerald-950 tracking-tight font-serif">
            Bienvenido, {displayName}
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
            {isAdmin
              ? `Gestiona y audita todas las cuentas de cobro de ${settings.companyName || 'Transportes Ravel'}, controla estados de pago, consulta informes por fecha pactada y administra el directorio de vehículos.`
              : `Genera tus cuentas de cobro para ${settings.companyName || 'Transportes Ravel'}, consulta el estado de tus pagos y descarga o comparte tus documentos en formato PDF.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onNewCuenta}
            className="min-h-[44px] flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm hover:shadow-emerald-600/20 transition-all cursor-pointer active:scale-[0.99]"
          >
            <Plus className="w-4 h-4 text-orange-300 shrink-0" />
            <span>Generar Nueva Cuenta de Cobro</span>
          </button>

          <button
            type="button"
            onClick={onGoToHistory}
            className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
          >
            <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{isAdmin ? 'Ver Todas las Cuentas' : 'Ver Mis Cuentas'}</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-emerald-100 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>{isAdmin ? 'Total Cuentas Registradas' : 'Mis Cuentas Creadas'}</span>
            <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-emerald-950 font-mono-numbers tabular-nums">
              {cuentas.length}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {emitidas.length} pendientes · {pagadas.length} pagadas
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-orange-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-orange-900 uppercase tracking-wider">
            <span>{isAdmin ? 'Pendiente por Pagar' : 'Pendiente por Cobrar'}</span>
            <Calendar className="w-4 h-4 text-orange-500 shrink-0" />
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-orange-950 font-mono-numbers tabular-nums">
              {formatCurrency(totalPorPagar)}
            </div>
            <p className="text-xs text-orange-800/80 mt-1 font-medium">
              {emitidas.length} {emitidas.length === 1 ? 'cuenta emitida' : 'cuentas emitidas'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-emerald-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-900 uppercase tracking-wider">
            <span>{isAdmin ? 'Total Pagado' : 'Total Recibido (Pagado)'}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-emerald-900 font-mono-numbers tabular-nums">
              {formatCurrency(totalPagado)}
            </div>
            <p className="text-xs text-emerald-700 mt-1 font-medium">
              {pagadas.length} {pagadas.length === 1 ? 'cuenta pagada' : 'cuentas pagadas'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 uppercase tracking-wider">
            <span>{isAdmin ? 'Monto Total Acumulado' : 'Total Facturado'}</span>
            <TrendingUp className="w-4 h-4 text-emerald-700 shrink-0" />
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono-numbers tabular-nums">
              {formatCurrency(totalGeneral)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Sin incluir cuentas anuladas
            </p>
          </div>
        </div>
      </div>

      {/* Quick Access Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={onNewCuenta}
          className="text-left bg-white hover:bg-emerald-50/50 border border-emerald-200 rounded-xl p-5 shadow-xs transition-all group cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center mb-3 shadow-xs group-hover:scale-105 transition-transform">
              <Plus className="w-5 h-5 text-orange-300" />
            </div>
            <h2 className="text-base font-extrabold text-emerald-950">
              Nueva Cuenta de Cobro
            </h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Diligencia una nueva cuenta de cobro con cálculo automático en letras, servicios del mes y datos bancarios.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
            <span>Crear cuenta ahora</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>

        <button
          type="button"
          onClick={onGoToHistory}
          className="text-left bg-white hover:bg-emerald-50/50 border border-emerald-200 rounded-xl p-5 shadow-xs transition-all group cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
            <h2 className="text-base font-extrabold text-emerald-950">
              {isAdmin ? 'Historial General de Cuentas' : 'Historial de Mis Cuentas'}
            </h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {isAdmin
                ? `Consulta, filtra, edita o cambia el estado de las ${cuentas.length} cuentas registradas en el sistema.`
                : `Revisa tus ${cuentas.length} cuentas guardadas, descarga el PDF o envíalo directamente por WhatsApp.`}
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
            <span>Ir al historial</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>

        {isAdmin ? (
          <div className="grid grid-rows-2 gap-3">
            <button
              type="button"
              onClick={onGoToReports}
              className="text-left bg-orange-50/60 hover:bg-orange-100/70 border border-orange-200 rounded-xl p-4 shadow-xs transition-all group cursor-pointer flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-orange-600 shrink-0" />
                  <h2 className="text-sm font-extrabold text-orange-950 truncate">
                    Informes por Fecha de Pago
                  </h2>
                </div>
                <p className="text-xs text-orange-900/80 mt-1 line-clamp-2">
                  Gráfica y programación de pagos por fecha pactada.
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-orange-700 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              type="button"
              onClick={onGoToDrivers}
              className="text-left bg-white hover:bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 shadow-xs transition-all group cursor-pointer flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-emerald-700 shrink-0" />
                  <h2 className="text-sm font-extrabold text-emerald-950 truncate">
                    Base de Vehículos y Placas ({drivers.length})
                  </h2>
                </div>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                  Administra placas, conductores y beneficiarios de pago.
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-700 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        ) : (
          <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-800 flex items-center justify-center mb-3">
                <Car className="w-5 h-5 text-orange-600" />
              </div>
              <h2 className="text-base font-extrabold text-emerald-950">
                Autocompletado Personal
              </h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Tus datos de conductor, placa y cuenta bancaria se guardan automáticamente en tu cuenta privada para agilizar tus próximos cobros.
              </p>
            </div>
            <div className="mt-4 text-xs font-semibold text-emerald-900">
              Perfiles guardados en tu cuenta: <span className="font-mono font-bold">{drivers.length}</span>
            </div>
          </div>
        )}
      </div>

      {/* Recent Cuentas Table / List */}
      <div className="bg-white rounded-2xl border border-emerald-100 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold text-emerald-950">
              {isAdmin ? 'Últimas Cuentas de Cobro Generadas' : 'Mis Cuentas de Cobro Recientes'}
            </h2>
            <p className="text-xs text-slate-500">
              Haz clic en ver documento para descargar el PDF o compartirlo por WhatsApp
            </p>
          </div>

          {cuentas.length > 0 && (
            <button
              type="button"
              onClick={onGoToHistory}
              className="self-start sm:self-auto text-xs font-bold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Ver todas ({cuentas.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {recentCuentas.length === 0 ? (
          <div className="p-8 sm:p-12 text-center space-y-3">
            <FileText className="w-10 h-10 text-emerald-600/50 mx-auto" />
            <div className="text-sm font-bold text-slate-800">
              Aún no hay cuentas de cobro registradas
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Genera tu primera cuenta de cobro haciendo clic en el botón inferior. Quedará guardada automáticamente en tu historial.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onNewCuenta}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 text-orange-300" />
                <span>Crear Primera Cuenta de Cobro</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-emerald-50/60 text-emerald-950 font-bold uppercase text-[11px] tracking-wider border-b border-emerald-100">
                  <th className="py-3 px-4">Consecutivo</th>
                  <th className="py-3 px-4">Conductor / Beneficiario</th>
                  <th className="py-3 px-4">Placa</th>
                  <th className="py-3 px-4">Fecha Pactada Pago</th>
                  <th className="py-3 px-4 text-right">Total COP</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentCuentas.map((c) => (
                  <tr key={c.id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="py-3 px-4 font-mono-numbers font-bold text-emerald-950 whitespace-nowrap">
                      {c.consecutiveFormatted}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 truncate max-w-[200px]">
                        {formatPersonName(c.driverName)}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono-numbers">
                        C.C. {c.driverId}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono-numbers font-bold text-slate-800 whitespace-nowrap">
                      {c.vehiclePlate}
                    </td>
                    <td className="py-3 px-4 font-mono-numbers text-slate-700 whitespace-nowrap">
                      {formatDateColombian(c.paymentDueDate || c.date)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-numbers font-extrabold text-emerald-950 whitespace-nowrap">
                      {formatCurrency(c.totalAmount)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex flex-col items-start gap-0.5">
                        {isAdmin && onStatusChange ? (
                          <select
                            value={c.status}
                            onChange={(e) =>
                              onStatusChange(c.id, e.target.value as CuentaStatus)
                            }
                            className={`text-[11px] font-bold px-2 py-1 rounded-md border transition-colors cursor-pointer ${
                              c.status === 'pagada'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : c.status === 'anulada'
                                ? 'bg-rose-50 text-rose-800 border-rose-300'
                                : 'bg-orange-50 text-orange-800 border-orange-300'
                            }`}
                          >
                            <option value="emitida">Emitida · Pendiente</option>
                            <option value="pagada">Pagada</option>
                            <option value="anulada">Anulada</option>
                          </select>
                        ) : (
                          <>
                            {c.status === 'emitida' && (
                              <span className="font-semibold text-orange-800">
                                Emitida · Pendiente
                              </span>
                            )}
                            {c.status === 'pagada' && (
                              <span className="font-semibold text-emerald-800">
                                Pagada
                              </span>
                            )}
                            {c.status === 'anulada' && (
                              <span className="font-semibold text-rose-800">
                                Anulada
                              </span>
                            )}
                          </>
                        )}
                        {c.statusUpdatedAt && (
                          <span
                            className="text-[10px] text-slate-400 font-mono-numbers"
                            title={
                              c.statusUpdatedByEmail
                                ? `Modificado por: ${c.statusUpdatedByEmail}`
                                : 'Momento del cambio de estado'
                            }
                          >
                            Cambio: {formatStatusChangeTimestamp(c.statusUpdatedAt)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onViewCuenta(c)}
                          title="Ver documento y descargar PDF"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Ver</span>
                        </button>
                        {(c.status !== 'anulada' || isAdmin) && (
                          <button
                            type="button"
                            onClick={() => onEditCuenta(c)}
                            title="Editar cuenta de cobro"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                            <span>Editar</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
