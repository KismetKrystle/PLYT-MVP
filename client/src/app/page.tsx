'use client';

import { useAuth } from '../lib/auth';
import LandingChatInterface from '../components/LandingChatInterface';
import AppLayout from '../components/AppLayout';
import AgriDashboard from '../components/AgriDashboard';

import { Suspense } from 'react';

export default function Home() {
  const { user, loading } = useAuth();

  // Show nothing while checking auth to prevent flash
  if (loading) return <div className="min-h-screen bg-white" />;

  // Authenticated View: Main Chat Dashboard inside App Shell
  if (user) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-white" />}>
        <AgriDashboard />
      </Suspense>
    );
  }

  // Guest View: Public Landing Page
  return <LandingChatInterface />;
}
