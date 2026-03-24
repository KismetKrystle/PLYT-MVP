'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth';

export default function ResourcesPanel() {
    const router = useRouter();
    const [isProfileLinksOpen, setIsProfileLinksOpen] = useState(false);
    const { user, openLoginModal } = useAuth();

    const navigateTo = (href: string) => {
        if (!user) {
            openLoginModal();
            return;
        }

        router.push(href);
    };

    return (
        <div className="flex flex-col w-full">
            <div className="px-4 py-2 mt-1">
                <button
                    onClick={() => setIsProfileLinksOpen((v) => !v)}
                    className="w-full flex items-center justify-between mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider"
                >
                    <span>Profile Links</span>
                    <svg
                        className={`w-3 h-3 transition-transform duration-200 ${isProfileLinksOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                <div className={`rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden transition-all duration-200 ${isProfileLinksOpen ? 'max-h-64 p-2 space-y-1' : 'max-h-0 p-0'}`}>
                    <button onClick={() => navigateTo('/?tab=customer_profile')} className="w-full text-left p-2 rounded-lg hover:bg-gray-50 text-xs font-medium text-gray-700">
                        About You
                    </button>
                    <button onClick={() => navigateTo('/?tab=health_profiles&profile=consumer')} className="w-full text-left p-2 rounded-lg hover:bg-gray-50 text-xs font-medium text-gray-700">
                        Consumer Health Profile
                    </button>
                    <button onClick={() => navigateTo('/?tab=health_profiles&profile=business')} className="w-full text-left p-2 rounded-lg hover:bg-gray-50 text-xs font-medium text-gray-700">
                        Farmer / Distributor Profile
                    </button>
                    <button onClick={() => navigateTo('/?tab=health_profiles&profile=expert')} className="w-full text-left p-2 rounded-lg hover:bg-gray-50 text-xs font-medium text-gray-700">
                        Expert Profile
                    </button>
                </div>
            </div>
        </div>
    );
}
