import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cuentas de Cobro - Transportes Ravel',
  description: 'Sistema para creación, gestión, autocompletado y exportación en PDF de cuentas de cobro para Transportes Ravel.',
  openGraph: {
    title: 'Cuentas de Cobro - Transportes Ravel',
    description: 'Sistema para creación, gestión, autocompletado y exportación en PDF de cuentas de cobro para Transportes Ravel.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cuentas de Cobro - Transportes Ravel',
    description: 'Sistema para creación, gestión, autocompletado y exportación en PDF de cuentas de cobro para Transportes Ravel.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#f8faf8] text-slate-800 antialiased font-sans selection:bg-emerald-200 selection:text-emerald-950">
        {children}
      </body>
    </html>
  );
}
