'use client';

import { useState } from 'react';

export default function ServicerDashboard() {
    const [activeTab, setActiveTab] = useState<'system' | 'plant'>('system');

    const TICKETS = [
        { id: 'T-1001', system: 'Hydro Wall @ Kismet Cafe', issue: 'Pump Failure', priority: 'High', date: 'Today' },
        { id: 'T-1004', system: 'NFT Setup @ Villa 22', issue: 'Sensor Drift', priority: 'Low', date: 'Yesterday' },
    ];

    const HOUSE_CALLS = [
        { id: 1, client: 'Sarah Connor', task: 'Weekly Pruning & Nutrient Check', date: 'Today, 2:00 PM', location: 'Ubud' },
        { id: 2, client: 'John Wick', task: 'Harvest & Replant', date: 'Tomorrow, 9:00 AM', location: 'Canggu' },
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Servicer Dashboard</h1>
                    <p className="text-gray-500">System Maintenance & Plant Care Operations.</p>
                </div>
                <button className="bg-red-600 text-white px-5 py-2 rounded-xl font-bold shadow-md hover:bg-red-700 transition">
                    Emergency Alert
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-400 text-xs uppercase font-bold">Open Tickets</p>
                    <p className="text-3xl font-bold text-red-500 mt-2">3</p>
                    <p className="text-xs text-gray-400 mt-1">1 High Priority</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-400 text-xs uppercase font-bold">House Calls</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">5</p>
                    <p className="text-xs text-gray-400 mt-1">Computed Today</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-400 text-xs uppercase font-bold">Systems Online</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">42</p>
                    <p className="text-xs text-green-500 mt-1">98% Uptime</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-400 text-xs uppercase font-bold">Parts Requests</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">2</p>
                    <p className="text-xs text-gray-400 mt-1">Pending Approval</p>
                </div>
            </div>

            <div className="w-full h-px bg-gray-200"></div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: System Maintenance */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <span className="p-2 bg-red-100 text-red-600 rounded-lg">🔧</span>
                        System Repairs
                    </h2>
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                        {TICKETS.map((ticket) => (
                            <div key={ticket.id} className="mb-4 last:mb-0 p-4 border border-gray-100 rounded-xl hover:shadow-md transition bg-gray-50">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-mono text-xs text-gray-400 bg-white px-2 py-1 rounded border border-gray-200">{ticket.id}</span>
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${ticket.priority === 'High' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{ticket.priority}</span>
                                </div>
                                <h3 className="font-bold text-gray-900">{ticket.issue}</h3>
                                <p className="text-sm text-gray-500">{ticket.system}</p>
                                <div className="mt-3 flex gap-2">
                                    <button className="flex-1 bg-white border border-gray-300 text-gray-700 py-1.5 rounded-lg text-sm font-bold hover:bg-gray-50 transition">View Details</button>
                                    <button className="flex-1 bg-blue-600 text-white py-1.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition">Accept Job</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Plant Care (House Calls) */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <span className="p-2 bg-green-100 text-green-600 rounded-lg">🌿</span>
                        Plant Care House Calls
                    </h2>
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                        {HOUSE_CALLS.map((call) => (
                            <div key={call.id} className="mb-4 last:mb-0 flex gap-4 p-4 border border-gray-100 rounded-xl hover:shadow-md transition bg-green-50/50">
                                <div className="text-center bg-white p-2 rounded-lg border border-gray-200 h-fit min-w-[60px]">
                                    <p className="text-xs text-gray-400 font-bold uppercase">Today</p>
                                    <p className="text-lg font-bold text-green-600">2:00</p>
                                    <p className="text-xs text-gray-400">PM</p>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-900">{call.client}</h3>
                                    <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        {call.location}
                                    </p>
                                    <p className="text-sm text-gray-800 font-medium bg-white px-3 py-2 rounded-lg border border-gray-100">{call.task}</p>
                                    <div className="mt-2 flex gap-2">
                                        <button className="text-xs font-bold text-green-700 hover:underline">Navigate</button>
                                        <button className="text-xs font-bold text-gray-500 hover:text-gray-900">Contact Client</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
