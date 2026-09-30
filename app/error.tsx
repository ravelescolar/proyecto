'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4 font-sans">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold text-rose-400 mb-2">Algo salió mal</h2>
        <p className="text-slate-400 text-sm mb-6">
          Ocurrió un inconveniente al cargar esta sección. Puedes reintentar la acción.
        </p>
        <button
          onClick={() => reset()}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors cursor-pointer shadow-lg shadow-emerald-700/20"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
