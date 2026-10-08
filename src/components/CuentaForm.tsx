import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Car,
  User,
  CreditCard,
  Plus,
  Trash2,
  Copy,
  RotateCcw,
  Sparkles,
  Search,
  Check,
  AlertCircle,
  Hash,
  Building,
  FileText,
  Clock
} from 'lucide-react';
import { CuentaDeCobro, ServiceItem, PaymentData, DriverProfile, AppSettings } from '../types';
import { formatCurrency, numberToWords } from '../utils/numberToWords';
import { COLOMBIAN_BANKS, ACCOUNT_TYPES, formatPlate } from '../utils/colombianFormatters';
import { generatePdfFileName } from '../utils/pdfExport';
import {
  loadDriverProfiles,
  findDriverByPlate,
  loadSettings,
  getNextConsecutive,
  formatConsecutive,
  loadCuentas
} from '../utils/storage';
import { RavelLogo } from './RavelLogo';

interface CuentaFormProps {
  onGenerate: (cuenta: CuentaDeCobro) => void;
  onLoadPrevious?: () => void;
  initialCuenta?: CuentaDeCobro | null;
  settings?: AppSettings;
  driverProfiles?: DriverProfile[];
}

export const CuentaForm: React.FC<CuentaFormProps> = ({
  onGenerate,
  onLoadPrevious,
  initialCuenta,
  settings: propSettings,
  driverProfiles: propDrivers,
}) => {
  const settings = propSettings || loadSettings();
  const driverProfiles = propDrivers || loadDriverProfiles();

  // Form State
  const [consecutiveNum, setConsecutiveNum] = useState<number>(() => {
    if (initialCuenta) return initialCuenta.consecutive;
    return getNextConsecutive().number;
  });
  const [isCustomConsecutive, setIsCustomConsecutive] = useState(false);
  const [date, setDate] = useState<string>(() => {
    if (initialCuenta) return initialCuenta.date;
    return new Date().toISOString().split('T')[0];
  });
  const [paymentDueDate, setPaymentDueDate] = useState<string>(() => {
    if (initialCuenta?.paymentDueDate) return initialCuenta.paymentDueDate;
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
  });
  const [city, setCity] = useState<string>(() => initialCuenta?.city || settings.defaultCity || 'Barranquilla');

  // Vehicle & Driver
  const [vehiclePlate, setVehiclePlate] = useState<string>(initialCuenta?.vehiclePlate || '');
  const [driverName, setDriverName] = useState<string>(initialCuenta?.driverName || '');
  const [driverId, setDriverId] = useState<string>(initialCuenta?.driverId || '');
  const [driverPhone, setDriverPhone] = useState<string>(initialCuenta?.driverPhone || '');

  // Autocomplete UI state
  const [plateSuggestions, setPlateSuggestions] = useState<DriverProfile[]>([]);
  const [showPlateDropdown, setShowPlateDropdown] = useState(false);
  const [availableClients, setAvailableClients] = useState<string[]>([]);

  // Services
  const [services, setServices] = useState<ServiceItem[]>(() => {
    if (initialCuenta && initialCuenta.services.length > 0) {
      return initialCuenta.services;
    }
    const today = new Date().toISOString().split('T')[0];
    return [
      {
        id: 'srv-1',
        date: today,
        plate: '',
        clientDetail: '',
        value: 0,
      },
    ];
  });

  // Concept
  const [legalConcept, setLegalConcept] = useState<string>(
    initialCuenta?.legalConcept || settings.defaultConcept
  );

  // Payment Data
  const [paymentData, setPaymentData] = useState<PaymentData>(() => {
    if (initialCuenta) return initialCuenta.paymentData;
    return {
      bank: 'Bancolombia',
      accountNumber: '',
      accountType: 'Ahorros',
      accountHolder: '',
      identification: '',
    };
  });

  // Error validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync initialCuenta or settings consecutive when props change
  useEffect(() => {
    if (initialCuenta) {
      setConsecutiveNum(initialCuenta.consecutive);
      setDate(initialCuenta.date);
      setPaymentDueDate(initialCuenta.paymentDueDate || initialCuenta.date);
      setCity(initialCuenta.city);
      setVehiclePlate(initialCuenta.vehiclePlate);
      setDriverName(initialCuenta.driverName);
      setDriverId(initialCuenta.driverId);
      setDriverPhone(initialCuenta.driverPhone || '');
      setServices(initialCuenta.services);
      setLegalConcept(initialCuenta.legalConcept);
      setPaymentData(initialCuenta.paymentData);
    } else if (!isCustomConsecutive && settings.nextConsecutive) {
      setConsecutiveNum(settings.nextConsecutive);
    }
  }, [initialCuenta, settings.nextConsecutive, isCustomConsecutive]);

  // Update plate suggestions on input change
  const handlePlateChange = (val: string) => {
    const formatted = formatPlate(val);
    setVehiclePlate(formatted);

    if (formatted.length >= 2) {
      const clean = formatted.replace(/[^A-Z0-9]/g, '');
      const matches = driverProfiles.filter((p) =>
        p.plate.replace(/[^A-Z0-9]/g, '').includes(clean)
      );
      setPlateSuggestions(matches);
      setShowPlateDropdown(matches.length > 0);
    } else {
      setShowPlateDropdown(false);
    }

    // Update services that have blank plate to match this vehicle plate
    setServices((prev) =>
      prev.map((s) => ({
        ...s,
        plate: s.plate ? s.plate : formatted,
      }))
    );

    // Direct exact match
    const exact = findDriverByPlate(formatted);
    if (exact) {
      applyDriverProfile(exact);
    }
  };

  const applyDriverProfile = (profile: DriverProfile) => {
    setVehiclePlate(profile.plate);
    setDriverName(profile.driverName);
    setDriverId(profile.idNumber);
    if (profile.phone) setDriverPhone(profile.phone);

    // Set payment data
    if (profile.paymentData) {
      setPaymentData({
        bank: profile.paymentData.bank || 'Bancolombia',
        accountNumber: profile.paymentData.accountNumber || '',
        accountType: profile.paymentData.accountType || 'Ahorros',
        accountHolder: profile.paymentData.accountHolder || profile.driverName,
        identification: profile.paymentData.identification || profile.idNumber,
      });
    }

    // Set frequent clients
    if (profile.frequentClients && profile.frequentClients.length > 0) {
      setAvailableClients(profile.frequentClients);
    }

    // Also update any services with empty plates
    setServices((prev) =>
      prev.map((s) => ({
        ...s,
        plate: s.plate || profile.plate,
      }))
    );

    setShowPlateDropdown(false);
  };

  // Keep holder in sync with driver name if untouched
  const handleDriverNameChange = (val: string) => {
    setDriverName(val);
    if (!paymentData.accountHolder || paymentData.accountHolder === driverName) {
      setPaymentData((prev) => ({ ...prev, accountHolder: val }));
    }
  };

  const handleDriverIdChange = (val: string) => {
    setDriverId(val);
    if (!paymentData.identification || paymentData.identification === driverId) {
      setPaymentData((prev) => ({ ...prev, identification: val }));
    }
  };

  // Services Management
  const addServiceRow = () => {
    const lastDate = services.length > 0 ? services[services.length - 1].date : date;
    const newRow: ServiceItem = {
      id: `srv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      date: lastDate,
      plate: vehiclePlate,
      clientDetail: '',
      value: 0,
    };
    setServices([...services, newRow]);
  };

  const updateServiceRow = (id: string, field: keyof ServiceItem, value: any) => {
    setServices((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const removeServiceRow = (id: string) => {
    if (services.length <= 1) {
      setServices([
        {
          id: `srv-${Date.now()}`,
          date,
          plate: vehiclePlate,
          clientDetail: '',
          value: 0,
        },
      ]);
      return;
    }
    setServices(services.filter((item) => item.id !== id));
  };

  const duplicateServiceRow = (row: ServiceItem) => {
    const newRow: ServiceItem = {
      ...row,
      id: `srv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    setServices([...services, newRow]);
  };

  // Calculations
  const totalAmount = services.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const amountWords = numberToWords(totalAmount);

  // Validation
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!driverName.trim()) {
      errs.driverName = 'El nombre del conductor es requerido';
    }
    if (!driverId.trim()) {
      errs.driverId = 'La cédula es requerida';
    }
    if (!vehiclePlate.trim()) {
      errs.vehiclePlate = 'La placa del vehículo es requerida';
    }
    if (!paymentDueDate.trim()) {
      errs.paymentDueDate = 'La fecha pactada de pago es obligatoria';
    }
    if (services.length === 0) {
      errs.services = 'Debe agregar al menos un servicio';
    } else {
      const hasValidRow = services.some((s) => s.value > 0);
      if (!hasValidRow) {
        errs.services = 'Al menos un servicio debe tener un valor mayor a $0';
      }
    }
    if (!paymentData.bank) {
      errs.bank = 'Seleccione una entidad bancaria';
    }
    if (!paymentData.accountNumber.trim()) {
      errs.accountNumber = 'Ingrese el número de cuenta';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      window.scrollTo({ top: 100, behavior: 'smooth' });
      return;
    }

    const formattedConsecutive = formatConsecutive(settings.prefix, consecutiveNum);

    const cuenta: CuentaDeCobro = {
      id: initialCuenta?.id || `cc-${consecutiveNum}-${Date.now()}`,
      consecutive: consecutiveNum,
      consecutiveFormatted: formattedConsecutive,
      date,
      paymentDueDate: paymentDueDate.trim(),
      city,
      companyName: settings.companyName,
      companyNit: settings.companyNit,
      driverName: driverName.trim(),
      driverId: driverId.trim(),
      vehiclePlate: vehiclePlate.trim().toUpperCase(),
      driverPhone: driverPhone.trim(),
      services: services.map((s) => ({
        ...s,
        plate: s.plate ? s.plate.toUpperCase() : vehiclePlate.trim().toUpperCase(),
        value: Number(s.value) || 0,
      })),
      totalAmount,
      amountInWords: amountWords,
      legalConcept: legalConcept.trim(),
      paymentData,
      companyLogoUrl: settings.companyLogoUrl,
      status: initialCuenta?.status || 'emitida',
      createdAt: initialCuenta?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onGenerate(cuenta);
  };

  const handleReset = () => {
    const next = getNextConsecutive();
    setConsecutiveNum(next.number);
    setDate(new Date().toISOString().split('T')[0]);
    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + 5);
    setPaymentDueDate(defaultDue.toISOString().split('T')[0]);
    setVehiclePlate('');
    setDriverName('');
    setDriverId('');
    setDriverPhone('');
    setServices([
      {
        id: `srv-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        plate: '',
        clientDetail: '',
        value: 0,
      },
    ]);
    setPaymentData({
      bank: 'Bancolombia',
      accountNumber: '',
      accountType: 'Ahorros',
      accountHolder: '',
      identification: '',
    });
    setErrors({});
  };

  const loadLatestCuenta = () => {
    const list = loadCuentas();
    if (list.length === 0) {
      setErrors({ form: 'Aún no hay cuentas anteriores guardadas en el historial.' });
      setTimeout(() => setErrors({}), 4000);
      return;
    }
    const latest = list[0];
    setVehiclePlate(latest.vehiclePlate);
    setDriverName(latest.driverName);
    setDriverId(latest.driverId);
    setDriverPhone(latest.driverPhone || '');
    setPaymentDueDate(latest.paymentDueDate || date);
    setCity(latest.city);
    setPaymentData(latest.paymentData);
    setServices(
      latest.services.map((s) => ({
        ...s,
        id: `srv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        date,
      }))
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Banner - Light Green & Crisp White with Orange Accents and Official Logo */}
      <div className="bg-gradient-to-r from-emerald-50 via-white to-emerald-50/60 p-4 sm:p-5 rounded-2xl shadow-xs border border-emerald-200/90 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <RavelLogo
            variant="badge"
            size="sm"
            showSlogan={true}
            customLogoUrl={settings.companyLogoUrl}
            className="shrink-0"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-emerald-950 font-serif truncate">
                {settings.companyName}
              </h2>
              <span className="text-xs text-orange-800 font-mono font-bold">
                · NIT {settings.companyNit}
              </span>
            </div>
            <p className="text-xs text-emerald-900/70 mt-0.5">
              donde quieras llegar · Generador Oficial de Cuentas de Cobro
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={loadLatestCuenta}
            className="flex-1 md:flex-initial min-h-[40px] flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-900 bg-emerald-100/70 hover:bg-emerald-200/80 border border-emerald-300 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            title="Carga datos de la última cuenta creada"
          >
            <RotateCcw className="w-3.5 h-3.5 text-orange-600 shrink-0" />
            <span>Cargar Última Cuenta</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="min-h-[40px] px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            Limpiar
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Header / Document Details */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-emerald-100 shadow-xs">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-emerald-50">
            <Hash className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
              1. Datos de la Cuenta de Cobro
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Consecutive */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Consecutivo:</span>
                <button
                  type="button"
                  onClick={() => setIsCustomConsecutive(!isCustomConsecutive)}
                  className="text-[10px] text-orange-600 font-semibold hover:underline"
                >
                  {isCustomConsecutive ? 'Bloquear' : 'Editar'}
                </button>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  readOnly={!isCustomConsecutive}
                  value={consecutiveNum}
                  onChange={(e) => setConsecutiveNum(parseInt(e.target.value, 10) || 1)}
                  className={`w-full px-3 py-2 text-sm font-bold font-mono-numbers rounded-lg border ${
                    isCustomConsecutive
                      ? 'border-orange-400 bg-orange-50/50 focus:ring-2 focus:ring-orange-500'
                      : 'border-emerald-100 bg-emerald-50/40 text-emerald-950 cursor-not-allowed'
                  }`}
                />
                <span className="absolute right-2.5 top-2.5 text-[11px] font-bold text-emerald-800 font-mono-numbers">
                  {formatConsecutive(settings.prefix, consecutiveNum)}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Automático</p>
            </div>

            {/* Emission Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fecha de Emisión:
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Emisión de la cuenta</p>
            </div>

            {/* Fecha Pactada de Pago (Requested by user) */}
            <div>
              <label className="block text-xs font-bold text-emerald-950 mb-1 flex items-center gap-1">
                <span>Fecha Pactada de Pago:</span>
                <span className="text-orange-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={paymentDueDate}
                  onChange={(e) => setPaymentDueDate(e.target.value)}
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${
                    errors.paymentDueDate
                      ? 'border-rose-400 bg-rose-50/50'
                      : 'border-orange-300 bg-orange-50/30 focus:ring-2 focus:ring-orange-500 focus:border-orange-500'
                  }`}
                />
              </div>
              <p className="text-[10px] text-orange-700/90 font-medium mt-1">
                Para archivo PDF & pago
              </p>
              {errors.paymentDueDate && (
                <p className="text-[11px] text-rose-500 mt-0.5">{errors.paymentDueDate}</p>
              )}
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ciudad:
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Barranquilla"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Total Preview Badge */}
            <div className="sm:col-span-2 lg:col-span-1 bg-gradient-to-br from-emerald-50 to-emerald-100/60 border border-emerald-200 rounded-xl p-3 flex sm:flex-col items-center sm:items-stretch justify-between">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-between gap-1.5">
                <span>Total</span>
                <span className="w-2 h-2 rounded-full bg-orange-500 hidden sm:inline-block"></span>
              </span>
              <div className="text-base font-black text-emerald-950 font-mono-numbers tabular-nums">
                {formatCurrency(totalAmount)}
              </div>
              <span className="text-[10px] text-emerald-700 truncate font-medium hidden sm:block">
                {services.length} {services.length === 1 ? 'servicio' : 'servicios'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Conductor & Placa (With Autocomplete) */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-emerald-100 shadow-xs relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-3 mb-4 border-b border-emerald-50">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-emerald-600 shrink-0" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                2. Vehículo y Conductor (Acreedor)
              </h3>
            </div>
            <span className="text-[11px] text-orange-800 font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-orange-500 shrink-0" />
              <span>Autocompletado activo por placa</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Placa with Autocomplete Dropdown */}
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Placa del Vehículo: <span className="text-orange-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Ej: WDF-452"
                  maxLength={7}
                  value={vehiclePlate}
                  onChange={(e) => handlePlateChange(e.target.value)}
                  onFocus={() => {
                    if (driverProfiles.length > 0) setShowPlateDropdown(true);
                  }}
                  className={`w-full px-3 py-2 text-sm font-bold font-mono-numbers uppercase tracking-wider rounded-lg border ${
                    errors.vehiclePlate
                      ? 'border-rose-400 bg-rose-50/30'
                      : 'border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                  }`}
                />
                <Car className="w-4 h-4 text-emerald-600 absolute right-3 top-2.5" />
              </div>
              {errors.vehiclePlate && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.vehiclePlate}</p>
              )}

              {/* Suggestions dropdown */}
              {showPlateDropdown && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-emerald-200 rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto">
                  <div className="p-2 text-[10px] font-bold text-emerald-800 bg-emerald-50 uppercase tracking-wider border-b border-emerald-100 flex justify-between items-center">
                    <span>Vehículos guardados</span>
                    <button
                      type="button"
                      onClick={() => setShowPlateDropdown(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      Cerrar
                    </button>
                  </div>
                  {(plateSuggestions.length > 0 ? plateSuggestions : driverProfiles).map((prof) => (
                    <button
                      key={prof.id}
                      type="button"
                      onClick={() => applyDriverProfile(prof)}
                      className="w-full text-left px-3 py-2 hover:bg-emerald-50 transition-colors flex items-center justify-between border-b border-slate-50 last:border-none"
                    >
                      <div>
                        <div className="text-xs font-bold text-emerald-950 font-mono-numbers">
                          {prof.plate}
                        </div>
                        <div className="text-[11px] text-slate-600 truncate max-w-[180px]">
                          {prof.driverName}
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono-numbers">
                        CC: {prof.idNumber}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Driver Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre Completo del Conductor: <span className="text-orange-600">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej: CARLOS ALBERTO MARTÍNEZ"
                value={driverName}
                onChange={(e) => handleDriverNameChange(e.target.value)}
                className={`w-full px-3 py-2 text-sm uppercase rounded-lg border ${
                  errors.driverName
                    ? 'border-rose-400 bg-rose-50/30'
                    : 'border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                }`}
              />
              {errors.driverName && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.driverName}</p>
              )}
            </div>

            {/* Cédula */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cédula de Ciudadanía: <span className="text-orange-600">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej: 72.345.890"
                value={driverId}
                onChange={(e) => handleDriverIdChange(e.target.value)}
                className={`w-full px-3 py-2 text-sm font-mono-numbers rounded-lg border ${
                  errors.driverId
                    ? 'border-rose-400 bg-rose-50/30'
                    : 'border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                }`}
              />
              {errors.driverId && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.driverId}</p>
              )}
            </div>

            {/* Celular */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Teléfono / Celular (Opcional):
              </label>
              <input
                type="tel"
                placeholder="Ej: 3012345678"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono-numbers rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Para enviar soporte por WhatsApp</p>
            </div>
          </div>
        </div>

        {/* Section 3: Dynamic Services Table */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-emerald-100 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-emerald-50">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                3. Relación de Servicios de Transporte
              </h3>
            </div>
            <button
              type="button"
              onClick={addServiceRow}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5 text-orange-300" />
              Agregar Fila de Servicio
            </button>
          </div>

          {errors.services && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errors.services}</span>
            </div>
          )}

          {/* Quick Client Suggestions Chips */}
          {availableClients.length > 0 && (
            <div className="mb-4 p-3 bg-emerald-50/50 border border-emerald-200/80 rounded-xl">
              <span className="text-[11px] font-bold text-emerald-900 block mb-1.5">
                Clientes frecuentes de este vehículo (haz clic para insertar en la última fila):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {availableClients.map((client, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      const last = services[services.length - 1];
                      if (last) {
                        updateServiceRow(last.id, 'clientDetail', client);
                      }
                    }}
                    className="text-xs px-2.5 py-1 bg-white hover:bg-emerald-100/70 border border-emerald-200 rounded-md text-emerald-900 transition-colors cursor-pointer text-left font-medium"
                  >
                    + {client}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mobile & Small Tablet Cards View (< md) */}
          <div className="md:hidden space-y-3">
            {services.map((row, index) => (
              <div
                key={row.id}
                className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/20 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-emerald-100/80 pb-2">
                  <span className="text-xs font-bold text-emerald-950 font-mono-numbers">
                    Servicio #{index + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => duplicateServiceRow(row)}
                      title="Duplicar servicio"
                      className="min-h-[36px] px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100/70 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Duplicar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeServiceRow(row.id)}
                      title="Eliminar servicio"
                      className="min-h-[36px] px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Fecha Servicio:
                    </label>
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => updateServiceRow(row.id, 'date', e.target.value)}
                      className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Placa:
                    </label>
                    <input
                      type="text"
                      placeholder={vehiclePlate || 'ABC-123'}
                      value={row.plate}
                      onChange={(e) =>
                        updateServiceRow(row.id, 'plate', formatPlate(e.target.value))
                      }
                      className="w-full px-2.5 py-2 text-xs text-center font-bold font-mono-numbers uppercase rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Cliente / Recorrido / Detalle:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Colegio San José - Ruta Escolar"
                    value={row.clientDetail}
                    onChange={(e) => updateServiceRow(row.id, 'clientDetail', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Valor del Servicio ($ COP):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-slate-400 font-mono-numbers">
                      $
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="0"
                      value={row.value === 0 ? '' : row.value}
                      onChange={(e) =>
                        updateServiceRow(row.id, 'value', parseFloat(e.target.value) || 0)
                      }
                      className="w-full pl-7 pr-3 py-2 text-sm text-right font-mono-numbers tabular-nums font-bold rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addServiceRow}
              className="w-full min-h-[44px] flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-dashed border-emerald-300 rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-orange-600" />
              <span>Agregar Otro Servicio</span>
            </button>

            <div className="p-3.5 rounded-xl bg-emerald-50/90 border border-emerald-200 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                Total Cuenta:
              </span>
              <span className="text-base font-black font-mono-numbers tabular-nums text-emerald-950">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>

          {/* Desktop Services Table (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[680px]">
              <thead>
                <tr className="bg-emerald-50/60 border-b border-emerald-100 text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
                  <th className="py-2.5 px-2 w-10 text-center">#</th>
                  <th className="py-2.5 px-2 w-36">Fecha Servicio</th>
                  <th className="py-2.5 px-2 w-28 text-center">Placa</th>
                  <th className="py-2.5 px-2">Cliente / Recorrido / Detalle</th>
                  <th className="py-2.5 px-2 w-36 text-right">Valor ($ COP)</th>
                  <th className="py-2.5 px-2 w-20 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50/60 text-sm">
                {services.map((row, index) => (
                  <tr key={row.id} className="group hover:bg-emerald-50/30 transition-colors">
                    <td className="py-2 px-2 text-center text-xs font-mono-numbers tabular-nums text-slate-400">
                      {index + 1}
                    </td>

                    {/* Date */}
                    <td className="py-2 px-2">
                      <input
                        type="date"
                        value={row.date}
                        onChange={(e) => updateServiceRow(row.id, 'date', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-200 bg-white focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>

                    {/* Plate */}
                    <td className="py-2 px-2 text-center">
                      <input
                        type="text"
                        placeholder={vehiclePlate || 'ABC-123'}
                        value={row.plate}
                        onChange={(e) =>
                          updateServiceRow(row.id, 'plate', formatPlate(e.target.value))
                        }
                        className="w-full px-2 py-1.5 text-xs text-center font-bold font-mono-numbers uppercase rounded-md border border-slate-200 bg-white focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>

                    {/* Client / Detail */}
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        placeholder="Ej: Colegio San José - Ruta Escolar Primaria"
                        value={row.clientDetail}
                        onChange={(e) => updateServiceRow(row.id, 'clientDetail', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-200 bg-white focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>

                    {/* Value */}
                    <td className="py-2 px-2 text-right">
                      <div className="relative">
                        <span className="absolute left-2 top-1.5 text-xs text-slate-400 font-mono-numbers">
                          $
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          placeholder="0"
                          value={row.value === 0 ? '' : row.value}
                          onChange={(e) =>
                            updateServiceRow(row.id, 'value', parseFloat(e.target.value) || 0)
                          }
                          className="w-full pl-6 pr-2 py-1.5 text-xs text-right font-mono-numbers tabular-nums font-semibold rounded-md border border-slate-200 bg-white focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-2 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => duplicateServiceRow(row)}
                          title="Duplicar fila"
                          className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeServiceRow(row.id)}
                          title="Eliminar fila"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-emerald-200 bg-emerald-50/80 font-bold">
                  <td colSpan={4} className="py-3 px-4 text-right text-xs uppercase tracking-wider text-emerald-950">
                    TOTAL CUENTA DE COBRO:
                  </td>
                  <td className="py-3 px-2 text-right text-base font-black font-mono-numbers tabular-nums text-emerald-950">
                    {formatCurrency(totalAmount)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Amount in Words Display */}
          <div className="mt-3 p-3 bg-emerald-50/40 border border-emerald-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
            <span className="font-bold text-emerald-800 uppercase text-[10px] tracking-wider shrink-0">
              Total en Letras:
            </span>
            <span className="font-bold text-emerald-950 sm:text-right">{amountWords}</span>
          </div>

          {/* Concept text input */}
          <div className="mt-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Concepto Legal del Cobro:
            </label>
            <textarea
              rows={2}
              value={legalConcept}
              onChange={(e) => setLegalConcept(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Section 4: Payment Data */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-emerald-100 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-emerald-50">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                4. Información Bancaria para Pago
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Se guarda automáticamente con el perfil del conductor
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Bank */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Entidad Bancaria: <span className="text-orange-600">*</span>
              </label>
              <select
                value={paymentData.bank}
                onChange={(e) => setPaymentData({ ...paymentData, bank: e.target.value })}
                className={`w-full px-3 py-2 text-sm rounded-lg border ${
                  errors.bank
                    ? 'border-rose-400 bg-rose-50/30'
                    : 'border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                }`}
              >
                {COLOMBIAN_BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Account Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipo de Cuenta:
              </label>
              <select
                value={paymentData.accountType}
                onChange={(e) =>
                  setPaymentData({
                    ...paymentData,
                    accountType: e.target.value as PaymentData['accountType'],
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Account Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Número de Cuenta: <span className="text-orange-600">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej: 459-823410-12"
                value={paymentData.accountNumber}
                onChange={(e) => setPaymentData({ ...paymentData, accountNumber: e.target.value })}
                className={`w-full px-3 py-2 text-sm font-mono-numbers rounded-lg border ${
                  errors.accountNumber
                    ? 'border-rose-400 bg-rose-50/30'
                    : 'border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                }`}
              />
              {errors.accountNumber && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.accountNumber}</p>
              )}
            </div>

            {/* Titular */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Titular de la Cuenta:
              </label>
              <input
                type="text"
                value={paymentData.accountHolder}
                onChange={(e) => setPaymentData({ ...paymentData, accountHolder: e.target.value })}
                placeholder={driverName || 'Nombre del titular'}
                className="w-full px-3 py-2 text-sm uppercase rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Identification of holder */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cédula / NIT del Titular:
              </label>
              <input
                type="text"
                value={paymentData.identification}
                onChange={(e) => setPaymentData({ ...paymentData, identification: e.target.value })}
                placeholder={driverId || 'Cédula del titular'}
                className="w-full px-3 py-2 text-sm font-mono-numbers rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Live Preview of PDF file name structure */}
          <div className="mt-4 p-3 bg-gradient-to-r from-orange-50/80 via-emerald-50/50 to-white border border-orange-200/90 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <div className="flex items-center gap-1.5 font-bold text-emerald-950 uppercase tracking-wide">
                <FileText className="w-4 h-4 text-orange-600" />
                <span>Estructura del nombre del archivo PDF al descargar:</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                [Día-Mes-Año de pago]_[Cédula beneficiario]_[Nombre beneficiario].pdf
              </p>
            </div>
            <div className="font-mono text-xs font-bold text-orange-950 bg-white px-3 py-1.5 rounded-lg border border-orange-300 shadow-xs break-all">
              {generatePdfFileName(
                paymentDueDate,
                paymentData.identification || driverId,
                paymentData.accountHolder || driverName
              )}
            </div>
          </div>
        </div>

        {/* Form Actions Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-emerald-100 shadow-xs">
          <div className="text-xs text-slate-500 text-center sm:text-left">
            Al hacer clic en generar, la cuenta de cobro y los datos del conductor se guardarán en Firebase Cloud Firestore.
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto justify-end shrink-0">
            <button
              type="button"
              onClick={handleReset}
              className="min-h-[44px] px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar / Limpiar
            </button>

            {/* Main Action Button - Orange with white text */}
            <button
              type="submit"
              className="min-h-[44px] w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-extrabold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-md hover:shadow-orange-500/25 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>Generar Cuenta de Cobro</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
