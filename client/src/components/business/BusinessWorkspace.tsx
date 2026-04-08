'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../lib/auth';
import type {
    BusinessCsvPreviewRow,
    BusinessInventoryItem,
    BusinessMember,
    BusinessMembershipRole,
    BusinessRecord,
    BusinessType
} from '../../lib/business';

const inputCls =
    'w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20';

type LocationSuggestion = {
    placeId: string;
    description: string;
    primaryText: string;
    secondaryText: string;
};

function csvToList(value: string) {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function getDefaultType(role?: string): BusinessType {
    return role === 'distributor' ? 'distributor' : 'farmer';
}

function emptyBusiness(type: BusinessType) {
    return {
        business_type: type,
        name: '',
        description: '',
        business_image_url: '',
        primary_location: '',
        service_region: '',
        product_types: '',
        trust_signals: '',
        fulfillment_notes: ''
    };
}

function emptyInventory() {
    return {
        id: null as string | null,
        name: '',
        description: '',
        category: '',
        price_fiat: '',
        quantity: '',
        unit: 'item',
        image_url: '',
        fulfillment_notes: '',
        service_region: '',
        consumer_tags: '',
        external_item_id: ''
    };
}

export default function BusinessWorkspace() {
    const { user } = useAuth();
    const [businesses, setBusinesses] = useState<BusinessRecord[]>([]);
    const [members, setMembers] = useState<BusinessMember[]>([]);
    const [items, setItems] = useState<BusinessInventoryItem[]>([]);
    const [activeBusinessId, setActiveBusinessId] = useState<string | null>(null);
    const [businessForm, setBusinessForm] = useState(() => emptyBusiness(getDefaultType(user?.role)));
    const [inventoryForm, setInventoryForm] = useState(() => emptyInventory());
    const [memberEmail, setMemberEmail] = useState('');
    const [memberRole, setMemberRole] = useState<BusinessMembershipRole>('member');
    const [csvText, setCsvText] = useState('');
    const [csvPreview, setCsvPreview] = useState<{ errors: string[]; rows: BusinessCsvPreviewRow[] } | null>(null);
    const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
    const [isLocationSearching, setIsLocationSearching] = useState(false);
    const [locationStatus, setLocationStatus] = useState<string | null>(null);
    const [isLocationConfirmed, setIsLocationConfirmed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    const activeBusiness = useMemo(
        () => businesses.find((business) => business.id === activeBusinessId) || null,
        [activeBusinessId, businesses]
    );

    const hydrateBusiness = (business: BusinessRecord) => {
        setIsLocationConfirmed(true);
        setLocationSuggestions([]);
        setLocationStatus(null);
        setBusinessForm({
            business_type: business.business_type,
            name: business.name || '',
            description: business.description || '',
            business_image_url: String(business.profile_data?.business_image_url || '').trim(),
            primary_location: business.primary_location || '',
            service_region: business.service_region || '',
            product_types: Array.isArray(business.profile_data?.product_types) ? business.profile_data.product_types.join(', ') : '',
            trust_signals: Array.isArray(business.profile_data?.trust_signals) ? business.profile_data.trust_signals.join(', ') : '',
            fulfillment_notes: String(business.profile_data?.fulfillment_notes || '').trim()
        });
    };

    useEffect(() => {
        const query = businessForm.primary_location.trim();
        if (isLocationConfirmed) return;
        if (query.length < 2) {
            setLocationSuggestions([]);
            setIsLocationSearching(false);
            setLocationStatus(null);
            return;
        }

        const timeoutId = window.setTimeout(async () => {
            setIsLocationSearching(true);
            setLocationStatus(null);

            try {
                const res = await api.get('/consumer-health-profile/location-suggestions/search', {
                    params: { q: query }
                });
                const suggestions = Array.isArray(res.data?.suggestions) ? res.data.suggestions : [];
                setLocationSuggestions(suggestions);
                setLocationStatus(
                    suggestions.length > 0
                        ? 'Choose a suggested business address, area, or landmark, or keep what you typed.'
                        : 'No address suggestions found yet. You can still continue with your typed location.'
                );
            } catch {
                setLocationSuggestions([]);
                setLocationStatus('Address lookup is unavailable right now. You can still continue with your typed location.');
            } finally {
                setIsLocationSearching(false);
            }
        }, 250);

        return () => window.clearTimeout(timeoutId);
    }, [businessForm.primary_location, isLocationConfirmed]);

    const loadBusinesses = async (preferredId?: string | null) => {
        setIsLoading(true);
        try {
            const res = await api.get('/businesses/mine');
            const nextBusinesses: BusinessRecord[] = Array.isArray(res.data?.businesses) ? res.data.businesses : [];
            setBusinesses(nextBusinesses);
            if (nextBusinesses.length === 0) {
                setActiveBusinessId(null);
                setBusinessForm(emptyBusiness(getDefaultType(user?.role)));
                return;
            }
            const nextActive = nextBusinesses.find((business) => business.id === preferredId) || nextBusinesses[0];
            setActiveBusinessId(nextActive.id);
            hydrateBusiness(nextActive);
        } catch (error: any) {
            setStatus(error?.response?.data?.error || 'Could not load business workspace.');
        } finally {
            setIsLoading(false);
        }
    };

    const loadContext = async (businessId: string) => {
        const [membersRes, itemsRes] = await Promise.all([
            api.get(`/businesses/${businessId}/members`),
            api.get(`/businesses/${businessId}/inventory`)
        ]);
        setMembers(Array.isArray(membersRes.data?.members) ? membersRes.data.members : []);
        setItems(Array.isArray(itemsRes.data?.items) ? itemsRes.data.items : []);
    };

    useEffect(() => {
        if (user?.id) {
            void loadBusinesses();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    useEffect(() => {
        if (activeBusinessId) {
            void loadContext(activeBusinessId).catch((error: any) => {
                setStatus(error?.response?.data?.error || 'Could not load operators or inventory.');
            });
        } else {
            setMembers([]);
            setItems([]);
        }
    }, [activeBusinessId]);

    const saveBusiness = async () => {
        if (!businessForm.name.trim()) {
            setStatus('Add a business name before saving.');
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                business_type: businessForm.business_type,
                name: businessForm.name.trim(),
                description: businessForm.description.trim(),
                primary_location: businessForm.primary_location.trim(),
                service_region: businessForm.service_region.trim(),
                profile_data: {
                    business_image_url: businessForm.business_image_url.trim(),
                    product_types: csvToList(businessForm.product_types),
                    trust_signals: csvToList(businessForm.trust_signals),
                    fulfillment_notes: businessForm.fulfillment_notes.trim()
                }
            };
            const res = activeBusinessId
                ? await api.put(`/businesses/${activeBusinessId}`, payload)
                : await api.post('/businesses', payload);
            await loadBusinesses(String(res.data?.id || activeBusinessId || ''));
            setStatus(activeBusinessId ? 'Business updated.' : 'Business created.');
        } catch (error: any) {
            setStatus(error?.response?.data?.error || 'Could not save the business.');
        } finally {
            setIsSaving(false);
        }
    };

    const saveInventory = async () => {
        if (!activeBusinessId) {
            setStatus('Create or select a business first.');
            return;
        }
        if (!inventoryForm.name.trim()) {
            setStatus('Inventory item needs a name.');
            return;
        }

        const payload = {
            name: inventoryForm.name.trim(),
            description: inventoryForm.description.trim(),
            category: inventoryForm.category.trim(),
            price_fiat: inventoryForm.price_fiat,
            quantity: inventoryForm.quantity,
            unit: inventoryForm.unit.trim(),
            image_url: inventoryForm.image_url.trim(),
            fulfillment_notes: inventoryForm.fulfillment_notes.trim(),
            service_region: inventoryForm.service_region.trim(),
            consumer_tags: csvToList(inventoryForm.consumer_tags),
            external_item_id: inventoryForm.external_item_id.trim()
        };

        setIsSaving(true);
        try {
            if (inventoryForm.id) {
                await api.put(`/businesses/${activeBusinessId}/inventory/${inventoryForm.id}`, payload);
            } else {
                await api.post(`/businesses/${activeBusinessId}/inventory`, payload);
            }
            await loadContext(activeBusinessId);
            setInventoryForm(emptyInventory());
            setStatus(inventoryForm.id ? 'Inventory updated.' : 'Inventory item added.');
        } catch (error: any) {
            setStatus(error?.response?.data?.error || 'Could not save inventory item.');
        } finally {
            setIsSaving(false);
        }
    };

    const addMember = async () => {
        if (!activeBusinessId || !memberEmail.trim()) {
            setStatus('Select a business and add an operator email.');
            return;
        }

        try {
            await api.post(`/businesses/${activeBusinessId}/members`, { email: memberEmail.trim(), role: memberRole });
            await loadContext(activeBusinessId);
            setMemberEmail('');
            setMemberRole('member');
            setStatus('Operator attached.');
        } catch (error: any) {
            setStatus(error?.response?.data?.error || 'Could not attach operator.');
        }
    };

    const previewCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!activeBusinessId) {
            setStatus('Create or select a business before importing CSV inventory.');
            event.target.value = '';
            return;
        }
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const res = await api.post(`/businesses/${activeBusinessId}/inventory/import/csv`, { csvText: text, dryRun: true });
            setCsvText(text);
            setCsvPreview({
                errors: Array.isArray(res.data?.errors) ? res.data.errors : [],
                rows: Array.isArray(res.data?.rows) ? res.data.rows : []
            });
            setStatus('CSV preview ready.');
        } catch (error: any) {
            setStatus(error?.response?.data?.error || 'Could not preview CSV.');
        } finally {
            event.target.value = '';
        }
    };

    const importCsv = async () => {
        if (!activeBusinessId || !csvText.trim()) return;
        setIsSaving(true);
        try {
            await api.post(`/businesses/${activeBusinessId}/inventory/import/csv`, { csvText, dryRun: false });
            await loadContext(activeBusinessId);
            setCsvText('');
            setCsvPreview(null);
            setStatus('CSV inventory imported.');
        } catch (error: any) {
            setStatus(error?.response?.data?.error || 'Could not import CSV inventory.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="mt-4 space-y-4">
            <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-[#f4fbf5] via-white to-[#eef8f2] p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Business Profile</p>
                <h3 className="mt-2 text-2xl font-bold text-gray-900">Shared supplier identity for operators and inventory</h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                    Businesses own the profile and inventory here. Operators attach to that business so farms and distributors are not tied to one account.
                </p>
            </section>

            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h3 className="text-base font-bold text-gray-900">Attached Businesses</h3>
                            <p className="mt-1 text-sm text-gray-500">Choose a business or start a new one.</p>
                        </div>
                        <button
                            type="button"
                             onClick={() => {
                                 setActiveBusinessId(null);
                                 setBusinessForm(emptyBusiness(getDefaultType(user?.role)));
                                 setIsLocationConfirmed(false);
                                 setLocationSuggestions([]);
                                 setLocationStatus(null);
                                 setItems([]);
                                 setMembers([]);
                             }}
                            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-green-300 hover:text-green-700"
                        >
                            New
                        </button>
                    </div>

                    {isLoading ? <p className="mt-4 text-sm text-gray-500">Loading business workspace...</p> : null}

                    <div className="mt-4 space-y-3">
                        {businesses.length > 0 ? businesses.map((business) => (
                            <button
                                key={business.id}
                                type="button"
                                onClick={() => {
                                    setActiveBusinessId(business.id);
                                    hydrateBusiness(business);
                                }}
                                className={`w-full rounded-2xl border p-4 text-left transition ${
                                    activeBusinessId === business.id ? 'border-green-500 bg-green-50/70' : 'border-gray-200 bg-white hover:border-green-300'
                                }`}
                            >
                                <p className="font-semibold text-gray-900">{business.name}</p>
                                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-gray-400">{business.business_type} · {business.membership_role}</p>
                                <p className="mt-2 text-sm text-gray-500">{business.primary_location || business.service_region || 'No location yet'}</p>
                            </button>
                        )) : (
                            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                                No business attached yet.
                            </div>
                        )}
                    </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h3 className="text-base font-bold text-gray-900">{activeBusiness ? 'Business Identity' : 'Create Business'}</h3>
                            <p className="mt-1 text-sm text-gray-500">Shape the public-facing supplier page buyers will scout before purchasing.</p>
                        </div>
                        {activeBusinessId ? (
                            <Link
                                href={`/business/${activeBusinessId}`}
                                className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 transition hover:bg-green-100"
                            >
                                View Public Profile
                            </Link>
                        ) : null}
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <select className={inputCls} value={businessForm.business_type} onChange={(event) => setBusinessForm((current) => ({ ...current, business_type: event.target.value as BusinessType }))}>
                            <option value="farmer">Farmer</option>
                            <option value="distributor">Distributor</option>
                        </select>
                        <input className={inputCls} value={businessForm.name} onChange={(event) => setBusinessForm((current) => ({ ...current, name: event.target.value }))} placeholder="Business name" />
                        <textarea className={`${inputCls} min-h-[100px] resize-y md:col-span-2`} value={businessForm.description} onChange={(event) => setBusinessForm((current) => ({ ...current, description: event.target.value }))} placeholder="Business description" />
                        <div className="md:col-span-2">
                            <input
                                className={inputCls}
                                value={businessForm.business_image_url}
                                onChange={(event) => setBusinessForm((current) => ({ ...current, business_image_url: event.target.value }))}
                                placeholder="Business image URL"
                            />
                            <p className="mt-2 text-xs text-gray-500">Use a hosted image link for the public-facing business cover or brand image.</p>
                        </div>
                        {businessForm.business_image_url ? (
                            <div className="md:col-span-2">
                                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                                    <img
                                        src={businessForm.business_image_url}
                                        alt={`${businessForm.name || 'Business'} preview`}
                                        className="h-44 w-full object-cover"
                                    />
                                </div>
                            </div>
                        ) : null}
                        <div className="md:col-span-2">
                            <input
                                className={inputCls}
                                value={businessForm.primary_location}
                                onChange={(event) => {
                                    setIsLocationConfirmed(false);
                                    setBusinessForm((current) => ({ ...current, primary_location: event.target.value }));
                                }}
                                placeholder="Primary location"
                            />
                            <p className="mt-2 text-xs text-gray-500">Start typing a street, area, landmark, city, ZIP code, or postcode to get address predictions.</p>
                            {isLocationSearching ? (
                                <p className="mt-2 text-xs text-gray-400">Searching addresses...</p>
                            ) : locationStatus ? (
                                <p className="mt-2 text-xs text-gray-400">{locationStatus}</p>
                            ) : null}
                            {locationSuggestions.length > 0 ? (
                                <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                                    {locationSuggestions.map((suggestion) => (
                                        <button
                                            key={`${suggestion.placeId}-${suggestion.description}`}
                                            type="button"
                                            onClick={() => {
                                                setBusinessForm((current) => ({
                                                    ...current,
                                                    primary_location: suggestion.description
                                                }));
                                                setIsLocationConfirmed(true);
                                                setLocationSuggestions([]);
                                                setLocationStatus(null);
                                            }}
                                            className="flex w-full flex-col items-start border-b border-gray-100 px-4 py-3 text-left last:border-b-0 hover:bg-gray-50"
                                        >
                                            <span className="text-sm font-medium text-gray-800">{suggestion.primaryText}</span>
                                            <span className="text-xs text-gray-500">{suggestion.secondaryText || suggestion.description}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                        <input className={inputCls} value={businessForm.service_region} onChange={(event) => setBusinessForm((current) => ({ ...current, service_region: event.target.value }))} placeholder="Service region" />
                        <input className={inputCls} value={businessForm.product_types} onChange={(event) => setBusinessForm((current) => ({ ...current, product_types: event.target.value }))} placeholder="Product types" />
                        <input className={inputCls} value={businessForm.trust_signals} onChange={(event) => setBusinessForm((current) => ({ ...current, trust_signals: event.target.value }))} placeholder="Trust signals" />
                        <textarea className={`${inputCls} min-h-[90px] resize-y md:col-span-2`} value={businessForm.fulfillment_notes} onChange={(event) => setBusinessForm((current) => ({ ...current, fulfillment_notes: event.target.value }))} placeholder="Fulfillment notes" />
                    </div>
                    <button type="button" onClick={saveBusiness} disabled={isSaving} className="mt-5 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60">
                        {isSaving ? 'Saving...' : activeBusiness ? 'Update Business' : 'Create Business'}
                    </button>
                </section>
            </div>

            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h3 className="text-base font-bold text-gray-900">Operators</h3>
                    <div className="mt-4 grid gap-3 md:grid-cols-[1.4fr_0.8fr_auto]">
                        <input className={inputCls} value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} placeholder="operator email" />
                        <select className={inputCls} value={memberRole} onChange={(event) => setMemberRole(event.target.value as BusinessMembershipRole)}>
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                            <option value="owner">Owner</option>
                        </select>
                        <button type="button" onClick={addMember} className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700">Add</button>
                    </div>
                    <div className="mt-4 space-y-3">
                        {members.length > 0 ? members.map((member) => (
                            <div key={member.user_id} className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                                <p className="font-semibold text-gray-900">{member.name || member.email}</p>
                                <p className="mt-1 text-sm text-gray-500">{member.email}</p>
                                <p className="mt-2 text-xs uppercase tracking-wide text-gray-400">{member.role} · {member.status}</p>
                            </div>
                        )) : <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-sm text-gray-500">No operators attached yet.</div>}
                    </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h3 className="text-base font-bold text-gray-900">Manual Inventory</h3>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <input className={`${inputCls} md:col-span-2`} value={inventoryForm.name} onChange={(event) => setInventoryForm((current) => ({ ...current, name: event.target.value }))} placeholder="Item name" />
                        <textarea className={`${inputCls} min-h-[90px] resize-y md:col-span-2`} value={inventoryForm.description} onChange={(event) => setInventoryForm((current) => ({ ...current, description: event.target.value }))} placeholder="Description" />
                        <input className={inputCls} value={inventoryForm.category} onChange={(event) => setInventoryForm((current) => ({ ...current, category: event.target.value }))} placeholder="Category" />
                        <input className={inputCls} value={inventoryForm.image_url} onChange={(event) => setInventoryForm((current) => ({ ...current, image_url: event.target.value }))} placeholder="Image URL" />
                        <input className={inputCls} value={inventoryForm.price_fiat} onChange={(event) => setInventoryForm((current) => ({ ...current, price_fiat: event.target.value }))} placeholder="Price" />
                        <input className={inputCls} value={inventoryForm.quantity} onChange={(event) => setInventoryForm((current) => ({ ...current, quantity: event.target.value }))} placeholder="Quantity" />
                        <input className={inputCls} value={inventoryForm.unit} onChange={(event) => setInventoryForm((current) => ({ ...current, unit: event.target.value }))} placeholder="Unit" />
                        <input className={inputCls} value={inventoryForm.external_item_id} onChange={(event) => setInventoryForm((current) => ({ ...current, external_item_id: event.target.value }))} placeholder="External item ID" />
                        <input className={inputCls} value={inventoryForm.service_region} onChange={(event) => setInventoryForm((current) => ({ ...current, service_region: event.target.value }))} placeholder="Service region" />
                        <input className={inputCls} value={inventoryForm.consumer_tags} onChange={(event) => setInventoryForm((current) => ({ ...current, consumer_tags: event.target.value }))} placeholder="Consumer tags" />
                        <textarea className={`${inputCls} min-h-[90px] resize-y md:col-span-2`} value={inventoryForm.fulfillment_notes} onChange={(event) => setInventoryForm((current) => ({ ...current, fulfillment_notes: event.target.value }))} placeholder="Fulfillment notes" />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                        <button type="button" onClick={saveInventory} disabled={isSaving} className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60">
                            {isSaving ? 'Saving...' : inventoryForm.id ? 'Update Item' : 'Add Item'}
                        </button>
                        <button type="button" onClick={() => setInventoryForm(emptyInventory())} className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-green-300 hover:text-green-700">
                            Reset
                        </button>
                    </div>
                </section>
            </div>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h3 className="text-base font-bold text-gray-900">CSV Import</h3>
                        <p className="mt-1 text-sm text-gray-500">Preview and import existing supplier catalogs without retyping everything.</p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 transition hover:bg-green-100">
                        <input type="file" accept=".csv,text/csv" className="hidden" onChange={previewCsv} />
                        Preview CSV
                    </label>
                </div>

                {csvPreview ? (
                    <div className="mt-4 space-y-3">
                        {csvPreview.errors.length > 0 ? (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                                {csvPreview.errors.map((error) => <p key={error}>{error}</p>)}
                            </div>
                        ) : (
                            <button type="button" onClick={importCsv} disabled={isSaving} className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60">
                                Confirm Import
                            </button>
                        )}
                        <div className="space-y-2">
                            {csvPreview.rows.slice(0, 5).map((row) => (
                                <div key={`${row.index}-${row.normalized.name}`} className="rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-3">
                                    <p className="font-semibold text-gray-900">Row {row.index}: {row.normalized.name || 'Unnamed item'}</p>
                                    <p className="mt-1 text-sm text-gray-500">{row.normalized.category || 'Uncategorized'} · {row.normalized.quantity} {row.normalized.unit}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-bold text-gray-900">Current Business Inventory</h3>
                <div className="mt-4 space-y-3">
                    {items.length > 0 ? items.map((item) => (
                        <div key={item.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="font-semibold text-gray-900">{item.name}</p>
                                    <p className="mt-1 text-sm text-gray-500">{item.category || 'Uncategorized'}</p>
                                    <p className="mt-2 text-sm text-gray-600">{item.description || 'No description yet.'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-gray-900">{Number(item.price_fiat || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</p>
                                    <p className="mt-1 text-xs uppercase tracking-wide text-gray-400">{item.quantity || 0} {item.unit || 'item'}</p>
                                </div>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <button type="button" onClick={() => setInventoryForm({
                                    id: item.id,
                                    name: item.name || '',
                                    description: item.description || '',
                                    category: String(item.category || ''),
                                    price_fiat: String(item.price_fiat ?? ''),
                                    quantity: String(item.quantity ?? ''),
                                    unit: String(item.unit || 'item'),
                                    image_url: String(item.image_url || ''),
                                    fulfillment_notes: String(item.enrichment_data?.fulfillment_notes || ''),
                                    service_region: String(item.enrichment_data?.service_region || ''),
                                    consumer_tags: Array.isArray(item.enrichment_data?.consumer_tags) ? item.enrichment_data?.consumer_tags.join(', ') : '',
                                    external_item_id: String(item.external_item_id || '')
                                })} className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-green-300 hover:text-green-700">
                                    Edit
                                </button>
                                <button type="button" onClick={async () => {
                                    if (!activeBusinessId) return;
                                    try {
                                        await api.delete(`/businesses/${activeBusinessId}/inventory/${item.id}`);
                                        await loadContext(activeBusinessId);
                                        setStatus('Inventory item removed.');
                                    } catch (error: any) {
                                        setStatus(error?.response?.data?.error || 'Could not delete inventory item.');
                                    }
                                }} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100">
                                    Delete
                                </button>
                            </div>
                        </div>
                    )) : <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-sm text-gray-500">No inventory added yet.</div>}
                </div>
            </section>

            {status ? <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">{status}</div> : null}
        </div>
    );
}
