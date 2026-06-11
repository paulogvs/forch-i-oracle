import type { Metadata, Viewport } from 'next';
import './globals.css';
import MainNav from '@/components/MainNav';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#050B14',
};

export const metadata: Metadata = {
  title: 'FORCH.i ORACLE — Predicciones IA Mundial 2026',
  description:
    'Predicciones deportivas con inteligencia artificial. Analiza partidos del Mundial FIFA 2026 con Poisson + Elo + xG.',
  keywords: [
    'mundial 2026',
    'predicciones',
    'inteligencia artificial',
    'fútbol',
    'FORCH.i',
  ],
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'FORCH.i ORACLE',
    description: 'Predicciones IA del Mundial FIFA 2026',
    type: 'website',
    images: ['/opengraph.svg'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">
        <div className="bg-mesh" aria-hidden="true" />
        <div className="flex min-h-screen relative">
          <MainNav />
          <main className="flex-1 lg:ml-0 pt-14">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
