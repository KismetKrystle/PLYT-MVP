'use client';

import Link from 'next/link';

export default function Dashboard() {
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
