'use client';

import { useAuth } from '../lib/auth';
import LandingChatInterface from '../components/LandingChatInterface';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import AgriDashboard from '../components/AgriDashboard';

export default function Home() {
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');

  if (loading) return <div className="min-h-screen bg-white" />;

  // 1. Explicit Landing Request (via Logo or Link)
  if (tab === 'landing') {
    return <LandingChatInterface />;
  }

  // 2. User is Logged In -> Default to Dashboard (Profile/Home)
  //    OR User is Guest but navigating functional tabs
  if (user || (tab && tab !== 'landing')) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-white" />}>
        <AgriDashboard />
      </Suspense>
    );
  }

  // 3. Guest on Root (No Tab) -> Landing Page
  return <LandingChatInterface />;
}
