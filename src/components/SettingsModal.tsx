import React, { useState } from 'react';
import {
  Settings,
  X,
  Save,
  Download,
  Upload,
  Check,
  Building,
  Hash,
  Image as ImageIcon,
  RotateCcw
} from 'lucide-react';
import { AppSettings } from '../types';
import { loadSettings, saveSettings, exportAllData, importAllData } from '../utils/storage';
import { RavelLogo } from './RavelLogo';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsUpdated: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsUpdated,
}) => {
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setSettings(loadSettings());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings(settings);
    setSaveSuccess(true);
    onSettingsUpdated();
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleExportBackup = () => {
    const data = exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_Cuentas_Cobro_TRANSPORTES_RAVEL_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importAllData(content);
      if (success) {
        setImportStatus('¡Datos restaurados con éxito!');
        setSettings(loadSettings());
        onSettingsUpdated();
        setTimeout(() => setImportStatus(null), 3000);
      } else {
        setImportStatus('Error: El archivo no tiene un formato válido.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/40 p-4 backdrop-blur-xs no-print">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-emerald-200">
        <div className="flex items-center justify-between pb-4 border-b border-emerald-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-800">
              <Settings className="w-5 h-5 text-emerald-700" />
            </div>
            <h3 className="text-lg font-bold text-emerald-950">Configuración del Sistema</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-5">
          {/* Logo Corporativo */}
          <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-900">
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                Logotipo Corporativo (RAVEL - donde quieras llegar)
              </div>
              {settings.companyLogoUrl && (
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, companyLogoUrl: undefined })}
                  className="text-[11px] text-orange-600 hover:underline flex items-center gap-1 font-semibold"
                >
                  <RotateCcw className="w-3 h-3" />
                  Restaurar logotipo oficial SVG
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3 rounded-lg border border-emerald-100">
              <RavelLogo
                variant="badge"
                size="md"
                showSlogan={true}
                customLogoUrl={settings.companyLogoUrl}
                className="shrink-0"
              />
              <div className="text-xs space-y-2 w-full">
                <p className="text-slate-600">
                  Este logotipo aparece en el encabezado de la aplicación y en el documento formal de la cuenta de cobro en PDF.
                </p>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5 text-emerald-700" />
                    Subir archivo de imagen (JPG / PNG)
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const res = ev.target?.result as string;
                            setSettings({ ...settings, companyLogoUrl: res });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Consecutivo settings */}
          <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-900">
              <Hash className="w-4 h-4 text-orange-500" />
              Consecutivo Automático
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Prefijo:</label>
                <input
                  type="text"
                  value={settings.prefix}
                  onChange={(e) => setSettings({ ...settings, prefix: e.target.value })}
                  placeholder="CC-"
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">
                  Próximo Número Consecutivo:
                </label>
                <input
                  type="number"
                  min="1"
                  value={settings.nextConsecutive}
                  onChange={(e) =>
                    setSettings({ ...settings, nextConsecutive: parseInt(e.target.value, 10) || 1 })
                  }
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 bg-white"
                />
              </div>
            </div>
            <p className="text-[11px] text-emerald-800/70">
              Ejemplo de formato: {settings.prefix}
              {settings.nextConsecutive.toString().padStart(4, '0')}
            </p>
          </div>

          {/* Empresa Fija */}
          <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-900">
              <Building className="w-4 h-4 text-emerald-600" />
              Datos Fijos de la Empresa (TRANSPORTES RAVEL)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Razón Social:</label>
                <input
                  type="text"
                  value={settings.companyName}
                  onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">NIT:</label>
                <input
                  type="text"
                  value={settings.companyNit}
                  onChange={(e) => setSettings({ ...settings, companyNit: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Dirección:</label>
                <input
                  type="text"
                  value={settings.companyAddress}
                  onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Ciudad Predeterminada:</label>
                <input
                  type="text"
                  value={settings.defaultCity}
                  onChange={(e) => setSettings({ ...settings, defaultCity: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Default Concept text */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Concepto Legal Predeterminado:
            </label>
            <textarea
              rows={2}
              value={settings.defaultConcept}
              onChange={(e) => setSettings({ ...settings, defaultConcept: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Backup & Restore */}
          <div className="border-t border-slate-100 pt-4">
            <span className="text-xs font-bold text-emerald-950 block mb-2 uppercase tracking-wider">
              Copia de Seguridad y Migración
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleExportBackup}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700" />
                Descargar Copia de Seguridad (.json)
              </button>

              <label className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-emerald-700" />
                Restaurar Copia (.json)
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>
            </div>
            {importStatus && (
              <p className="text-xs font-medium text-emerald-700 mt-2">{importStatus}</p>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {saveSuccess ? (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <Check className="w-4 h-4" />
                Configuración guardada
              </span>
            ) : (
              <span></span>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cerrar
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg shadow-sm"
              >
                <Save className="w-4 h-4 text-white" />
                Guardar Cambios
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
