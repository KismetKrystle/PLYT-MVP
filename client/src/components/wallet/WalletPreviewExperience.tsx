'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency, Currency } from '../../lib/currency';
import { useAuth } from '../../lib/auth';
import { useCart, type CartItem } from '../../context/CartContext';
import { MOCK_DIGITAL_ASSETS } from '../../lib/mockDigitalAssets';
import ItemProfileModal from '../commerce/ItemProfileModal';
import {
    type CommerceCategory,
    type CommerceItemProfile,
    type SupplierRole,
    getSupplierPreviewRoute
} from '../../lib/commerce';

type WalletTab = 'overview' | 'basket' | 'purchases' | 'assets' | 'methods';
type WalletLineItem = CommerceItemProfile;

type PurchaseRecord = {
    id: string;
    date: string;
    status: string;
    total: number;
    settlement: string;
    lineItems: WalletLineItem[];
};

const CONNECTED_ACCOUNTS = [
    { id: 1, type: 'Bank', name: 'BCA', number: '**** 8899', connected: true },
    { id: 2, type: 'E-Wallet', name: 'GoPay', number: '0812-****-9988', connected: true },
    { id: 3, type: 'XRPL Wallet', name: 'Xaman', number: 'Preview only', connected: false }
];

const WALLET_ROADMAP = [
    {
        title: 'XRPL wallet connection',
        status: 'In preview',
        description: 'Link a member wallet, surface balances, and prepare payout rails for future marketplace activity.'
    },
    {
        title: 'Micro-purchases across the app',
        status: 'Coming soon',
        description: 'Use one wallet for produce, product, and service checkout without leaving PLYT.'
    },
    {
        title: 'Tokenized expert resources',
        status: 'Coming soon',
        description: 'Mint premium protocols, books, recipe systems, and credentials into transferable digital assets.'
    }
];

const DEMO_BASKET_ITEMS: WalletLineItem[] = [
    {
        id: 'basket-kale',
        name: 'Mineral-rich kale bundle',
        category: 'Produce',
        price: 4.8,
        quantity: 2,
        unit: 'bundle',
        image: '/assets/images/gallery/expert.jpeg',
        supplierName: 'Sunrise Farm Collective',
        supplierRole: 'Farmer',
        supplierLocation: 'Bali highlands',
        description: 'Fresh-cut kale harvested for quick same-day delivery and positioned as a micronutrient-dense base for meals.',
        supplierBio: 'A small regenerative grower group supplying leafy greens to local households and wellness kitchens.',
        trustSignals: ['Regenerative growing practices', 'Same-day harvest window', 'Local delivery coverage'],
        fulfillment: 'Courier dropoff or pickup point within 12 km.',
        story: 'Presented as a future wallet-paid produce purchase inside the app.'
    },
    {
        id: 'basket-guide',
        name: 'Gut reset recipe guide',
        category: 'Products',
        price: 12,
        quantity: 1,
        unit: 'guide',
        image: '/assets/images/gallery/takeout.jpeg',
        supplierName: 'Coach Amara',
        supplierRole: 'Expert',
        supplierLocation: 'Remote expert studio',
        description: 'A structured digital guide that combines recipes, prep guidance, and a simple symptom tracking cadence.',
        supplierBio: 'Functional nutrition educator focused on digestion-first meal planning and behavior-friendly protocols.',
        trustSignals: ['Expert-authored', 'Downloadable resource', 'Future tokenized ownership path'],
        fulfillment: 'Instant delivery to wallet library after purchase.',
        story: 'Presented as a future micro-purchase from an expert inside the same wallet.'
    }
];

const PURCHASE_HISTORY: PurchaseRecord[] = [
    {
        id: '#PUR-201',
        date: 'Apr 02, 2026',
        status: 'Delivered',
        total: 18.4,
        settlement: 'Paid from PLYT wallet',
        lineItems: [
            {
                id: 'purchase-bokchoy',
                name: 'Bok choy weekly pack',
                category: 'Produce',
                price: 8.4,
                quantity: 1,
                unit: 'pack',
                image: '/assets/images/gallery/takeout.jpeg',
                supplierName: 'GreenBridge Distribution',
                supplierRole: 'Distributor',
                supplierLocation: 'Denpasar fulfillment hub',
                description: 'A mixed bok choy pack sourced from nearby growers and routed through a local distribution layer.',
                supplierBio: 'Regional distributor specializing in produce routing, light cold-chain handling, and household delivery windows.',
                trustSignals: ['Regional sourcing network', 'Cold-chain handling', 'Weekly route optimization'],
                fulfillment: 'Delivered during scheduled morning route.',
                story: 'Shows how the wallet can settle routine produce orders and preserve supplier context.'
            },
            {
                id: 'purchase-basil',
                name: 'Thai basil add-on',
                category: 'Produce',
                price: 2.5,
                quantity: 1,
                unit: 'bundle',
                image: '/assets/images/gallery/expert.jpeg',
                supplierName: 'GreenBridge Distribution',
                supplierRole: 'Distributor',
                supplierLocation: 'Denpasar fulfillment hub',
                description: 'A same-basket herb bundle paired with produce routes for low-friction incremental spending.',
                supplierBio: 'Regional distributor specializing in produce routing, light cold-chain handling, and household delivery windows.',
                trustSignals: ['Route-level bundling', 'Low-friction add-on purchase'],
                fulfillment: 'Packed into the same produce delivery window.',
                story: 'A simple example of micro-purchases layered into one order.'
            }
        ]
    },
    {
        id: '#PUR-202',
        date: 'Mar 26, 2026',
        status: 'Completed',
        total: 27,
        settlement: 'Wallet + credit blend',
        lineItems: [
            {
                id: 'purchase-service',
                name: '15-minute metabolic review',
                category: 'Services',
                price: 27,
                quantity: 1,
                unit: 'session',
                image: '/assets/images/gallery/expert.jpeg',
                supplierName: 'Coach Amara',
                supplierRole: 'Expert',
                supplierLocation: 'Remote consultation',
                description: 'A short paid advisory session designed to translate food logs into a few high-leverage next steps.',
                supplierBio: 'Functional nutrition educator focused on digestion-first meal planning and behavior-friendly protocols.',
                trustSignals: ['Verified expert role', 'Service-based micro-purchase', 'Future payout rails through XRPL'],
                fulfillment: 'Session delivery through future in-app scheduling and secure chat.',
                story: 'Demonstrates how services can sit beside products and produce in the same wallet.'
            }
        ]
    }
];

function toWalletLineItem(item: CartItem): WalletLineItem {
    return {
        id: item.id,
        name: item.name,
        category: 'Produce',
        price: item.price,
        quantity: item.quantity,
        unit: item.unit,
        image: item.image,
        supplierName: item.farm || 'PLYT supplier network',
        supplierRole: 'Farmer',
        supplierLocation: 'Local supplier route',
        description: `${item.name} ready for micro-purchase checkout through the future wallet layer.`,
        supplierBio: 'This supplier preview uses current cart data and will later connect to a richer public supplier profile.',
        trustSignals: ['Added from current cart', 'Wallet checkout candidate', 'Supplier profile preview planned'],
        fulfillment: 'Delivery, pickup, or routing options will appear during checkout.',
        story: 'This row comes from your live cart context, not seeded demo data.'
    };
}

function roleBadgeClass(role: SupplierRole) {
    if (role === 'Farmer') return 'bg-emerald-50 text-emerald-700';
    if (role === 'Expert') return 'bg-violet-100 text-violet-700';
    return 'bg-slate-100 text-slate-700';
}

function categoryBadgeClass(category: CommerceCategory) {
    if (category === 'Produce') return 'bg-green-100 text-green-700';
    if (category === 'Services') return 'bg-amber-100 text-amber-700';
    return 'bg-blue-100 text-blue-700';
}

export default function WalletPreviewExperience() {
    const { user } = useAuth();
    const { items, updateQuantity, removeFromCart, totalItems, cartTotal } = useCart();
    const router = useRouter();
    const [currency, setCurrency] = useState<Currency>('IDR');
    const [activeTab, setActiveTab] = useState<WalletTab>('overview');
    const [selectedItem, setSelectedItem] = useState<WalletLineItem | null>(null);

    const usingLiveCart = items.length > 0;
    const basketItems = useMemo(
        () => (usingLiveCart ? items.map(toWalletLineItem) : DEMO_BASKET_ITEMS),
        [items, usingLiveCart]
    );
    const basketTotal = usingLiveCart
        ? cartTotal
        : DEMO_BASKET_ITEMS.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const basketCount = usingLiveCart
        ? totalItems
        : DEMO_BASKET_ITEMS.reduce((sum, item) => sum + item.quantity, 0);
    const purchaseCount = PURCHASE_HISTORY.length;
    const purchaseVolume = PURCHASE_HISTORY.reduce((sum, purchase) => sum + purchase.total, 0);
    const balancePLYT = 1250;
    const balanceUSD = 12.5;
    const previewWalletAddress = user?.wallet_address || 'rPLYTPreviewWalletComingSoon';
    const isPreviewMode = true;

    const formatAmount = (value: number) =>
        currency === 'IDR' ? formatCurrency(value, 'IDR') : formatCurrency(value, 'USD');

    return (
        <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-3xl font-bold text-gray-900">Wallet Preview</h1>
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
                            Coming soon
                        </span>
                    </div>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                        A demo of how PLYT wallet management can cover balances, micro-purchases, supplier context, and future XRPL-backed ownership in one place.
                    </p>
                </div>
                <div className="flex self-start rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
                    {(['IDR', 'USD'] as Currency[]).map((value) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setCurrency(value)}
                            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                                currency === value ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            {value}
                        </button>
                    ))}
                </div>
            </div>

            <section className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-green-50 p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">XRPL roadmap preview</p>
                        <h2 className="mt-2 text-xl font-bold text-gray-900">Demo-ready today, transactional later</h2>
                        <p className="mt-2 text-sm leading-6 text-gray-600">
                            This preview tells the story of one wallet spanning produce, products, and services. The flows remain read-only for now, but the structure is ready for demo conversations around checkout, creator payouts, and asset ownership.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Preview wallet</p>
                        <p className="mt-1 font-mono text-sm text-gray-800">{previewWalletAddress}</p>
                        <p className="mt-2 text-xs text-gray-500">Network lane: XRPL testnet/dev narrative</p>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 to-gray-800 p-8 text-white shadow-xl">
                        <div className="absolute right-0 top-0 h-64 w-64 -translate-y-12 translate-x-12 rounded-full bg-green-500/10 blur-3xl" />
                        <div className="relative z-10">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold uppercase tracking-wider text-gray-400">Preview Balance</p>
                                {isPreviewMode ? (
                                    <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/75">
                                        Read only
                                    </span>
                                ) : null}
                            </div>
                            <h2 className="text-5xl font-bold">{formatAmount(balanceUSD)}</h2>
                            <p className="mb-8 mt-2 text-sm font-medium text-green-400">approx {balancePLYT.toLocaleString()} PLYT demo balance</p>

                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                                    <p className="text-xs uppercase tracking-wide text-gray-400">Basket</p>
                                    <p className="mt-2 text-2xl font-bold text-white">{basketCount}</p>
                                    <p className="mt-1 text-xs text-gray-400">items queued for micro-purchase</p>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                                    <p className="text-xs uppercase tracking-wide text-gray-400">Purchase history</p>
                                    <p className="mt-2 text-2xl font-bold text-white">{purchaseCount}</p>
                                    <p className="mt-1 text-xs text-gray-400">recent wallet-managed purchases</p>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                                    <p className="text-xs uppercase tracking-wide text-gray-400">Digital assets</p>
                                    <p className="mt-2 text-2xl font-bold text-white">{MOCK_DIGITAL_ASSETS.length}</p>
                                    <p className="mt-1 text-xs text-gray-400">records and premium resources</p>
                                </div>
                            </div>

                            <div className="mt-6 flex flex-wrap gap-4">
                                <button
                                    type="button"
                                    disabled
                                    className="cursor-not-allowed rounded-xl bg-green-600/50 px-6 py-3 text-sm font-bold text-white/80 shadow-lg shadow-green-900/10"
                                >
                                    Checkout with wallet soon
                                </button>
                                <button
                                    type="button"
                                    disabled
                                    className="cursor-not-allowed rounded-xl bg-white/10 px-6 py-3 text-sm font-bold text-white/75 backdrop-blur-md"
                                >
                                    Creator payout tools soon
                                </button>
                            </div>
                        </div>
                    </section>

                    <div className="flex overflow-x-auto border-b border-gray-200 no-scrollbar">
                        {([
                            ['overview', 'Overview'],
                            ['basket', 'Basket'],
                            ['purchases', 'Purchases'],
                            ['assets', 'Assets'],
                            ['methods', 'Methods']
                        ] as Array<[WalletTab, string]>).map(([tab, label]) => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveTab(tab)}
                                className={`whitespace-nowrap border-b-2 px-6 py-3 text-sm font-semibold transition-colors ${
                                    activeTab === tab
                                        ? 'border-green-600 text-green-700'
                                        : 'border-transparent text-gray-500 hover:text-gray-800'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="min-h-[360px]">
                        {activeTab === 'overview' ? (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                    This overview is built for demos. It shows how wallet balances, basket checkout, and post-purchase records can sit together before the live payment rails are activated.
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                                        <p className="text-sm font-bold text-gray-900">Basket value</p>
                                        <p className="mt-2 text-3xl font-bold text-gray-900">{formatAmount(basketTotal)}</p>
                                        <p className="mt-2 text-sm text-gray-500">
                                            {usingLiveCart
                                                ? 'Using your live cart context as the wallet basket preview.'
                                                : 'Showing seeded demo basket items so the future flow is easy to present.'}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                                        <p className="text-sm font-bold text-gray-900">Purchase volume</p>
                                        <p className="mt-2 text-3xl font-bold text-gray-900">{formatAmount(purchaseVolume)}</p>
                                        <p className="mt-2 text-sm text-gray-500">A combined view of produce, products, and service spend.</p>
                                    </div>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('basket')}
                                        className="rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition hover:border-green-200 hover:shadow-md"
                                    >
                                        <p className="text-sm font-bold text-gray-900">Open basket management</p>
                                        <p className="mt-2 text-sm leading-6 text-gray-600">Review quantities, inspect suppliers, and prepare the future wallet checkout path.</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('purchases')}
                                        className="rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition hover:border-green-200 hover:shadow-md"
                                    >
                                        <p className="text-sm font-bold text-gray-900">Open purchase history</p>
                                        <p className="mt-2 text-sm leading-6 text-gray-600">Show previous purchases and open item-level detail modals with supplier context.</p>
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        {activeTab === 'basket' ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">Shopping basket</h3>
                                        <p className="mt-1 text-sm text-gray-500">
                                            {usingLiveCart
                                                ? 'Live cart items are mirrored here so the wallet can act as the future checkout control center.'
                                                : 'Seeded preview items stand in for the future in-app basket experience.'}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-right">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Basket total</p>
                                        <p className="mt-1 text-lg font-bold text-gray-900">{formatAmount(basketTotal)}</p>
                                    </div>
                                </div>

                                {basketItems.map((item) => (
                                    <div key={item.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="flex gap-4">
                                                <div className="h-16 w-16 overflow-hidden rounded-xl bg-gray-100">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={item.image || '/assets/images/gallery/user_avatar.png'}
                                                        alt={item.name}
                                                        className="h-full w-full object-cover"
                                                    />
                                                </div>
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h4 className="font-bold text-gray-900">{item.name}</h4>
                                                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${categoryBadgeClass(item.category)}`}>
                                                            {item.category}
                                                        </span>
                                                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${roleBadgeClass(item.supplierRole)}`}>
                                                            {item.supplierRole}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 text-sm text-gray-500">{item.supplierName} - {item.supplierLocation}</p>
                                                    <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">{item.description}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-start gap-3 sm:items-end">
                                                <p className="text-lg font-bold text-gray-900">{formatAmount(item.price * item.quantity)}</p>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={!usingLiveCart}
                                                        onClick={() => updateQuantity(item.id, -1)}
                                                        className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
                                                            usingLiveCart
                                                                ? 'border-gray-200 bg-white text-gray-700 hover:border-green-300 hover:text-green-700'
                                                                : 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
                                                        }`}
                                                    >
                                                        -
                                                    </button>
                                                    <span className="min-w-[3rem] text-center text-sm font-semibold text-gray-700">
                                                        {item.quantity} x {item.unit}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        disabled={!usingLiveCart}
                                                        onClick={() => updateQuantity(item.id, 1)}
                                                        className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
                                                            usingLiveCart
                                                                ? 'border-gray-200 bg-white text-gray-700 hover:border-green-300 hover:text-green-700'
                                                                : 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
                                                        }`}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedItem(item)}
                                                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-green-300 hover:text-green-700"
                                                    >
                                                        View profile
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={!usingLiveCart}
                                                        onClick={() => removeFromCart(item.id)}
                                                        className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                                                            usingLiveCart
                                                                ? 'border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100'
                                                                : 'cursor-not-allowed border border-gray-200 bg-gray-50 text-gray-400'
                                                        }`}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-900">
                                    Wallet checkout, split settlements, and supplier-specific routing are intentionally disabled for the demo, but this basket layout is ready to present how those steps will fit.
                                </div>
                            </div>
                        ) : null}

                        {activeTab === 'purchases' ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                                    <h3 className="text-lg font-bold text-gray-900">Purchase history</h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        A combined history of produce, products, and services with the same wallet acting as the settlement layer.
                                    </p>
                                </div>
                                {PURCHASE_HISTORY.map((purchase) => (
                                    <div key={purchase.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                                        <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{purchase.id}</p>
                                                <p className="mt-1 text-sm text-gray-500">{purchase.date} - {purchase.status}</p>
                                                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-400">{purchase.settlement}</p>
                                            </div>
                                            <p className="text-lg font-bold text-gray-900">{formatAmount(purchase.total)}</p>
                                        </div>
                                        <div className="mt-4 space-y-3">
                                            {purchase.lineItems.map((item) => (
                                                <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-gray-50/70 p-4 md:flex-row md:items-center md:justify-between">
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="font-semibold text-gray-900">{item.name}</p>
                                                            <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${categoryBadgeClass(item.category)}`}>
                                                                {item.category}
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 text-sm text-gray-500">{item.supplierName} - {item.supplierRole}</p>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-sm font-semibold text-gray-900">{formatAmount(item.price * item.quantity)}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedItem(item)}
                                                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-green-300 hover:text-green-700"
                                                        >
                                                            View profile
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : null}

                        {activeTab === 'assets' ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-800">
                                    Recipes, books, and research uploads can be minted into digital assets and managed here. Transfer controls stay disabled until the XRPL layer is activated.
                                </div>
                                {MOCK_DIGITAL_ASSETS.map((asset) => (
                                    <div key={asset.id} className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-16 w-16 overflow-hidden rounded-lg bg-gray-100">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={asset.image} alt={asset.name} className="h-full w-full object-cover" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900">{asset.name}</h4>
                                                <p className="text-xs text-gray-500">{asset.type}</p>
                                                <p className="mt-1 text-xs text-gray-500">Minted from {asset.mintedFrom}</p>
                                                <span className="mt-2 inline-block rounded bg-gray-100 px-2 py-0.5 font-mono text-[10px] text-gray-600">
                                                    {asset.hash}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => router.push(`/wallet/assets/${asset.id}`)}
                                                className="rounded-lg bg-gray-50 px-4 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-100"
                                            >
                                                View
                                            </button>
                                            <button
                                                type="button"
                                                disabled
                                                className="cursor-not-allowed rounded-lg bg-green-600/55 px-4 py-2 text-sm font-bold text-white"
                                            >
                                                Transfer soon
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : null}

                        {activeTab === 'methods' ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                {CONNECTED_ACCOUNTS.map((account) => (
                                    <div key={account.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className={`flex h-12 w-12 items-center justify-center rounded-lg font-bold text-white ${account.connected ? 'bg-blue-600' : 'bg-gray-300'}`}>
                                                {account.name[0]}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900">{account.name}</h4>
                                                <p className="text-sm text-gray-500">{account.type} - {account.connected ? account.number : 'Not connected yet'}</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            disabled
                                            className={`cursor-not-allowed rounded-lg px-4 py-2 text-sm font-bold opacity-70 ${account.connected ? 'bg-red-50/60 text-red-500' : 'bg-green-50/60 text-green-600'}`}
                                        >
                                            {account.connected ? 'Disconnect soon' : 'Connect soon'}
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    disabled
                                    className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-3 font-bold text-gray-400"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add New Method soon
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 font-bold text-gray-900">Roadmap</h3>
                        <div className="space-y-3">
                            {WALLET_ROADMAP.map((item) => (
                                <div key={item.title} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="font-semibold text-gray-900">{item.title}</p>
                                        <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                                            {item.status}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-sm leading-6 text-gray-600">{item.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-blue-100 bg-blue-50 p-6">
                        <h3 className="mb-2 font-bold text-blue-900">Demo talking points</h3>
                        <div className="space-y-2 text-sm text-blue-800">
                            <p>Show how one wallet can manage produce, goods, and service purchases across the app.</p>
                            <p>Use the item modal to make supplier trust, credentials, and fulfillment context visible at checkout time.</p>
                            <p>Frame digital assets as the long-term ownership layer for premium content, provenance, and resale-aware commerce.</p>
                        </div>
                    </div>
                </div>
            </div>

            <ItemProfileModal
                item={selectedItem}
                currency={currency}
                onClose={() => setSelectedItem(null)}
                supplierActionLabel="Open preview route"
                onSupplierAction={selectedItem ? () => {
                    const previewProfileRoute = getSupplierPreviewRoute(selectedItem.supplierRole);
                    setSelectedItem(null);
                    router.push(previewProfileRoute);
                } : undefined}
                primaryActionLabel="Buy again soon"
                primaryActionDisabled
            />
        </div>
    );
}
