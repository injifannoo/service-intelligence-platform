import { Inter } from 'next/font/google';
import { Navbar } from '@/components/shared/navbar';
import Providers from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'IntelligentService Platform',
  description: 'Ethiopian Service Intelligence Engine',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-50" suppressHydrationWarning>
      <body 
        className={`${inter.className} min-h-full flex flex-col text-slate-900 antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          {/* No inline functions passed from Server Component */}
          <Navbar compareCount={0} />

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>

          <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
            © 2026 IntelligentService Platform. Ethiopian Service Intelligence Engine.
          </footer>
        </Providers>
      </body>
    </html>
  );
}