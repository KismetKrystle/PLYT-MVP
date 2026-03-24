'use client';

import { useState } from 'react';

type OrderCategory = 'Raw Produce' | 'Meals' | 'Products';
type OrderTab = 'All' | OrderCategory;
type SellerRole = 'Farmer' | 'Distributor' | 'Expert';

type OrderRow = {
    id: string;
    category: OrderCategory;
    date: string;
    status: string;
    total: number;
    items: string;
    sellerName: string;
    sellerRole: SellerRole;
};

export default function OrdersPage() {
    const [activeTab, setActiveTab] = useState<OrderTab>('All');
    const TABS: OrderTab[] = ['All', 'Raw Produce', 'Meals', 'Products'];

    const ORDERS: OrderRow[] = [
        {
            id: '#ORD-101',
            category: 'Raw Produce',
            date: 'Oct 24, 2024',
            status: 'Delivered',
            total: 45000,
            items: 'Tomatoes (2kg), Thai basil (1 bundle)',
            sellerName: 'Sunrise Farm',
            sellerRole: 'Farmer'
        },
        {
            id: '#ORD-102',
            category: 'Meals',
            date: 'Oct 20, 2024',
            status: 'Shipped',
            total: 98000,
            items: 'Green curry bowl (2), veggie wrap (1)',
            sellerName: 'FreshRoute Foods',
            sellerRole: 'Distributor'
        },
        {
            id: '#ORD-103',
            category: 'Products',
            date: 'Sep 15, 2024',
            status: 'Completed',
            total: 150000,
            items: 'Mineral-rich dressing set, recipe cards',
            sellerName: 'Coach Amara',
            sellerRole: 'Expert'
        },
        {
            id: '#ORD-104',
            category: 'Raw Produce',
            date: 'Sep 10, 2024',
            status: 'Delivered',
            total: 32000,
            items: 'Kale (1kg), bok choy (2 bundles)',
            sellerName: 'GreenBridge Distribution',
            sellerRole: 'Distributor'
        },
        {
            id: '#ORD-105',
            category: 'Products',
            date: 'Sep 04, 2024',
            status: 'Delivered',
            total: 275000,
            items: 'Starter sprouting kit, nutrition guide',
            sellerName: 'Bali Harvest Co.',
            sellerRole: 'Farmer'
        },
    ];

    const filtered = activeTab === 'All'
        ? ORDERS
        : ORDERS.filter((order) => order.category === activeTab);

    const categoryBadgeClass: Record<OrderCategory, string> = {
        'Raw Produce': 'bg-green-100 text-green-700',
        Meals: 'bg-amber-100 text-amber-700',
        Products: 'bg-blue-100 text-blue-700'
    };

    const sellerBadgeClass: Record<SellerRole, string> = {
        Farmer: 'bg-emerald-50 text-emerald-700',
        Distributor: 'bg-slate-100 text-slate-700',
        Expert: 'bg-violet-100 text-violet-700'
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Your Orders</h1>
                <p className="mt-2 max-w-3xl text-sm text-gray-500">
                    Raw produce and meals connect buyers with farmers and distributors. Products can also be listed by verified experts who have built community standing and hold the right certificates.
                </p>
            </div>

            {/* Filter Tabs */}
            <div className="mb-6 flex border-b border-gray-200 overflow-x-auto">
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

            <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Order ID</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Seller</th>
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
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${categoryBadgeClass[order.category]}`}>
                                        {order.category}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    <div className="flex flex-col gap-1">
                                        <span className="font-medium text-gray-900">{order.sellerName}</span>
                                        <span className={`inline-flex w-fit rounded-full px-2 py-1 text-xs font-semibold ${sellerBadgeClass[order.sellerRole]}`}>
                                            {order.sellerRole}
                                        </span>
                                    </div>
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

