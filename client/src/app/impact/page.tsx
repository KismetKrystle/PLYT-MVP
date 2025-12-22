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

            {/* Visual Metrics (Carbon Graph & Progress Bars) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">

                {/* Carbon Footprint Graph */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Carbon Footprint</h2>
                            <p className="text-gray-400 text-sm font-medium">Reduced 6.8 kg</p>
                        </div>
                        <span className="bg-[#22c55e] text-white text-sm font-bold px-3 py-1 rounded-full shadow-sm">-6.8 kg</span>
                    </div>

                    {/* Wavy Graph SVG */}
                    <div className="h-48 w-full relative">
                        <svg viewBox="0 0 375 200" className="w-full h-full" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="chartGradientMain" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#22c55e" stopOpacity="0.4" />
                                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <path
                                d="M0,50 C30,90 60,110 90,80 C120,50 150,50 180,90 C210,130 240,110 270,140 C300,170 330,130 375,150 L375,220 L0,220 Z"
                                fill="url(#chartGradientMain)"
                            />
                            <path
                                d="M0,50 C30,90 60,110 90,80 C120,50 150,50 180,90 C210,130 240,110 270,140 C300,170 330,130 375,150"
                                fill="none"
                                stroke="#16a34a"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                </div>

                {/* Detailed Meter Bars */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center space-y-8">
                    {/* Water Saved */}
                    <div className="relative">
                        <div className="flex justify-between text-sm font-bold text-gray-800 mb-2">
                            <span>Water Saved</span>
                            <span className="text-gray-400 font-normal text-xs">Litres</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full relative overflow-visible flex items-center">
                            <div className="h-full bg-green-600 rounded-l-full rounded-r-sm w-[60%]"></div>
                            <div className="absolute left-[60%] -ml-1 bg-green-700 text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm z-10">
                                12.4
                            </div>
                        </div>
                    </div>

                    {/* Food Miles Reduced */}
                    <div className="relative">
                        <div className="flex justify-between text-sm font-bold text-gray-800 mb-2">
                            <span>Food Miles Reduced</span>
                            <span className="text-gray-400 font-normal text-xs">km</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full relative overflow-visible flex items-center">
                            <div className="h-full bg-green-600 rounded-l-full rounded-r-sm w-[35%]"></div>
                            <div className="absolute left-[35%] -ml-1 bg-green-700 text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm z-10">
                                4.3
                            </div>
                        </div>
                    </div>

                    {/* Home Crops Harvested */}
                    <div className="relative">
                        <div className="flex justify-between text-sm font-bold text-gray-800 mb-2">
                            <span>Home Crops Harvested</span>
                            <span className="text-gray-400 font-normal text-xs">grams</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full relative overflow-visible flex items-center">
                            <div className="h-full bg-green-600 rounded-l-full rounded-r-sm w-[25%]"></div>
                            <div className="absolute left-[25%] -ml-1 bg-green-700 text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm z-10">
                                120
                            </div>
                        </div>
                    </div>

                    {/* Self-Sufficiency Score */}
                    <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                        <span className="font-bold text-gray-900 text-sm">Self-Sufficiency Score</span>
                        <span className="text-sm font-bold text-gray-500">40%</span>
                    </div>
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
