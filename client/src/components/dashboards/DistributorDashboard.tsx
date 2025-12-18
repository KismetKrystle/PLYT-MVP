'use client';

import { useState } from 'react';

export default function DistributorDashboard() {
    const [activeTab, setActiveTab] = useState<'logistics' | 'processing' | 'dispatch'>('logistics');

    const PICKUPS = [
        { id: 1, farmers: ['Green Acres', 'Urban Vertical'], location: 'District 1', status: 'Scheduled', time: '10:00 AM' },
        { id: 2, farmers: ['RoofTop Gardens'], location: 'Ubud Center', status: 'In Transit', time: '11:30 AM' },
    ];

    const PROCESSING_QUEUE = [
        { id: 101, batch: 'Morning Harvest A', source: 'Green Acres', status: 'Sorting', items: '50kg Mix' },
        { id: 102, batch: 'Root Crops B', source: 'Bali Eco Farm', status: 'Ready for Pack', items: '120kg' },
    ];

    const DELIVERIES = [
        { id: 501, dest: 'Hub A (Kuta)', items: '20 Boxes', status: 'Loading' },
        { id: 502, dest: 'Direct: Resume Cafe', items: '5 Boxes', status: 'Delivered' },
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Distributor Dashboard</h1>
                    <p className="text-gray-500">Logistics, Processing, and Fulfillment Center.</p>
                </div>
                <div className="flex gap-2">
                    <button className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl font-bold hover:bg-gray-50 transition">
                        Map View
                    </button>
                    <button className="bg-blue-600 text-white px-5 py-2 rounded-xl font-bold shadow-md hover:bg-blue-700 transition">
                        Scan Inbound
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-700">🚚</div>
                        <h3 className="font-bold text-blue-900">Fleet Status</h3>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">3/5 <span className="text-sm font-normal text-gray-500">Trucks Active</span></p>
                </div>
                <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center text-amber-700">📦</div>
                        <h3 className="font-bold text-amber-900">Processing</h3>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">145 kg <span className="text-sm font-normal text-gray-500">In Queue</span></p>
                </div>
                <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-green-700">✅</div>
                        <h3 className="font-bold text-green-900">Fulfilled Today</h3>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">42 <span className="text-sm font-normal text-gray-500">Orders</span></p>
                </div>
            </div>

            {/* Main Tabs */}
            <div className="border-b border-gray-200 flex gap-6">
                <button
                    onClick={() => setActiveTab('logistics')}
                    className={`pb-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'logistics' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                    Pickup Logistics
                </button>
                <button
                    onClick={() => setActiveTab('processing')}
                    className={`pb-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'processing' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                    Processing Center
                </button>
                <button
                    onClick={() => setActiveTab('dispatch')}
                    className={`pb-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'dispatch' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                    Delivery Dispatch
                </button>
            </div>

            {/* Tab Content */}
            <div className="min-h-[300px]">
                {activeTab === 'logistics' && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Scheduled Pickups</h2>
                        <div className="space-y-3">
                            {PICKUPS.map((trip) => (
                                <div key={trip.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition cursor-pointer">
                                    <div className="flex gap-4 items-center">
                                        <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-100 text-xl">🚚</div>
                                        <div>
                                            <p className="font-bold text-gray-900">Route #{trip.id} - {trip.location}</p>
                                            <p className="text-sm text-gray-500">{trip.farmers.join(', ')}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-gray-900">{trip.time}</p>
                                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{trip.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'processing' && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Inbound Sorting Queue</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-400 text-xs uppercase">
                                    <tr>
                                        <th className="p-3 rounded-l-lg">Batch ID</th>
                                        <th className="p-3">Source</th>
                                        <th className="p-3">Content</th>
                                        <th className="p-3">Status</th>
                                        <th className="p-3 rounded-r-lg">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {PROCESSING_QUEUE.map((item) => (
                                        <tr key={item.id} className="border-b border-gray-50">
                                            <td className="p-3 font-mono font-medium">{item.batch}</td>
                                            <td className="p-3">{item.source}</td>
                                            <td className="p-3">{item.items}</td>
                                            <td className="p-3">
                                                <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold">{item.status}</span>
                                            </td>
                                            <td className="p-3">
                                                <button className="text-blue-600 font-bold hover:underline">Process</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'dispatch' && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Outbound Delivery Manifest</h2>
                        <div className="space-y-3">
                            {DELIVERIES.map((del) => (
                                <div key={del.id} className="flex justify-between items-center p-4 border border-gray-200 rounded-xl bg-white">
                                    <div>
                                        <p className="font-bold text-gray-900">{del.dest}</p>
                                        <p className="text-sm text-gray-500">{del.items}</p>
                                    </div>
                                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${del.status === 'Delivered' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {del.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
