import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import MainNav from '@/components/MainNav';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

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
    <html lang="es" className={inter.variable}>
      <body className="antialiased bg-bg-primary min-h-screen">
        <div className="bg-mesh" aria-hidden="true" />
        <MainNav />
        <main className="lg:ml-56 min-h-screen pt-14">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
