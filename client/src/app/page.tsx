'use client';

import { useAuth } from '../lib/auth';
import LandingChatInterface from '../components/LandingChatInterface';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import AgriDashboard from '../components/AgriDashboard';

export default function Home() {
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
    return <LandingChatInterface />;
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
  return <LandingChatInterface />;
}
