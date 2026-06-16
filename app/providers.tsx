'use client';

import { type ReactNode } from 'react';
import { ThemeProvider } from '@/lib/theme-context';
import { I18nProvider } from '@/lib/i18n';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        {children}
      </I18nProvider>
    </ThemeProvider>
  );
}
