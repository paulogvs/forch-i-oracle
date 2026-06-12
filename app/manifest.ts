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
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
