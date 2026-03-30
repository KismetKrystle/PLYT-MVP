import type { Metadata } from 'next';
import Link from 'next/link';
import { ClerkProvider } from '@clerk/nextjs';
import { AuthProvider } from '../lib/auth';
import ProtectedRoute from '../lib/ProtectedRoute';
import './globals.css';

export const metadata: Metadata = {
  title: 'PLYT - Eat & Grow',
  description: 'Connecting farmers and consumers in Bali.',
};

import NavBar from '../components/NavBar';
import AppLayout from '../components/AppLayout';
import AuthModal from '../components/auth/AuthModal';
import ClerkSessionBridge from '../components/auth/ClerkSessionBridge';

import { LessonProvider } from '../context/LessonContext';
import { CartProvider } from '../context/CartContext';

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {clerkPublishableKey ? <ClerkSessionBridge /> : null}
      <LessonProvider>
        <CartProvider>
          <ProtectedRoute>
            <AppLayout>
              <main className="flex-1 h-full">
                {children}
              </main>
            </AppLayout>
          </ProtectedRoute>
        </CartProvider>
      </LessonProvider>
      <AuthModal />
    </AuthProvider>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen" suppressHydrationWarning>
        {clerkPublishableKey ? (
          <ClerkProvider publishableKey={clerkPublishableKey}>
            <AppProviders>{children}</AppProviders>
          </ClerkProvider>
        ) : (
          <AppProviders>{children}</AppProviders>
        )}
      </body>
    </html>
  );
}
