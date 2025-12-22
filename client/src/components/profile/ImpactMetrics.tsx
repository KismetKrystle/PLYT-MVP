'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ImpactMetrics() {
    const [step, setStep] = useState(1);

    return (
        <div className="w-full min-h-full bg-white flex flex-col relative overflow-hidden">
            {/* Header */}
            <div className="px-6 py-6 flex items-center justify-between sticky top-0 bg-white z-10 z-[100]">
                <button onClick={() => window.history.back()} className="p-2 -ml-2 text-gray-400 hover:text-gray-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                </button>
                <div className="flex items-center gap-1">
                    <span className="text-xl font-bold tracking-tight text-gray-900">ply<span className="text-green-600">o</span>nt</span>
                    <span className="w-2 h-2 bg-green-500 rounded-full mt-1"></span>
                </div>
                <button className="p-2 -mr-2 text-gray-400 hover:text-gray-600 relative">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                </button>
            </div>

            <div className="px-6 pb-4">
                <h1 className="text-2xl font-bold text-gray-900">Impact Metrics</h1>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-24 no-scrollbar">
                <AnimatePresence mode="wait">
                    {step === 1 ? (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            {/* Carbon Footprint Chart Card */}
                            <div className="relative mb-6">
                                <div className="flex justify-between items-start mb-2 px-1">
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900">Carbon Footprint</h2>
                                        <p className="text-gray-400 text-sm font-medium">Reduced 6.8 kg</p>
                                    </div>
                                    <span className="bg-[#22c55e] text-white text-sm font-bold px-3 py-1 rounded-full shadow-sm">-6.8 kg</span>
                                </div>

                                {/* Custom SVG Chart - Wavy Green Gradient */}
                                <div className="h-48 w-full relative -mx-2">
                                    <svg viewBox="0 0 375 200" className="w-full h-full" preserveAspectRatio="none">
                                        <defs>
                                            <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                                                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.4" />
                                                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>
                                        {/* Area Path */}
                                        <path
                                            d="M0,50 C30,90 60,110 90,80 C120,50 150,50 180,90 C210,130 240,110 270,140 C300,170 330,130 375,150 L375,220 L0,220 Z"
                                            fill="url(#chartGradient)"
                                        />
                                        {/* Line Path */}
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

                            {/* Progress Bars - Rectangular Badge Style */}
                            <div className="space-y-8 px-1">
                                {/* Water Saved */}
                                <div className="relative">
                                    <div className="flex justify-between text-sm font-bold text-gray-800 mb-2">
                                        <span>Water Saved</span>
                                        <span className="text-gray-400 font-normal text-xs">Litres</span>
                                    </div>
                                    <div className="h-3 bg-gray-100 rounded-full relative overflow-visible flex items-center">
                                        <div className="h-full bg-green-600 rounded-l-full rounded-r-sm w-[60%]"></div>
                                        {/* Rectangular Badge */}
                                        <div className="absolute left-[60%] -ml-1 bg-green-700 text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm z-10 transform -translate-y-0">
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
                                        {/* Rectangular Badge */}
                                        <div className="absolute left-[35%] -ml-1 bg-green-700 text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm z-10 transform -translate-y-0">
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
                                        {/* Rectangular Badge */}
                                        <div className="absolute left-[25%] -ml-1 bg-green-700 text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm z-10 transform -translate-y-0">
                                            120
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Self-Sufficiency Score */}
                            <div className="bg-gray-100 rounded-full p-4 mt-6 flex items-center justify-between px-6">
                                <span className="font-bold text-gray-900 text-base">Self-Sufficiency Score</span>
                                <span className="text-base font-bold text-gray-500">40%</span>
                            </div>

                        </motion.div>
                    ) : (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-6"
                        >
                            {/* Detailed Metrics */}

                            {/* Systems Donated Card */}
                            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                                <div className="relative z-10">
                                    <h3 className="text-green-100 text-sm font-medium mb-1">Community Impact</h3>
                                    <h2 className="text-3xl font-bold mb-2">3 Systems</h2>
                                    <p className="text-green-50 text-sm opacity-90">Donated to local schools through your purchase contributions.</p>
                                </div>
                            </div>

                            {/* Impact Breakdown */}
                            <div className="bg-white border boundary-gray-100 rounded-3xl p-6 shadow-sm">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Impact Breakdown</h3>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800">Supply Chain</h4>
                                            <p className="text-sm text-gray-500 leading-relaxed">
                                                By sourcing locally, you've cut down typical food travel distance by <span className="text-green-600 font-bold">85%</span>.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600 shrink-0">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800">Energy Efficiency</h4>
                                            <p className="text-sm text-gray-500 leading-relaxed">
                                                Your hydroponic systems use <span className="text-green-600 font-bold">90% less water</span> than traditional soil farming.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Achievements */}
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Achievements</h3>
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { title: 'First Harvest', icon: '🌱', color: 'bg-green-100 text-green-600' },
                                        { title: 'Water Saver', icon: '💧', color: 'bg-blue-100 text-blue-600' },
                                        { title: 'Community', icon: '🤝', color: 'bg-purple-100 text-purple-600' },
                                        { title: 'Expert', icon: '⭐', color: 'bg-yellow-100 text-yellow-600' },
                                    ].map((badge, i) => (
                                        <div key={i} className="flex flex-col items-center gap-2">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${badge.color}`}>
                                                {badge.icon}
                                            </div>
                                            <span className="text-[10px] font-semibold text-gray-600 text-center">{badge.title}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Sticky Footer Button */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent z-20">
                <button
                    onClick={() => step === 1 ? setStep(2) : window.history.back()}
                    className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-green-200 active:scale-95 transition-all"
                >
                    {step === 1 ? 'Continue' : 'Back to Profile'}
                </button>
            </div>
        </div>
    );
}
