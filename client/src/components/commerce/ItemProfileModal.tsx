'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { formatCurrency, type Currency } from '../../lib/currency';
import type { CommerceItemProfile } from '../../lib/commerce';

type ItemProfileModalProps = {
    item: CommerceItemProfile | null;
    currency?: Currency;
    onClose: () => void;
    supplierActionLabel?: string;
    onSupplierAction?: () => void;
    primaryActionLabel?: string;
    onPrimaryAction?: () => void;
    primaryActionDisabled?: boolean;
};

function categoryBadgeClass(category: CommerceItemProfile['category']) {
    if (category === 'Produce') return 'bg-green-100 text-green-700';
    if (category === 'Services') return 'bg-amber-100 text-amber-700';
    return 'bg-blue-100 text-blue-700';
}

function roleBadgeClass(role: CommerceItemProfile['supplierRole']) {
    if (role === 'Farmer') return 'bg-emerald-50 text-emerald-700';
    if (role === 'Expert') return 'bg-violet-100 text-violet-700';
    return 'bg-slate-100 text-slate-700';
}

export default function ItemProfileModal({
    item,
    currency = 'IDR',
    onClose,
    supplierActionLabel = 'View supplier preview',
    onSupplierAction,
    primaryActionLabel = 'Primary action',
    onPrimaryAction,
    primaryActionDisabled = false
}: ItemProfileModalProps) {
    return (
        <AnimatePresence>
            {item ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm" onClick={onClose}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 16 }}
                        className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={onClose}
                            className="absolute right-4 top-4 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                            aria-label="Close item detail"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="grid gap-0 md:grid-cols-[1.2fr_0.95fr]">
                            <div className="border-b border-gray-100 p-6 md:border-b-0 md:border-r">
                                <div className="flex items-start gap-4">
                                    <div className="h-20 w-20 overflow-hidden rounded-2xl bg-gray-100">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={item.image || '/assets/images/gallery/user_avatar.png'}
                                            alt={item.name}
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${categoryBadgeClass(item.category)}`}>
                                                {item.category}
                                            </span>
                                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${roleBadgeClass(item.supplierRole)}`}>
                                                {item.supplierRole}
                                            </span>
                                        </div>
                                        <h2 className="mt-3 text-2xl font-bold text-gray-900">{item.name}</h2>
                                        <p className="mt-2 text-sm leading-6 text-gray-600">{item.description}</p>
                                    </div>
                                </div>

                                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Price</p>
                                        <p className="mt-2 text-lg font-bold text-gray-900">{formatCurrency(item.price, currency)}</p>
                                        <p className="mt-1 text-xs text-gray-500">Per {item.unit}</p>
                                    </div>
                                    <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Fulfillment</p>
                                        <p className="mt-2 text-sm font-medium text-gray-900">{item.fulfillment}</p>
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">Why it matters</h3>
                                    <p className="mt-2 text-sm leading-6 text-gray-600">{item.story}</p>
                                </div>
                            </div>

                            <div className="bg-gray-50/70 p-6">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Supplier profile</p>
                                <h3 className="mt-3 text-xl font-bold text-gray-900">{item.supplierName}</h3>
                                <p className="mt-1 text-sm text-gray-500">{item.supplierRole} - {item.supplierLocation}</p>
                                <p className="mt-4 text-sm leading-6 text-gray-600">{item.supplierBio}</p>

                                <div className="mt-5 space-y-2">
                                    <p className="text-sm font-bold text-gray-900">Trust signals</p>
                                    {item.trustSignals.map((signal) => (
                                        <div key={signal} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                                            {signal}
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 flex flex-wrap gap-3">
                                    {onSupplierAction ? (
                                        <button
                                            type="button"
                                            onClick={onSupplierAction}
                                            className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
                                        >
                                            {supplierActionLabel}
                                        </button>
                                    ) : null}
                                    {onPrimaryAction ? (
                                        <button
                                            type="button"
                                            onClick={onPrimaryAction}
                                            disabled={primaryActionDisabled}
                                            className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
                                                primaryActionDisabled
                                                    ? 'cursor-not-allowed border border-gray-200 bg-white text-gray-400'
                                                    : 'border border-gray-200 bg-white text-gray-700 transition hover:border-green-300 hover:text-green-700'
                                            }`}
                                        >
                                            {primaryActionLabel}
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            ) : null}
        </AnimatePresence>
    );
}
