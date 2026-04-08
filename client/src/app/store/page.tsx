'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useCart } from '../../context/CartContext';
import ItemProfileModal from '../../components/commerce/ItemProfileModal';
import {
    type CommerceItemProfile,
    getSupplierPreviewRoute,
    inferSupplierRole
} from '../../lib/commerce';

type StoreTab = 'fresh_produce' | 'request_store';

type InventoryItem = {
    id: number | string;
    name: string;
    description?: string | null;
    price_plyt?: number | string | null;
    price_fiat?: number | string | null;
    image_url?: string | null;
    category?: string | null;
    quantity?: number | null;
    unit?: string | null;
    farmer_name?: string | null;
    supplier_name?: string | null;
    supplier_type?: string | null;
    supplier_location?: string | null;
    distance_km?: number | null;
};

const FALLBACK_PRODUCE_ITEMS: InventoryItem[] = [
    {
        id: 1,
        name: 'Organic Kale',
        category: 'Leafy Greens',
        image_url: '/assets/images/store/organic_kale.png',
        description: 'Mineral-rich bunches from nearby growers',
        price_fiat: 35000,
        farmer_name: 'Marketplace grower'
    },
    {
        id: 2,
        name: 'Cherry Tomatoes',
        category: 'Fruit',
        image_url: '/assets/images/store/cherry_tomatoes.png',
        description: 'Sweet, vine-ripened, small-batch harvest',
        price_fiat: 28000,
        farmer_name: 'Marketplace grower'
    },
    {
        id: 3,
        name: 'Fresh Thai Basil',
        category: 'Herbs',
        image_url: '/assets/images/store/thai_basil_seeds.png',
        description: 'Fragrant basil for soups, salads, and sauces',
        price_fiat: 25000,
        farmer_name: 'Marketplace grower'
    },
    {
        id: 4,
        name: 'Red Spinach',
        category: 'Leafy Greens',
        image_url: '/assets/images/store/red_spinach.png',
        description: 'Tender leaves for smoothies and sautés',
        price_fiat: 24000,
        farmer_name: 'Marketplace grower'
    },
    {
        id: 5,
        name: 'Bok Choy',
        category: 'Leafy Greens',
        image_url: '/assets/images/store/bok_choy.png',
        description: 'Crisp bunches for stir-fries and broth',
        price_fiat: 22000,
        farmer_name: 'Marketplace grower'
    },
    {
        id: 6,
        name: 'Sweet Potatoes',
        category: 'Roots',
        image_url: '/assets/images/systems/gallery_harvest.png',
        description: 'Slow-energy staple for meal prep',
        price_fiat: 26000,
        farmer_name: 'Marketplace grower'
    }
];

const TAB_OPTIONS: Array<{ id: StoreTab; label: string }> = [
    { id: 'fresh_produce', label: 'Fresh Produce' },
    { id: 'request_store', label: 'Messages to Admin' }
];

function toCommerceItemProfile(item: InventoryItem): CommerceItemProfile {
    const supplierName = String(item.supplier_name || item.farmer_name || 'Marketplace grower');
    const price = Number(item.price_fiat ?? item.price_plyt ?? 0);
    const quantity = Number(item.quantity ?? 1) || 1;
    const unit = String(item.unit || 'item');
    const distance = String(item.supplier_location || '').trim()
        || (typeof item.distance_km === 'number' ? `${item.distance_km} km delivery radius` : 'Local marketplace route');
    const role = inferSupplierRole(String(item.supplier_type || supplierName));

    return {
        id: String(item.id),
        name: item.name,
        category: 'Produce',
        price,
        quantity,
        unit,
        image: String(item.image_url || '/assets/images/store/organic_kale.png'),
        supplierName,
        supplierRole: role,
        supplierLocation: distance,
        description: String(item.description || 'Fresh listing from the current marketplace inventory.'),
        supplierBio: role === 'Distributor'
            ? 'This supplier is presented as a distribution-layer partner coordinating produce from multiple growers into one accessible marketplace flow.'
            : 'This supplier is presented as a grower-facing partner profile so customers can understand where their produce is coming from before purchase.',
        trustSignals: [
            role === 'Distributor' ? 'Distribution-ready inventory routing' : 'Grower-linked marketplace listing',
            item.category ? `${item.category} category listing` : 'Fresh marketplace inventory',
            typeof item.distance_km === 'number' ? `${item.distance_km} km away` : 'Local delivery or pickup planning'
        ],
        fulfillment: 'Pickup, routed delivery, and wallet-assisted checkout will appear here as supplier operations come online.',
        story: 'This modal is designed to scale as farmers and distributors plug inventory into PLYT, keeping the item story and supplier profile visible at the moment of purchase.'
    };
}

export default function StorePage() {
    const { user, openLoginModal } = useAuth();
    const { items: cartItems, addToCart, totalItems } = useCart();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<StoreTab>('fresh_produce');
    const [category, setCategory] = useState('All');
    const [storeRequest, setStoreRequest] = useState('');
    const [status, setStatus] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [inventoryError, setInventoryError] = useState<string | null>(null);
    const [isLoadingInventory, setIsLoadingInventory] = useState(true);
    const [selectedItem, setSelectedItem] = useState<CommerceItemProfile | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const pendingRequest = localStorage.getItem('pendingStoreRequest');
        if (!pendingRequest) return;

        setStoreRequest(pendingRequest);
        setActiveTab('request_store');
        localStorage.removeItem('pendingStoreRequest');
    }, []);

    useEffect(() => {
        let cancelled = false;

        const loadInventory = async () => {
            setIsLoadingInventory(true);
            setInventoryError(null);

            try {
                const response = await api.get('/inventory/search');
                if (cancelled) return;

                setInventoryItems(Array.isArray(response.data) ? response.data : []);
            } catch (error: any) {
                if (cancelled) return;

                setInventoryError(error?.response?.data?.error || 'Could not load live inventory right now.');
                setInventoryItems(FALLBACK_PRODUCE_ITEMS);
            } finally {
                if (!cancelled) {
                    setIsLoadingInventory(false);
                }
            }
        };

        void loadInventory();

        return () => {
            cancelled = true;
        };
    }, []);

    const produceCategories = useMemo(() => {
        const categories = new Set<string>();
        inventoryItems.forEach((item) => {
            const value = String(item.category || '').trim();
            if (value) categories.add(value);
        });

        return ['All', ...Array.from(categories)];
    }, [inventoryItems]);

    const filteredProduce = useMemo(
        () => (category === 'All'
            ? inventoryItems
            : inventoryItems.filter((item) => String(item.category || '').trim() === category)),
        [category, inventoryItems]
    );
    const cartQuantities = useMemo(
        () => new Map(cartItems.map((item) => [item.id, item.quantity])),
        [cartItems]
    );

    const handleAddToCart = (product: InventoryItem) => {
        const unit = String(product.unit || 'item');
        const supplierName = String(product.supplier_name || product.farmer_name || 'Marketplace grower');
        const price = Number(product.price_fiat ?? product.price_plyt ?? 0);

        addToCart({
            id: String(product.id),
            name: product.name,
            price,
            quantity: 1,
            image: String(product.image_url || '/assets/images/store/organic_kale.png'),
            unit,
            farm: supplierName
        });
    };

    const handleStoreRequestSubmit = async () => {
        const trimmedRequest = storeRequest.trim();
        if (!trimmedRequest) {
            setStatus('Please tell us what type of store you would like to have here.');
            return;
        }

        if (!user) {
            localStorage.setItem('pendingStoreRequest', trimmedRequest);
            openLoginModal();
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
                        Browse live inventory from farmers and distributors, or tell us what kind of store you want to see added next.
                    </p>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3">
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-right">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Basket sync</p>
                        <p className="mt-1 text-lg font-bold text-gray-900">{totalItems} items</p>
                        <button
                            type="button"
                            onClick={() => router.push('/wallet')}
                            className="mt-2 text-xs font-semibold text-emerald-700 transition hover:text-emerald-900"
                        >
                            Open wallet preview
                        </button>
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
            </div>

            {activeTab === 'fresh_produce' ? (
                <section>
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Fresh Produce</h2>
                        <p className="mt-2 text-sm text-gray-500">
                            Inventory shown here reflects active marketplace listings, with a fallback preview if nothing has been published yet.
                        </p>
                    </div>

                    {inventoryError ? (
                        <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-[#6b531f]">
                            {inventoryError}
                        </p>
                    ) : null}

                    <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
                        {produceCategories.map((cat) => (
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

                    {isLoadingInventory ? (
                        <div className="rounded-3xl border border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500 shadow-sm">
                            Loading marketplace inventory...
                        </div>
                    ) : filteredProduce.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-900">No inventory published yet</h3>
                            <p className="mt-2 text-sm text-gray-500">
                                As farmers and distributors add inventory, their produce will show up here automatically.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
                            {filteredProduce.map((product) => {
                                const commerceItem = toCommerceItemProfile(product);
                                const imageSrc = String(product.image_url || '/assets/images/store/organic_kale.png');
                                const price = Number(product.price_fiat ?? product.price_plyt ?? 0);
                                const seller = String(product.supplier_name || product.farmer_name || 'Marketplace seller');
                                const description = String(product.description || 'Fresh listing from the current marketplace inventory.');
                                const quantityLabel = product.quantity != null
                                    ? `${product.quantity}${product.unit ? ` ${product.unit}` : ''} available`
                                    : null;
                                const inCartQuantity = cartQuantities.get(String(product.id)) || 0;

                                return (
                                    <div key={product.id} className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md">
                                        <div className="relative aspect-square bg-white">
                                            <Image
                                                src={imageSrc}
                                                alt={product.name}
                                                fill
                                                className="object-cover transition duration-300 group-hover:scale-105"
                                            />
                                        </div>
                                        <div className="p-4">
                                            <div className="mb-2 flex items-start justify-between gap-3">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 transition group-hover:text-green-600">{product.name}</h3>
                                                    <p className="text-xs text-gray-500">{product.category || 'Marketplace'}</p>
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-500">{description}</p>
                                            <div className="mt-3 space-y-1 text-xs text-gray-400">
                                                <p>Seller: {seller}</p>
                                                {quantityLabel ? <p>{quantityLabel}</p> : null}
                                                {typeof product.distance_km === 'number' ? <p>{product.distance_km} km away</p> : null}
                                            </div>
                                            <div className="mt-4 flex items-center justify-between gap-3">
                                                <div>
                                                    <span className="font-bold text-gray-900">Rp {price.toLocaleString()}</span>
                                                    {inCartQuantity > 0 ? (
                                                        <p className="mt-1 text-[11px] font-medium text-emerald-700">{inCartQuantity} in basket</p>
                                                    ) : null}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedItem(commerceItem)}
                                                        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-green-300 hover:text-green-700"
                                                    >
                                                        View profile
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddToCart(product)}
                                                        className="rounded-xl bg-green-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-green-700"
                                                    >
                                                        Add to basket
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
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

            <ItemProfileModal
                item={selectedItem}
                onClose={() => setSelectedItem(null)}
                supplierActionLabel="Open supplier preview"
                onSupplierAction={selectedItem ? () => {
                    const previewRoute = getSupplierPreviewRoute(selectedItem.supplierRole);
                    setSelectedItem(null);
                    router.push(previewRoute);
                } : undefined}
                primaryActionLabel="Add to basket"
                onPrimaryAction={selectedItem ? () => {
                    const matchingItem = inventoryItems.find((item) => String(item.id) === selectedItem.id);
                    if (matchingItem) {
                        handleAddToCart(matchingItem);
                    }
                    setSelectedItem(null);
                } : undefined}
            />
        </div>
    );
}
