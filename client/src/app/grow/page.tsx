'use client';

import React, { useState, useEffect } from 'react';
import api from '../../lib/api';

interface GrowSystem {
    id: number;
    name: string;
    description: string;
    price_plyt: string;
    image_url: string;
    type: string;
    features: string[];
}

export default function GrowPage() {
    const [systems, setSystems] = useState<GrowSystem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSystems = async () => {
            try {
                // For now, we fetch all. In real app, might filter or search.
                const res = await api.get('/grow/systems/search');
                setSystems(res.data);
            } catch (error) {
                console.error('Failed to fetch grow systems', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSystems();
    }, []);

    return (
        <div className="flex h-[calc(100vh-4rem)]">
            {/* Left Interface: Chat */}
            <div className="flex-1 border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                    <h2 className="font-semibold text-gray-800">PLYT Assistant (Grow Mode)</h2>
                </div>
                <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                    <div className="bg-white p-3 rounded-lg shadow-sm max-w-[80%] mb-4">
                        <p className="text-gray-800">Ready to grow? I can teach you how to plant a garden or help you pick a hydroponic system.</p>
                    </div>
                </div>
                <div className="p-4 border-t border-gray-200 bg-white">
                    <input
                        type="text"
                        placeholder="Ask about growing tomatoes..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>
            </div>

            {/* Right Interface: Context (Lessons / Systems) */}
            <div className="w-[30rem] flex flex-col bg-white">
                <div className="p-4 border-b border-gray-200 bg-emerald-50 flex gap-4">
                    <button className="text-emerald-800 font-semibold border-b-2 border-emerald-600 pb-1">Systems</button>
                    <button className="text-gray-500 font-medium pb-1 px-1">Lessons</button>
                </div>
                <div className="flex-1 p-4 overflow-y-auto">
                    <h3 className="font-medium text-gray-900 mb-4">Recommended Systems</h3>

                    {loading ? (
                        <div className="text-gray-500 text-sm">Loading systems...</div>
                    ) : (
                        <div className="space-y-4">
                            {systems.map((system) => (
                                <div key={system.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition bg-white">
                                    <div className="h-40 bg-gray-100 rounded-md mb-3 overflow-hidden">
                                        {system.image_url ? (
                                            <img src={system.image_url} alt={system.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-gray-400">No Image</div>
                                        )}
                                    </div>
                                    <h4 className="font-semibold text-gray-800">{system.name}</h4>
                                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{system.type}</p>
                                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{system.description}</p>

                                    <div className="flex justify-between items-center mt-2">
                                        <span className="font-bold text-emerald-600">{Math.floor(parseFloat(system.price_plyt))} PLYT</span>
                                        <button className="px-3 py-1 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 transition">View</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
