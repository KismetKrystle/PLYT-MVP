'use client';


import Image from 'next/image';

import { useRouter } from 'next/navigation';

export default function ResourcesPanel() {
    const router = useRouter();

    // Hardcoded history data for demo
    const HISTORY_ITEMS = [
        { id: 1, title: 'Hydroponics for beginners', date: '2h ago' },
        { id: 2, title: 'Best Kale varieties', date: '1d ago' },
    ];

    return (
        <div className="flex flex-col w-full">

            {/* Chat History Section */}
            <div className="px-4 py-2 mt-2">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">History</h3>
                </div>

                {/* List Items */}
                <div className="space-y-1">
                    {HISTORY_ITEMS.map(item => (
                        <div
                            key={item.id}
                            onClick={() => router.push(`/?historyId=${item.id}`)}
                            className="p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-100 transition group"
                        >
                            <p className="text-xs font-medium text-gray-800 line-clamp-1 group-hover:text-green-700">{item.title}</p>
                            <p className="text-[10px] text-gray-400">{item.date}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
