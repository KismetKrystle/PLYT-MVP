'use client';

import { useState } from 'react';
import Image from 'next/image';

interface RightSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function RightSidebar({ isOpen, onClose }: RightSidebarProps) {
    const [historyCategory, setHistoryCategory] = useState<'general' | 'lessons' | 'custom'>('general');

    // Hardcoded history data for demo
    const HISTORY_ITEMS = {
        general: [
            { id: 1, title: 'Hydroponics for beginners', date: '2h ago' },
            { id: 2, title: 'Best Kale varieties', date: '1d ago' },
        ],
        lessons: [
            { id: 3, title: 'Nutrient Balancing 101', date: '3d ago' },
            { id: 4, title: 'Harvesting Techniques', date: '1w ago' },
        ],
        custom: [
            { id: 5, title: 'My Farm Expansion', date: '5d ago' },
        ]
    };

    if (!isOpen) return null;

    return (
        <aside className="fixed inset-y-0 right-0 z-30 w-80 bg-white border-l border-gray-200 shadow-xl transform transition-transform duration-300 ease-in-out md:static md:shadow-none md:transform-none h-full flex flex-col">
            {/* Header / Toggle Actions */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="font-bold text-gray-800">Resources</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 md:hidden">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            {/* Quick Links: Marketplace & Orders */}
            <div className="p-4 grid grid-cols-2 gap-3">
                <button className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-100 bg-white shadow-sm hover:bg-green-50 hover:border-green-200 transition group">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-2 group-hover:bg-green-100 group-hover:text-green-600 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </div>
                    <span className="text-xs font-semibold text-gray-700">Marketplace</span>
                </button>
                <button className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-100 bg-white shadow-sm hover:bg-green-50 hover:border-green-200 transition group">
                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mb-2 group-hover:bg-green-100 group-hover:text-green-600 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                    </div>
                    <span className="text-xs font-semibold text-gray-700">Orders</span>
                </button>
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-100 mx-4 my-2"></div>

            {/* Chat History Section */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">History</h3>
                    <button className="text-green-600 hover:text-green-700 text-xs font-medium">+ New Category</button>
                </div>

                {/* Categories Accordion (Simplified as tabs for MVP) */}
                <div className="flex space-x-2 mb-4">
                    {(['general', 'lessons', 'custom'] as const).map(cat => (
                        <button
                            key={cat}
                            onClick={() => setHistoryCategory(cat)}
                            className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md transition ${historyCategory === cat
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* List Items */}
                <div className="space-y-2">
                    {HISTORY_ITEMS[historyCategory]?.map(item => (
                        <div key={item.id} className="p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-100 transition group">
                            <p className="text-sm font-medium text-gray-800 line-clamp-1 group-hover:text-green-700">{item.title}</p>
                            <p className="text-xs text-gray-400">{item.date}</p>
                        </div>
                    ))}
                    {HISTORY_ITEMS[historyCategory]?.length === 0 && (
                        <p className="text-xs text-gray-400 italic text-center py-4">No history yet.</p>
                    )}
                </div>
            </div>
        </aside>
    );
}
