'use client';

export default function ImpactPage() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Impact Score</h1>

            {/* Main Score Hero */}
            <div className="bg-gradient-to-br from-green-500 to-emerald-700 rounded-3xl p-8 md:p-12 text-white shadow-xl mb-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-12 translate-x-12 pointer-events-none"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="text-center md:text-left">
                        <p className="text-green-100 text-lg font-medium mb-1">Total Impact Points</p>
                        <h2 className="text-6xl md:text-8xl font-bold tracking-tight">850</h2>
                        <span className="inline-block mt-4 px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-sm font-semibold border border-white/30">
                            Top 5% in Bali Region
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-6 md:gap-12">
                        <div className="text-center">
                            <p className="text-3xl font-bold">12.5</p>
                            <p className="text-sm text-green-100">kg CO2 Offset</p>
                        </div>
                        <div className="text-center">
                            <p className="text-3xl font-bold">45</p>
                            <p className="text-sm text-green-100">Food Miles Saved</p>
                        </div>
                        <div className="text-center">
                            <p className="text-3xl font-bold">3</p>
                            <p className="text-sm text-green-100">Local Farms Supported</p>
                        </div>
                        <div className="text-center">
                            <p className="text-3xl font-bold">$40</p>
                            <p className="text-sm text-green-100">Community Donated</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Impact Breakdown */}
            <h2 className="text-xl font-bold text-gray-900 mb-6">Impact Breakdown</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Product Impact Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-4">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">Sustainable Purchases</h3>
                    <p className="text-sm text-gray-500 mb-4">You've chosen locally grown produce 15 times this month.</p>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 w-[75%]"></div>
                    </div>
                    <p className="text-xs text-right mt-1 text-gray-400">75% of goal</p>
                </div>

                {/* System Impact Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600 mb-4">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">Active Growing</h3>
                    <p className="text-sm text-gray-500 mb-4">Your vertical tower has produced 5kg of greens.</p>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 w-[45%]"></div>
                    </div>
                    <p className="text-xs text-right mt-1 text-gray-400">45% of yearly target</p>
                </div>

                {/* Community Impact Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 mb-4">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">Community Support</h3>
                    <p className="text-sm text-gray-500 mb-4">Engagement with 3 local artisan projects.</p>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 w-[90%]"></div>
                    </div>
                    <p className="text-xs text-right mt-1 text-gray-400">Gold Supporter Status</p>
                </div>
            </div>

            {/* Recent Badges */}
            <div className="mt-12">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Achievements</h2>
                <div className="flex gap-4 overflow-x-auto pb-4">
                    {['Local Hero', 'Zero Waste Warrior', 'Hydro Pioneer', 'Community Pillar'].map((badge, i) => (
                        <div key={i} className="min-w-[120px] p-4 bg-gray-50 rounded-xl border border-gray-200 text-center flex flex-col items-center justify-center grayscale hover:grayscale-0 transition cursor-pointer">
                            <div className="w-12 h-12 bg-gray-200 rounded-full mb-3"></div>
                            <span className="text-xs font-bold text-gray-600">{badge}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
