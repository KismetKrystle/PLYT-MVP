import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthProvider } from '../lib/auth';
import ProtectedRoute from '../lib/ProtectedRoute';
import './globals.css';

export const metadata: Metadata = {
  title: 'PLYT - Eat & Grow',
  description: 'Connecting farmers and consumers in Bali.',
};

import NavBar from '../components/NavBar';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen">
        <AuthProvider>
          <main className="flex-1">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
