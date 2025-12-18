'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

export default function FarmerDashboard() {
    const [activeTab, setActiveTab] = useState<'overview' | 'harvest' | 'orders' | 'systems'>('overview');

    // Mock Data
    const HARVESTS = [
        { id: 1, crop: 'Cherry Tomatoes', quantity: '5 kg', date: '2025-02-20', status: 'Pending Pickup' },
        { id: 2, crop: 'Basil', quantity: '1 kg', date: '2025-02-19', status: 'Picked Up' },
    ];

    const ORDERS = [
        { id: 101, customer: 'Alice M.', items: '2x Lettuce, 1x Kale', total: '$12.00', status: 'New' },
        { id: 102, customer: 'Bob D.', items: '5kg Tomatoes', total: '$25.00', status: 'Processing' },
    ];

    const SYSTEMS = [
        { id: 1, name: 'Vertical Tower A', health: 98, ph: 6.5, ec: 1.2, status: 'Optimal' },
        { id: 2, name: 'NFT Channel B', health: 85, ph: 6.8, ec: 1.0, status: 'Nutrients Low' },
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Farmer Dashboard</h1>
                    <p className="text-gray-500">Manage your production and sales.</p>
                </div>
                <button className="bg-green-600 text-white px-5 py-2 rounded-xl font-bold shadow-md hover:bg-green-700 transition">
                    + Log Harvest
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-400 text-xs uppercase font-bold">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">$1,250.00</p>
                    <p className="text-green-500 text-xs font-medium mt-1">↑ 15% this week</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-400 text-xs uppercase font-bold">Pending Orders</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">5</p>
                    <p className="text-amber-500 text-xs font-medium mt-1">Needs Action</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-400 text-xs uppercase font-bold">Active Systems</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">8</p>
                    <p className="text-green-500 text-xs font-medium mt-1">All Systems Go</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-400 text-xs uppercase font-bold">Total Yield</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">450 kg</p>
                    <p className="text-gray-500 text-xs font-medium mt-1">Lifetime</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Harvest Logs */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Harvests</h3>
                    <div className="space-y-4">
                        {HARVESTS.map((harvest) => (
                            <div key={harvest.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-xl">
                                        🥗
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">{harvest.crop}</p>
                                        <p className="text-sm text-gray-500">{harvest.quantity} • {harvest.date}</p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${harvest.status === 'Pending Pickup' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                                    }`}>
                                    {harvest.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* System Status */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">System Health</h3>
                    <div className="space-y-4">
                        {SYSTEMS.map((sys) => (
                            <div key={sys.id} className="p-4 border border-gray-100 rounded-xl">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="font-bold text-gray-900">{sys.name}</p>
                                    <span className={`w-2 h-2 rounded-full ${sys.status === 'Optimal' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                    <div className="bg-gray-50 p-2 rounded-lg">
                                        <p className="text-gray-400 text-[10px] uppercase">Health</p>
                                        <p className="font-bold text-green-600">{sys.health}%</p>
                                    </div>
                                    <div className="bg-gray-50 p-2 rounded-lg">
                                        <p className="text-gray-400 text-[10px] uppercase">pH</p>
                                        <p className="font-bold text-gray-700">{sys.ph}</p>
                                    </div>
                                    <div className="bg-gray-50 p-2 rounded-lg">
                                        <p className="text-gray-400 text-[10px] uppercase">EC</p>
                                        <p className="font-bold text-gray-700">{sys.ec}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Active Orders */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center justify-between">
                    Incoming Orders
                    <button className="text-sm text-green-600 font-bold hover:underline">View All</button>
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-gray-400 text-xs uppercase border-b border-gray-100">
                                <th className="pb-3 pl-2">Order ID</th>
                                <th className="pb-3">Customer</th>
                                <th className="pb-3">Items</th>
                                <th className="pb-3">Total</th>
                                <th className="pb-3">Status</th>
                                <th className="pb-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {ORDERS.map((order) => (
                                <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                                    <td className="py-4 pl-2 font-mono text-gray-500">#{order.id}</td>
                                    <td className="py-4 font-bold text-gray-900">{order.customer}</td>
                                    <td className="py-4 text-gray-600">{order.items}</td>
                                    <td className="py-4 font-bold text-green-600">{order.total}</td>
                                    <td className="py-4">
                                        <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-bold">{order.status}</span>
                                    </td>
                                    <td className="py-4">
                                        <button className="text-gray-400 hover:text-gray-900 font-medium">Manage</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
