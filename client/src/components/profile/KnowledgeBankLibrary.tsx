'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { downloadTextFile, renderMarkdownToHtml, slugifyFilename, stripMarkdownToPlainText } from '../../lib/markdownDocument';

type LibraryCategory = {
    id: string;
    label: string;
    emoji?: string | null;
    color?: string | null;
    sort_order?: number;
    created_at?: string;
};

type LibraryItem = {
    id: string;
    category_id: string;
    title: string;
    media_url?: string | null;
    media_type: 'image' | 'video' | 'pdf' | 'markdown';
    document_type?: string | null;
    description?: string | null;
    content_markdown?: string | null;
    content_json?: Record<string, unknown> | null;
    tags?: string[] | null;
    source?: string | null;
    source_ref?: string | null;
    source_conversation_id?: string | null;
    source_message_index?: number | null;
    selection_text?: string | null;
    metadata?: Record<string, unknown> | null;
    is_private?: boolean;
    created_at?: string;
};

type AddMethod = 'url' | 'upload' | 'chat' | 'manual' | null;

type LibraryInitResponse = {
    categories?: LibraryCategory[];
    activeCategory?: LibraryCategory | null;
    activeItems?: LibraryItem[];
};

type ArchiveCache = {
    userId: string;
    categories: LibraryCategory[] | null;
    itemsByCategory: Record<string, LibraryItem[]>;
    aiChatItems: LibraryItem[] | null;
    aiChatItemsLoaded: boolean;
};

function createArchiveCache(userId = ''): ArchiveCache {
    return {
        userId,
        categories: null,
        itemsByCategory: {},
        aiChatItems: null,
        aiChatItemsLoaded: false
    };
}

const SOURCE_META: Record<string, { label: string; tint: string; ring: string }> = {
    ai_chat: { label: 'AI Chat', tint: 'bg-sky-50 text-sky-700', ring: 'border-sky-200' },
    research: { label: 'Research', tint: 'bg-violet-50 text-violet-700', ring: 'border-violet-200' },
    upload: { label: 'Uploaded', tint: 'bg-amber-50 text-amber-700', ring: 'border-amber-200' },
    manual: { label: 'Manual', tint: 'bg-emerald-50 text-emerald-700', ring: 'border-emerald-200' }
};

const DEFAULT_CATEGORIES = [
    { label: 'Recipes', emoji: '🍽️', color: '#4ade80', sort_order: 0 },
    { label: 'Foods', emoji: '🥦', color: '#facc15', sort_order: 1 },
    { label: 'Health Tips', emoji: '💡', color: '#60a5fa', sort_order: 2 },
    { label: 'Research', emoji: '📄', color: '#c084fc', sort_order: 3 }
];

const EMOJI_OPTIONS = ['🍽️', '🥦', '💡', '📄', '🧬', '🌿', '💊', '🏃', '🧘', '🫀', '🧠', '🥗', '🫖', '🌱', '🔬', '📊'];
const COLOR_OPTIONS = ['#4ade80', '#facc15', '#60a5fa', '#c084fc', '#f87171', '#fb923c', '#34d399', '#e879f9'];

const MOCK_PREVIEW_CATEGORIES: LibraryCategory[] = [
    { id: 'mock-recipes', label: 'Recipes', emoji: 'Recipe', color: '#4ade80', sort_order: 0 },
    { id: 'mock-foods', label: 'Foods', emoji: 'Food', color: '#facc15', sort_order: 1 },
    { id: 'mock-health-tips', label: 'Health Tips', emoji: 'Tips', color: '#60a5fa', sort_order: 2 },
    { id: 'mock-research', label: 'Research', emoji: 'Note', color: '#c084fc', sort_order: 3 }
];

const DEFAULT_LIBRARY_ITEMS: Record<
    string,
    Array<{
        title: string;
        media_url: string;
        media_type: 'image' | 'video' | 'pdf' | 'markdown';
        description: string;
        tags: string[];
        source: string;
        document_type?: string | null;
        content_markdown?: string | null;
        content_json?: Record<string, unknown> | null;
        source_ref?: string | null;
        is_private: boolean;
    }>
> = {
    recipes: [
        {
            title: 'Garden Greens Citrus Bowl',
            media_url: '/assets/images/gallery/organic_kale.png',
            media_type: 'image',
            description: 'A bright starter recipe built around leafy greens, herbs, citrus, and seeds.',
            tags: ['recipe', 'greens', 'fresh'],
            source: 'manual',
            is_private: true
        }
    ],
    foods: [
        {
            title: 'Local Spinach Harvest Notes',
            media_url: '/assets/images/gallery/spinach.png',
            media_type: 'image',
            description: 'Reference item for spinach quality, source details, and seasonal use.',
            tags: ['food', 'spinach', 'produce'],
            source: 'upload',
            is_private: true
        }
    ],
    'health tips': [
        {
            title: 'Daily Anti-Inflammatory Reminders',
            media_url: '/assets/images/gallery/indoor_garden.png',
            media_type: 'image',
            description: 'Quick reminder list for building more anti-inflammatory meals and shopping habits.',
            tags: ['health', 'wellness', 'tips'],
            source: 'manual',
            is_private: true
        }
    ],
    research: [
        {
            title: 'Urban Nutrition Research Snapshot',
            media_url: '/assets/images/gallery/community_garden.png',
            media_type: 'image',
            description: 'Starter research card for saving findings related to food systems, health, and local sourcing.',
            tags: ['research', 'nutrition', 'community'],
            source: 'research',
            source_ref: 'starter-research-001',
            is_private: true
        }
    ]
};

const MOCK_PREVIEW_ITEMS: Record<string, LibraryItem[]> = {
    'mock-recipes': [
        {
            id: 'mock-recipe-1',
            category_id: 'mock-recipes',
            title: 'Garden Greens Citrus Bowl',
            media_url: '/assets/images/gallery/organic_kale.png',
            media_type: 'image',
            description: 'A light recipe card with leafy greens, citrus, seeds, and herb notes.',
            tags: ['recipe', 'greens', 'fresh'],
            source: 'manual',
            is_private: true
        }
    ],
    'mock-foods': [
        {
            id: 'mock-food-1',
            category_id: 'mock-foods',
            title: 'Local Spinach Harvest Notes',
            media_url: '/assets/images/gallery/spinach.png',
            media_type: 'image',
            description: 'Example food reference with source notes, freshness cues, and usage ideas.',
            tags: ['food', 'spinach', 'produce'],
            source: 'upload',
            is_private: true
        }
    ],
    'mock-health-tips': [
        {
            id: 'mock-health-1',
            category_id: 'mock-health-tips',
            title: 'Daily Anti-Inflammatory Reminders',
            media_url: '/assets/images/gallery/indoor_garden.png',
            media_type: 'image',
            description: 'Example health card for daily tips, behavior cues, and supportive routines.',
            tags: ['health', 'wellness', 'tips'],
            source: 'manual',
            is_private: true
        }
    ],
    'mock-research': [
        {
            id: 'mock-research-1',
            category_id: 'mock-research',
            title: 'Urban Nutrition Research Snapshot',
            media_url: '/assets/images/gallery/community_garden.png',
            media_type: 'image',
            description: 'A preview research entry showing how findings and references can be organized.',
            tags: ['research', 'nutrition', 'community'],
            source: 'research',
            source_ref: 'mock-research-001',
            is_private: true
        }
    ]
};

function normalizeCategoryLabel(label?: string | null) {
    return String(label || '').trim().toLowerCase();
}

function isMockCategory(categoryId?: string | null) {
    return String(categoryId || '').startsWith('mock-');
}

function getPdfViewerSrc(mediaUrl?: string | null) {
    if (!mediaUrl) return '';
    return mediaUrl.includes('#') ? mediaUrl : `${mediaUrl}#page=1&zoom=page-width&toolbar=0&navpanes=0&scrollbar=1`;
}

function PdfDocumentFrame({
    mediaUrl,
    title,
    className,
    onDocumentReady
}: {
    mediaUrl?: string | null;
    title: string;
    className?: string;
    onDocumentReady?: (url: string) => void;
}) {
    const [resolvedUrl, setResolvedUrl] = useState('');
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        if (!mediaUrl) {
            setResolvedUrl('');
            setHasError(false);
            onDocumentReady?.('');
            return;
        }

        let objectUrl: string | null = null;

        try {
            if (mediaUrl.startsWith('data:application/pdf')) {
                const [header, payload] = mediaUrl.split(',', 2);
                const isBase64 = header.includes(';base64');
                let pdfBytes: Uint8Array;

                if (isBase64) {
                    const binary = atob(payload || '');
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i += 1) {
                        bytes[i] = binary.charCodeAt(i);
                    }
                    pdfBytes = bytes;
                } else {
                    pdfBytes = new TextEncoder().encode(decodeURIComponent(payload || ''));
                }

                const normalizedPdfBytes = new Uint8Array(pdfBytes.byteLength);
                normalizedPdfBytes.set(pdfBytes);
                objectUrl = URL.createObjectURL(new Blob([normalizedPdfBytes.buffer], { type: 'application/pdf' }));
                const nextUrl = getPdfViewerSrc(objectUrl);
                setResolvedUrl(nextUrl);
                onDocumentReady?.(nextUrl);
            } else {
                const nextUrl = getPdfViewerSrc(mediaUrl);
                setResolvedUrl(nextUrl);
                onDocumentReady?.(nextUrl);
            }

            setHasError(false);
        } catch (error) {
            console.warn('Failed to prepare PDF document for viewing.', error);
            setResolvedUrl('');
            setHasError(true);
            onDocumentReady?.('');
        }

        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [mediaUrl, onDocumentReady]);

    if (hasError) {
        return (
            <div className={`flex items-center justify-center bg-[#f7f3eb] ${className || ''}`}>
                <div className="px-6 text-center">
                    <p className="text-sm font-semibold text-slate-700">Could not render this PDF preview.</p>
                    <p className="mt-2 text-xs text-slate-500">The file saved, but this browser could not display it inline.</p>
                </div>
            </div>
        );
    }

    if (!resolvedUrl) {
        return (
            <div className={`flex items-center justify-center bg-[#f7f3eb] ${className || ''}`}>
                <p className="text-sm font-semibold text-slate-600">Loading document...</p>
            </div>
        );
    }

    return (
        <object data={resolvedUrl} type="application/pdf" className={className || 'block h-full w-full bg-white'}>
            <iframe src={resolvedUrl} title={title} className={className || 'block h-full w-full border-0 bg-white'} />
        </object>
    );
}

function SourceBadge({ source }: { source?: string | null }) {
    const meta = source ? SOURCE_META[source] : null;
    if (!meta) return null;

    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${meta.tint} ${meta.ring}`}>
            {meta.label}
        </span>
    );
}

function MediaViewer({
    item,
    onOpenPdf,
    onDocumentReady
}: {
    item: LibraryItem | null;
    onOpenPdf?: () => void;
    onDocumentReady?: (url: string) => void;
}) {
    if (!item) {
        return (
            <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(74,222,128,0.18),_transparent_42%),linear-gradient(180deg,#101511_0%,#121212_100%)] text-center">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-green-300/80">Living Library</p>
                    <p className="mt-3 max-w-xs text-sm text-white/70">Select an item below to view the saved media, context, and source details.</p>
                </div>
            </div>
        );
    }

    if (item.media_type === 'video' && item.media_url) {
        return <video src={item.media_url} controls className="h-full w-full object-cover" />;
    }

    if (item.media_type === 'pdf' && item.media_url) {
        return (
            <div className="relative h-full w-full bg-white">
                <PdfDocumentFrame mediaUrl={item.media_url} title={item.title} className="h-full w-full border-0" onDocumentReady={onDocumentReady} />
                {onOpenPdf ? (
                    <button
                        type="button"
                        onClick={onOpenPdf}
                        className="absolute right-4 top-4 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-black/80"
                    >
                        Open PDF
                    </button>
                ) : null}
            </div>
        );
    }

    if (item.media_type === 'markdown' || item.content_markdown) {
        return (
            <div className="h-full w-full overflow-y-auto bg-[linear-gradient(180deg,#fbfaf6_0%,#f4efe5_100%)] px-6 py-6">
                <article
                    className="prose prose-sm max-w-none text-slate-700"
                    dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(item.content_markdown || item.description || '') }}
                />
            </div>
        );
    }

    if (item.media_url) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.media_url} alt={item.title} className="h-full w-full object-cover" />
        );
    }

    return (
        <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#1b2b1d,#101010)] text-white/75">
            <div className="text-center">
                <p className="text-sm font-bold">{item.title}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/50">No media attached</p>
            </div>
        </div>
    );
}

export default function KnowledgeBankLibrary() {
    const router = useRouter();
    const { user, loading, openLoginModal } = useAuth();
    const addItemMenuRef = useRef<HTMLDivElement | null>(null);
    const archiveCacheRef = useRef<ArchiveCache>(createArchiveCache());
    const [categories, setCategories] = useState<LibraryCategory[]>([]);
    const [items, setItems] = useState<LibraryItem[]>([]);
    const [activeCategoryId, setActiveCategoryId] = useState<string>('');
    const [activeItem, setActiveItem] = useState<LibraryItem | null>(null);
    const [aiChatItems, setAiChatItems] = useState<LibraryItem[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(true);
    const [isLoadingItems, setIsLoadingItems] = useState(false);
    const [isLoadingAiChatItems, setIsLoadingAiChatItems] = useState(false);
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [isCreatingItem, setIsCreatingItem] = useState(false);
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [showAddItem, setShowAddItem] = useState(false);
    const [categoryLabel, setCategoryLabel] = useState('');
    const [categoryEmoji, setCategoryEmoji] = useState('🌿');
    const [categoryColor, setCategoryColor] = useState('#4ade80');
    const [addMethod, setAddMethod] = useState<AddMethod>(null);
    const [itemTitle, setItemTitle] = useState('');
    const [itemDescription, setItemDescription] = useState('');
    const [itemTags, setItemTags] = useState('');
    const [itemUrl, setItemUrl] = useState('');
    const [itemUrlType, setItemUrlType] = useState<'image' | 'video' | 'pdf'>('image');
    const [itemUploadName, setItemUploadName] = useState('');
    const [itemUploadData, setItemUploadData] = useState<string | null>(null);
    const [selectedAiChatItem, setSelectedAiChatItem] = useState<LibraryItem | null>(null);
    const [itemVisibility, setItemVisibility] = useState<'private' | 'public'>('private');
    const [activePdfOpenUrl, setActivePdfOpenUrl] = useState('');
    const [statusMessage, setStatusMessage] = useState('');

    const activeCategory = useMemo(
        () => categories.find((category) => category.id === activeCategoryId) || null,
        [categories, activeCategoryId]
    );
    const displayName = user?.full_name || user?.email?.split('@')[0] || 'Your Profile';
    const avatarUrl = user?.avatar_url || '/assets/images/gallery/user_avatar.png';

    useEffect(() => {
        if (loading || !user) return;

        let cancelled = false;
        const userId = String(user.id || '');
        const cache = archiveCacheRef.current;

        if (cache.userId !== userId) {
            archiveCacheRef.current = createArchiveCache(userId);
        }

        if (archiveCacheRef.current.categories) {
            setCategories(archiveCacheRef.current.categories || []);
            setActiveCategoryId((current) => current || archiveCacheRef.current.categories?.[0]?.id || '');
            setIsLoadingCategories(false);
        }

        const loadArchive = async () => {
            if (!archiveCacheRef.current.categories) {
                setIsLoadingCategories(true);
            }
            try {
                const res = await api.get('/profile-library/init');
                const payload = (res.data || {}) as LibraryInitResponse;
                const nextCategories = Array.isArray(payload.categories) ? payload.categories : [];
                const nextActiveCategoryId = String(payload.activeCategory?.id || nextCategories[0]?.id || '');
                const nextItems = Array.isArray(payload.activeItems) ? payload.activeItems : [];
                if (cancelled) return;

                archiveCacheRef.current.categories = nextCategories;
                if (nextActiveCategoryId) {
                    archiveCacheRef.current.itemsByCategory[nextActiveCategoryId] = nextItems;
                }

                setCategories(nextCategories);
                setItems(nextItems);
                setActiveCategoryId(nextActiveCategoryId);
                setActiveItem(nextItems[0] || null);
            } catch (error) {
                console.warn('Failed to load profile library categories.', error);
                if (!cancelled) {
                    setCategories([]);
                    setItems([]);
                    setActiveItem(null);
                    setActiveCategoryId('');
                    setStatusMessage('Could not load your archive right now.');
                }
            } finally {
                if (!cancelled) setIsLoadingCategories(false);
            }
        };

        void loadArchive();

        return () => {
            cancelled = true;
        };
    }, [loading, user]);

    useEffect(() => {
        if (!user || !activeCategoryId) return;

        let cancelled = false;
        const cachedItems = archiveCacheRef.current.itemsByCategory[activeCategoryId];

        if (cachedItems) {
            setItems(cachedItems);
            setActiveItem((current) => {
                if (current) {
                    const matchingItem = cachedItems.find((item) => item.id === current.id);
                    if (matchingItem) return matchingItem;
                }
                return cachedItems[0] || null;
            });
            setIsLoadingItems(false);
        }

        const loadItems = async () => {
            if (!cachedItems) {
                setIsLoadingItems(true);
            }
            try {
                const res = await api.get(`/profile-library/items/${activeCategoryId}`);
                const nextItems: LibraryItem[] = Array.isArray(res.data?.items) ? res.data.items : [];
                if (cancelled) return;

                archiveCacheRef.current.itemsByCategory[activeCategoryId] = nextItems;
                setItems(nextItems);
                setActiveItem((current) => {
                    if (current) {
                        const matchingItem = nextItems.find((item) => item.id === current.id);
                        if (matchingItem) return matchingItem;
                    }
                    return nextItems[0] || null;
                });
            } catch (error) {
                console.warn('Failed to load profile library items.', error);
                if (!cancelled) setStatusMessage('Could not load the items in this category.');
            } finally {
                if (!cancelled) setIsLoadingItems(false);
            }
        };

        void loadItems();

        return () => {
            cancelled = true;
        };
    }, [activeCategoryId, user]);

    useEffect(() => {
        if (!user || !showAddItem || addMethod !== 'chat') return;

        let cancelled = false;
        const cache = archiveCacheRef.current;

        if (cache.aiChatItemsLoaded) {
            setAiChatItems(cache.aiChatItems || []);
            return;
        }

        const loadAiChatItems = async () => {
            setIsLoadingAiChatItems(true);

            try {
                const res = await api.get('/profile-library/items', {
                    params: {
                        source: 'ai_chat',
                        limit: 10
                    }
                });
                const nextAiChatItems = Array.isArray(res.data) ? (res.data as LibraryItem[]) : [];
                if (cancelled) return;

                cache.aiChatItems = nextAiChatItems;
                cache.aiChatItemsLoaded = true;
                setAiChatItems(nextAiChatItems);
            } catch (error) {
                console.warn('Failed to load archived AI chat items for knowledge bank.', error);
                if (!cancelled) {
                    setAiChatItems([]);
                    setStatusMessage('Could not load saved AI chat items right now.');
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingAiChatItems(false);
                }
            }
        };

        void loadAiChatItems();

        return () => {
            cancelled = true;
        };
    }, [addMethod, showAddItem, user]);

    useEffect(() => {
        if (!showAddItem) return;

        const handlePointerDown = (event: MouseEvent) => {
            if (!addItemMenuRef.current?.contains(event.target as Node)) {
                setShowAddItem(false);
                resetAddItem();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setShowAddItem(false);
                resetAddItem();
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [showAddItem]);

    useEffect(() => {
        if (activeItem?.media_type !== 'pdf') {
            setActivePdfOpenUrl('');
        }
    }, [activeItem]);

    const resetAddItem = () => {
        setAddMethod(null);
        setItemTitle('');
        setItemDescription('');
        setItemTags('');
        setItemUrl('');
        setItemUrlType('image');
        setItemUploadName('');
        setItemUploadData(null);
        setSelectedAiChatItem(null);
        setItemVisibility('private');
    };

    const closeAddItem = () => {
        setShowAddItem(false);
        resetAddItem();
    };

    const handleMobileBack = () => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back();
            return;
        }

        router.push('/');
    };

    const openAddItem = () => {
        resetAddItem();
        setShowAddItem(true);
    };

    const handleCreateCategory = async () => {
        const label = categoryLabel.trim();
        if (!label) return;

        setIsCreatingCategory(true);
        try {
            const res = await api.post('/profile-library/categories', {
                label,
                emoji: categoryEmoji,
                color: categoryColor,
                sort_order: categories.length
            });
            const nextCategory = res.data as LibraryCategory;
            setCategories((prev) => {
                if (prev.some((category) => category.id === nextCategory.id)) {
                    return prev;
                }
                const nextCategories = [...prev, nextCategory];
                archiveCacheRef.current.categories = nextCategories;
                return nextCategories;
            });
            setActiveCategoryId(nextCategory.id);
            setShowAddCategory(false);
            setCategoryLabel('');
            setCategoryEmoji('🌿');
            setCategoryColor('#4ade80');
            setStatusMessage(res.status === 200 ? 'Category already existed, so I opened it for you.' : 'Category created.');
        } catch (error) {
            console.warn('Failed to create profile library category.', error);
            setStatusMessage('Could not create the category.');
        } finally {
            setIsCreatingCategory(false);
        }
    };

    const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setItemUploadName(file.name);
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
            setItemUploadData(String(loadEvent.target?.result || ''));
        };
        reader.readAsDataURL(file);

        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            setItemUrlType('pdf');
        }

        if (!itemTitle.trim()) {
            setItemTitle(file.name.replace(/\.[^.]+$/, ''));
        }
    };

    const handleSelectAiChatItem = (item: LibraryItem) => {
        setSelectedAiChatItem(item);
        if (!itemTitle.trim()) setItemTitle(item.title);
        if (!itemDescription.trim()) setItemDescription(item.description || `Saved from AI chat: ${item.title}`);
        if (!itemTags.trim() && Array.isArray(item.tags) && item.tags.length > 0) {
            setItemTags(item.tags.join(', '));
        }
    };

    const canSaveItem = () => {
        if (!itemTitle.trim()) return false;
        if (addMethod === 'url') return itemUrl.trim().length > 0;
        if (addMethod === 'upload') return Boolean(itemUploadData);
        if (addMethod === 'chat') return Boolean(selectedAiChatItem);
        if (addMethod === 'manual') return itemDescription.trim().length > 0;
        return false;
    };

    const handleSaveItem = async () => {
        if (!activeCategoryId || !canSaveItem() || isCreatingItem) return;

        const tags = itemTags.split(',').map((tag) => tag.trim()).filter(Boolean);
        let payload: Record<string, unknown> = {
            category_id: activeCategoryId,
            title: itemTitle.trim(),
            description: itemDescription.trim(),
            tags,
            is_private: itemVisibility === 'private'
        };

        if (addMethod === 'url') {
            payload = { ...payload, media_url: itemUrl.trim(), media_type: itemUrlType, source: 'research' };
        }

        if (addMethod === 'upload') {
            payload = {
                ...payload,
                media_url: itemUploadData,
                media_type: itemUploadData?.startsWith('data:video')
                    ? 'video'
                    : itemUploadData?.startsWith('data:application/pdf')
                      ? 'pdf'
                      : 'image',
                source: 'upload'
            };
        }

        if (addMethod === 'chat') {
            const sourceItem = selectedAiChatItem;
            const markdown = sourceItem?.content_markdown
                || `# ${itemTitle.trim()}\n\n${itemDescription.trim() || `Saved from AI chat: ${sourceItem?.title || 'Chat response'}`}`;
            payload = {
                ...payload,
                media_url: sourceItem?.media_url || null,
                media_type: sourceItem?.media_type || 'markdown',
                document_type: sourceItem?.document_type || 'chat_reference',
                content_markdown: markdown,
                content_json: sourceItem?.content_json || {
                    version: 1,
                    documentType: 'chat_reference',
                    title: itemTitle.trim(),
                    description: itemDescription.trim(),
                    markdown,
                    plainText: stripMarkdownToPlainText(markdown),
                    tags,
                    source: {
                        type: 'ai_chat',
                        conversationId: sourceItem?.source_conversation_id || sourceItem?.source_ref || null
                    }
                },
                source: 'ai_chat',
                source_ref: sourceItem?.source_ref || sourceItem?.id || null,
                source_conversation_id: sourceItem?.source_conversation_id || sourceItem?.source_ref || null,
                source_message_index: sourceItem?.source_message_index ?? null,
                selection_text: sourceItem?.selection_text || null,
                metadata: {
                    ...(sourceItem?.metadata || {}),
                    saved_from: 'knowledge_bank_chat_picker',
                    copied_from_item_id: sourceItem?.id || null
                }
            };
        }

        if (addMethod === 'manual') {
            payload = {
                ...payload,
                media_url: '/assets/images/gallery/organic_kale.png',
                media_type: 'image',
                source: 'manual'
            };
        }

        setIsCreatingItem(true);
        try {
            const res = await api.post('/profile-library/items', payload);
            const nextItem = res.data as LibraryItem;
            setItems((prev) => {
                const nextItems = [nextItem, ...prev];
                archiveCacheRef.current.itemsByCategory[activeCategoryId] = nextItems;
                return nextItems;
            });
            if (nextItem.source === 'ai_chat') {
                const nextAiChatItems = [nextItem, ...(archiveCacheRef.current.aiChatItems || []).filter((item) => item.id !== nextItem.id)].slice(0, 10);
                archiveCacheRef.current.aiChatItems = nextAiChatItems;
                archiveCacheRef.current.aiChatItemsLoaded = true;
                setAiChatItems(nextAiChatItems);
            }
            setActiveItem(nextItem);
            closeAddItem();
            setStatusMessage('Saved to your library.');
        } catch (error: any) {
            console.warn('Failed to save profile library item.', error);
            const status = error?.response?.status;
            if (status === 413) {
                setStatusMessage('That file is too large to save right now. Try a smaller PDF.');
            } else {
                setStatusMessage('Could not save the item right now.');
            }
        } finally {
            setIsCreatingItem(false);
        }
    };

    if (loading || isLoadingCategories) {
        return <div className="min-h-screen bg-white" />;
    }

    if (!user) {
        return (
            <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-6 py-12">
                <div className="w-full rounded-[2rem] border border-gray-200 bg-white p-10 text-center shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-green-600">Living Library</p>
                    <h1 className="mt-3 text-3xl font-bold text-gray-900">Sign in to access your media library</h1>
                    <p className="mt-4 text-sm text-gray-500">Your saved recipes, uploads, research, and AI findings live here.</p>
                    <button
                        type="button"
                        onClick={openLoginModal}
                        className="mt-8 rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-green-700"
                    >
                        Open Sign In
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen overflow-x-hidden bg-white text-slate-900">
            <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
                <div className="mb-6 flex items-center gap-4">
                    <button
                        type="button"
                        onClick={handleMobileBack}
                        aria-label="Go back"
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#ddd2c1] bg-white text-slate-700 shadow-sm transition hover:bg-[#f7f1e7] md:hidden"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
                            <path d="M15 18L9 12L15 6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <div className="relative h-16 w-16 overflow-hidden rounded-full border border-[#e5dccd] bg-white shadow-sm">
                        <Image src={avatarUrl} alt={displayName} fill className="object-cover" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900">{displayName}</h1>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Living Library</p>
                    </div>
                </div>

                {statusMessage ? (
                    <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 shadow-sm">
                        {statusMessage}
                    </div>
                ) : null}

                <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="min-w-0 -mx-4 overflow-hidden border-y border-[#e5dccd] bg-white shadow-[0_24px_80px_rgba(104,85,53,0.12)] sm:mx-0 sm:rounded-[2rem] sm:border">
                        <div className="relative h-[18rem] w-full bg-[#ede4d6] md:h-[28rem]">
                            <MediaViewer
                                item={activeItem}
                                onDocumentReady={activeItem?.media_type === 'pdf' ? setActivePdfOpenUrl : undefined}
                                onOpenPdf={
                                    activeItem?.media_type === 'pdf'
                                        ? () => {
                                              const targetUrl = activePdfOpenUrl || getPdfViewerSrc(activeItem.media_url);
                                              if (targetUrl) {
                                                  window.open(targetUrl, '_blank', 'noopener,noreferrer');
                                              }
                                          }
                                        : undefined
                                }
                            />
                            {activeItem && activeItem.media_type !== 'pdf' && activeItem.media_type !== 'markdown' && !activeItem.content_markdown ? (
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-6 pb-6 pt-20 text-white">
                                    <h2 className="mt-4 text-2xl font-bold">{activeItem.title}</h2>
                                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                                        <SourceBadge source={activeItem.source} />
                                        {(activeItem.tags || []).map((tag, index) => (
                                            <div key={tag} className="flex items-center gap-3 text-[11px] font-semibold text-white/85">
                                                {index > 0 ? <span className="h-3 w-px bg-white/35" aria-hidden="true" /> : null}
                                                <span>{tag}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="mt-2 max-w-2xl text-sm text-white/70">{activeItem.description || 'No description added yet.'}</p>
                                </div>
                            ) : null}
                            {activeItem && (activeItem.media_type === 'markdown' || activeItem.content_markdown) ? (
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0f1410]/88 via-[#0f1410]/50 to-transparent px-6 pb-6 pt-24 text-white">
                                    <h2 className="mt-4 text-2xl font-bold">{activeItem.title}</h2>
                                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                                        <SourceBadge source={activeItem.source} />
                                        {(activeItem.tags || []).map((tag, index) => (
                                            <div key={tag} className="flex items-center gap-3 text-[11px] font-semibold text-white/85">
                                                {index > 0 ? <span className="h-3 w-px bg-white/35" aria-hidden="true" /> : null}
                                                <span>{tag}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="mt-2 max-w-2xl text-sm text-white/70">{activeItem.description || 'Saved markdown document.'}</p>
                                </div>
                            ) : null}
                        </div>
                        {activeItem?.media_type === 'pdf' ? (
                            <div className="border-t border-[#efe6d8] px-5 py-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">{activeItem.title}</h2>
                                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-slate-600">
                                            <SourceBadge source={activeItem.source} />
                                            {(activeItem.tags || []).map((tag, index) => (
                                                <div key={tag} className="flex items-center gap-3 text-[11px] font-semibold text-slate-600">
                                                    {index > 0 ? <span className="h-3 w-px bg-slate-300" aria-hidden="true" /> : null}
                                                    <span>{tag}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="mt-3 max-w-3xl text-sm text-slate-600">{activeItem.description || 'No description added yet.'}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const targetUrl = activePdfOpenUrl || getPdfViewerSrc(activeItem.media_url);
                                            if (targetUrl) {
                                                window.open(targetUrl, '_blank', 'noopener,noreferrer');
                                            }
                                        }}
                                        className="rounded-xl border border-[#d8cfbf] bg-[#f7f2e8] px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-[#efe6d8]"
                                    >
                                        Open PDF
                                    </button>
                                </div>
                            </div>
                        ) : null}
                        {activeItem && (activeItem.media_type === 'markdown' || activeItem.content_markdown) ? (
                            <div className="border-t border-[#efe6d8] px-5 py-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">{activeItem.title}</h2>
                                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-slate-600">
                                            <SourceBadge source={activeItem.source} />
                                            {(activeItem.tags || []).map((tag, index) => (
                                                <div key={tag} className="flex items-center gap-3 text-[11px] font-semibold text-slate-600">
                                                    {index > 0 ? <span className="h-3 w-px bg-slate-300" aria-hidden="true" /> : null}
                                                    <span>{tag}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="mt-3 max-w-3xl text-sm text-slate-600">{activeItem.description || 'Saved markdown document.'}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => downloadTextFile(`${slugifyFilename(activeItem.title)}.md`, activeItem.content_markdown || '', 'text/markdown')}
                                            className="rounded-xl border border-[#d8cfbf] bg-[#f7f2e8] px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-[#efe6d8]"
                                        >
                                            Download MD
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => downloadTextFile(
                                                `${slugifyFilename(activeItem.title)}.json`,
                                                JSON.stringify(activeItem.content_json || activeItem.metadata || {}, null, 2),
                                                'application/json'
                                            )}
                                            className="rounded-xl border border-[#d8cfbf] bg-[#f7f2e8] px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-[#efe6d8]"
                                        >
                                            Download JSON
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                        <div className="border-t border-[#efe6d8] px-5 py-4">
                            <div className="flex flex-wrap gap-2 pb-2 md:flex-nowrap md:gap-3 md:overflow-x-auto">
                                {categories.map((category) => {
                                    const isActive = activeCategoryId === category.id;
                                    return (
                                        <button
                                            key={category.id}
                                            type="button"
                                            onClick={() => setActiveCategoryId(category.id)}
                                            className={`flex min-w-[68px] flex-col items-center justify-center rounded-xl border px-2 py-2 text-center transition md:min-w-[88px] md:rounded-2xl md:px-3 md:py-3 ${
                                                isActive
                                                    ? 'border-[#cce8d4] bg-[#eef9f1] text-slate-900 shadow-sm'
                                                    : 'border-[#e8dfd0] bg-[#faf6ef] text-slate-600 hover:bg-[#f4ecdf]'
                                            }`}
                                        >
                                            <span className="text-xl">{category.emoji || '🌿'}</span>
                                            <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] md:mt-2 md:text-[11px] md:tracking-wide">{category.label}</span>
                                        </button>
                                    );
                                })}
                                    <button
                                        type="button"
                                        onClick={() => setShowAddCategory(true)}
                                        aria-label="Add category"
                                        className="flex min-w-[68px] items-center justify-center rounded-xl border border-dashed border-[#d7ccb9] bg-[#fff9ef] px-2 py-2 text-2xl font-light text-slate-500 transition hover:border-green-300 hover:bg-[#eef9f1] hover:text-green-700 md:min-w-[88px] md:rounded-2xl md:px-3 md:py-3 md:text-3xl"
                                    >
                                        +
                                    </button>
                            </div>
                        </div>
                    </div>

                    <div className="min-w-0 p-0">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                    {(activeCategory?.emoji || '🌿')} {activeCategory?.label || 'Category'}
                                </p>
                                <h2 className="mt-1 text-lg font-bold text-slate-900">{items.length} saved item{items.length === 1 ? '' : 's'}</h2>
                            </div>
                            <div className="relative flex items-center gap-3" ref={addItemMenuRef}>
                                {isLoadingItems ? <span className="text-xs font-semibold text-slate-500">Loading...</span> : null}
                                <button
                                    type="button"
                                    onClick={() => (showAddItem ? closeAddItem() : openAddItem())}
                                    disabled={!activeCategoryId}
                                    className="rounded-xl border border-[#d8cfbf] bg-[#f7f2e8] px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-[#efe6d8] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    + Add
                                </button>
                                {showAddItem ? (
                                    <div className="absolute left-0 right-0 top-full z-30 mt-3 overflow-hidden rounded-[1.5rem] border border-[#e5dccd] bg-[#fffaf2] p-4 text-slate-900 shadow-[0_24px_80px_rgba(104,85,53,0.18)] md:left-auto md:right-0 md:w-[min(28rem,calc(100vw-3rem))]">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Add Content</p>
                                                <h3 className="mt-1 text-base font-bold text-slate-900">Save something into {activeCategory?.label || 'this category'}</h3>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={closeAddItem}
                                                className="rounded-full border border-[#ddd2c1] bg-white px-2.5 py-1 text-sm font-semibold text-slate-500 transition hover:bg-[#f7f1e7]"
                                                aria-label="Close add content menu"
                                            >
                                                x
                                            </button>
                                        </div>

                                        <div className="mt-4 grid grid-cols-2 gap-2">
                                            {[
                                                { id: 'url', label: 'Paste URL' },
                                                { id: 'upload', label: 'Upload File' },
                                                { id: 'chat', label: 'AI Chat' },
                                                { id: 'manual', label: 'Manual Entry' }
                                            ].map((method) => (
                                                <button
                                                    key={method.id}
                                                    type="button"
                                                    onClick={() => setAddMethod(method.id as AddMethod)}
                                                    className={`rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                                                        addMethod === method.id ? 'border-green-300 bg-green-50 text-green-800' : 'border-[#e3d9c9] bg-white text-slate-600'
                                                    }`}
                                                >
                                                    {method.label}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="mt-4 max-h-[60vh] overflow-y-auto pr-1">
                                            {addMethod === 'url' ? (
                                                <div className="space-y-4">
                                                    <input
                                                        type="text"
                                                        value={itemUrl}
                                                        onChange={(event) => setItemUrl(event.target.value)}
                                                        placeholder="https://example.com/file.pdf"
                                                        className="w-full rounded-2xl border border-[#ded5c6] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-green-500"
                                                    />
                                                    <div className="flex gap-2">
                                                        {(['image', 'video', 'pdf'] as const).map((type) => (
                                                            <button
                                                                key={type}
                                                                type="button"
                                                                onClick={() => setItemUrlType(type)}
                                                                className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold capitalize transition ${
                                                                    itemUrlType === type ? 'border-green-300 bg-green-50 text-green-800' : 'border-[#e3d9c9] bg-white text-slate-600'
                                                                }`}
                                                            >
                                                                {type}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : null}

                                            {addMethod === 'upload' ? (
                                                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#cddfcb] bg-[#f4fbf5] px-4 py-8 text-center">
                                                    <input type="file" accept="image/*,video/*,.pdf,application/pdf" className="hidden" onChange={handleFile} />
                                                    <p className="text-lg">{itemUploadName ? '✓' : '📁'}</p>
                                                    <p className="mt-3 text-sm font-semibold text-slate-900">{itemUploadName || 'Tap to choose image, video, or PDF'}</p>
                                                    <p className="mt-1 text-xs text-slate-500">Stored as a direct client upload for now</p>
                                                </label>
                                            ) : null}

                                            {addMethod === 'chat' ? (
                                                <div className="max-h-60 space-y-2 overflow-y-auto">
                                                    <p className="rounded-2xl border border-[#e9dfd0] bg-white px-4 py-3 text-xs text-slate-500">
                                                        Only AI chat documents already saved in your archive appear here.
                                                    </p>
                                                    {isLoadingAiChatItems ? (
                                                        <div className="rounded-2xl border border-dashed border-[#ddd2c1] px-4 py-6 text-center text-sm text-slate-500">
                                                            Loading saved AI chat items...
                                                        </div>
                                                    ) : aiChatItems.length === 0 ? (
                                                        <div className="rounded-2xl border border-dashed border-[#ddd2c1] px-4 py-6 text-center text-sm text-slate-500">
                                                            No archived AI chat items found yet.
                                                        </div>
                                                    ) : (
                                                        aiChatItems.map((item) => (
                                                            <button
                                                                key={item.id}
                                                                type="button"
                                                                onClick={() => handleSelectAiChatItem(item)}
                                                                className={`w-full rounded-2xl border p-4 text-left transition ${
                                                                    selectedAiChatItem?.id === item.id ? 'border-green-300 bg-green-50' : 'border-[#e3d9c9] bg-white'
                                                                }`}
                                                            >
                                                                <p className="text-sm font-bold text-slate-900">{item.title}</p>
                                                                <p className="mt-1 text-xs text-slate-500">
                                                                    {item.source_conversation_id ? `Conversation ID: ${item.source_conversation_id}` : `Archive item: ${item.id}`}
                                                                </p>
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            ) : null}

                                            {addMethod ? (
                                                <div className="mt-4 space-y-4">
                                                    <input
                                                        type="text"
                                                        value={itemTitle}
                                                        onChange={(event) => setItemTitle(event.target.value)}
                                                        placeholder="Give this item a name"
                                                        className="w-full rounded-2xl border border-[#ded5c6] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-green-500"
                                                    />
                                                    <textarea
                                                        value={itemDescription}
                                                        onChange={(event) => setItemDescription(event.target.value)}
                                                        placeholder="Add a description or useful context"
                                                        className="min-h-24 w-full rounded-2xl border border-[#ded5c6] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-green-500"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={itemTags}
                                                        onChange={(event) => setItemTags(event.target.value)}
                                                        placeholder="e.g. gut health, dairy-free"
                                                        className="w-full rounded-2xl border border-[#ded5c6] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-green-500"
                                                    />
                                                    <div>
                                                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Visibility</p>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {(['private', 'public'] as const).map((visibility) => (
                                                                <button
                                                                    key={visibility}
                                                                    type="button"
                                                                    onClick={() => setItemVisibility(visibility)}
                                                                    className={`rounded-xl border px-4 py-2.5 text-sm font-bold capitalize transition ${
                                                                        itemVisibility === visibility
                                                                            ? 'border-green-300 bg-green-50 text-green-800'
                                                                            : 'border-[#e3d9c9] bg-white text-slate-600'
                                                                    }`}
                                                                >
                                                                    {visibility}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>

                                        <div className="mt-4 flex gap-3">
                                            <button
                                                type="button"
                                                onClick={closeAddItem}
                                                className="flex-1 rounded-xl border border-[#ddd2c1] bg-white px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-[#f7f1e7]"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleSaveItem}
                                                disabled={!canSaveItem() || isCreatingItem}
                                                className="flex-[1.3] rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
                                            >
                                                {isCreatingItem ? 'Saving...' : 'Save to Library'}
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="md:max-h-[36rem] md:overflow-y-auto md:pr-1">
                            {items.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-[#ddd2c1] bg-[#fcf8f1] px-5 py-10 text-center">
                                    <div className="text-3xl">{activeCategory?.emoji || '🌿'}</div>
                                    <p className="mt-4 text-base font-semibold text-slate-900">Nothing saved here yet</p>
                                    <p className="mt-2 text-sm text-slate-500">Add content by URL, upload, AI chat, or manual entry.</p>
                                </div>
                            ) : (
                                items.map((item, index) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setActiveItem(item)}
                                        className={`flex w-full items-center gap-4 px-1 py-4 text-left transition ${
                                            index < items.length - 1 ? 'border-b border-[#eee4d5]' : ''
                                        } ${
                                            activeItem?.id === item.id
                                                ? 'bg-transparent'
                                                : 'bg-transparent hover:bg-transparent'
                                        }`}
                                    >
                                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md">
                                            {item.media_type === 'pdf' ? (
                                                <div className="flex h-full w-full items-center justify-center bg-[#f4efe5] text-xs font-bold uppercase tracking-[0.18em] text-slate-600">
                                                    PDF
                                                </div>
                                            ) : item.media_type === 'markdown' || item.content_markdown ? (
                                                <div className="flex h-full w-full items-center justify-center bg-[#eef6ee] text-xs font-bold uppercase tracking-[0.18em] text-green-700">
                                                    MD
                                                </div>
                                            ) : item.media_url ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={item.media_url} alt={item.title} className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="flex h-full items-center justify-center text-xs font-bold text-slate-500">No Media</div>
                                            )}
                                            {item.media_type === 'video' ? (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/35 text-lg text-white">▶</div>
                                            ) : null}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="truncate text-sm font-bold text-slate-900">{item.title}</p>
                                                <SourceBadge source={item.source} />
                                            </div>
                                            <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.description || 'No description added yet.'}</p>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {showAddCategory ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1c1b18]/35 px-4 py-8 backdrop-blur-sm">
                    <div className="w-full max-w-xl rounded-[2rem] border border-[#e5dccd] bg-[#fffaf2] p-6 text-slate-900 shadow-[0_24px_80px_rgba(104,85,53,0.18)]">
                        <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-[#d9cfbf]" />
                        <h2 className="text-xl font-bold">Create Category</h2>
                        <div className="mt-5 space-y-4">
                            <input
                                type="text"
                                value={categoryLabel}
                                onChange={(event) => setCategoryLabel(event.target.value)}
                                placeholder="e.g. Supplements"
                                className="w-full rounded-2xl border border-[#ded5c6] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-green-500"
                            />
                            <div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Icon</p>
                                <div className="flex flex-wrap gap-2">
                                    {EMOJI_OPTIONS.map((emoji) => (
                                        <button
                                            key={emoji}
                                            type="button"
                                            onClick={() => setCategoryEmoji(emoji)}
                                            className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg transition ${
                                                categoryEmoji === emoji ? 'border-green-400 bg-green-50' : 'border-[#e3d9c9] bg-white'
                                            }`}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Accent</p>
                                <div className="flex flex-wrap gap-2">
                                    {COLOR_OPTIONS.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setCategoryColor(color)}
                                            className={`h-9 w-9 rounded-full border-2 transition ${categoryColor === color ? 'border-white' : 'border-transparent'}`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowAddCategory(false)}
                                className="flex-1 rounded-xl border border-[#ddd2c1] bg-white px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-[#f7f1e7]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleCreateCategory}
                                disabled={!categoryLabel.trim() || isCreatingCategory}
                                className="flex-[1.3] rounded-xl px-4 py-3 text-sm font-bold text-gray-950 transition disabled:opacity-50"
                                style={{ backgroundColor: categoryColor }}
                            >
                                {isCreatingCategory ? 'Creating...' : 'Add Category'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

        </div>
    );
}
