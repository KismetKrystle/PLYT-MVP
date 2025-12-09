'use client';

import React, { useState, useEffect, useRef } from 'react';
import api from '../../lib/api';

interface InventoryItem {
    id: number;
    name: string;
    description: string;
    price_plyt: string;
    image_url: string;
    category: string;
    quantity: number;
    unit: string;
    farmer_name?: string;
    distance_km?: number;
}

export default function EatPage() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [chatMessage, setChatMessage] = useState('');
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', text: string }[]>([
        { role: 'assistant', text: 'Hello! What would you like to cook today? I can suggest recipes based on what\'s fresh.' }
    ]);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchInventory = async () => {
            try {
                const res = await api.get('/inventory/search');
                setItems(res.data);
            } catch (error) {
                console.error('Failed to fetch inventory', error);
            } finally {
                setLoading(false);
            }
        };

        fetchInventory();
    }, []);

    const handleSendMessage = () => {
        if (!chatMessage.trim()) return;

        // Add user message
        const newMessages = [...messages, { role: 'user' as const, text: chatMessage }];
        setMessages(newMessages);
        setChatMessage('');

        // Simulating AI response
        setTimeout(() => {
            setMessages(prev => [...prev, { role: 'assistant', text: "That sounds delicious! You can find fresh ingredients for that in the market below." }]);
        }, 1000);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    };

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const formatIdr = (plyt: string) => {
        const amount = parseFloat(plyt) * 15000;
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
    };

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] overflow-hidden">
            {/* Left Interface: Chat (Taking up more space on Mobile) */}
            <div className="flex-[2] md:flex-1 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col min-h-[50vh] md:min-h-0 bg-white">
                <div className="p-4 border-b border-gray-200">
                    <h2 className="font-semibold text-gray-800">PLYT Assistant (Eat Mode)</h2>
                </div>
                <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-3">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`max-w-[85%] p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-green-100 self-end text-green-900' : 'bg-white shadow-sm self-start text-gray-800'}`}>
                            {msg.text}
                        </div>
                    ))}
                    <div ref={chatEndRef} />
                </div>
                <div className="p-3 md:p-4 border-t border-gray-200 bg-white flex gap-2">
                    <input
                        type="text"
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    />
                    <button
                        onClick={handleSendMessage}
                        className="bg-green-600 text-white p-2 rounded-full hover:bg-green-700 transition flex items-center justify-center w-10 h-10"
                    >
                        ➤
                    </button>
                </div>
            </div>

            {/* Right Interface: Application Marketplace (Bottom on Mobile, Right on Desktop) */}
            <div className="flex-1 md:w-[28rem] md:flex-none flex flex-col bg-white overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-green-50 flex justify-between items-center">
                    <h2 className="font-semibold text-green-800">Fresh Market</h2>
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">Nearby</span>
                </div>

                {/* Scrollable Container based on Viewport */}
                <div className="flex-1 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto bg-gray-50 p-4">
                    {loading ? (
                        <div className="text-gray-500 text-sm p-4 text-center">Loading market...</div>
                    ) : (
                        <div className="flex md:flex-col gap-4 min-w-max md:min-w-0">
                            {/* Horizontal Layout on Mobile (flex-row is default for div), Vertical on Desktop via md:flex-col */}
                            {items.map((item) => (
                                <div key={item.id} className="w-64 md:w-full bg-white border border-gray-100 p-3 rounded-xl hover:shadow-md transition flex flex-col md:flex-row gap-3 md:gap-4 flex-shrink-0">
                                    {/* Image */}
                                    <div className="w-full h-32 md:w-24 md:h-24 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 relative">
                                        {item.image_url ? (
                                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-xs text-gray-400">No Image</div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-semibold text-gray-800 leading-tight">{item.name}</h4>
                                                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{item.distance_km ? `${item.distance_km}km` : '2km'}</span>
                                            </div>
                                            <p className="text-xs text-green-600 font-medium mt-0.5 flex items-center gap-1">
                                                <span>👤 {item.farmer_name || 'Farmer'}</span>
                                            </p>
                                        </div>

                                        <div className="mt-2">
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <span className="block font-bold text-green-700 text-sm">{Math.floor(parseFloat(item.price_plyt))} PLYT</span>
                                                    <span className="block text-[10px] text-gray-400">{formatIdr(item.price_plyt)}</span>
                                                </div>
                                                <button className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition shadow-sm">
                                                    Add
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 hidden md:block">
                    <button className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition">
                        View Basket (0)
                    </button>
                </div>
            </div>
        </div>
    );
}
