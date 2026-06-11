import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#050B14',
};

export const metadata: Metadata = {
  title: 'FORCH.i ORACLE — Predicciones IA Mundial 2026',
  description:
    'Predicciones deportivas con inteligencia artificial. Analiza partidos del Mundial FIFA 2026 con Groq Llama 3.3 y datos en tiempo real.',
  keywords: [
    'mundial 2026',
    'predicciones',
    'inteligencia artificial',
    'fútbol',
    'Groq',
    'Llama 3.3',
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
        {/* Background layer — subtle radial gradients */}
        <div className="bg-mesh" aria-hidden="true" />
        {/* Content */}
        <main className="relative z-10">
          {children}
        </main>
      </body>
    </html>
  );
}
