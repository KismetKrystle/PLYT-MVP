'use client';

import Link from 'next/link';
import { useAuth } from '../lib/auth';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) return null;

  // Authenticated View: Dashboard (Eat vs Grow)
  if (user) {
    return (
      <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] relative">
        {/* Temporary Logout for debugging */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 md:hidden">
          <button onClick={() => window.location.href = '/login'} className="bg-red-500 text-white px-4 py-2 rounded-full shadow-lg text-sm font-bold">
            Force Logout
          </button>
        </div>
        {/* Eat Section */}
        <Link
          href="/eat"
          className="group relative flex-1 bg-green-50 hover:bg-green-100 transition-all duration-500 overflow-hidden flex flex-col items-center justify-center p-8 text-center"
        >
          <div className="z-10 bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-sm group-hover:shadow-md transition-all">
            <h2 className="text-4xl font-bold text-green-800 mb-4">Eat</h2>
            <p className="text-green-700 max-w-md mx-auto mb-6">
              Chat with AI to order fresh, local produce directly from Bali farmers.
            </p>
            <span className="inline-flex items-center text-green-600 font-semibold group-hover:translate-x-1 transition-transform">
              Start Eating <span className="ml-2">→</span>
            </span>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-200/30 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700 pointer-events-none" />
        </Link>

        {/* Grow Section */}
        <Link
          href="/grow"
          className="group relative flex-1 bg-emerald-900 hover:bg-emerald-800 transition-all duration-500 overflow-hidden flex flex-col items-center justify-center p-8 text-center"
        >
          <div className="z-10 bg-black/20 backdrop-blur-sm p-8 rounded-2xl border border-white/10 group-hover:border-white/20 transition-all">
            <h2 className="text-4xl font-bold text-white mb-4">Grow</h2>
            <p className="text-emerald-100 max-w-md mx-auto mb-6">
              Learn to grow your own food or buy smart hydroponic systems.
            </p>
            <span className="inline-flex items-center text-emerald-300 font-semibold group-hover:translate-x-1 transition-transform">
              Start Growing <span className="ml-2">→</span>
            </span>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700 pointer-events-none" />
        </Link>
      </div>
    );
  }

  // Guest View: Public Landing Page
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-white text-center px-4">
      <div className="max-w-3xl space-y-8">
        <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-emerald-600 tracking-tight">
          PLYT
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 font-light leading-relaxed">
          The decentralized food network for Bali. <br />
          <span className="font-normal text-green-700">Eat Fresh. Grow Smart. Own Your Food.</span>
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <Link
            href="/login"
            className="px-8 py-4 bg-green-600 text-white rounded-full font-semibold text-lg hover:bg-green-700 transition shadow-lg hover:shadow-xl hover:-translate-y-1 transform"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="px-8 py-4 bg-white text-green-700 border-2 border-green-100 rounded-full font-semibold text-lg hover:border-green-600 hover:bg-green-50 transition"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
