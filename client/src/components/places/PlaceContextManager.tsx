'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '../../lib/api';

type MenuSource = {
    id: string;
    name: string;
    type: string;
    excerpt: string;
};

type InventoryItem = {
    id: string;
    name: string;
    detail: string;
};

type ManagedPlaceProfile = {
    id: string;
    name: string;
    place_kind: string;
    network_status: string;
    updated_at?: string;
    isPreview?: boolean;
    profile_data?: {
        address?: string;
        website?: string;
        mapsUrl?: string;
        phone?: string;
        menu_context?: string;
        menu_sources?: MenuSource[];
        raw_inventory_context?: string;
        raw_inventory_items?: InventoryItem[];
    };
};

type FormState = {
    placeProfileId: string | null;
    name: string;
    place_kind: string;
    address: string;
    website: string;
    mapsUrl: string;
    phone: string;
    menu_context: string;
    menu_sources: MenuSource[];
    raw_inventory_context: string;
};

const PLACE_KIND_OPTIONS = [
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'cafe', label: 'Cafe' },
    { value: 'juice_bar', label: 'Juice Bar' },
    { value: 'natural_food_store', label: 'Natural Food Store' },
    { value: 'grocery', label: 'Grocery' },
    { value: 'farm_stand', label: 'Farm Stand' },
    { value: 'prepared_food', label: 'Prepared Food' },
    { value: 'farm', label: 'Farm' },
    { value: 'distributor', label: 'Distributor' },
    { value: 'other', label: 'Other' }
];

const textInputCls =
    'w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500';

function createEmptyForm(defaultKind: string): FormState {
    return {
        placeProfileId: null,
        name: '',
        place_kind: defaultKind,
        address: '',
        website: '',
        mapsUrl: '',
        phone: '',
        menu_context: '',
        menu_sources: [],
        raw_inventory_context: ''
    };
}

function isTextLikeFile(file: File) {
    return (
        file.type.startsWith('text/') ||
        file.type === 'application/json' ||
        file.type === 'application/xml' ||
        file.name.endsWith('.md') ||
        file.name.endsWith('.csv')
    );
}

async function buildMenuSource(file: File): Promise<MenuSource> {
    let excerpt = `Uploaded menu file: ${file.name}.`;

    if (isTextLikeFile(file)) {
        try {
            const text = await file.text();
            const trimmed = text.replace(/\s+/g, ' ').trim().slice(0, 1800);
            if (trimmed) {
                excerpt = trimmed;
            }
        } catch {
            excerpt = `Uploaded menu file: ${file.name}. Text extraction failed in browser.`;
        }
    } else if (file.type === 'application/pdf') {
        excerpt = `Uploaded PDF menu: ${file.name}. PDF text extraction is not available in-browser yet, so add the key menu items in the paste field too.`;
    } else if (file.type.startsWith('image/')) {
        excerpt = `Uploaded menu image: ${file.name}. OCR is not available in-browser yet, so add the key menu items in the paste field too.`;
    }

    return {
        id: `${file.name}-${file.lastModified}-${file.size}`,
        name: file.name,
        type: file.type || 'application/octet-stream',
        excerpt
    };
}

function formatInventoryLines(items?: InventoryItem[], fallbackText?: string) {
    if (Array.isArray(items) && items.length > 0) {
        return items
            .map((item) => {
                const name = String(item.name || '').trim();
                const detail = String(item.detail || '').trim();
                if (!name) return detail;
                return detail ? `${name} - ${detail}` : name;
            })
            .filter(Boolean)
            .join('\n');
    }

    return String(fallbackText || '').trim();
}

function parseInventoryLines(text: string): InventoryItem[] {
    return text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index) => {
            const [namePart, ...detailParts] = line.split(/\s[-:]\s/);
            return {
                id: `inventory-line-${index + 1}`,
                name: String(namePart || '').trim(),
                detail: detailParts.join(' - ').trim()
            };
        })
        .filter((item) => item.name || item.detail);
}

function createDemoManagedPlaces(defaultKind: string): ManagedPlaceProfile[] {
    if (defaultKind === 'farm_stand') {
        return [
            {
                id: 'preview-farm-stand',
                isPreview: true,
                name: 'Sunrise Harvest Stand',
                place_kind: 'farm_stand',
                network_status: 'preview',
                profile_data: {
                    address: '128 Greenway Lane, Austin, TX',
                    website: 'https://sunrise-harvest.example',
                    mapsUrl: 'https://maps.google.com/?q=Sunrise+Harvest+Stand',
                    phone: '+1 512 555 0181',
                    raw_inventory_context: 'Kale - harvested this morning\nRainbow chard - bunches available\nHeirloom tomatoes - ripe, limited crates\nFresh basil - ideal for sauces and salads',
                    raw_inventory_items: [
                        { id: 'preview-f1', name: 'Kale', detail: 'harvested this morning' },
                        { id: 'preview-f2', name: 'Rainbow chard', detail: 'bunches available' },
                        { id: 'preview-f3', name: 'Heirloom tomatoes', detail: 'ripe, limited crates' },
                        { id: 'preview-f4', name: 'Fresh basil', detail: 'ideal for sauces and salads' }
                    ],
                    menu_context: 'Weekend pickup table includes green juice packs, herb salad kits, and ready soup bundles.',
                    menu_sources: [
                        {
                            id: 'preview-farm-menu',
                            name: 'Harvest table notes',
                            type: 'text/plain',
                            excerpt: 'Soup bundles include kale, celery, parsley, and turmeric. Salad kits include tomatoes, basil, cucumbers, and lemon dressing.'
                        }
                    ]
                }
            },
            {
                id: 'preview-farm-pickup',
                isPreview: true,
                name: 'Riverbend Farm Pickup',
                place_kind: 'prepared_food',
                network_status: 'preview',
                profile_data: {
                    address: '44 Market Circle, Austin, TX',
                    phone: '+1 512 555 0138',
                    raw_inventory_context: 'Sweet potatoes - bulk boxes\nMint - tea and smoothie bunches\nGinger - fresh roots\nSpinach - washed bags ready',
                    raw_inventory_items: [
                        { id: 'preview-f5', name: 'Sweet potatoes', detail: 'bulk boxes' },
                        { id: 'preview-f6', name: 'Mint', detail: 'tea and smoothie bunches' },
                        { id: 'preview-f7', name: 'Ginger', detail: 'fresh roots' },
                        { id: 'preview-f8', name: 'Spinach', detail: 'washed bags ready' }
                    ],
                    menu_context: 'Prepared pickup items include mineral broth kits, smoothie packs, and roasted root veg trays.'
                }
            }
        ];
    }

    return [
        {
            id: 'preview-distributor-store',
            isPreview: true,
            name: 'Nourish Natural Market',
            place_kind: defaultKind === 'grocery' ? 'grocery' : 'natural_food_store',
            network_status: 'preview',
            profile_data: {
                address: '208 Wellness Ave, Austin, TX',
                website: 'https://nourish-market.example',
                mapsUrl: 'https://maps.google.com/?q=Nourish+Natural+Market',
                phone: '+1 512 555 0144',
                raw_inventory_context: 'Avocados - soft and ready\nOrganic cucumbers - cooling produce section\nLacinato kale - local farm supply\nFresh turmeric - refrigerated produce case',
                raw_inventory_items: [
                    { id: 'preview-d1', name: 'Avocados', detail: 'soft and ready' },
                    { id: 'preview-d2', name: 'Organic cucumbers', detail: 'cooling produce section' },
                    { id: 'preview-d3', name: 'Lacinato kale', detail: 'local farm supply' },
                    { id: 'preview-d4', name: 'Fresh turmeric', detail: 'refrigerated produce case' }
                ],
                menu_context: 'In-store tonic bar serves ginger turmeric shots, unsweetened green smoothies, and coconut kefir drinks.',
                menu_sources: [
                    {
                        id: 'preview-dist-menu',
                        name: 'Store tonic bar menu',
                        type: 'text/plain',
                        excerpt: 'Ginger turmeric shot, mineral greens smoothie, cucumber mint cooler, coconut kefir tonic.'
                    }
                ]
            }
        },
        {
            id: 'preview-distributor-cafe',
            isPreview: true,
            name: 'Daily Greens Cafe',
            place_kind: 'cafe',
            network_status: 'preview',
            profile_data: {
                address: '12 Spring Street, Austin, TX',
                phone: '+1 512 555 0112',
                raw_inventory_context: 'Berry packs - smoothie add-ons\nSpinach - daily prep stock\nLemons - juice bar use',
                raw_inventory_items: [
                    { id: 'preview-d5', name: 'Berry packs', detail: 'smoothie add-ons' },
                    { id: 'preview-d6', name: 'Spinach', detail: 'daily prep stock' },
                    { id: 'preview-d7', name: 'Lemons', detail: 'juice bar use' }
                ],
                menu_context: 'Featured items include a green protein smoothie, cucumber mint tonic, lentil bowl, and citrus herb salad.'
            }
        }
    ];
}

export default function PlaceContextManager({
    title,
    subtitle,
    defaultKind
}: {
    title: string;
    subtitle: string;
    defaultKind: string;
}) {
    const [places, setPlaces] = useState<ManagedPlaceProfile[]>([]);
    const [form, setForm] = useState<FormState>(() => createEmptyForm(defaultKind));
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const previewPlaces = useMemo(() => createDemoManagedPlaces(defaultKind), [defaultKind]);

    const sortedKinds = useMemo(() => {
        const preferred = PLACE_KIND_OPTIONS.find((option) => option.value === defaultKind);
        const rest = PLACE_KIND_OPTIONS.filter((option) => option.value !== defaultKind);
        return preferred ? [preferred, ...rest] : PLACE_KIND_OPTIONS;
    }, [defaultKind]);
    const visiblePlaces = places.length > 0 ? places : previewPlaces;
    const isPreviewMode = places.length === 0;

    const loadPlaces = async () => {
        setIsLoading(true);
        setStatus(null);
        try {
            const res = await api.get('/place-profiles/manage/mine');
            setPlaces(Array.isArray(res.data) ? res.data : []);
        } catch (error: any) {
            setStatus(error?.response?.data?.error || 'Could not load your managed places right now.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadPlaces();
    }, []);

    const handleEdit = (place: ManagedPlaceProfile) => {
        setForm({
            placeProfileId: place.isPreview ? null : place.id,
            name: place.name || '',
            place_kind: place.place_kind || defaultKind,
            address: place.profile_data?.address || '',
            website: place.profile_data?.website || '',
            mapsUrl: place.profile_data?.mapsUrl || '',
            phone: place.profile_data?.phone || '',
            menu_context: place.profile_data?.menu_context || '',
            menu_sources: Array.isArray(place.profile_data?.menu_sources) ? place.profile_data.menu_sources : [],
            raw_inventory_context: formatInventoryLines(place.profile_data?.raw_inventory_items, place.profile_data?.raw_inventory_context)
        });
        setStatus(place.isPreview ? 'Preview example loaded. Save it to create a real place profile.' : null);
    };

    const handleReset = () => {
        setForm(createEmptyForm(defaultKind));
        setStatus(null);
    };

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;

        const sources = await Promise.all(files.map((file) => buildMenuSource(file)));
        setForm((current) => ({
            ...current,
            menu_sources: [
                ...current.menu_sources,
                ...sources.filter((source) => !current.menu_sources.some((existing) => existing.id === source.id))
            ]
        }));
        event.target.value = '';
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            setStatus('Add a place name before saving.');
            return;
        }

        setIsSaving(true);
        setStatus(null);
        try {
            await api.post('/place-profiles/manage', {
                ...form,
                raw_inventory_items: parseInventoryLines(form.raw_inventory_context)
            });
            await loadPlaces();
            setStatus(form.placeProfileId ? 'Place context updated.' : 'Place context saved.');
            handleReset();
        } catch (error: any) {
            setStatus(error?.response?.data?.error || 'Could not save this place context.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                    <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
                </div>
                <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-green-400 hover:text-green-700"
                >
                    New Place
                </button>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-gray-600">Managed Places</h3>
                        {isLoading ? <span className="text-xs text-gray-400">Loading...</span> : null}
                    </div>
                    {isPreviewMode ? (
                        <p className="mt-3 text-xs text-gray-500">
                            Showing built-in preview examples so you can see the dashboard layout before adding real places.
                        </p>
                    ) : null}
                    <div className="mt-4 space-y-3">
                        {visiblePlaces.length > 0 ? visiblePlaces.map((place) => (
                            <button
                                key={place.id}
                                type="button"
                                onClick={() => handleEdit(place)}
                                className="w-full rounded-2xl border border-gray-200 bg-white p-4 text-left transition hover:border-green-300 hover:shadow-sm"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-gray-900">{place.name}</p>
                                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-gray-400">
                                            {String(place.place_kind || 'other').replace(/_/g, ' ')}
                                        </p>
                                    </div>
                                    <span className="rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700">
                                        {place.profile_data?.raw_inventory_context || (place.profile_data?.raw_inventory_items || []).length > 0
                                            ? 'Inventory Ready'
                                            : place.profile_data?.menu_context
                                                ? 'Menu Ready'
                                                : 'Needs Details'}
                                    </span>
                                </div>
                                <p className="mt-2 text-sm text-gray-500">
                                    {place.profile_data?.address || 'No address saved yet.'}
                                </p>
                                {place.isPreview ? (
                                    <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.16em] text-gray-400">
                                        Preview Example
                                    </p>
                                ) : null}
                            </button>
                        )) : (
                            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-500">
                                No managed places yet. Add a restaurant, cafe, natural food store, farm stand, or grocery so Navi can use your exact menu context.
                            </div>
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="block">
                            <span className="mb-2 block text-sm font-medium text-gray-700">Place Name</span>
                            <input
                                className={textInputCls}
                                value={form.name}
                                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                                placeholder="Nourish Cafe"
                            />
                        </label>
                        <label className="block">
                            <span className="mb-2 block text-sm font-medium text-gray-700">Place Type</span>
                            <select
                                className={textInputCls}
                                value={form.place_kind}
                                onChange={(event) => setForm((current) => ({ ...current, place_kind: event.target.value }))}
                            >
                                {sortedKinds.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <label className="block md:col-span-2">
                            <span className="mb-2 block text-sm font-medium text-gray-700">Address</span>
                            <input
                                className={textInputCls}
                                value={form.address}
                                onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                                placeholder="Street, district, city"
                            />
                        </label>
                        <label className="block">
                            <span className="mb-2 block text-sm font-medium text-gray-700">Website</span>
                            <input
                                className={textInputCls}
                                value={form.website}
                                onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
                                placeholder="https://..."
                            />
                        </label>
                        <label className="block">
                            <span className="mb-2 block text-sm font-medium text-gray-700">Google Maps URL</span>
                            <input
                                className={textInputCls}
                                value={form.mapsUrl}
                                onChange={(event) => setForm((current) => ({ ...current, mapsUrl: event.target.value }))}
                                placeholder="https://maps.google.com/..."
                            />
                        </label>
                    </div>

                    <label className="mt-4 block">
                        <span className="mb-2 block text-sm font-medium text-gray-700">Phone</span>
                        <input
                            className={textInputCls}
                            value={form.phone}
                            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                            placeholder="+1 ..."
                        />
                    </label>

                    <label className="mt-4 block">
                        <span className="mb-2 block text-sm font-medium text-gray-700">Raw Produce Inventory</span>
                        <textarea
                            className={`${textInputCls} min-h-[140px] resize-y`}
                            value={form.raw_inventory_context}
                            onChange={(event) => setForm((current) => ({ ...current, raw_inventory_context: event.target.value }))}
                            placeholder={'Add one ingredient per line.\nKale - available this week\nHeirloom tomatoes - ripe, limited batch\nFresh turmeric\nMint - smoothie and tea use'}
                        />
                        <p className="mt-2 text-xs text-gray-500">
                            This is what Navi will check first when users ask for groceries, produce, or recipe ingredients.
                        </p>
                    </label>

                    <label className="mt-4 block">
                        <span className="mb-2 block text-sm font-medium text-gray-700">Menu Context</span>
                        <textarea
                            className={`${textInputCls} min-h-[180px] resize-y`}
                            value={form.menu_context}
                            onChange={(event) => setForm((current) => ({ ...current, menu_context: event.target.value }))}
                            placeholder="Paste the actual menu, featured drinks, product shelf notes, ingredient details, and any health-friendly highlights you want Navi to use."
                        />
                    </label>

                    <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-gray-800">Upload Menu Files</p>
                                <p className="mt-1 text-xs text-gray-500">Text files extract automatically. PDFs and images are saved as source notes for now.</p>
                            </div>
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 transition hover:bg-green-100">
                                <input type="file" className="hidden" multiple onChange={handleUpload} />
                                Add Files
                            </label>
                        </div>

                        {form.menu_sources.length > 0 ? (
                            <div className="mt-4 space-y-2">
                                {form.menu_sources.map((source) => (
                                    <div key={source.id} className="rounded-xl border border-gray-200 bg-white px-3 py-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-800">{source.name}</p>
                                                <p className="mt-1 text-xs text-gray-500">{source.type}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setForm((current) => ({
                                                    ...current,
                                                    menu_sources: current.menu_sources.filter((item) => item.id !== source.id)
                                                }))}
                                                className="text-xs font-semibold text-red-500 hover:text-red-600"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                        <p className="mt-2 text-sm text-gray-600">{source.excerpt}</p>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>

                    {status ? (
                        <p className="mt-4 text-sm text-gray-600">{status}</p>
                    ) : null}

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="rounded-full bg-green-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
                        >
                            {isSaving ? 'Saving...' : form.placeProfileId ? 'Update Place Context' : 'Save Place Context'}
                        </button>
                        <p className="text-xs text-gray-500">
                            Saved inventory and menu context become available to chat recommendations when this place appears in search.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
