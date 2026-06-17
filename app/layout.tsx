import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';
import Providers from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#06080D',
};

export const metadata: Metadata = {
  title: 'FORCH.i ORACLE — Predicciones IA · Mundial 2026',
  description: 'Predicciones deportivas con IA. Poisson + Dixon-Coles + Elo + xG para el Mundial FIFA 2026.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://forch-i-oracle.vercel.app'),
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'FORCH.i ORACLE',
    description: 'Predicciones IA del Mundial FIFA 2026',
    type: 'website',
    images: ['/opengraph.svg'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-canvas text-fg-primary">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
        <Toaster
          theme="dark"
          position="top-right"
          richColors
          toastOptions={{ className: 'surface-elevated !text-fg-primary' }}
        />
      </body>
    </html>
  );
}
