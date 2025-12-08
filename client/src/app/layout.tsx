import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'PLYT - Eat & Grow',
  description: 'Connecting farmers and consumers in Bali.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-emerald-600">
              PLYT
            </Link>
            <div className="flex gap-6 text-sm font-medium text-gray-600">
              <Link href="/eat" className="hover:text-green-600 transition-colors">Eat</Link>
              <Link href="/grow" className="hover:text-green-600 transition-colors">Grow</Link>
              <Link href="/orders" className="hover:text-green-600 transition-colors">Orders</Link>
              <Link href="/wallet" className="hover:text-green-600 transition-colors">Wallet</Link>
            </div>
            <div className="flex items-center gap-3">
              {/* Placeholder for Auth/Profile */}
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                ME
              </div>
            </div>
          </nav>
        </header>

        <main className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
