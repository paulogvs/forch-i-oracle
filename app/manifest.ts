import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FORCH.i ORACLE',
    short_name: 'FORCH.i',
    description: 'Predicciones IA Mundial 2026',
    start_url: '/',
    display: 'standalone',
    background_color: '#06080D',
    theme_color: '#06080D',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
