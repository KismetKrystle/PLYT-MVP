'use client';


import Image from 'next/image';

export default function ResourcesPanel() {
    // Hardcoded history data for demo
    const HISTORY_ITEMS = [
        { id: 1, title: 'Hydroponics for beginners', date: '2h ago' },
        { id: 2, title: 'Best Kale varieties', date: '1d ago' },
    ];

    return (
        <div className="flex flex-col w-full">

            {/* Divider/Header */}
            <div className="px-4 py-2 mt-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Resources</h3>
            </div>

            {/* Quick Links: Marketplace & Orders */}
            <div className="px-4 pb-2 grid grid-cols-2 gap-2">
                <button className="flex flex-col items-center justify-center p-2 rounded-xl border border-gray-100 bg-white shadow-sm hover:bg-green-50 hover:border-green-200 transition group">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-1 group-hover:bg-green-100 group-hover:text-green-600 transition-colors">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </div>
                    <span className="text-[10px] font-semibold text-gray-700">Store</span>
                </button>
                <button className="flex flex-col items-center justify-center p-2 rounded-xl border border-gray-100 bg-white shadow-sm hover:bg-green-50 hover:border-green-200 transition group">
                    <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mb-1 group-hover:bg-green-100 group-hover:text-green-600 transition-colors">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                    </div>
                    <span className="text-[10px] font-semibold text-gray-700">Orders</span>
                </button>
            </div>

            {/* Chat History Section */}
            <div className="px-4 py-2">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">History</h3>
                </div>

                {/* List Items */}
                <div className="space-y-1">
                    {HISTORY_ITEMS.map(item => (
                        <div key={item.id} className="p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-100 transition group">
                            <p className="text-xs font-medium text-gray-800 line-clamp-1 group-hover:text-green-700">{item.title}</p>
                            <p className="text-[10px] text-gray-400">{item.date}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
