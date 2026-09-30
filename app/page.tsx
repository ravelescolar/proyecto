'use client';

import dynamic from 'next/dynamic';

const App = dynamic(() => import('../src/App'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-sans">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm font-semibold text-emerald-400">Cargando TRANSPORTES RAVEL...</p>
      </div>
    </div>
  ),
});

export default function Page() {
  return <App />;
}
