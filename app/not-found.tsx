import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4 font-sans">
      <div className="text-center max-w-md">
        <h2 className="text-3xl font-extrabold text-emerald-400 mb-2">404</h2>
        <h3 className="text-xl font-bold mb-2">Página no encontrada</h3>
        <p className="text-slate-400 text-sm mb-6">
          La página solicitada no está disponible o ha cambiado de ubicación.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-emerald-700/20"
        >
          Volver al Portal
        </Link>
      </div>
    </div>
  );
}
