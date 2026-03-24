'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';
import { useAuth } from '../../lib/auth';

type StoreTab = 'fresh_produce' | 'request_store';

const PRODUCE_CATEGORIES = ['All', 'Leafy Greens', 'Fruit', 'Herbs', 'Roots'];

const PRODUCE_ITEMS = [
    { id: 1, name: 'Organic Kale', price: 35000, category: 'Leafy Greens', image: '/assets/images/store/organic_kale.png', note: 'Mineral-rich bunches from nearby growers' },
    { id: 2, name: 'Cherry Tomatoes', price: 28000, category: 'Fruit', image: '/assets/images/store/cherry_tomatoes.png', note: 'Sweet, vine-ripened, small-batch harvest' },
    { id: 3, name: 'Fresh Thai Basil', price: 25000, category: 'Herbs', image: '/assets/images/store/thai_basil_seeds.png', note: 'Fragrant basil for soups, salads, and sauces' },
    { id: 4, name: 'Red Spinach', price: 24000, category: 'Leafy Greens', image: '/assets/images/store/red_spinach.png', note: 'Tender leaves for smoothies and sautés' },
    { id: 5, name: 'Bok Choy', price: 22000, category: 'Leafy Greens', image: '/assets/images/store/bok_choy.png', note: 'Crisp bunches for stir-fries and broth' },
    { id: 6, name: 'Sweet Potatoes', price: 26000, category: 'Roots', image: '/assets/images/systems/gallery_harvest.png', note: 'Slow-energy staple for meal prep' },
];

const TAB_OPTIONS: Array<{ id: StoreTab; label: string }> = [
    { id: 'fresh_produce', label: 'Fresh Produce' },
    { id: 'request_store', label: 'Messages to Admin' }
];

export default function StorePage() {
    const router = useRouter();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<StoreTab>('fresh_produce');
    const [category, setCategory] = useState('All');
    const [storeRequest, setStoreRequest] = useState('');
    const [status, setStatus] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const pendingRequest = localStorage.getItem('pendingStoreRequest');
        if (!pendingRequest) return;

        setStoreRequest(pendingRequest);
        setActiveTab('request_store');
        localStorage.removeItem('pendingStoreRequest');
    }, []);

    const filteredProduce = useMemo(
        () => (category === 'All' ? PRODUCE_ITEMS : PRODUCE_ITEMS.filter((item) => item.category === category)),
        [category]
    );

    const handleStoreRequestSubmit = async () => {
        const trimmedRequest = storeRequest.trim();
        if (!trimmedRequest) {
            setStatus('Please tell us what type of store you would like to have here.');
            return;
        }

        if (!user) {
            localStorage.setItem('pendingStoreRequest', trimmedRequest);
            router.push('/login?redirect=%2Fstore');
            return;
        }

        setIsSaving(true);
        setStatus(null);
        try {
            await api.post('/messages-to-admin', {
                subject: 'store_request',
                context: 'store_page',
                message: trimmedRequest
            });
            setStoreRequest('');
            setStatus('Your request was sent to Messages to Admin.');
        } catch (error: any) {
            setStatus(error?.response?.data?.error || 'Could not send your message right now.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="container mx-auto max-w-7xl px-4 py-8">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Store</h1>
                    <p className="mt-2 text-sm text-gray-500">
                        Browse fresh produce now, or tell us what kind of store you want to see added next.
                    </p>
                </div>

                <div className="inline-flex rounded-full border border-gray-200 bg-white p-1 shadow-sm">
                    {TAB_OPTIONS.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                                activeTab === tab.id
                                    ? 'bg-green-600 text-white shadow'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'fresh_produce' ? (
                <section>
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Fresh Produce</h2>
                        <p className="mt-2 text-sm text-gray-500">
                            Seasonal produce listings for the marketplace experience you want to grow.
                        </p>
                    </div>

                    <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
                        {PRODUCE_CATEGORIES.map((cat) => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setCategory(cat)}
                                className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition ${
                                    category === cat
                                        ? 'bg-green-600 text-white shadow-lg shadow-green-200'
                                        : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
                        {filteredProduce.map((product) => (
                            <div key={product.id} className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md">
                                <div className="relative aspect-square bg-white">
                                    <Image
                                        src={product.image}
                                        alt={product.name}
                                        fill
                                        className="object-cover transition duration-300 group-hover:scale-105"
                                    />
                                </div>
                                <div className="p-4">
                                    <div className="mb-2 flex items-start justify-between gap-3">
                                        <div>
                                            <h3 className="font-bold text-gray-900 transition group-hover:text-green-600">{product.name}</h3>
                                            <p className="text-xs text-gray-500">{product.category}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-500">{product.note}</p>
                                    <div className="mt-4 flex items-center justify-between">
                                        <span className="font-bold text-gray-900">Rp {product.price.toLocaleString()}</span>
                                        <button
                                            type="button"
                                            className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700 transition hover:bg-green-600 hover:text-white"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            ) : (
                <section className="mx-auto max-w-3xl rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-2xl font-bold text-gray-900">Messages to Admin</h2>
                    <p className="mt-3 text-sm text-gray-500">
                        What type of store would you like to have here?
                    </p>

                    <div className="mt-6 space-y-4">
                        <label className="block">
                            <span className="mb-2 block text-sm font-medium text-gray-700">Your request</span>
                            <textarea
                                value={storeRequest}
                                onChange={(event) => setStoreRequest(event.target.value)}
                                placeholder="Example: I would love to see a natural food store with smoothie supplies, raw snacks, and herbal wellness products."
                                className="min-h-[180px] w-full resize-y rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                            />
                        </label>

                        {!user ? (
                            <p className="text-xs text-gray-400">
                                If you are not signed in, we will send you to login first and then bring you back to the store page.
                            </p>
                        ) : null}

                        {status ? (
                            <p className="text-sm text-gray-600">{status}</p>
                        ) : null}

                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={handleStoreRequestSubmit}
                                disabled={isSaving}
                                className="rounded-full bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
                            >
                                {isSaving ? 'Sending...' : 'Send to Admin'}
                            </button>
                            <p className="text-xs text-gray-500">
                                These requests are now saved into the `Messages to Admin` inbox flow for the admin dashboard.
                            </p>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
