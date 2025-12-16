'use client';

import { useState } from 'react';

export default function OrdersPage() {
    const [activeTab, setActiveTab] = useState('All');
    const TABS = ['All', 'Food', 'Systems', 'Services'];

    const ORDERS = [
        { id: "#ORD-101", type: "Food", date: "Oct 24, 2024", status: "Delivered", total: 45000, items: "Tomatoes (2kg), Basil (1)" },
        { id: "#ORD-102", type: "Systems", date: "Oct 20, 2024", status: "Shipped", total: 1250000, items: "Hydro-Starter Kit" },
        { id: "#ORD-103", type: "Services", date: "Sep 15, 2024", status: "Completed", total: 150000, items: "System Maintenance (1hr)" },
        { id: "#ORD-104", type: "Food", date: "Sep 10, 2024", status: "Delivered", total: 32000, items: "Kale (1kg)" },
    ];

    const filtered = activeTab === 'All' ? ORDERS : ORDERS.filter(o => o.type === activeTab);

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Your Orders</h1>

            {/* Filter Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
                {TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-3 text-sm font-medium transition border-b-2 ${activeTab === tab
                            ? 'border-green-600 text-green-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Order ID</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Items</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {filtered.map((order) => (
                            <tr key={order.id} className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.id}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${order.type === 'Food' ? 'bg-green-100 text-green-700' :
                                            order.type === 'Systems' ? 'bg-blue-100 text-blue-700' :
                                                'bg-purple-100 text-purple-700'
                                        }`}>
                                        {order.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={order.items}>
                                    {order.items}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.date}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="flex items-center text-xs font-medium text-gray-700">
                                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                        {order.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                                    Rp {order.total.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filtered.length === 0 && (
                    <div className="p-12 text-center text-gray-400">
                        No orders found in this category.
                    </div>
                )}
            </div>
        </div>
    );
}

