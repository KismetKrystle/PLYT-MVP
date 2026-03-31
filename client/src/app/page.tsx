'use client';

import Link from 'next/link';
import { useAuth } from '../lib/auth';
import LandingChatInterface from '../components/LandingChatInterface';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import AgriDashboard from '../components/AgriDashboard';

function LandingShell() {
  return (
    <div className="relative">
      <LandingChatInterface />
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-20 -translate-x-1/2">
        <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/20 bg-white/85 px-4 py-2 text-xs text-gray-600 shadow-lg backdrop-blur">
          <Link className="underline underline-offset-2 hover:text-green-700" href="/privacy">
            Privacy Policy
          </Link>
          <span aria-hidden="true">|</span>
          <Link className="underline underline-offset-2 hover:text-green-700" href="/terms">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}

function HomeScreen() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');

  useEffect(() => {
    if (!loading && !user && tab && !['landing', 'chat'].includes(tab)) {
      router.replace('/');
    }
  }, [loading, router, tab, user]);

  if (loading) return <div className="min-h-screen bg-white" />;

  // 1. Explicit Landing Request (via Logo or Link)
  if (tab === 'landing') {
    return <LandingShell />;
  }

  // 2. User is Logged In -> Default to Dashboard (Profile/Home)
  if (user || tab === 'chat') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-white" />}>
        <AgriDashboard />
      </Suspense>
    );
  }

  // 3. Guest on Root (No Tab) -> Landing Page
  return <LandingShell />;
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <HomeScreen />
    </Suspense>
  );
}
