import React, { useState } from 'react';
import {
  Car,
  CreditCard,
  Plus,
  Trash2,
  Edit2,
  Check,
  Search,
  FileText,
  Phone,
  AlertCircle,
  UserCheck
} from 'lucide-react';
import { DriverProfile, PaymentData } from '../types';
import {
  COLOMBIAN_BANKS,
  ACCOUNT_TYPES,
  formatPlate,
  formatPersonName
} from '../utils/colombianFormatters';
import {
  saveDriverProfile,
  deleteDriverProfile,
  findMatchingVehicleByPlateAndPayee
} from '../utils/storage';

interface ConductoresPlacasProps {
  drivers: DriverProfile[];
  onRefresh: () => void;
  onSelectForCuenta: (driver: DriverProfile) => void;
}

export const ConductoresPlacas: React.FC<ConductoresPlacasProps> = ({
  drivers,
  onRefresh,
  onSelectForCuenta,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingDriver, setEditingDriver] = useState<DriverProfile | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // New Driver Form state
  const [plate, setPlate] = useState('');
  const [driverName, setDriverName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [bank, setBank] = useState('Bancolombia');
  const [accountType, setAccountType] = useState<PaymentData['accountType']>('Ahorros');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [identification, setIdentification] = useState('');
  const [clientInput, setClientInput] = useState('');
  const [frequentClients, setFrequentClients] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [driverToDelete, setDriverToDelete] = useState<{ id: string; plate: string; name: string } | null>(null);

  const filtered = drivers.filter((d) => {
    const term = searchTerm.toLowerCase();
    const payeeHolder = (d.paymentData?.accountHolder || d.driverName || '').toLowerCase();
    const payeeId = (d.paymentData?.identification || d.idNumber || '').toLowerCase();
    return (
      d.plate.toLowerCase().includes(term) ||
      d.driverName.toLowerCase().includes(term) ||
      d.idNumber.toLowerCase().includes(term) ||
      payeeHolder.includes(term) ||
      payeeId.includes(term)
    );
  });

  // Check if the entered plate already exists for other payees
  const formattedCurrentPlate = formatPlate(plate);
  const cleanCurrentPlate = formattedCurrentPlate.replace(/[^A-Z0-9]/g, '');
  const samePlateProfiles = cleanCurrentPlate.length >= 5
    ? drivers.filter(
        (d) =>
          (!editingDriver || d.id !== editingDriver.id) &&
          d.plate.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanCurrentPlate
      )
    : [];

  const handleOpenEdit = (profile: DriverProfile) => {
    setEditingDriver(profile);
    setIsCreating(false);
    setFormError(null);
    setPlate(profile.plate);
    setDriverName(formatPersonName(profile.driverName));
    setIdNumber(profile.idNumber);
    setPhone(profile.phone || '');
    setBank(profile.paymentData?.bank || 'Bancolombia');
    setAccountType(profile.paymentData?.accountType || 'Ahorros');
    setAccountNumber(profile.paymentData?.accountNumber || '');
    setAccountHolder(formatPersonName(profile.paymentData?.accountHolder || profile.driverName));
    setIdentification(profile.paymentData?.identification || profile.idNumber);
    setFrequentClients(profile.frequentClients || []);
  };

  const handleOpenCreate = () => {
    setEditingDriver(null);
    setIsCreating(true);
    setFormError(null);
    setPlate('');
    setDriverName('');
    setIdNumber('');
    setPhone('');
    setBank('Bancolombia');
    setAccountType('Ahorros');
    setAccountNumber('');
    setAccountHolder('');
    setIdentification('');
    setFrequentClients([]);
  };

  const handleAddClientTag = () => {
    if (clientInput.trim()) {
      if (frequentClients.length >= 10) return;
      if (!frequentClients.includes(clientInput.trim())) {
        setFrequentClients([...frequentClients, clientInput.trim().slice(0, 200)]);
      }
      setClientInput('');
    }
  };

  const handleRemoveClientTag = (tag: string) => {
    setFrequentClients(frequentClients.filter((t) => t !== tag));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!plate.trim() || !driverName.trim()) {
      return;
    }

    const formattedDriverName = formatPersonName(driverName.trim());
    const effectiveHolder = formatPersonName(accountHolder.trim() || formattedDriverName);
    const effectiveIdentification = identification.trim() || idNumber.trim();

    const duplicate = findMatchingVehicleByPlateAndPayee(drivers, {
      id: editingDriver?.id,
      plate: formatPlate(plate),
      driverName: formattedDriverName,
      idNumber: idNumber.trim(),
      paymentData: {
        accountHolder: effectiveHolder,
        identification: effectiveIdentification,
      },
    });

    if (duplicate) {
      const dupPayee = formatPersonName(duplicate.paymentData?.accountHolder || duplicate.driverName);
      const dupId = duplicate.paymentData?.identification || duplicate.idNumber;
      setFormError(
        `El vehículo de placa ${formatPlate(plate)} ya existe registrado para la misma persona a pagar (${dupPayee}${
          dupId ? ` - C.C./NIT ${dupId}` : ''
        }). Los vehículos deben ser únicos, a menos que tengan una persona a pagar (titular/beneficiario) diferente.`
      );
      return;
    }

    const payload: Partial<DriverProfile> & { plate: string; driverName: string } = {
      ...(editingDriver ? { id: editingDriver.id } : {}),
      plate: formatPlate(plate),
      driverName: formattedDriverName,
      idNumber: idNumber.trim(),
      phone: phone.trim(),
      frequentClients,
      paymentData: {
        bank,
        accountType,
        accountNumber: accountNumber.trim(),
        accountHolder: effectiveHolder,
        identification: effectiveIdentification,
      },
    };

    saveDriverProfile(payload);
    onRefresh();
    setIsCreating(false);
    setEditingDriver(null);
  };

  const handleDelete = (id: string, plateName: string, name: string) => {
    setDriverToDelete({ id, plate: plateName, name });
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12">
      {/* Search and Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por placa, conductor o cédula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="min-h-[42px] w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg shadow-xs transition-colors whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-4 h-4 text-white shrink-0" />
          <span>Registrar Nuevo Vehículo / Conductor</span>
        </button>
      </div>

      {/* Modal for Creating or Editing Driver Profile */}
      {(isCreating || editingDriver) && (
        <div className="bg-white p-6 rounded-2xl border-2 border-emerald-300 shadow-lg mb-6">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-emerald-50">
            <div className="flex items-center gap-2">
              <Car className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-emerald-950">
                {isCreating ? 'Registrar Nuevo Vehículo y Conductor' : `Editar Datos de ${editingDriver?.plate}`}
              </h3>
            </div>
            <button
              onClick={() => {
                setIsCreating(false);
                setEditingDriver(null);
              }}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancelar
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {samePlateProfiles.length > 0 && !formError && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
                <UserCheck className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <span className="font-bold">Placa {formattedCurrentPlate} ya registrada:</span>{' '}
                  Actualmente asociada a{' '}
                  {samePlateProfiles
                    .map(
                      (p) =>
                        `${p.paymentData?.accountHolder || p.driverName} (${
                          p.paymentData?.identification || p.idNumber || 'Sin C.C.'
                        })`
                    )
                    .join(' · ')}
                  . Solo puedes crear otro registro con esta misma placa si tiene una{' '}
                  <strong>persona a pagar (titular / beneficiario) diferente</strong>.
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Placa: *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: WDF-452"
                  value={plate}
                  onChange={(e) => setPlate(formatPlate(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-bold uppercase font-mono-numbers rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre Conductor: *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Carlos Alberto Martínez"
                  value={driverName}
                  onChange={(e) => setDriverName(formatPersonName(e.target.value, true))}
                  onBlur={() => setDriverName((prev) => formatPersonName(prev))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cédula:
                </label>
                <input
                  type="text"
                  placeholder="Número de cédula"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono-numbers rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Celular:
                </label>
                <input
                  type="tel"
                  placeholder="300 000 0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono-numbers rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Banking data */}
            <div className="p-3 bg-emerald-50/50 border border-emerald-200/80 rounded-xl space-y-3">
              <span className="text-[11px] font-bold text-emerald-900 block uppercase">
                Información Bancaria y Persona a Pagar (Beneficiario):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Persona a Pagar (Titular):
                  </label>
                  <input
                    type="text"
                    placeholder={driverName || 'Nombre del beneficiario'}
                    value={accountHolder}
                    onChange={(e) => {
                      setAccountHolder(formatPersonName(e.target.value, true));
                      setFormError(null);
                    }}
                    onBlur={() => setAccountHolder((prev) => formatPersonName(prev))}
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Cédula / NIT Persona a Pagar:
                  </label>
                  <input
                    type="text"
                    placeholder={idNumber || 'Documento del titular'}
                    value={identification}
                    onChange={(e) => {
                      setIdentification(e.target.value);
                      setFormError(null);
                    }}
                    className="w-full px-2.5 py-1.5 text-xs font-mono-numbers rounded-md border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Banco:</label>
                  <select
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 bg-white"
                  >
                    {COLOMBIAN_BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Tipo Cuenta:</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as PaymentData['accountType'])}
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 bg-white"
                  >
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">N° de Cuenta:</label>
                  <input
                    type="text"
                    placeholder="Número de cuenta"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono-numbers rounded-md border border-slate-300 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Frequent clients tags */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Clientes / Rutas Frecuentes (para autocompletar en los servicios):
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Ej: Colegio San José - Ruta Mañana"
                  value={clientInput}
                  onChange={(e) => setClientInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddClientTag();
                    }
                  }}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300"
                />
                <button
                  type="button"
                  onClick={handleAddClientTag}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-950 bg-emerald-100 hover:bg-emerald-200 rounded-lg"
                >
                  Agregar
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {frequentClients.map((client, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-md text-xs"
                  >
                    {client}
                    <button
                      type="button"
                      onClick={() => handleRemoveClientTag(client)}
                      className="text-emerald-700 hover:text-rose-600 ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingDriver(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
              >
                <Check className="w-4 h-4 text-white" />
                Guardar Registro
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-white p-5 rounded-2xl border border-emerald-100 hover:border-emerald-300 transition-all shadow-xs flex flex-col justify-between"
          >
            <div>
              {/* Header: Plate & Actions */}
              <div className="flex items-center justify-between pb-3 border-b border-emerald-50">
                <div className="flex items-center gap-2">
                  <span className="font-mono-numbers font-black text-sm text-orange-950">
                    {item.plate}
                  </span>
                  <span className="text-slate-300" aria-hidden="true">·</span>
                  <span className="text-[11px] text-slate-500 font-medium tabular-nums">
                    {item.totalAccountsGenerated || 1} cuentas emitidas
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(item)}
                    title="Editar perfil"
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id, item.plate, item.driverName)}
                    title="Eliminar de base de datos"
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Driver info */}
              <div className="mt-3 space-y-1.5 text-xs">
                <div className="font-bold text-emerald-950">
                  {formatPersonName(item.driverName)}
                </div>
                <div className="text-slate-500 font-mono-numbers">
                  C.C. {item.idNumber || 'Sin registrar'}
                </div>
                {item.phone && (
                  <div className="text-slate-500 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-600" />
                    <span className="font-mono-numbers">{item.phone}</span>
                  </div>
                )}
              </div>

              {/* Payment preview */}
              <div className="mt-3 p-2.5 bg-emerald-50/40 border border-emerald-100 rounded-lg text-[11px] space-y-1">
                <div className="text-[10px] font-bold uppercase text-emerald-800 flex items-center justify-between">
                  <span>Persona a pagar:</span>
                  <span className="font-mono-numbers text-slate-500">
                    {item.paymentData?.identification || item.idNumber || ''}
                  </span>
                </div>
                <div className="font-bold text-slate-900 truncate">
                  {formatPersonName(item.paymentData?.accountHolder || item.driverName)}
                </div>
                <div className="flex items-center gap-1 text-emerald-900 font-semibold pt-0.5">
                  <CreditCard className="w-3 h-3 text-orange-500" />
                  <span>{item.paymentData?.bank || 'Bancolombia'}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500">{item.paymentData?.accountType || 'Ahorros'}</span>
                </div>
                <div className="font-mono-numbers text-slate-800 font-medium">
                  {item.paymentData?.accountNumber || 'Cuenta no registrada'}
                </div>
              </div>

              {/* Frequent Clients */}
              {item.frequentClients && item.frequentClients.length > 0 && (
                <div className="mt-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Rutas / Clientes Habituales:
                  </span>
                  <div className="text-xs text-emerald-900 font-medium leading-relaxed">
                    {item.frequentClients.slice(0, 3).join(' · ')}
                    {item.frequentClients.length > 3 && (
                      <span className="text-[11px] text-slate-400">
                        {' '}· +{item.frequentClients.length - 3} más
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick action button */}
            <div className="mt-4 pt-3 border-t border-emerald-50">
              <button
                type="button"
                onClick={() => onSelectForCuenta(item)}
                className="min-h-[42px] w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span>Crear Cuenta de Cobro para {item.plate}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Driver Confirmation Modal */}
      {driverToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900">
              ¿Eliminar Vehículo {driverToDelete.plate}?
            </h3>

            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Estás a punto de eliminar el perfil del conductor <strong className="text-slate-900">{driverToDelete.name}</strong> y su vehículo asociado <strong className="text-slate-900">({driverToDelete.plate})</strong> de tu base de datos frecuente.
            </p>

            <div className="mt-3 p-3 bg-rose-50/80 rounded-xl border border-rose-200 text-xs text-rose-800">
              ⚠️ Esta acción no se puede deshacer. Las cuentas de cobro generadas previamente conservarán su información.
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDriverToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteDriverProfile(driverToDelete.id);
                  onRefresh();
                  setDriverToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Sí, Eliminar Registro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
