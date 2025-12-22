'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ResourcesPanel() {
    const router = useRouter();
    const [openGroup, setOpenGroup] = useState<string | null>('Learn');

    // Grouped Mock Data
    const HISTORY_GROUPS = [
        {
            title: 'Produce',
            items: [
                { id: 101, title: 'Tomato Availability', date: '2h ago' },
                { id: 102, title: 'Price check: Basil', date: '1d ago' },
            ]
        },
        {
            title: 'System',
            items: [
                { id: 201, title: 'Water Pump Issue', date: '3d ago' },
            ]
        },
        {
            title: 'Learn',
            items: [
                { id: 301, title: 'Hydroponics for beginners', date: '4h ago' },
                { id: 302, title: 'Best Kale varieties', date: '5d ago' },
            ]
        }
    ];

    const toggleGroup = (title: string) => {
        setOpenGroup(openGroup === title ? null : title);
    };

    return (
        <div className="flex flex-col w-full">

            {/* Chat History Section */}
            <div className="px-4 py-2 mt-2">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Recent History</h3>
                </div>

                {/* Accordion Groups */}
                <div className="space-y-2">
                    {HISTORY_GROUPS.map(group => (
                        <div key={group.title} className="rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm">
                            <button
                                onClick={() => toggleGroup(group.title)}
                                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold transition-colors ${openGroup === group.title ? 'bg-gray-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                <span className="flex items-center gap-2">
                                    {group.title}
                                    <span className="bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5 text-[9px]">{group.items.length}</span>
                                </span>
                                <svg
                                    className={`w-3 h-3 transition-transform duration-200 ${openGroup === group.title ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* Dropdown Content */}
                            {openGroup === group.title && (
                                <div className="bg-gray-50/50 p-2 space-y-1 border-t border-gray-100">
                                    {group.items.map(item => (
                                        <div
                                            key={item.id}
                                            onClick={() => router.push(`/?tab=${group.title === 'Produce' ? 'find_produce' : group.title === 'System' ? 'pick_system' : 'learn'}&historyId=${item.id}`)}
                                            className="p-2 rounded-lg hover:bg-white cursor-pointer border border-transparent hover:border-gray-100 transition group flex flex-col items-start"
                                        >
                                            <p className="text-xs font-medium text-gray-700 w-full truncate group-hover:text-green-700 text-left">{item.title}</p>
                                            <p className="text-[9px] text-gray-400">{item.date}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
