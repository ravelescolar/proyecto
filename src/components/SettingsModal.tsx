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
  RotateCcw,
  ShieldCheck,
  UserCheck,
  Plus,
  Trash2,
  Copy
} from 'lucide-react';
import { AdminMember, AppSettings } from '../types';
import {
  loadSettings,
  saveSettings,
  exportAllData,
  importAllData,
  loadAdmins,
  addAdminMember,
  removeAdminMember,
  PRIMARY_ADMIN_EMAIL
} from '../utils/storage';
import { RavelLogo } from './RavelLogo';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsUpdated: () => void;
  isAdmin?: boolean;
  userUid?: string;
  userEmail?: string | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsUpdated,
  isAdmin = false,
  userUid = '',
  userEmail = '',
}) => {
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [admins, setAdmins] = useState<AdminMember[]>(loadAdmins());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [logoUploadStatus, setLogoUploadStatus] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [copiedUid, setCopiedUid] = useState(false);

  // Compress uploaded logo image so its Base64 data URL always fits safely inside Firestore's limits
  const compressImageFileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('No se pudo leer el archivo de imagen.'));
      reader.onload = (ev) => {
        const rawDataUrl = ev.target?.result as string;
        if (!rawDataUrl) {
          reject(new Error('Imagen vacía.'));
          return;
        }
        const img = new Image();
        img.onerror = () => {
          // If browser cannot decode into canvas (e.g. SVG), return raw if within limit
          if (rawDataUrl.length <= 450000) {
            resolve(rawDataUrl);
          } else {
            reject(new Error('El archivo es demasiado grande. Usa una imagen JPG o PNG.'));
          }
        };
        img.onload = () => {
          const maxWidth = 420;
          const maxHeight = 180;
          let { width, height } = img;
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.max(1, Math.round(width * ratio));
            height = Math.max(1, Math.round(height * ratio));
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawDataUrl.slice(0, 450000));
            return;
          }
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Try PNG first to preserve transparency
          let output = canvas.toDataURL('image/png');
          if (output.length > 180000) {
            // Fallback to WebP (preserves transparency and is much smaller) or JPEG
            const webpOutput = canvas.toDataURL('image/webp', 0.85);
            if (webpOutput.startsWith('data:image/webp') && webpOutput.length <= 180000) {
              output = webpOutput;
            } else {
              ctx.fillStyle = '#ffffff';
              ctx.globalCompositeOperation = 'destination-over';
              ctx.fillRect(0, 0, width, height);
              output = canvas.toDataURL('image/jpeg', 0.82);
            }
          }
          resolve(output);
        };
        img.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  // New Admin Form (Only for Admins)
  const [newAdminUid, setNewAdminUid] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adminStatusMsg, setAdminStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  React.useEffect(() => {
    if (isOpen) {
      setSettings(loadSettings());
      setAdmins(loadAdmins());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    saveSettings(settings);
    setSaveSuccess(true);
    onSettingsUpdated();
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleCopyUid = () => {
    if (!userUid) return;
    navigator.clipboard.writeText(userUid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminStatusMsg(null);
    try {
      await addAdminMember(newAdminUid, newAdminEmail);
      setNewAdminUid('');
      setNewAdminEmail('');
      setAdmins(loadAdmins());
      setAdminStatusMsg({
        type: 'ok',
        text: 'Cuenta administradora autorizada correctamente.',
      });
    } catch (err: unknown) {
      setAdminStatusMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'No se pudo autorizar el administrador.',
      });
    }
  };

  const handleRemoveAdmin = async (uidToRemove: string) => {
    setAdminStatusMsg(null);
    try {
      await removeAdminMember(uidToRemove);
      setAdmins(loadAdmins());
      setAdminStatusMsg({
        type: 'ok',
        text: 'Permiso de administrador revocado.',
      });
    } catch {
      setAdminStatusMsg({
        type: 'err',
        text: 'Error al revocar administrador.',
      });
    }
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-emerald-950/40 p-0 sm:p-4 backdrop-blur-xs no-print">
      <div className="w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white p-4 sm:p-6 shadow-2xl border border-emerald-200">
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-emerald-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-800">
              <Settings className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-emerald-950">
                {isAdmin ? 'Configuración Corporativa y Roles' : 'Mi Cuenta y Consecutivo Oficial'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isAdmin
                  ? 'Cuenta Administradora (Empresa de Transporte) · Control total del sistema'
                  : 'Cuenta Usuario (Conductor / Contratista) · Emisión de cuentas de cobro'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Role & Account Info Card */}
        <div className="mt-4 p-4 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50/70 via-white to-emerald-50/40 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {isAdmin ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-extrabold bg-orange-100 text-orange-950 border border-orange-300">
                  <ShieldCheck className="w-4 h-4 text-orange-600" />
                  <span>ROL: ADMINISTRADOR (EMPRESA)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-extrabold bg-emerald-100 text-emerald-950 border border-emerald-300">
                  <UserCheck className="w-4 h-4 text-emerald-700" />
                  <span>ROL: USUARIO (CONDUCTOR / ACREEDOR)</span>
                </span>
              )}
              <span className="text-xs font-semibold text-slate-700">{userEmail}</span>
            </div>

            {userUid && (
              <button
                type="button"
                onClick={handleCopyUid}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-md cursor-pointer transition-colors"
                title="Copiar código UID de tu cuenta"
              >
                <Copy className="w-3 h-3 text-emerald-600" />
                <span>UID: {userUid.slice(0, 10)}...</span>
                {copiedUid && <span className="text-emerald-700 font-sans font-bold">¡Copiado!</span>}
              </button>
            )}
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {isAdmin
              ? 'Como cuenta Administradora de TRANSPORTES RAVEL puedes visualizar, aprobar, marcar como pagadas, editar o anular las cuentas de cobro subidas por todos los usuarios, además de administrar el consecutivo único global.'
              : 'Con tu cuenta de Usuario puedes montar tus cuentas de cobro y consultar tu historial. Cada cuenta recibe automáticamente un número consecutivo único e irrepetible en toda la empresa.'}
          </p>
        </div>

        {/* Admin Management Section (Only visible to Administrators) */}
        {isAdmin && (
          <div className="mt-4 p-4 bg-orange-50/50 border border-orange-200/90 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-950">
                <ShieldCheck className="w-4 h-4 text-orange-600" />
                Cuentas Administradoras Autorizadas (Empresa)
              </div>
            </div>

            <p className="text-xs text-slate-600">
              La cuenta principal <strong>{PRIMARY_ADMIN_EMAIL}</strong> es administradora por defecto. También puedes autorizar otras cuentas de la empresa ingresando su <strong>UID</strong> (disponible en el perfil del usuario) y su correo:
            </p>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-orange-200 text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />
                  <span className="font-bold text-slate-900">{PRIMARY_ADMIN_EMAIL}</span>
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-orange-100 text-orange-900 rounded">
                  Admin Principal
                </span>
              </div>

              {admins.map((adm) => (
                <div
                  key={adm.uid}
                  className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800">{adm.email}</span>
                    <span className="ml-2 font-mono text-[10px] text-slate-400">UID: {adm.uid}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAdmin(adm.uid)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer"
                    title="Revocar permisos de administrador"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
              <input
                type="text"
                placeholder="UID del usuario (ej: k8Lm9...)"
                value={newAdminUid}
                onChange={(e) => setNewAdminUid(e.target.value)}
                className="sm:col-span-2 px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 bg-white"
              />
              <input
                type="email"
                placeholder="correo@empresa.com"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                className="sm:col-span-2 px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
              />
              <button
                type="button"
                onClick={handleAddAdmin}
                className="sm:col-span-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar</span>
              </button>
            </div>

            {adminStatusMsg && (
              <p
                className={`text-xs font-semibold ${
                  adminStatusMsg.type === 'ok' ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {adminStatusMsg.text}
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSave} className="mt-5 space-y-5">
          {/* Logo Corporativo */}
          <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-900">
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                Logotipo Corporativo (RAVEL - donde quieras llegar)
              </div>
              {isAdmin && settings.companyLogoUrl && (
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...settings, companyLogoUrl: undefined };
                    setSettings(updated);
                    saveSettings(updated);
                    onSettingsUpdated();
                    setLogoUploadStatus('Logotipo oficial restaurado y guardado.');
                    setTimeout(() => setLogoUploadStatus(null), 3000);
                  }}
                  className="text-[11px] text-orange-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
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
                  Este logotipo aparece en la página de inicio, en el encabezado de la aplicación y en el documento formal de la cuenta de cobro en PDF.
                </p>
                {isAdmin && (
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5 text-emerald-700" />
                      Subir archivo de imagen (JPG / PNG)
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            setLogoUploadStatus('Optimizando y guardando logotipo...');
                            const compressedDataUrl = await compressImageFileToDataUrl(file);
                            const updated = { ...settings, companyLogoUrl: compressedDataUrl };
                            setSettings(updated);
                            saveSettings(updated);
                            onSettingsUpdated();
                            setLogoUploadStatus('¡Logotipo cargado y guardado en la nube!');
                            setTimeout(() => setLogoUploadStatus(null), 3500);
                          } catch (err) {
                            setLogoUploadStatus(
                              err instanceof Error ? err.message : 'Error al procesar la imagen.'
                            );
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                    {logoUploadStatus && (
                      <span className="text-[11px] font-semibold text-emerald-700">
                        {logoUploadStatus}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Consecutivo settings */}
          <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-900">
              <Hash className="w-4 h-4 text-orange-500" />
              Consecutivo Único Global (Irrepetible)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Prefijo:</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={settings.prefix}
                  onChange={(e) => setSettings({ ...settings, prefix: e.target.value })}
                  placeholder="CC-"
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">
                  Próximo Número Consecutivo Global:
                </label>
                <input
                  type="number"
                  min="1"
                  disabled={!isAdmin}
                  value={settings.nextConsecutive}
                  onChange={(e) =>
                    setSettings({ ...settings, nextConsecutive: parseInt(e.target.value, 10) || 1 })
                  }
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
            </div>
            <p className="text-[11px] text-emerald-800/80">
              Próxima cuenta disponible en el sistema:{' '}
              <strong className="font-mono">
                {settings.prefix}
                {settings.nextConsecutive.toString().padStart(4, '0')}
              </strong>{' '}
              (Se incrementa automáticamente cada vez que cualquier usuario radica una cuenta).
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
                  disabled={!isAdmin}
                  value={settings.companyName}
                  onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">NIT:</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={settings.companyNit}
                  onChange={(e) => setSettings({ ...settings, companyNit: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Dirección:</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={settings.companyAddress}
                  onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Ciudad Predeterminada:</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={settings.defaultCity}
                  onChange={(e) => setSettings({ ...settings, defaultCity: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-500"
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
              disabled={!isAdmin}
              value={settings.defaultConcept}
              onChange={(e) => setSettings({ ...settings, defaultConcept: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>

          {/* Backup & Restore */}
          <div className="border-t border-slate-100 pt-4">
            <span className="text-xs font-bold text-emerald-950 block mb-2 uppercase tracking-wider">
              Copia de Seguridad y Exportación
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleExportBackup}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700" />
                Descargar Copia de Seguridad (.json)
              </button>

              {isAdmin && (
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
              )}
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
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cerrar
              </button>
              {isAdmin && (
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg shadow-sm cursor-pointer"
                >
                  <Save className="w-4 h-4 text-white" />
                  Guardar Cambios
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
