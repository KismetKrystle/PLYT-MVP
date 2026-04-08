'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';
import { useCart } from '../../context/CartContext';
import ItemProfileModal from '../../components/commerce/ItemProfileModal';
import {
    type CommerceItemProfile,
    getSupplierPreviewRoute,
    inferSupplierRole
} from '../../lib/commerce';

interface InventoryItem {
    id: number;
    business_id?: string | null;
    name: string;
    description: string;
    price_plyt: string;
    image_url: string;
    category: string;
    quantity: number;
    unit: string;
    farmer_name?: string;
    supplier_name?: string;
    supplier_type?: string;
    supplier_location?: string;
    distance_km?: number;
}

function toCommerceItemProfile(item: InventoryItem): CommerceItemProfile {
    const supplierName = item.supplier_name || item.farmer_name || 'Marketplace grower';
    const supplierRole = inferSupplierRole(item.supplier_type || supplierName);

    return {
        id: String(item.id),
        name: item.name,
        category: 'Produce',
        price: Number(item.price_plyt || 0) * 15000,
        quantity: item.quantity || 1,
        unit: item.unit || 'item',
        image: item.image_url || '/assets/images/store/organic_kale.png',
        supplierName,
        supplierRole,
        supplierBusinessId: item.business_id ? String(item.business_id) : null,
        supplierLocation: item.supplier_location || (typeof item.distance_km === 'number' ? `${item.distance_km} km away` : 'Nearby market route'),
        description: item.description || 'Fresh market listing surfaced inside the Eat flow.',
        supplierBio: supplierRole === 'Distributor'
            ? 'Presented as a distribution partner coordinating nearby availability for recipe-led shopping.'
            : 'Presented as a grower profile so recipe exploration can stay connected to supplier context.',
        trustSignals: [
            supplierRole === 'Distributor' ? 'Distribution-ready availability' : 'Farmer-linked fresh listing',
            item.category || 'Fresh market category',
            item.unit ? `${item.unit} inventory unit` : 'Flexible fulfillment planning'
        ],
        fulfillment: 'Recipe-driven basket building, local routing, and wallet checkout will land here as the commerce flow expands.',
        story: 'This preview shows how the Eat experience can open the same item and supplier profile used in store and wallet views.'
    };
}

export default function EatPage() {
    const router = useRouter();
    const { addToCart, totalItems } = useCart();
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [chatMessage, setChatMessage] = useState('');
    const [selectedItem, setSelectedItem] = useState<CommerceItemProfile | null>(null);
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', text: string }[]>([
        { role: 'assistant', text: 'Hello! What would you like to cook today? I can suggest recipes based on what is fresh.' }
    ]);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchInventory = async () => {
            try {
                const res = await api.get('/inventory/search');
                setItems(Array.isArray(res.data) ? res.data : []);
            } catch (error) {
                console.error('Failed to fetch inventory', error);
            } finally {
                setLoading(false);
            }
        };

        void fetchInventory();
    }, []);

    const handleSendMessage = () => {
        if (!chatMessage.trim()) return;

        const newMessages = [...messages, { role: 'user' as const, text: chatMessage }];
        setMessages(newMessages);
        setChatMessage('');

        setTimeout(() => {
            setMessages((prev) => [...prev, { role: 'assistant', text: 'That sounds delicious! You can find fresh ingredients for that in the market below.' }]);
        }, 1000);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    };

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const formatIdr = (plyt: string) => {
        const amount = parseFloat(plyt) * 15000;
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
    };

    const handleAddToCart = (item: InventoryItem) => {
        addToCart({
            id: String(item.id),
            name: item.name,
            price: parseFloat(item.price_plyt) * 15000,
            quantity: 1,
            image: item.image_url,
            unit: item.unit || 'item',
            farm: item.supplier_name || item.farmer_name || 'Marketplace grower'
        });
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden md:flex-row">
            <div className="flex min-h-[50vh] flex-[2] flex-col border-b border-gray-200 bg-white md:min-h-0 md:flex-1 md:border-b-0 md:border-r">
                <div className="border-b border-gray-200 p-4">
                    <h2 className="font-semibold text-gray-800">PLYT Assistant (Eat Mode)</h2>
                </div>
                <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-gray-50 p-4">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`max-w-[85%] rounded-lg p-3 text-sm ${msg.role === 'user' ? 'self-end bg-green-100 text-green-900' : 'self-start bg-white text-gray-800 shadow-sm'}`}>
                            {msg.text}
                        </div>
                    ))}
                    <div ref={chatEndRef} />
                </div>
                <div className="flex gap-2 border-t border-gray-200 bg-white p-3 md:p-4">
                    <input
                        type="text"
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                        type="button"
                        onClick={handleSendMessage}
                        className="flex min-w-[4.5rem] items-center justify-center rounded-full bg-green-600 px-3 text-sm font-medium text-white transition hover:bg-green-700"
                    >
                        Send
                    </button>
                </div>
            </div>

            <div className="flex flex-1 flex-col overflow-hidden bg-white md:w-[28rem] md:flex-none">
                <div className="flex items-center justify-between border-b border-gray-200 bg-green-50 p-4">
                    <div>
                        <h2 className="font-semibold text-green-800">Fresh Market</h2>
                        <p className="mt-1 text-[11px] text-green-700">{totalItems} items in basket</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => router.push('/wallet')}
                        className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-600 transition hover:bg-green-200"
                    >
                        Wallet preview
                    </button>
                </div>

                <div className="flex-1 overflow-x-auto bg-gray-50 p-4 md:overflow-x-hidden md:overflow-y-auto">
                    {loading ? (
                        <div className="p-4 text-center text-sm text-gray-500">Loading market...</div>
                    ) : (
                        <div className="flex min-w-max gap-4 md:min-w-0 md:flex-col">
                            {items.map((item) => {
                                const commerceItem = toCommerceItemProfile(item);

                                return (
                                    <div key={item.id} className="flex w-64 flex-shrink-0 flex-col gap-3 rounded-xl border border-gray-100 bg-white p-3 transition hover:shadow-md md:w-full md:flex-row md:gap-4">
                                        <div className="relative h-32 w-full flex-shrink-0 overflow-hidden rounded-lg bg-gray-200 md:h-24 md:w-24">
                                            {item.image_url ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="flex h-full items-center justify-center text-xs text-gray-400">No Image</div>
                                            )}
                                        </div>

                                        <div className="flex flex-1 flex-col justify-between">
                                            <div>
                                                <div className="flex items-start justify-between">
                                                    <h4 className="font-semibold leading-tight text-gray-800">{item.name}</h4>
                                                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                                                        {item.distance_km ? `${item.distance_km}km` : '2km'}
                                                    </span>
                                                </div>
                                                <p className="mt-0.5 text-xs font-medium text-green-600">
                                                    Seller: {item.supplier_name || item.farmer_name || 'Farmer'}
                                                </p>
                                            </div>

                                            <div className="mt-2">
                                                <div className="flex items-end justify-between gap-3">
                                                    <div>
                                                        <span className="block text-sm font-bold text-green-700">{Math.floor(parseFloat(item.price_plyt))} PLYT</span>
                                                        <span className="block text-[10px] text-gray-400">{formatIdr(item.price_plyt)}</span>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedItem(commerceItem)}
                                                            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 shadow-sm transition hover:border-green-300 hover:text-green-700"
                                                        >
                                                            View
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAddToCart(item)}
                                                            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs text-white shadow-sm transition hover:bg-green-700"
                                                        >
                                                            Add
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="hidden border-t border-gray-200 p-4 md:block">
                    <button
                        type="button"
                        onClick={() => router.push('/wallet')}
                        className="w-full rounded-lg bg-green-600 py-3 font-medium text-white transition hover:bg-green-700"
                    >
                        View Basket ({totalItems})
                    </button>
                </div>
            </div>

            <ItemProfileModal
                item={selectedItem}
                onClose={() => setSelectedItem(null)}
                supplierActionLabel="Open supplier preview"
                onSupplierAction={selectedItem ? () => {
                    const previewRoute = getSupplierPreviewRoute(selectedItem.supplierRole, selectedItem.supplierBusinessId);
                    setSelectedItem(null);
                    router.push(previewRoute);
                } : undefined}
                primaryActionLabel="Add to basket"
                onPrimaryAction={selectedItem ? () => {
                    const matchingItem = items.find((item) => String(item.id) === selectedItem.id);
                    if (matchingItem) {
                        handleAddToCart(matchingItem);
                    }
                    setSelectedItem(null);
                } : undefined}
            />
        </div>
    );
}
