import type { Metadata } from 'next';
import { Bebas_Neue, Poppins, Space_Mono } from 'next/font/google';
import Navigation from '@/components/Navigation';
import { ToastProvider } from '@/components/Toast';
import './globals.css';

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
});

const poppins = Poppins({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins',
  display: 'swap',
});

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SEMAFORA — Métricas + CRM',
  description: 'Dashboard de campañas ADS (Meta / Google / TikTok) y CRM de clientes.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📊</text></svg>',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${bebasNeue.variable} ${poppins.variable} ${spaceMono.variable}`}
    >
      <body className="flex min-h-screen bg-[var(--bg)]">
        <ToastProvider>
          <Navigation />
          <main className="flex-1 min-w-0 pb-16 md:pb-0">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
