'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '../../../lib/api';
import { useCart } from '../../../context/CartContext';
import type { BusinessInventoryItem, PublicBusinessProfileResponse } from '../../../lib/business';

function formatUsd(value: number | string | null | undefined) {
    const amount = Number(value || 0);
    return amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

export default function PublicBusinessProfilePage() {
    const params = useParams<{ businessId: string }>();
    const router = useRouter();
    const { addToCart, totalItems } = useCart();
    const businessId = String(params?.businessId || '').trim();
    const [data, setData] = useState<PublicBusinessProfileResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadProfile = async () => {
            if (!businessId) {
                setError('Business profile not found.');
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const response = await api.get(`/businesses/${businessId}/public`);
                if (cancelled) return;
                setData(response.data);
            } catch (loadError: any) {
                if (cancelled) return;
                setError(loadError?.response?.data?.error || 'Could not load this public business profile.');
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        void loadProfile();

        return () => {
            cancelled = true;
        };
    }, [businessId]);

    const business = data?.business || null;
    const items = data?.items || [];
    const activeCategories = useMemo(
        () => Array.from(new Set(items.map((item) => String(item.category || '').trim()).filter(Boolean))),
        [items]
    );

    const handleAddToCart = (item: BusinessInventoryItem) => {
        if (!business) return;
        addToCart({
            id: String(item.id),
            name: item.name,
            price: Number(item.price_fiat || 0),
            quantity: 1,
            image: String(item.image_url || ''),
            unit: String(item.unit || 'item'),
            farm: business.name
        });
    };

    if (isLoading) {
        return <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-gray-500">Loading public business profile...</div>;
    }

    if (error || !business) {
        return (
            <div className="mx-auto max-w-4xl px-4 py-12">
                <div className="rounded-3xl border border-red-100 bg-red-50 px-6 py-8">
                    <h1 className="text-2xl font-bold text-gray-900">Public business profile unavailable</h1>
                    <p className="mt-3 text-sm text-gray-600">{error || 'We could not find that supplier page.'}</p>
                    <Link href="/store" className="mt-5 inline-flex rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700">
                        Back to store
                    </Link>
                </div>
            </div>
        );
    }

    const heroImage = business.business_image_url || '/assets/images/gallery/expert.jpeg';
    const profileDescription = business.description || business.sourcing_story || 'This supplier is preparing a fuller public profile inside PLYT.';
    const trustSignals = business.trust_signals?.length
        ? business.trust_signals
        : [
            business.business_type === 'distributor' ? 'Distribution-ready supplier identity' : 'Farmer-led supplier identity',
            business.primary_location ? `Operating from ${business.primary_location}` : 'Local network presence',
            business.inventory_count ? `${business.inventory_count} active inventory items` : 'Catalog in progress'
        ];

    return (
        <div className="bg-[#f6f8f4]">
            <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
                <div className="overflow-hidden rounded-[2rem] border border-emerald-100 bg-white shadow-sm">
                    <div className="relative h-64 w-full bg-emerald-100 md:h-80">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={heroImage} alt={business.name} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#081321]/75 via-[#081321]/30 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur">
                                    {business.business_type}
                                </span>
                                <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur">
                                    Public Supplier Profile
                                </span>
                            </div>
                            <h1 className="mt-4 max-w-3xl text-3xl font-bold text-white md:text-5xl">{business.name}</h1>
                            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/90 md:text-base">{profileDescription}</p>
                        </div>
                    </div>

                    <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_0.85fr]">
                        <div className="space-y-6">
                            <section className="rounded-3xl border border-gray-200 bg-[#fbfcfa] p-5">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">About this business</p>
                                        <h2 className="mt-2 text-2xl font-bold text-gray-900">Scout the supplier before you buy</h2>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => router.push('/store')}
                                        className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-green-300 hover:text-green-700"
                                    >
                                        Browse marketplace
                                    </button>
                                </div>
                                <div className="mt-5 grid gap-4 md:grid-cols-3">
                                    <div className="rounded-2xl border border-gray-200 bg-white p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Primary location</p>
                                        <p className="mt-2 text-sm font-semibold text-gray-900">{business.primary_location || 'Location coming soon'}</p>
                                    </div>
                                    <div className="rounded-2xl border border-gray-200 bg-white p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Service region</p>
                                        <p className="mt-2 text-sm font-semibold text-gray-900">{business.service_region || 'Region coming soon'}</p>
                                    </div>
                                    <div className="rounded-2xl border border-gray-200 bg-white p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Operators</p>
                                        <p className="mt-2 text-sm font-semibold text-gray-900">{business.operator_count || 0} attached</p>
                                    </div>
                                </div>
                                {business.fulfillment_notes ? (
                                    <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-900">
                                        <span className="font-semibold">Fulfillment notes:</span> {business.fulfillment_notes}
                                    </div>
                                ) : null}
                            </section>

                            <section className="rounded-3xl border border-gray-200 bg-white p-5">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">Inventory</p>
                                        <h2 className="mt-2 text-2xl font-bold text-gray-900">Current catalog</h2>
                                    </div>
                                    <div className="rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                                        {items.length} listed items
                                    </div>
                                </div>
                                {items.length === 0 ? (
                                    <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-8 text-sm text-gray-500">
                                        This supplier has not published inventory yet, but their business profile is now ready for direct discovery.
                                    </div>
                                ) : (
                                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                                        {items.map((item) => (
                                            <div key={item.id} className="overflow-hidden rounded-3xl border border-gray-200 bg-[#fbfcfa]">
                                                <div className="h-48 w-full bg-gray-100">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={String(item.image_url || heroImage)}
                                                        alt={item.name}
                                                        className="h-full w-full object-cover"
                                                    />
                                                </div>
                                                <div className="p-5">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{item.category || 'Marketplace item'}</p>
                                                            <h3 className="mt-2 text-lg font-bold text-gray-900">{item.name}</h3>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-lg font-bold text-gray-900">{formatUsd(item.price_fiat)}</p>
                                                            <p className="mt-1 text-xs text-gray-500">{Number(item.quantity || 0)} {String(item.unit || 'item')}</p>
                                                        </div>
                                                    </div>
                                                    <p className="mt-3 text-sm leading-6 text-gray-600">{item.description || 'No product description added yet.'}</p>
                                                    <div className="mt-4 flex flex-wrap gap-2">
                                                        {(Array.isArray(item.enrichment_data?.consumer_tags) ? item.enrichment_data.consumer_tags : []).slice(0, 3).map((tag) => (
                                                            <span key={tag} className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <div className="mt-5 flex flex-wrap gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAddToCart(item)}
                                                            className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
                                                        >
                                                            Add to basket
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => router.push('/wallet')}
                                                            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-green-300 hover:text-green-700"
                                                        >
                                                            Open wallet
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        </div>

                        <aside className="space-y-6">
                            <section className="rounded-3xl border border-gray-200 bg-white p-5">
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">Trust signals</p>
                                <div className="mt-4 space-y-3">
                                    {trustSignals.map((signal) => (
                                        <div key={signal} className="rounded-2xl border border-gray-200 bg-[#fbfcfa] px-4 py-3 text-sm text-gray-700">
                                            {signal}
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section className="rounded-3xl border border-gray-200 bg-white p-5">
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">Catalog snapshot</p>
                                <div className="mt-4 grid gap-3">
                                    <div className="rounded-2xl border border-gray-200 bg-[#fbfcfa] px-4 py-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Basket</p>
                                        <p className="mt-2 text-2xl font-bold text-gray-900">{totalItems}</p>
                                        <p className="mt-1 text-sm text-gray-500">items currently in your wallet basket</p>
                                    </div>
                                    <div className="rounded-2xl border border-gray-200 bg-[#fbfcfa] px-4 py-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Product focus</p>
                                        <p className="mt-2 text-sm font-semibold text-gray-900">
                                            {business.product_types?.length ? business.product_types.join(', ') : activeCategories.join(', ') || 'Products coming soon'}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-gray-200 bg-[#fbfcfa] px-4 py-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Direct purchase path</p>
                                        <p className="mt-2 text-sm text-gray-600">
                                            Buyers can scout this supplier here, add inventory to basket, and continue through the wallet preview.
                                        </p>
                                    </div>
                                </div>
                            </section>
                        </aside>
                    </div>
                </div>
            </div>
        </div>
    );
}
