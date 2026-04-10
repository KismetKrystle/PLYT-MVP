'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProductPreviewPanel, { ProductDetail } from './ProductPreviewPanel';
import IntentLoader from './chat/IntentLoader';
import NaviAvatar from './chat/NaviAvatar';
import { useLessons } from '../context/LessonContext';
import { classifyIntent, IntentClassification, IntentConfidence, IntentName } from '../lib/intentClassifier';
import { renderMarkdownToHtml, stripMarkdownToPlainText } from '../lib/markdownDocument';

interface ProduceItem extends ProductDetail {
    quantity: number;
}

interface PlaceSuggestion {
    id?: string;
    place_profile_id?: string;
    name: string;
    address: string;
    phone: string;
    rating: number | null;
    reviewsCount: number;
    website: string;
    mapsUrl: string;
    image: string | null;
    distance_km?: number | null;
    place_kind?: string;
    network_status?: string;
}

interface FavoritePlaceRecord {
    id?: string;
    place_profile_id?: string;
    external_place_id?: string;
    name?: string;
    address?: string;
    mapsUrl?: string;
    [key: string]: unknown;
}

interface GroceryListItem {
    id: string;
    name: string;
    quantity?: string;
    unit?: string;
    display: string;
    checked: boolean;
}

interface GroceryBundle {
    title: string;
    items: GroceryListItem[];
    premiumFindings: PlaceSuggestion[];
    googleFindings: PlaceSuggestion[];
    premiumQueries: string[];
    googleQueries: string[];
    location: string;
    areaLabel: string;
    sourceLabel: string;
    googleRequested: boolean;
}

type SearchLocationSource = 'manual' | 'device' | 'home' | 'unknown';
type ChatFallbackReason = 'config_missing' | 'provider_error' | 'generation_failed';
type LocationReason = 'resolved' | 'missing' | 'geocode_failed';

type ChatMessage = {
    role: 'user' | 'assistant';
    content: string;
    tags?: string[];
    steps?: string[];
    image?: string;
    followUpOptions?: QuickReplyOption[] | null;
    usedFallback?: boolean;
    fallbackReason?: ChatFallbackReason;
    providerStatus?: string;
    incompleteProfile?: boolean;
    intent?: IntentName;
    intentConfidence?: IntentConfidence;
    mixedIntent?: IntentName | null;
};

type SuggestionPanelMode = 'suggestions' | 'grocery_options' | 'ready_to_eat' | 'advice_guidance';

const SUGGESTION_PANEL_MODE_META: Record<SuggestionPanelMode, { title: string; description: string }> = {
    suggestions: {
        title: 'Suggestions',
        description: 'Nearby matches related to your current search.'
    },
    grocery_options: {
        title: 'Grocery Options',
        description: 'Ingredient sourcing starts with Premium Findings from the app network. Search by Google only when you want broader external results.'
    },
    ready_to_eat: {
        title: 'Ready to Eat',
        description: 'Nearby places that look like a fit for something you can order or eat now.'
    },
    advice_guidance: {
        title: 'Advice & Guidance',
        description: 'Expert profiles and guidance resources related to the help you are looking for.'
    }
};

function inferSuggestionPanelModeFromContext(
    message: string,
    intent?: IntentName | null,
    queries: string[] = []
): SuggestionPanelMode {
    if (intent === 'health_advice' || intent === 'research' || intent === 'library_action') {
        return 'advice_guidance';
    }

    const combinedText = `${String(message || '')} ${queries.join(' ')}`.toLowerCase();

    if (/(ingredient|ingredients|grocery|grocer|market|produce|farm stand|farmers market|buy|shop|pantry|herb|spice)/.test(combinedText)) {
        return 'grocery_options';
    }

    if (
        intent === 'meal_suggestion' ||
        intent === 'food_search' ||
        /(restaurant|restaurants|cafe|cafes|takeout|delivery|order|pickup|eat now|eat out|meal near me|ready to eat|what.?s nearby)/.test(combinedText)
    ) {
        return 'ready_to_eat';
    }

    return 'suggestions';
}

function supportsHoverInteractions() {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return false;
    }
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function describeGeolocationError(error: unknown) {
    if (typeof window !== 'undefined' && 'GeolocationPositionError' in window && error instanceof GeolocationPositionError) {
        switch (error.code) {
            case error.PERMISSION_DENIED:
                return 'permission denied';
            case error.POSITION_UNAVAILABLE:
                return 'position unavailable';
            case error.TIMEOUT:
                return 'request timed out';
            default:
                return error.message || 'unknown geolocation error';
        }
    }

    if (error && typeof error === 'object' && 'code' in error) {
        const maybeCode = Number((error as { code?: unknown }).code);
        if (maybeCode === 1) return 'permission denied';
        if (maybeCode === 2) return 'position unavailable';
        if (maybeCode === 3) return 'request timed out';
    }

    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as { message?: unknown }).message || 'unknown geolocation error');
    }

    return 'unknown geolocation error';
}

function getPlaceIdentity(place: {
    place_profile_id?: string | null;
    external_place_id?: string | null;
    id?: string | null;
    mapsUrl?: string | null;
    name?: string | null;
    address?: string | null;
}) {
    return String(
        place.place_profile_id ||
        place.external_place_id ||
        place.id ||
        place.mapsUrl ||
        `${place.name || ''}|${place.address || ''}`
    ).trim();
}

function getDefaultSearchRadiusKm(profileData: Record<string, any> | undefined) {
    const radius = Number(profileData?.user_settings?.default_search_radius_km);
    return SEARCH_RADIUS_OPTIONS_KM.includes(radius) ? radius : 25;
}

function mentionsSuggestionsPanel(text: string) {
    const normalized = String(text || '').toLowerCase();
    return normalized.includes('suggestions panel') ||
        normalized.includes('check your panel') ||
        normalized.includes('see your suggestions') ||
        normalized.includes('places listed');
}

function isRecipeAssistantMessage(message: Pick<ChatMessage, 'role' | 'content' | 'intent'>) {
    if (message.role !== 'assistant') return false;
    if (message.intent === 'recipe_search') return true;
    const normalized = String(message.content || '').toLowerCase();
    return normalized.includes('ingredients') && (normalized.includes('instructions') || normalized.includes('directions') || normalized.includes('method'));
}

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSuggestionLinkTarget(place: {
    place_profile_id?: string | null;
    external_place_id?: string | null;
    id?: string | null;
    mapsUrl?: string | null;
    name?: string | null;
    address?: string | null;
}) {
    const identity = getPlaceIdentity(place);
    return identity ? `plyt://suggestion/${encodeURIComponent(identity)}` : '';
}

function stripPanelPlaceLinks(text: string, places: PlaceSuggestion[]) {
    let normalizedText = String(text || '');

    places
        .filter((place) => String(place?.name || '').trim() && String(place?.mapsUrl || '').trim())
        .forEach((place) => {
            const name = String(place.name || '').trim();
            const mapsUrl = String(place.mapsUrl || '').trim();
            const escapedName = escapeRegExp(name);
            const escapedUrl = escapeRegExp(mapsUrl);

            normalizedText = normalizedText.replace(
                new RegExp(`\\[${escapedName}\\]\\(${escapedUrl}\\)`, 'gi'),
                name
            );

            normalizedText = normalizedText.replace(
                new RegExp(`(^|[^\\]])(${escapedName})\\s*(?:\\(|-\\s*|:\\s*)${escapedUrl}\\)?`, 'gmi'),
                (_match, prefix) => `${prefix}${name}`
            );

            normalizedText = normalizedText.replace(
                new RegExp(`(^|[^\\]])(${escapedName})\\s+${escapedUrl}`, 'gmi'),
                (_match, prefix) => `${prefix}${name}`
            );
        });

    return normalizedText;
}

function normalizeSuggestedPlaceLinks(text: string, places: PlaceSuggestion[]) {
    let normalizedText = String(text || '');

    places
        .filter((place) => String(place?.name || '').trim() && String(place?.mapsUrl || '').trim())
        .forEach((place) => {
            const name = String(place.name || '').trim();
            const mapsUrl = String(place.mapsUrl || '').trim();
            const suggestionHref = buildSuggestionLinkTarget(place);
            const escapedName = escapeRegExp(name);
            const escapedUrl = escapeRegExp(mapsUrl);
            const markdownLink = suggestionHref ? `[${name}](${suggestionHref})` : `[${name}](${mapsUrl})`;

            normalizedText = normalizedText.replace(
                new RegExp(`\\[${escapedName}\\]\\(${escapedUrl}\\)\\s*(?:\\(|-\\s*|:\\s*)?${escapedUrl}\\)?`, 'gi'),
                markdownLink
            );

            normalizedText = normalizedText.replace(
                new RegExp(`(^|[^\\]])(${escapedName})\\s*(?:\\(|-\\s*|:\\s*)${escapedUrl}\\)?`, 'gmi'),
                (_match, prefix) => `${prefix}${markdownLink}`
            );

            normalizedText = normalizedText.replace(
                new RegExp(`(^|[^\\]])(${escapedName})\\s+${escapedUrl}`, 'gmi'),
                (_match, prefix) => `${prefix}${markdownLink}`
            );
        });

    return normalizedText;
}

function linkSuggestedPlaceMentions(text: string, places: PlaceSuggestion[]) {
    let linkedText = String(text || '');
    const sortedPlaces = [...places]
        .filter((place) => String(place?.name || '').trim() && String(place?.mapsUrl || '').trim())
        .sort((a, b) => String(b.name || '').length - String(a.name || '').length);

    sortedPlaces.forEach((place) => {
        const name = String(place.name || '').trim();
        const suggestionHref = buildSuggestionLinkTarget(place);
        if (!name || !suggestionHref) {
            return;
        }

        const escapedName = escapeRegExp(name);
        linkedText = linkedText.replace(
            new RegExp(`\\[${escapedName}\\]\\((?:https?:\\/\\/|plyt:\\/\\/)[^\\s)]*\\)`, 'gi'),
            `[${name}](${suggestionHref})`
        );

        const pattern = new RegExp(`(^|[^\\w\\[])(${escapedName})(?=[^\\w]|$)`, 'g');
        linkedText = linkedText.replace(pattern, (_match, prefix, matchedName) => `${prefix}[${matchedName}](${suggestionHref})`);
    });

    return linkedText;
}

function appendCompanionPlacesNote(text: string, places: PlaceSuggestion[]) {
    const normalizedText = String(text || '').trim();
    if (!normalizedText) return normalizedText;
    if (places.length === 0) {
        return normalizedText;
    }

    const namedPlaces = places
        .filter((place) => String(place?.name || '').trim() && String(place?.mapsUrl || '').trim())
        .slice(0, 2);

    if (namedPlaces.length === 0) {
        return `${normalizedText}\n\nYou may find similar options in the suggestions panel as well.`;
    }

    if (namedPlaces.length === 1) {
        return mentionsSuggestionsPanel(normalizedText)
            ? `${normalizedText}\n\n${String(namedPlaces[0].name).trim()} is one good match there too.`
            : `${normalizedText}\n\nYou may find similar options in the suggestions panel too, especially at ${String(namedPlaces[0].name).trim()}.`;
    }

    return mentionsSuggestionsPanel(normalizedText)
        ? `${normalizedText}\n\nGood matches there include ${String(namedPlaces[0].name).trim()} and ${String(namedPlaces[1].name).trim()}.`
        : `${normalizedText}\n\nYou may find similar options in the suggestions panel too, including ${String(namedPlaces[0].name).trim()} and ${String(namedPlaces[1].name).trim()}.`;
}

function PlaceThumbnail({ image, name }: { image: string | null; name: string }) {
    const [hasImageError, setHasImageError] = useState(false);

    useEffect(() => {
        setHasImageError(false);
    }, [image]);

    if (!image || hasImageError) {
        return (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0L6.343 16.657a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </div>
        );
    }

    return (
        <img
            src={image}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setHasImageError(true)}
        />
    );
}

type LastPlaceSearch = {
    message: string;
    queries: string[];
    location: string;
    locationResolved?: boolean;
    locationReason?: LocationReason;
    restored?: boolean;
};

type SavedSuggestionState = {
    suggestedPlaces: PlaceSuggestion[];
    suggestedProducts: ProduceItem[];
    lastPlaceSearch: LastPlaceSearch | null;
    searchRadiusKm: number;
    searchAreaLabel: string;
    locationSourceLabel: string;
    showPreview: boolean;
    locationReason?: LocationReason;
    locationContextRestored?: boolean;
};

type ResolvedSearchLocation = {
    location: string;
    areaLabel: string;
    source: SearchLocationSource;
    locationResolved: boolean;
    locationReason: LocationReason;
};

type GoogleInquiryResult = {
    queries: string[];
    places: PlaceSuggestion[];
    locationResolved: boolean;
    locationReason: LocationReason;
    providerStatus?: string;
};

type QuickReplyOption = {
    id: string;
    label: string;
    prompt: string;
};

type LibraryCategory = {
    id: string;
    label: string;
    emoji?: string | null;
    color?: string | null;
    sort_order?: number;
    created_at?: string;
};

type Tab = 'home' | 'chat' | 'find_produce' | 'pick_system' | 'learn' | 'impact' | 'guide' | 'about_you' | 'living_library';

function normalizeDashboardTab(tab: string | null) {
    const normalized = String(tab || '').trim().toLowerCase();
    if (normalized === 'health_profiles') return 'about_you';
    if (normalized === 'customer_profile') return 'living_library';
    return normalized;
}

import { useSearchParams, useRouter } from 'next/navigation';
import api from '../lib/api';

// import PublicProfile from './profile/PublicProfile'; // Deprecated
import PublicProfileV2 from './profile/PublicProfileV2';
import { useCart } from '../context/CartContext';
import ImpactMetrics from './profile/ImpactMetrics';
import { useAuth } from '../lib/auth';
import FarmerDashboard from './dashboards/FarmerDashboard';
import DistributorDashboard from './dashboards/DistributorDashboard';
import ServicerDashboard from './dashboards/ServicerDashboard';
import ProfileWorkspace from './consumer-health-profile/ProfileWorkspace';

const SEARCH_RADIUS_OPTIONS_KM = [5, 10, 25, 50, 80, 120];
const INITIAL_VISIBLE_PLACE_COUNT = 6;
const PLACE_PANEL_INCREMENT = 6;
const DEFAULT_CHAT_GREETING = 'Hello! I can help you find fresh food, nearby places, recipes, and practical nutrition guidance. What are you looking for?';
const GOOGLE_SEARCH_RESULT_LIMIT = 5;
const AUTH_MODAL_LINKS = new Set(['/login', '/signup', 'plyt://auth-modal']);
const SIGN_IN_REQUIRED_MESSAGE = 'Sign in or create your profile before searching so Navi can tailor results to your health context and preferences.';
const DEFAULT_LIBRARY_CATEGORIES = [
    { label: 'Recipes', emoji: '🍽️', color: '#4ade80', sort_order: 0 },
    { label: 'Foods', emoji: '🥦', color: '#facc15', sort_order: 1 },
    { label: 'Health Tips', emoji: '💡', color: '#60a5fa', sort_order: 2 },
    { label: 'Research', emoji: '📄', color: '#c084fc', sort_order: 3 }
];

type SaveMode = 'full' | 'selection';

function normalizeIntentName(value: unknown): IntentName | null {
    switch (value) {
        case 'food_search':
        case 'recipe_search':
        case 'health_advice':
        case 'meal_suggestion':
        case 'research':
        case 'library_action':
        case 'general':
            return value;
        default:
            return null;
    }
}

function normalizeLibraryLabel(value?: string | null) {
    return String(value || '').trim().toLowerCase();
}

function getSuggestedLibraryCategoryLabel(intent?: IntentName) {
    if (intent === 'recipe_search') return 'recipes';
    if (intent === 'food_search' || intent === 'meal_suggestion') return 'foods';
    if (intent === 'health_advice' || intent === 'library_action') return 'health tips';
    if (intent === 'research') return 'research';
    return 'recipes';
}

function deriveDocumentType(intent?: IntentName) {
    if (intent === 'recipe_search') return 'recipe';
    if (intent === 'food_search' || intent === 'meal_suggestion') return 'food_note';
    if (intent === 'health_advice') return 'health_note';
    if (intent === 'research') return 'research_note';
    if (intent === 'library_action') return 'library_note';
    return 'chat_note';
}

function deriveChatSaveTitle(content: string, intent?: IntentName) {
    const headingMatch = String(content || '').match(/^#{1,3}\s+(.+)$/m);
    if (headingMatch?.[1]) {
        return headingMatch[1].trim().slice(0, 80);
    }

    const plain = stripMarkdownToPlainText(content).replace(/\s+/g, ' ').trim();
    if (!plain) {
        return intent === 'recipe_search' ? 'Saved Recipe' : 'Saved Chat Note';
    }

    const clipped = plain.length > 72 ? `${plain.slice(0, 69).trim()}...` : plain;
    return clipped;
}

function normalizeSearchLocationText(location?: string) {
    const value = String(location || '').trim();
    if (!value || /^Lat:\s*[-0-9.]+\s*,\s*Lng:\s*[-0-9.]+$/i.test(value)) {
        return value;
    }

    if (/bali/i.test(value) && !/indonesia/i.test(value)) {
        return `${value}, Indonesia`;
    }

    return value;
}

function getFallbackNotice(message: Pick<ChatMessage, 'usedFallback' | 'fallbackReason' | 'providerStatus'>) {
    if (!message.usedFallback) return '';
    if (message.fallbackReason === 'config_missing' || message.fallbackReason === 'provider_error') {
        return 'AI provider unavailable right now. Please try again in a moment.';
    }

    return 'AI response generation failed just now. Please try again in a moment.';
}

function getLocationReasonLabel(locationReason?: LocationReason) {
    if (locationReason === 'geocode_failed') return 'geocode_failed';
    if (locationReason === 'missing') return 'missing';
    return 'resolved';
}

export default function AgriDashboard() {
    const searchParams = useSearchParams();
    const historyId = searchParams.get('historyId');
    const requestedTab = searchParams.get('tab');
    const normalizedRequestedTab = normalizeDashboardTab(requestedTab);

    const { user, requireAuth, openLoginModal } = useAuth(); // Get user for profile & requireAuth
    const { addToCart } = useCart();
    const defaultSearchRadiusKm = getDefaultSearchRadiusKm(user?.profile_data);

    const isProfileTab = normalizedRequestedTab === 'living_library' || normalizedRequestedTab === 'about_you';
    const shouldShowDelegatedDashboard = !normalizedRequestedTab || normalizedRequestedTab === 'home';
    const delegatedDashboard = !isProfileTab && shouldShowDelegatedDashboard
        ? user?.role === 'farmer'
            ? <FarmerDashboard />
            : user?.role === 'distributor'
                ? <DistributorDashboard />
                : user?.role === 'servicer'
                    ? <ServicerDashboard />
                    : null
        : null;

    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>('home');
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [searchRadiusKm, setSearchRadiusKm] = useState(defaultSearchRadiusKm);
    const [visiblePlaceCount, setVisiblePlaceCount] = useState(INITIAL_VISIBLE_PLACE_COUNT);
    const [searchAreaLabel, setSearchAreaLabel] = useState('Current location');
    const [locationSourceLabel, setLocationSourceLabel] = useState('device');
    const [locationReason, setLocationReason] = useState<LocationReason>('resolved');
    const [isLocationContextRestored, setIsLocationContextRestored] = useState(false);

    const homeLocation = (user?.location_address || user?.location_city || '').trim();

    // Sync Tab with URL query param
    useEffect(() => {
        const tab = normalizeDashboardTab(searchParams.get('tab'));
        if (tab && ['home', 'chat', 'find_produce', 'impact', 'guide', 'about_you', 'living_library'].includes(tab)) {
            setActiveTab(tab as Tab);
        }
    }, [searchParams]);

    // Mobile Panel State
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    // Notes for Learn Mode
    const [notes, setNotes] = useState<string[]>([]);
    const { addLesson, activeLesson, setActiveLesson } = useLessons();

    // Find Produce Side Panel State
    const [produceItems, setProduceItems] = useState<ProduceItem[]>([]);

    // Pick System Side Panel State
    const [systemItems, setSystemItems] = useState<ProduceItem[]>([]);
    const [containerItems, setContainerItems] = useState<ProduceItem[]>([]);

    // Chat Tab Suggested Products
    const [suggestedProducts, setSuggestedProducts] = useState<ProduceItem[]>([]);
    const [suggestedPlaces, setSuggestedPlaces] = useState<PlaceSuggestion[]>([]);
    const [googleInquiryPlaces, setGoogleInquiryPlaces] = useState<PlaceSuggestion[]>([]);
    const [googleInquiryQueries, setGoogleInquiryQueries] = useState<string[]>([]);
    const [favoritePlaces, setFavoritePlaces] = useState<FavoritePlaceRecord[]>([]);
    const [isLoadingFavoritePlaces, setIsLoadingFavoritePlaces] = useState(false);
    const [pendingFavoriteKeys, setPendingFavoriteKeys] = useState<string[]>([]);
    const visibleSuggestedPlaces = suggestedPlaces.slice(0, visiblePlaceCount);
    const visibleGoogleInquiryPlaces = googleInquiryPlaces.slice(0, visiblePlaceCount);
    const hasMoreSuggestedPlaces = suggestedPlaces.length > visiblePlaceCount;
    const hasMoreGoogleInquiryPlaces = googleInquiryPlaces.length > visiblePlaceCount;
    const collapsedSuggestionPreview = suggestedPlaces.length > 0
        ? `${suggestedPlaces[0].name}${suggestedPlaces.length > 1 ? ` +${suggestedPlaces.length - 1} more` : ''}`
        : suggestedProducts.length > 0
            ? `${suggestedProducts[0].name}${suggestedProducts.length > 1 ? ` +${suggestedProducts.length - 1} more` : ''}`
            : '';
    const showSearchDebug =
        process.env.NODE_ENV !== 'production' ||
        process.env.NEXT_PUBLIC_SHOW_SEARCH_DEBUG === 'true';
    const isMainChatTab = activeTab === 'chat';
    const [groceryBundlesByKey, setGroceryBundlesByKey] = useState<Record<string, GroceryBundle>>({});
    const [activeGroceryBundleKey, setActiveGroceryBundleKey] = useState<string | null>(null);
    const [pendingGroceryBundleKey, setPendingGroceryBundleKey] = useState<string | null>(null);
    const [isGroceryListModalOpen, setIsGroceryListModalOpen] = useState(false);
    const [isSuggestionModeInfoOpen, setIsSuggestionModeInfoOpen] = useState(false);
    const [suggestionPanelMode, setSuggestionPanelMode] = useState<SuggestionPanelMode>('suggestions');
    const [suggestionPanelSubject, setSuggestionPanelSubject] = useState('');
    const [canHoverInfoPopover, setCanHoverInfoPopover] = useState(false);
    const [isStandaloneGoogleRequested, setIsStandaloneGoogleRequested] = useState(false);
    const [lastPlaceSearch, setLastPlaceSearch] = useState<LastPlaceSearch | null>(null);
    const locationLabelCacheRef = useRef<Record<string, string>>({});
    const [isRefreshingSuggestions, setIsRefreshingSuggestions] = useState(false);
    const [isSuggestionSettingsOpen, setIsSuggestionSettingsOpen] = useState(false);
    const [skipAutoRestore, setSkipAutoRestore] = useState(false);
    const [isRestoringConversation, setIsRestoringConversation] = useState(false);
    const [pendingIntent, setPendingIntent] = useState<IntentClassification | null>(null);
    const [knowledgeBankCategories, setKnowledgeBankCategories] = useState<LibraryCategory[]>([]);
    const [selectedAssistantMessageIndex, setSelectedAssistantMessageIndex] = useState<number | null>(null);
    const placeCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [focusedSuggestionIdentity, setFocusedSuggestionIdentity] = useState<string | null>(null);

    useEffect(() => {
        if (!focusedSuggestionIdentity) return;
        const timeoutId = window.setTimeout(() => setFocusedSuggestionIdentity(null), 2200);
        return () => window.clearTimeout(timeoutId);
    }, [focusedSuggestionIdentity]);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return;
        }

        const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
        const applyHoverSupport = () => setCanHoverInfoPopover(mediaQuery.matches);
        applyHoverSupport();

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', applyHoverSupport);
            return () => mediaQuery.removeEventListener('change', applyHoverSupport);
        }

        mediaQuery.addListener(applyHoverSupport);
        return () => mediaQuery.removeListener(applyHoverSupport);
    }, []);

    useEffect(() => {
        if (lastPlaceSearch) return;
        setSearchRadiusKm(defaultSearchRadiusKm);
    }, [defaultSearchRadiusKm, lastPlaceSearch]);
    const [isSaveChatModalOpen, setIsSaveChatModalOpen] = useState(false);
    const [isLoadingKnowledgeBankCategories, setIsLoadingKnowledgeBankCategories] = useState(false);
    const [isSavingChatDocument, setIsSavingChatDocument] = useState(false);
    const [chatSaveStatus, setChatSaveStatus] = useState('');
    const [chatSaveTargetIndex, setChatSaveTargetIndex] = useState<number | null>(null);
    const [chatSaveMode, setChatSaveMode] = useState<SaveMode>('full');
    const [chatSaveSelectionText, setChatSaveSelectionText] = useState('');
    const [chatSaveTitle, setChatSaveTitle] = useState('');
    const [chatSaveDescription, setChatSaveDescription] = useState('');
    const [chatSaveTags, setChatSaveTags] = useState('');
    const [chatSaveCategoryId, setChatSaveCategoryId] = useState('');

    const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null);
    const assistantMessageRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const favoritePlacesByIdentity = useMemo(() => {
        const nextMap = new Map<string, FavoritePlaceRecord>();

        favoritePlaces.forEach((place) => {
            const keys = [
                getPlaceIdentity(place),
                String(place.place_profile_id || '').trim(),
                String(place.external_place_id || '').trim(),
                String(place.id || '').trim(),
                String(place.mapsUrl || '').trim()
            ].filter(Boolean);

            keys.forEach((key) => nextMap.set(key, place));
        });

        return nextMap;
    }, [favoritePlaces]);
    const activeGroceryBundle = activeGroceryBundleKey ? groceryBundlesByKey[activeGroceryBundleKey] || null : null;
    const activeSuggestionPanelMode: SuggestionPanelMode = activeGroceryBundle ? 'grocery_options' : suggestionPanelMode;
    const activeSuggestionPanelMeta = SUGGESTION_PANEL_MODE_META[activeSuggestionPanelMode];

    useEffect(() => {
        setIsSuggestionModeInfoOpen(false);
    }, [activeSuggestionPanelMode, isPanelOpen]);

    useEffect(() => {
        setVisiblePlaceCount(INITIAL_VISIBLE_PLACE_COUNT);
    }, [lastPlaceSearch?.message, suggestedPlaces.length]);

    useEffect(() => {
        if (!user?.id) {
            setFavoritePlaces([]);
            setIsLoadingFavoritePlaces(false);
            setPendingFavoriteKeys([]);
            return;
        }

        let cancelled = false;
        setIsLoadingFavoritePlaces(true);

        const fetchFavoritePlaces = async () => {
            try {
                const res = await api.get('/user/favorites/places');
                if (cancelled) {
                    return;
                }

                setFavoritePlaces(Array.isArray(res.data?.favorite_places) ? res.data.favorite_places : []);
            } catch (error) {
                if (!cancelled) {
                    console.warn('Unable to load favorite places.', error);
                    setFavoritePlaces([]);
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingFavoritePlaces(false);
                }
            }
        };

        void fetchFavoritePlaces();

        return () => {
            cancelled = true;
        };
    }, [user?.id]);

    // Calculate Total Price (Produce + Systems + Containers)
    const produceTotal = produceItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const systemTotal = systemItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const containerTotal = containerItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const grandTotal = produceTotal + systemTotal + containerTotal;

    // Helper: Update Quantity or Remove
    const updateQuantity = (
        stateSetter: React.Dispatch<React.SetStateAction<ProduceItem[]>>,
        id: string,
        delta: number
    ) => {
        stateSetter(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, quantity: Math.max(0, item.quantity + delta) };
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    // Helper: Remove Item Directly
    const removeItem = (
        stateSetter: React.Dispatch<React.SetStateAction<ProduceItem[]>>,
        id: string
    ) => {
        stateSetter(prev => prev.filter(item => item.id !== id));
    };

    const normalizeSuggestedPlaces = (places: PlaceSuggestion[]) => {
        const merged = new Map<string, PlaceSuggestion>();

        places.forEach((place) => {
            const key = `${place.name}|${place.address}|${place.mapsUrl}`;
            if (!merged.has(key)) {
                merged.set(key, place);
            }
        });

        return Array.from(merged.values()).sort((a, b) => {
            if (a.distance_km == null && b.distance_km == null) return 0;
            if (a.distance_km == null) return 1;
            if (b.distance_km == null) return -1;
            return a.distance_km - b.distance_km;
        });
    };

    const mergeSuggestedPlaces = (incoming: PlaceSuggestion[]) => {
        setSuggestedPlaces((prev) => normalizeSuggestedPlaces([...prev, ...incoming]));
    };

    const replaceSuggestedPlaces = (incoming: PlaceSuggestion[]) => {
        setSuggestedPlaces(normalizeSuggestedPlaces(incoming));
    };

    const applyResolvedSearchContext = (resolvedSearch: ResolvedSearchLocation, restored = false) => {
        setSearchAreaLabel(resolvedSearch.areaLabel);
        setLocationSourceLabel(resolvedSearch.source);
        setLocationReason(resolvedSearch.locationReason);
        setIsLocationContextRestored(restored);
    };

    const applyGoogleLocationResolution = (result: Pick<GoogleInquiryResult, 'locationResolved' | 'locationReason'>) => {
        if (result.locationResolved) {
            setLocationReason('resolved');
            return;
        }

        setLocationReason(result.locationReason);
        setSearchAreaLabel('Location unavailable');
        setLocationSourceLabel('unknown');
    };

    const buildGroceryBundleKey = (messageIndex: number) => `${currentConversationId || 'draft'}:${messageIndex}`;

    const getGroceryBundleMessageIndex = (bundleKey?: string | null) => {
        const normalizedKey = String(bundleKey || '').trim();
        if (!normalizedKey) return null;
        const separatorIndex = normalizedKey.lastIndexOf(':');
        const indexValue = separatorIndex >= 0 ? normalizedKey.slice(separatorIndex + 1) : normalizedKey;
        const parsed = Number(indexValue);
        return Number.isInteger(parsed) ? parsed : null;
    };

    const updateGroceryBundle = (
        key: string,
        updater: (bundle: GroceryBundle | null) => GroceryBundle | null
    ) => {
        setGroceryBundlesByKey((current) => {
            const nextBundle = updater(current[key] || null);
            if (!nextBundle) {
                const nextState = { ...current };
                delete nextState[key];
                return nextState;
            }
            return {
                ...current,
                [key]: nextBundle
            };
        });
    };

    const fetchPremiumFindingsForBundle = async (
        key: string,
        items: GroceryListItem[],
        resolvedSearch: ResolvedSearchLocation,
        bundleTitle = 'Recipe'
    ) => {
        const response = await api.post('/chat/source-ingredients/premium', {
            items,
            recipeTitle: bundleTitle
        });
        const places = Array.isArray(response.data?.places) ? response.data.places as PlaceSuggestion[] : [];
        const queries = Array.isArray(response.data?.queries) ? response.data.queries.map((query: unknown) => String(query || '')).filter(Boolean) : [];

        updateGroceryBundle(key, (bundle) => {
            if (!bundle) return bundle;
            return {
                ...bundle,
                premiumFindings: normalizeSuggestedPlaces(places),
                premiumQueries: queries,
                location: resolvedSearch.location,
                areaLabel: resolvedSearch.areaLabel,
                sourceLabel: resolvedSearch.source
            };
        });
        applyResolvedSearchContext(resolvedSearch);
        setLastPlaceSearch({
            message: `${bundleTitle} ingredients`,
            queries,
            location: resolvedSearch.location,
            locationResolved: resolvedSearch.locationResolved,
            locationReason: resolvedSearch.locationReason,
            restored: false
        });
        setShowPreview(true);
    };

    const handleSearchGoogleForBundle = async (key: string, radiusOverride?: number) => {
        const bundle = groceryBundlesByKey[key];
        if (!bundle) return;

        updateGroceryBundle(key, (current) => current ? { ...current, googleRequested: true } : current);
        setActiveGroceryBundleKey(key);
        setIsPanelOpen(true);

        try {
            const resolvedSearch = !isLocationContextRestored && bundle.location
                ? {
                    location: bundle.location,
                    areaLabel: bundle.areaLabel || searchAreaLabel,
                    source: (bundle.sourceLabel as SearchLocationSource) || 'device',
                    locationResolved: true,
                    locationReason: 'resolved' as LocationReason
                }
                : await resolveSearchLocation();

            if (!resolvedSearch.locationResolved) {
                applyResolvedSearchContext(resolvedSearch);
                setGoogleInquiryPlaces([]);
                setGoogleInquiryQueries([]);
                setLastPlaceSearch({
                    message: `${bundle.title} ingredients`,
                    queries: [],
                    location: '',
                    locationResolved: false,
                    locationReason: resolvedSearch.locationReason,
                    restored: false
                });
                setShowPreview(true);
                return;
            }

            const response = await api.post('/chat/source-ingredients/google', {
                items: bundle.items,
                recipeTitle: bundle.title,
                location: resolvedSearch.location,
                radiusKm: radiusOverride ?? searchRadiusKm
            });
            const places = Array.isArray(response.data?.places) ? response.data.places as PlaceSuggestion[] : [];
            const queries = Array.isArray(response.data?.queries) ? response.data.queries.map((query: unknown) => String(query || '')).filter(Boolean) : [];
            const nextLocationResolved = response.data?.locationResolved !== false;
            const nextLocationReason: LocationReason =
                response.data?.locationReason === 'missing' || response.data?.locationReason === 'geocode_failed'
                    ? response.data.locationReason
                    : 'resolved';

            updateGroceryBundle(key, (current) => {
                if (!current) return current;
                const nextBundle: GroceryBundle = {
                    ...current,
                    googleFindings: normalizeSuggestedPlaces(places),
                    googleQueries: queries,
                    googleRequested: true,
                    location: resolvedSearch.location,
                    areaLabel: resolvedSearch.areaLabel,
                    sourceLabel: resolvedSearch.source
                };
                return nextBundle;
            });

            applyResolvedSearchContext({
                ...resolvedSearch,
                locationResolved: nextLocationResolved,
                locationReason: nextLocationReason
            });
            setLastPlaceSearch({
                message: `${bundle.title} ingredients`,
                queries,
                location: resolvedSearch.location,
                locationResolved: nextLocationResolved,
                locationReason: nextLocationReason,
                restored: false
            });
            setShowPreview(true);
        } catch (error) {
            console.warn('Unable to search Google ingredient sources.', error);
        }
    };

    const handleSearchGoogleForCurrentInquiry = async () => {
        if (!lastPlaceSearch) {
            return;
        }

        setIsRefreshingSuggestions(true);
        try {
            const resolvedSearch: ResolvedSearchLocation = lastPlaceSearch.restored ? await resolveSearchLocation() : {
                location: lastPlaceSearch.location,
                areaLabel: searchAreaLabel,
                source: locationSourceLabel as SearchLocationSource,
                locationResolved: lastPlaceSearch.locationResolved !== false,
                locationReason: lastPlaceSearch.locationReason === 'missing' || lastPlaceSearch.locationReason === 'geocode_failed'
                    ? lastPlaceSearch.locationReason
                    : 'resolved'
            };
            applyResolvedSearchContext(resolvedSearch);
            setGoogleInquiryPlaces([]);
            const result = await fetchGoogleInquiryPlaces(lastPlaceSearch.queries, resolvedSearch.location, searchRadiusKm);
            applyGoogleInquiryResults(result);
            setLastPlaceSearch((current) => current ? {
                ...current,
                location: resolvedSearch.location,
                locationResolved: result.locationResolved,
                locationReason: result.locationReason,
                restored: false
            } : current);
        } catch (error) {
            console.warn('Unable to search Google for the current inquiry.', error);
        } finally {
            setIsRefreshingSuggestions(false);
        }
    };

    const handleBuildGroceryList = async (message: ChatMessage, messageIndex: number) => {
        const bundleKey = buildGroceryBundleKey(messageIndex);
        const existingBundle = groceryBundlesByKey[bundleKey];

        if (existingBundle) {
            setActiveGroceryBundleKey(bundleKey);
            setIsGroceryListModalOpen(true);
            setSuggestionPanelSubject(existingBundle.title);
            applyResolvedSearchContext({
                location: existingBundle.location,
                areaLabel: existingBundle.areaLabel || searchAreaLabel,
                source: (existingBundle.sourceLabel as SearchLocationSource) || (locationSourceLabel as SearchLocationSource),
                locationResolved: Boolean(existingBundle.location),
                locationReason: existingBundle.location ? 'resolved' : locationReason
            }, isLocationContextRestored);
            setLastPlaceSearch({
                message: `${existingBundle.title} ingredients`,
                queries: existingBundle.googleRequested && existingBundle.googleQueries.length > 0 ? existingBundle.googleQueries : existingBundle.premiumQueries,
                location: existingBundle.location,
                locationResolved: Boolean(existingBundle.location),
                locationReason: existingBundle.location ? 'resolved' : locationReason,
                restored: isLocationContextRestored
            });
            setShowPreview(true);
            setIsPanelOpen(true);
            return;
        }

        setPendingGroceryBundleKey(bundleKey);
        setActiveGroceryBundleKey(bundleKey);
        setIsGroceryListModalOpen(true);
        setIsPanelOpen(true);

        try {
            const groceryResponse = await api.post('/chat/extract-grocery-list', {
                recipeText: message.content
            });
            const title = String(groceryResponse.data?.title || 'Recipe grocery list').trim() || 'Recipe grocery list';
            const items = Array.isArray(groceryResponse.data?.items)
                ? groceryResponse.data.items.map((item: any, index: number) => ({
                    id: String(item?.id || `ingredient-${index + 1}`),
                    name: String(item?.name || '').trim(),
                    quantity: String(item?.quantity || '').trim(),
                    unit: String(item?.unit || '').trim(),
                    display: String(item?.display || [item?.quantity, item?.unit, item?.name].filter(Boolean).join(' ')).trim(),
                    checked: false
                })).filter((item: GroceryListItem) => item.name)
                : [];

            const resolvedSearch = await resolveSearchLocation();
            const nextBundle: GroceryBundle = {
                title,
                items,
                premiumFindings: [],
                googleFindings: [],
                premiumQueries: [],
                googleQueries: [],
                location: resolvedSearch.location,
                areaLabel: resolvedSearch.areaLabel,
                sourceLabel: resolvedSearch.source,
                googleRequested: false
            };

            updateGroceryBundle(bundleKey, () => nextBundle);
            setSuggestionPanelSubject(title);
            applyResolvedSearchContext(resolvedSearch);
            setLastPlaceSearch({
                message: `${title} ingredients`,
                queries: [],
                location: resolvedSearch.location,
                locationResolved: resolvedSearch.locationResolved,
                locationReason: resolvedSearch.locationReason,
                restored: false
            });
            setShowPreview(true);

            if (items.length > 0) {
                await fetchPremiumFindingsForBundle(bundleKey, items, resolvedSearch, title);
            }
        } catch (error) {
            console.warn('Unable to build grocery list from recipe.', error);
        } finally {
            setPendingGroceryBundleKey((current) => current === bundleKey ? null : current);
        }
    };

    const focusSuggestedPlaceCard = (matchedPlace: PlaceSuggestion) => {
        const matchedIndex = suggestedPlaces.findIndex((place) => getPlaceIdentity(place) === getPlaceIdentity(matchedPlace));
        if (matchedIndex >= 0) {
            setVisiblePlaceCount((current) => Math.max(current, matchedIndex + 1, INITIAL_VISIBLE_PLACE_COUNT));
        }

        setIsPanelOpen(true);
        setFocusedSuggestionIdentity(getPlaceIdentity(matchedPlace));

        window.setTimeout(() => {
            const targetRef =
                placeCardRefs.current[getPlaceIdentity(matchedPlace)] ||
                placeCardRefs.current[String(matchedPlace.mapsUrl || '').trim()] ||
                null;

            targetRef?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }, 120);
    };

    const handleAssistantMessageClick = (event: React.MouseEvent<HTMLDivElement>) => {
        const target = event.target as HTMLElement | null;
        const anchor = target?.closest('a');
        if (!anchor) return;

        const href = String(anchor.getAttribute('href') || '').trim();
        if (href.startsWith('plyt://suggestion/')) {
            const encodedIdentity = href.replace('plyt://suggestion/', '');
            const decodedIdentity = decodeURIComponent(encodedIdentity || '').trim();
            const matchedPlace = suggestedPlaces.find((place) => getPlaceIdentity(place) === decodedIdentity);

            if (!matchedPlace) {
                return;
            }

            event.preventDefault();
            focusSuggestedPlaceCard(matchedPlace);
            return;
        }

        const normalizedHref = href.split('?')[0];
        if (AUTH_MODAL_LINKS.has(normalizedHref)) {
            event.preventDefault();
            openLoginModal();
            return;
        }

        const anchorText = String(anchor.textContent || '').trim().toLowerCase();
        const matchedPlace = suggestedPlaces.find((place) => {
            const placeName = String(place.name || '').trim().toLowerCase();
            const placeMapsUrl = String(place.mapsUrl || '').trim();
            return (placeMapsUrl && placeMapsUrl === href) || (placeName && placeName === anchorText);
        });

        if (!matchedPlace) {
            return;
        }

        event.preventDefault();
        focusSuggestedPlaceCard(matchedPlace);
    };

    const buildSuggestionState = (): SavedSuggestionState => ({
        suggestedPlaces: normalizeSuggestedPlaces(suggestedPlaces),
        suggestedProducts,
        lastPlaceSearch: lastPlaceSearch ? { ...lastPlaceSearch, restored: false } : null,
        searchRadiusKm,
        searchAreaLabel,
        locationSourceLabel,
        showPreview,
        locationReason,
        locationContextRestored: false
    });

    const applySuggestionState = (state?: Partial<SavedSuggestionState> | null) => {
        const nextPlaces = Array.isArray(state?.suggestedPlaces)
            ? normalizeSuggestedPlaces(state?.suggestedPlaces as PlaceSuggestion[])
            : [];
        const nextProducts = Array.isArray(state?.suggestedProducts)
            ? (state?.suggestedProducts as ProduceItem[])
            : [];
        const nextLastPlaceSearch: LastPlaceSearch | null =
            state?.lastPlaceSearch &&
            typeof state.lastPlaceSearch === 'object' &&
            Array.isArray(state.lastPlaceSearch.queries)
                ? {
                    message: String(state.lastPlaceSearch.message || ''),
                    queries: state.lastPlaceSearch.queries.map((query) => String(query || '')).filter(Boolean),
                    location: String(state.lastPlaceSearch.location || ''),
                    locationResolved: typeof state.lastPlaceSearch.locationResolved === 'boolean'
                        ? state.lastPlaceSearch.locationResolved
                        : Boolean(String(state.lastPlaceSearch.location || '').trim()),
                    locationReason: state.lastPlaceSearch.locationReason === 'missing' || state.lastPlaceSearch.locationReason === 'geocode_failed'
                        ? state.lastPlaceSearch.locationReason
                        : (String(state.lastPlaceSearch.location || '').trim() ? 'resolved' : 'missing'),
                    restored: true
                }
                : null;
        const nextRadiusKm = Number.isFinite(Number(state?.searchRadiusKm))
            ? Number(state?.searchRadiusKm)
            : 25;

        setSuggestedPlaces(nextPlaces);
        setGoogleInquiryPlaces([]);
        setIsStandaloneGoogleRequested(false);
        setSuggestedProducts(nextProducts);
        setLastPlaceSearch(nextLastPlaceSearch);
        setSearchRadiusKm(nextRadiusKm);
        applyResolvedSearchContext({
            location: nextLastPlaceSearch?.location || '',
            areaLabel: typeof state?.searchAreaLabel === 'string' && state.searchAreaLabel.trim()
                ? state.searchAreaLabel
                : 'Current location',
            source: typeof state?.locationSourceLabel === 'string' && state.locationSourceLabel.trim()
                ? state.locationSourceLabel as SearchLocationSource
                : 'device',
            locationResolved: nextLastPlaceSearch?.locationResolved !== false,
            locationReason: state?.locationReason === 'missing' || state?.locationReason === 'geocode_failed'
                ? state.locationReason
                : 'resolved'
        }, Boolean(nextLastPlaceSearch));
        setGoogleInquiryPlaces([]);
        setGoogleInquiryQueries([]);
        setIsStandaloneGoogleRequested(false);
        setShowPreview(Boolean(state?.showPreview) || nextPlaces.length > 0 || nextProducts.length > 0);
        setIsPanelOpen(nextPlaces.length > 0 || nextProducts.length > 0);
    };

    const fetchAndMergePlaces = async (queries: string[], location: string, radiusKm: number, limit = 16) => {
        if (queries.length === 0) return [];

        const placeRes = await api.post('/chat/places', {
            queries,
            location,
            radiusKm,
            limit
        });
        const places = Array.isArray(placeRes.data?.places) ? placeRes.data.places : [];
        mergeSuggestedPlaces(places);
        setSuggestedProducts([]);
        setShowPreview(true);
        return places as PlaceSuggestion[];
    };

    const fetchPremiumInquiryPlaces = async (queries: string[], limit = 16) => {
        if (queries.length === 0) {
            replaceSuggestedPlaces([]);
            return [];
        }

        const placeRes = await api.post('/chat/source-inquiry/premium', {
            queries,
            limit
        });
        const places = Array.isArray(placeRes.data?.places) ? placeRes.data.places : [];
        replaceSuggestedPlaces(places);
        setSuggestedProducts([]);
        setShowPreview(true);
        return places as PlaceSuggestion[];
    };

    const normalizeSearchQueries = (queries: string[], limit?: number) => Array.from(new Set(
        queries
            .map((query) => String(query || '').trim())
            .filter(Boolean)
    )).slice(0, typeof limit === 'number' ? limit : queries.length);

    const fetchGoogleInquiryPlaces = async (
        queries: string[],
        location: string,
        radiusKm: number,
        queryLimit?: number
    ): Promise<GoogleInquiryResult> => {
        const normalizedQueries = normalizeSearchQueries(queries, queryLimit);
        if (normalizedQueries.length === 0) {
            return {
                queries: [] as string[],
                places: [] as PlaceSuggestion[],
                locationResolved: true,
                locationReason: 'resolved'
            };
        }

        if (!String(location || '').trim()) {
            return {
                queries: normalizedQueries,
                places: [] as PlaceSuggestion[],
                locationResolved: false,
                locationReason: 'missing'
            };
        }

        const response = await api.post('/chat/source-inquiry/google', {
            queries: normalizedQueries,
            location,
            radiusKm,
            limit: GOOGLE_SEARCH_RESULT_LIMIT
        });
        const places = Array.isArray(response.data?.places)
            ? normalizeSuggestedPlaces(response.data.places as PlaceSuggestion[])
            : [];

        return {
            queries: normalizedQueries,
            places,
            locationResolved: response.data?.locationResolved !== false,
            locationReason: response.data?.locationReason === 'missing' || response.data?.locationReason === 'geocode_failed'
                ? response.data.locationReason
                : 'resolved',
            providerStatus: typeof response.data?.providerStatus === 'string' ? response.data.providerStatus : undefined
        };
    };

    const applyGoogleInquiryResults = (result: GoogleInquiryResult) => {
        setIsStandaloneGoogleRequested(result.locationResolved);
        setGoogleInquiryQueries(result.queries);
        setGoogleInquiryPlaces(result.places);
        applyGoogleLocationResolution(result);
        setVisiblePlaceCount(INITIAL_VISIBLE_PLACE_COUNT);
        setShowPreview(true);
        setIsPanelOpen(true);
    };

    // Auto-switch to Learn tab when a lesson is selected
    useEffect(() => {
        if (activeLesson) {
            setActiveTab('learn');
        }
    }, [activeLesson]);

    // -- Copied Logic from MainChat (History Simulation) --
    // -- Chat History per Tab --
    const [chatHistory, setChatHistory] = useState<{
        [key in 'chat' | 'find_produce' | 'pick_system' | 'learn']: ChatMessage[]
    }>({
        chat: [{ role: 'assistant', content: DEFAULT_CHAT_GREETING }],
        find_produce: [{ role: 'assistant', content: 'Welcome back! Looking for fresh produce?' }],
        pick_system: [{ role: 'assistant', content: 'If you want to explore home growing later, I can help with that too.' }],
        learn: [{ role: 'assistant', content: 'What would you like to learn about growing today?' }]
    });
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Helper: Fetch history from DB
    const fetchConversationHistory = async (convId: string) => {
        setIsRestoringConversation(true);
        setIsLoading(true);
        try {
            const res = await api.get(`/chat/history/${convId}`);
            const historyData = Array.isArray(res.data) ? { messages: res.data, suggestionState: null } : (res.data || {});
            const messages = Array.isArray(historyData.messages) ? historyData.messages.map((m: any) => ({
                role: m.role,
                content: m.content
            })) : [];
            setChatHistory(prev => ({
                ...prev,
                chat: messages.length > 0 ? messages : [{ role: 'assistant', content: DEFAULT_CHAT_GREETING }]
            }));
            applySuggestionState(historyData.suggestionState);
            setCurrentConversationId(convId);
            setSkipAutoRestore(false);
        } catch (error) {
            console.error('Failed to fetch history:', error);
            applySuggestionState(null);
        } finally {
            setIsRestoringConversation(false);
            setIsLoading(false);
        }
    };

    const resolveSearchLocation = async (manualLocation?: string): Promise<ResolvedSearchLocation> => {
        const requestedLocation = (manualLocation || '').trim();
        if (requestedLocation) {
            const normalizedLocation = normalizeSearchLocationText(requestedLocation);
            return {
                location: normalizedLocation,
                areaLabel: requestedLocation,
                source: 'manual',
                locationResolved: true,
                locationReason: 'resolved'
            };
        }

        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            const normalizedHomeLocation = normalizeSearchLocationText(homeLocation);
            if (normalizedHomeLocation) {
                return {
                    location: normalizedHomeLocation,
                    areaLabel: homeLocation || 'Saved home area',
                    source: 'home',
                    locationResolved: true,
                    locationReason: 'resolved'
                };
            }
            return {
                location: '',
                areaLabel: 'Location unavailable',
                source: 'unknown',
                locationResolved: false,
                locationReason: 'missing'
            };
        }

        try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    resolve,
                    reject,
                    { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
                );
            });
            const coordinateLocation = `Lat: ${pos.coords.latitude}, Lng: ${pos.coords.longitude}`;
            let areaLabel = locationLabelCacheRef.current[coordinateLocation] || '';
            if (!areaLabel) {
                try {
                    const response = await api.post('/chat/location-label', { location: coordinateLocation });
                    areaLabel = String(response.data?.label || '').trim();
                    if (areaLabel) {
                        locationLabelCacheRef.current[coordinateLocation] = areaLabel;
                    }
                } catch {
                    // Keep the coordinate-backed location even if the readable label lookup fails.
                }
            }
            return {
                location: coordinateLocation,
                areaLabel: areaLabel || 'Current location',
                source: 'device',
                locationResolved: true,
                locationReason: 'resolved'
            };
        } catch (e) {
            console.warn(`Geolocation unavailable, falling back to saved home area: ${describeGeolocationError(e)}.`);
            const normalizedHomeLocation = normalizeSearchLocationText(homeLocation);
            if (normalizedHomeLocation) {
                return {
                    location: normalizedHomeLocation,
                    areaLabel: homeLocation || 'Saved home area',
                    source: 'home',
                    locationResolved: true,
                    locationReason: 'resolved'
                };
            }
            return {
                location: '',
                areaLabel: 'Location unavailable',
                source: 'unknown',
                locationResolved: false,
                locationReason: 'missing'
            };
        }
    };

    const handleSend = async (
        overridePrompt?: string,
        tags?: string[],
        overrideScope?: 'local' | 'global',
        overrideLocation?: string,
        freshChat?: boolean
    ) => {
        const messageText = overridePrompt || prompt;
        const normalizedTags = tags || [];
        if (!messageText.trim() && normalizedTags.length === 0) return;
        const shouldStartFreshChat = Boolean(freshChat);
        const targetTab: 'chat' | 'find_produce' | 'pick_system' | 'learn' = activeTab === 'home' || activeTab === 'impact' || activeTab === 'guide' || activeTab === 'about_you' || activeTab === 'living_library' ? 'chat' : activeTab as any;

        if (shouldStartFreshChat) {
            setSkipAutoRestore(true);
            setCurrentConversationId(null);
            setActiveGroceryBundleKey(null);
            setPendingGroceryBundleKey(null);
            setIsGroceryListModalOpen(false);
            setSuggestionPanelMode('suggestions');
            setSuggestionPanelSubject('');
            setLastPlaceSearch(null);
            setSuggestedPlaces([]);
            setGoogleInquiryPlaces([]);
            setGoogleInquiryQueries([]);
            setSuggestedProducts([]);
            setShowPreview(false);
            setLocationReason('resolved');
            setIsLocationContextRestored(false);
            setPrompt('');
            setSelectedAssistantMessageIndex(null);
            setChatSaveStatus('');
            setChatHistory((prev) => ({
                ...prev,
                chat: [{ role: 'assistant', content: DEFAULT_CHAT_GREETING }]
            }));
            setActiveTab('chat');
        }

        setActiveGroceryBundleKey(null);
        setSuggestionPanelSubject(messageText.trim());
        setIsStandaloneGoogleRequested(false);
        setGoogleInquiryPlaces([]);
        setGoogleInquiryQueries([]);
        setSuggestedProducts([]);
        const predictedIntent = classifyIntent(messageText, normalizedTags);
        setSuggestionPanelMode(inferSuggestionPanelModeFromContext(messageText, predictedIntent.intent, []));

        if (!user) {
            setActiveTab('chat');
            setChatHistory(prev => ({
                ...prev,
                [targetTab]: [...prev[targetTab], { role: 'assistant', content: SIGN_IN_REQUIRED_MESSAGE }]
            }));
            localStorage.setItem('pendingChatPrompt', JSON.stringify({
                tags: normalizedTags,
                text: messageText,
                scope: overrideScope || 'local',
                location: overrideLocation
            }));
            requireAuth(() => { });
            return;
        }

        setChatHistory(prev => ({
            ...prev,
            [targetTab]: shouldStartFreshChat
                ? [
                    { role: 'assistant', content: DEFAULT_CHAT_GREETING },
                    { role: 'user', content: messageText, tags: normalizedTags }
                ]
                : [...prev[targetTab], { role: 'user', content: messageText, tags: normalizedTags }]
        }));

        if (!overridePrompt) setPrompt('');
        if (activeTab === 'home') setActiveTab('chat');
        setSelectedAssistantMessageIndex(null);
        setPendingIntent(targetTab === 'chat' ? predictedIntent : null);

        setIsLoading(true);
        try {
            const conversationIdForRequest = shouldStartFreshChat ? null : currentConversationId;
            const resolvedSearch = await resolveSearchLocation(overrideLocation);
            const finalLocation = resolvedSearch.location;
            applyResolvedSearchContext(resolvedSearch);
            const chatPromise = api.post('/chat', {
                message: messageText,
                conversationId: conversationIdForRequest,
                tags: normalizedTags,
                scope: overrideScope || 'local',
                location: finalLocation,
                locationLabel: resolvedSearch.areaLabel,
                visiblePlaces: shouldStartFreshChat ? [] : suggestedPlaces.slice(0, 12)
            });

            const res = await chatPromise;

            const aiResponse = res.data.reply || res.data.response;
            const usedFallback = Boolean(res.data?.usedFallback);
            const fallbackReason: ChatFallbackReason | undefined =
                res.data?.fallbackReason === 'config_missing' || res.data?.fallbackReason === 'provider_error' || res.data?.fallbackReason === 'generation_failed'
                    ? res.data.fallbackReason
                    : undefined;
            const providerStatus = typeof res.data?.providerStatus === 'string' ? res.data.providerStatus : undefined;
            const incompleteProfile = Boolean(res.data?.incomplete_profile);
            const newConvId = res.data.conversationId ? String(res.data.conversationId) : null;
            const responseIntent = normalizeIntentName(res.data?.intent) || predictedIntent.intent;
            const responseIntentConfidence: IntentConfidence =
                res.data?.intentConfidence === 'high' || res.data?.intentConfidence === 'medium' || res.data?.intentConfidence === 'low'
                    ? res.data.intentConfidence
                    : predictedIntent.confidence;
            const responseMixedIntent = normalizeIntentName(res.data?.mixedIntent) || predictedIntent.mixed;

            if (newConvId && !conversationIdForRequest) {
                setCurrentConversationId(newConvId);
            }
            if (newConvId) {
                setSkipAutoRestore(false);
            }

            if (incompleteProfile) {
                setChatHistory(prev => ({
                    ...prev,
                    [targetTab]: [...prev[targetTab], {
                        role: 'assistant',
                        content: aiResponse,
                        followUpOptions: null,
                        usedFallback: false,
                        fallbackReason,
                        providerStatus,
                        incompleteProfile: true,
                        intent: responseIntent,
                        intentConfidence: responseIntentConfidence,
                        mixedIntent: responseMixedIntent
                    }]
                }));
                return;
            }

            const searchQueries = Array.isArray(res.data?.searchQueries)
                ? res.data.searchQueries.map((query: unknown) => String(query || '').trim()).filter(Boolean)
                : [];
            const placeQueries = searchQueries;
            setSuggestionPanelMode(inferSuggestionPanelModeFromContext(messageText, responseIntent, placeQueries));
            if (placeQueries.length > 0) {
                setLastPlaceSearch({
                    message: messageText,
                    queries: placeQueries,
                    location: finalLocation,
                    locationResolved: resolvedSearch.locationResolved,
                    locationReason: resolvedSearch.locationReason,
                    restored: false
                });
                try {
                    const places = await fetchPremiumInquiryPlaces(placeQueries, 16);

                    if (places.length > 0) {
                        try {
                            const syncedResponse = (await api.post('/chat/recommend-places', {
                                message: messageText,
                                places,
                                conversationId: newConvId || currentConversationId
                            })).data?.response || appendCompanionPlacesNote(aiResponse, places);
                            setChatHistory(prev => ({
                                ...prev,
                                [targetTab]: [...prev[targetTab], {
                                    role: 'assistant',
                                    content: syncedResponse,
                                    followUpOptions: null,
                                    usedFallback: false,
                                    fallbackReason,
                                    providerStatus,
                                    intent: responseIntent,
                                    intentConfidence: responseIntentConfidence,
                                    mixedIntent: responseMixedIntent
                                }]
                            }));
                        } catch {
                            setChatHistory(prev => ({
                                ...prev,
                                [targetTab]: [...prev[targetTab], {
                                    role: 'assistant',
                                    content: appendCompanionPlacesNote(aiResponse, places),
                                    followUpOptions: Array.isArray(res.data?.followUpOptions) ? res.data.followUpOptions : null,
                                    usedFallback,
                                    fallbackReason,
                                    providerStatus,
                                    intent: responseIntent,
                                    intentConfidence: responseIntentConfidence,
                                    mixedIntent: responseMixedIntent
                                }]
                            }));
                        }
                    } else {
                        replaceSuggestedPlaces([]);
                        setGoogleInquiryPlaces([]);
                        setGoogleInquiryQueries([]);
                        setIsStandaloneGoogleRequested(false);
                        setShowPreview(true);
                        setChatHistory(prev => ({
                            ...prev,
                            [targetTab]: [...prev[targetTab], {
                                role: 'assistant',
                                content: aiResponse,
                                followUpOptions: Array.isArray(res.data?.followUpOptions) ? res.data.followUpOptions : null,
                                usedFallback,
                                fallbackReason,
                                providerStatus,
                                intent: responseIntent,
                                intentConfidence: responseIntentConfidence,
                                mixedIntent: responseMixedIntent
                            }]
                        }));
                    }
                } catch {
                    replaceSuggestedPlaces([]);
                    setSuggestedProducts([]);
                    setShowPreview(false);
                    setChatHistory(prev => ({
                        ...prev,
                        [targetTab]: [...prev[targetTab], {
                            role: 'assistant',
                            content: aiResponse,
                            followUpOptions: Array.isArray(res.data?.followUpOptions) ? res.data.followUpOptions : null,
                            usedFallback,
                            fallbackReason,
                            providerStatus,
                            intent: responseIntent,
                            intentConfidence: responseIntentConfidence,
                            mixedIntent: responseMixedIntent
                        }]
                    }));
                }
                return;
            }

            setChatHistory(prev => ({
                ...prev,
                [targetTab]: [...prev[targetTab], {
                    role: 'assistant',
                    content: aiResponse,
                    followUpOptions: Array.isArray(res.data?.followUpOptions) ? res.data.followUpOptions : null,
                    usedFallback,
                    fallbackReason,
                    providerStatus,
                    intent: responseIntent,
                    intentConfidence: responseIntentConfidence,
                    mixedIntent: responseMixedIntent
                }]
            }));

        } catch (error: any) {
            console.error('Chat error full:', error);
            if (error.response) {
                console.error('Chat error data:', error.response.data);
            }
            setChatHistory(prev => ({
                ...prev,
                [targetTab]: [...prev[targetTab], { role: 'assistant', content: `Sorry, I encountered an error: ${error.response?.data?.details || error.message || 'Unknown error'}. Please try again.` }]
            }));
        } finally {
            setPendingIntent(null);
            setIsLoading(false);
        }
    };

    // Restore pending prompt after sign-in or handle redirect-from-landing
    useEffect(() => {
        const urlConvId = searchParams.get('conversationId');
        if (urlConvId) {
            fetchConversationHistory(urlConvId);
            setActiveTab('chat');
            return;
        }

        if (!user?.id) {
            return;
        }

        const stored = localStorage.getItem('pendingChatPrompt');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed.text) {
                    handleSend(parsed.text, parsed.tags, parsed.scope, parsed.location, Boolean(parsed.freshChat));
                }
                localStorage.removeItem('pendingChatPrompt');
            } catch (e) {
                console.error(e);
            }
        }
    }, [searchParams, user?.id]);

    useEffect(() => {
        const urlConvId = searchParams.get('conversationId');
        const pendingPrompt = typeof window !== 'undefined' ? localStorage.getItem('pendingChatPrompt') : null;

        if (!user?.id || urlConvId || pendingPrompt || currentConversationId || skipAutoRestore) {
            return;
        }

        let cancelled = false;

        const restoreLatestHistory = async () => {
            try {
                const historyRes = await api.get('/chat/history');
                const latestHistory = Array.isArray(historyRes.data) ? historyRes.data[0] : null;
                if (!latestHistory?.id || cancelled) return;

                await fetchConversationHistory(String(latestHistory.id));
            } catch (error) {
                console.warn('Unable to restore chat history on load.', error);
            }
        };

        void restoreLatestHistory();

        return () => {
            cancelled = true;
        };
    }, [user?.id, searchParams, currentConversationId, skipAutoRestore]);

    useEffect(() => {
        if (!user?.id || !currentConversationId || isRestoringConversation) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            void api.put(`/chat/history/${currentConversationId}/suggestion-state`, {
                suggestionState: buildSuggestionState()
            }).catch((error) => {
                console.warn('Unable to save chat suggestion state.', error);
            });
        }, 250);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [
        user?.id,
        currentConversationId,
        isRestoringConversation,
        suggestedPlaces,
        suggestedProducts,
        lastPlaceSearch,
        searchRadiusKm,
        searchAreaLabel,
        locationSourceLabel,
        locationReason,
        isLocationContextRestored,
        showPreview
    ]);

    // Handle History ID Navigation
    useEffect(() => {
        const historyId = searchParams.get('historyId');
        if (historyId) {
            setActiveTab('learn');
            if (historyId === '1') {
                setChatHistory(prev => ({
                    ...prev,
                    learn: [
                        { role: 'user', content: 'How do I start hydroponics?' },
                        { role: 'assistant', content: 'Hydroponics is a method of growing plants without soil. You use mineral nutrient solutions in an aqueous solvent.' },
                        { role: 'user', content: 'What do I need for beginners?' },
                        { role: 'assistant', content: 'For a simple start, try the Kratky method. You need a container, net pot, growing medium, nutrient solution, and seeds (like lettuce).' }
                    ]
                }));
                setActiveLesson(null);
            } else if (historyId === '2') {
                setChatHistory(prev => ({
                    ...prev,
                    learn: [
                        { role: 'user', content: 'What are the best Kale varieties for indoor growing?' },
                        { role: 'assistant', content: 'Lacinato (Dino) Kale and Red Russian Kale are excellent for indoors. They are compact and grow fast.' }
                    ]
                }));
                setActiveLesson(null);
            }
        }
    }, [searchParams, setActiveLesson]);

    useEffect(() => {
        if (searchParams.get('newChat') === '1') {
            handleStartNewChat();
        }
    }, [searchParams]);

    // Auto-scroll logic
    useEffect(() => {
        const currentHistory = chatHistory[activeTab as 'chat' | 'find_produce' | 'pick_system' | 'learn'] || [];
        if (messagesEndRef.current && currentHistory.length > 1) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatHistory, activeTab, notes]);


    const handleSaveLesson = () => {
        requireAuth(() => {
            if (notes.length === 0) return;
            const title = `Lesson ${new Date().toLocaleDateString()} (${notes.length} notes)`;
            const content = notes.join('\n\n');
            addLesson(title, content);
            alert(`Saved "${title}" to your sidebar!`);
        });
    };

    const ensureKnowledgeBankCategories = async () => {
        setIsLoadingKnowledgeBankCategories(true);
        try {
            const res = await api.get('/profile-library/categories');
            const existing = Array.isArray(res.data) ? (res.data as LibraryCategory[]) : [];
            const existingLabels = new Set(existing.map((category) => normalizeLibraryLabel(category.label)));
            const missingDefaults = DEFAULT_LIBRARY_CATEGORIES.filter(
                (category) => !existingLabels.has(normalizeLibraryLabel(category.label))
            );

            const created = missingDefaults.length > 0
                ? await Promise.all(
                    missingDefaults.map((category) =>
                        api.post('/profile-library/categories', category).then((response) => response.data as LibraryCategory)
                    )
                )
                : [];

            const merged = [...existing, ...created].sort((a, b) => {
                if ((a.sort_order || 0) !== (b.sort_order || 0)) {
                    return (a.sort_order || 0) - (b.sort_order || 0);
                }
                return String(a.created_at || '').localeCompare(String(b.created_at || ''));
            });

            setKnowledgeBankCategories(merged);
            return merged;
        } finally {
            setIsLoadingKnowledgeBankCategories(false);
        }
    };

    const getSelectedAssistantText = (messageIndex: number) => {
        if (typeof window === 'undefined') return '';

        const selection = window.getSelection();
        const selectionText = selection?.toString().trim() || '';
        if (!selection || !selectionText || selection.rangeCount === 0) {
            return '';
        }

        const container = assistantMessageRefs.current[`chat-${messageIndex}`];
        if (!container) return '';

        const range = selection.getRangeAt(0);
        const ancestor = range.commonAncestorContainer;
        const ancestorElement = ancestor.nodeType === Node.TEXT_NODE ? ancestor.parentElement : (ancestor as HTMLElement | null);
        if (!ancestorElement || !container.contains(ancestorElement)) {
            return '';
        }

        return selectionText;
    };

    const closeSaveChatModal = () => {
        setIsSaveChatModalOpen(false);
        setChatSaveTargetIndex(null);
        setChatSaveMode('full');
        setChatSaveSelectionText('');
        setChatSaveTitle('');
        setChatSaveDescription('');
        setChatSaveTags('');
        setChatSaveCategoryId('');
    };

    const openSaveChatModal = async (
        message: {
            content: string;
            intent?: IntentName;
            intentConfidence?: IntentConfidence;
            mixedIntent?: IntentName | null;
        },
        messageIndex: number
    ) => {
        try {
            const categories = knowledgeBankCategories.length > 0
                ? knowledgeBankCategories
                : await ensureKnowledgeBankCategories();
            const selectionText = getSelectedAssistantText(messageIndex);
            const defaultCategory = categories.find(
                (category) => normalizeLibraryLabel(category.label) === getSuggestedLibraryCategoryLabel(message.intent)
            ) || categories[0] || null;

            const defaultTags = Array.from(new Set([
                message.intent ? message.intent.replace(/_/g, ' ') : '',
                message.mixedIntent ? message.mixedIntent.replace(/_/g, ' ') : ''
            ].filter(Boolean))).join(', ');

            setSelectedAssistantMessageIndex(messageIndex);
            setChatSaveTargetIndex(messageIndex);
            setChatSaveSelectionText(selectionText);
            setChatSaveMode(selectionText ? 'selection' : 'full');
            setChatSaveTitle(deriveChatSaveTitle(selectionText || message.content, message.intent));
            setChatSaveDescription(selectionText
                ? 'Selected excerpt saved from a Navi chat response.'
                : 'Full response saved from a Navi chat answer.');
            setChatSaveTags(defaultTags);
            setChatSaveCategoryId(defaultCategory?.id || '');
            setIsSaveChatModalOpen(true);
        } catch (error) {
            console.warn('Failed to prepare Knowledge Bank categories for chat save.', error);
            setChatSaveStatus('Could not open the save flow right now.');
        }
    };

    const quickSaveChatMessage = async (messageIndex: number, description = 'Full response saved from a Navi chat answer.') => {
        const targetMessage = chatHistory.chat[messageIndex];
        if (!targetMessage || targetMessage.role !== 'assistant' || isSavingChatDocument) return;

        const categories = knowledgeBankCategories.length > 0
            ? knowledgeBankCategories
            : await ensureKnowledgeBankCategories();
        const defaultCategory = categories.find(
            (category) => normalizeLibraryLabel(category.label) === getSuggestedLibraryCategoryLabel(targetMessage.intent)
        ) || categories[0] || null;

        if (!defaultCategory?.id) {
            setChatSaveStatus('Could not save this chat right now.');
            return;
        }

        const markdownContent = targetMessage.content.trim();
        const plainText = stripMarkdownToPlainText(markdownContent);
        const defaultTags = Array.from(new Set([
            targetMessage.intent ? targetMessage.intent.replace(/_/g, ' ') : '',
            targetMessage.mixedIntent ? targetMessage.mixedIntent.replace(/_/g, ' ') : ''
        ].filter(Boolean)));
        const documentType = deriveDocumentType(targetMessage.intent);

        setIsSavingChatDocument(true);
        try {
            await api.post('/profile-library/items', {
                category_id: defaultCategory.id,
                title: deriveChatSaveTitle(markdownContent, targetMessage.intent),
                description,
                media_url: null,
                media_type: 'markdown',
                document_type: documentType,
                tags: defaultTags,
                source: 'ai_chat',
                source_ref: `${currentConversationId || 'unsaved-conversation'}:${messageIndex}`,
                source_conversation_id: currentConversationId,
                source_message_index: messageIndex,
                selection_text: null,
                content_markdown: markdownContent,
                content_json: {
                    version: 1,
                    documentType,
                    title: deriveChatSaveTitle(markdownContent, targetMessage.intent),
                    description,
                    markdown: markdownContent,
                    plainText,
                    tags: defaultTags,
                    selectionMode: 'full',
                    source: {
                        conversationId: currentConversationId,
                        messageIndex
                    }
                }
            });

            setChatSaveStatus('Saved this chat to your Knowledge Bank.');
        } catch (error) {
            console.warn('Failed to quick-save chat response.', error);
            setChatSaveStatus('Could not save this chat right now.');
        } finally {
            setIsSavingChatDocument(false);
        }
    };

    const handleSaveActiveGroceryListChat = async () => {
        const messageIndex = getGroceryBundleMessageIndex(activeGroceryBundleKey);
        if (messageIndex == null) {
            setChatSaveStatus('Could not find the recipe chat to save.');
            return;
        }

        await quickSaveChatMessage(
            messageIndex,
            'Recipe companion saved from a Navi grocery list.'
        );
        setIsGroceryListModalOpen(false);
    };

    const handleSaveChatResponse = async () => {
        if (chatSaveTargetIndex == null || !chatSaveCategoryId || isSavingChatDocument) return;

        const targetMessage = chatHistory.chat[chatSaveTargetIndex];
        if (!targetMessage || targetMessage.role !== 'assistant') return;

        const markdownContent = chatSaveMode === 'selection' && chatSaveSelectionText.trim()
            ? chatSaveSelectionText.trim()
            : targetMessage.content.trim();

        const plainText = stripMarkdownToPlainText(markdownContent);
        const tagList = Array.from(new Set(
            chatSaveTags.split(',').map((tag) => tag.trim()).filter(Boolean)
        ));
        const documentType = deriveDocumentType(targetMessage.intent);

        setIsSavingChatDocument(true);
        try {
            await api.post('/profile-library/items', {
                category_id: chatSaveCategoryId,
                title: chatSaveTitle.trim() || deriveChatSaveTitle(markdownContent, targetMessage.intent),
                description: chatSaveDescription.trim() || plainText.slice(0, 220),
                media_url: null,
                media_type: 'markdown',
                document_type: documentType,
                tags: tagList,
                source: 'ai_chat',
                source_ref: `${currentConversationId || 'unsaved-conversation'}:${chatSaveTargetIndex}`,
                source_conversation_id: currentConversationId,
                source_message_index: chatSaveTargetIndex,
                selection_text: chatSaveMode === 'selection' ? chatSaveSelectionText.trim() : null,
                content_markdown: markdownContent,
                content_json: {
                    version: 1,
                    documentType,
                    title: chatSaveTitle.trim() || deriveChatSaveTitle(markdownContent, targetMessage.intent),
                    description: chatSaveDescription.trim() || plainText.slice(0, 220),
                    markdown: markdownContent,
                    plainText,
                    tags: tagList,
                    selectionMode: chatSaveMode,
                    source: {
                        type: 'ai_chat',
                        conversationId: currentConversationId,
                        messageIndex: chatSaveTargetIndex
                    },
                    intent: {
                        primary: targetMessage.intent || null,
                        confidence: targetMessage.intentConfidence || null,
                        mixed: targetMessage.mixedIntent || null
                    }
                },
                metadata: {
                    saved_from: 'chat_response',
                    selection_mode: chatSaveMode,
                    full_markdown: targetMessage.content,
                    full_plain_text: stripMarkdownToPlainText(targetMessage.content)
                },
                is_private: true
            });

            const activeCategory = knowledgeBankCategories.find((category) => category.id === chatSaveCategoryId);
            setChatSaveStatus(`Saved to ${activeCategory?.label || 'your Knowledge Bank'}.`);
            closeSaveChatModal();
        } catch (error) {
            console.warn('Failed to save chat document to profile library.', error);
            setChatSaveStatus('Could not save that response right now.');
        } finally {
            setIsSavingChatDocument(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleRadiusChange = async (nextRadiusKm: number) => {
        setSearchRadiusKm(nextRadiusKm);

        if (activeGroceryBundleKey && groceryBundlesByKey[activeGroceryBundleKey] && nextRadiusKm > searchRadiusKm) {
            const bundle = groceryBundlesByKey[activeGroceryBundleKey];
            const resolvedSearch = !isLocationContextRestored && bundle.location
                ? {
                    location: bundle.location,
                    areaLabel: bundle.areaLabel || searchAreaLabel,
                    source: (bundle.sourceLabel as SearchLocationSource) || 'device',
                    locationResolved: true,
                    locationReason: 'resolved' as LocationReason
                }
                : await resolveSearchLocation();

            setIsLoading(true);
            try {
                await fetchPremiumFindingsForBundle(activeGroceryBundleKey, bundle.items, resolvedSearch, bundle.title);
                if (bundle.googleRequested) {
                    await handleSearchGoogleForBundle(activeGroceryBundleKey, nextRadiusKm);
                }
            } catch (error) {
                console.warn('Unable to refresh grocery sourcing radius.', error);
            } finally {
                setIsLoading(false);
            }
            return;
        }

        if (!lastPlaceSearch || nextRadiusKm <= searchRadiusKm) {
            return;
        }

        if (!isStandaloneGoogleRequested) {
            return;
        }

        setIsLoading(true);
        try {
            const resolvedSearch: ResolvedSearchLocation = lastPlaceSearch.restored ? await resolveSearchLocation() : {
                location: lastPlaceSearch.location,
                areaLabel: searchAreaLabel,
                source: locationSourceLabel as SearchLocationSource,
                locationResolved: lastPlaceSearch.locationResolved !== false,
                locationReason: lastPlaceSearch.locationReason === 'missing' || lastPlaceSearch.locationReason === 'geocode_failed'
                    ? lastPlaceSearch.locationReason
                    : 'resolved'
            };
            applyResolvedSearchContext(resolvedSearch);
            const result = await fetchGoogleInquiryPlaces(
                googleInquiryQueries.length > 0 ? googleInquiryQueries : lastPlaceSearch.queries,
                resolvedSearch.location,
                nextRadiusKm
            );
            applyGoogleInquiryResults(result);
            setLastPlaceSearch((current) => current ? {
                ...current,
                location: resolvedSearch.location,
                locationResolved: result.locationResolved,
                locationReason: result.locationReason,
                restored: false
            } : current);
            setChatHistory((prev) => {
                const chatMessages = prev.chat;
                if (chatMessages.length === 0) return prev;

                const lastMessage = chatMessages[chatMessages.length - 1];
                if (
                    lastMessage.role === 'assistant' &&
                    lastMessage.content.includes('I found a wider set of nearby options in the suggestions panel.')
                ) {
                    return prev;
                }

                return {
                    ...prev,
                    chat: [
                        ...chatMessages,
                        {
                            role: 'assistant',
                            content: `I found a wider set of nearby options in the suggestions panel using a ${nextRadiusKm} km search radius.`
                        }
                    ]
                };
            });
        } catch (error) {
            console.warn('Unable to expand place search radius.', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefreshSuggestions = async () => {
        if (!lastPlaceSearch) return;

        setIsRefreshingSuggestions(true);
        try {
            if (activeGroceryBundleKey && groceryBundlesByKey[activeGroceryBundleKey]) {
                const bundle = groceryBundlesByKey[activeGroceryBundleKey];
                const resolvedSearch = !isLocationContextRestored && bundle.location
                    ? {
                        location: bundle.location,
                        areaLabel: bundle.areaLabel || searchAreaLabel,
                        source: (bundle.sourceLabel as SearchLocationSource) || 'device',
                        locationResolved: true,
                        locationReason: 'resolved' as LocationReason
                    }
                    : await resolveSearchLocation();

                await fetchPremiumFindingsForBundle(activeGroceryBundleKey, bundle.items, resolvedSearch, bundle.title);
                if (bundle.googleRequested) {
                    await handleSearchGoogleForBundle(activeGroceryBundleKey, searchRadiusKm);
                }
                return;
            }

            if (isStandaloneGoogleRequested) {
                const resolvedSearch: ResolvedSearchLocation = lastPlaceSearch.restored ? await resolveSearchLocation() : {
                    location: lastPlaceSearch.location,
                    areaLabel: searchAreaLabel,
                    source: locationSourceLabel as SearchLocationSource,
                    locationResolved: lastPlaceSearch.locationResolved !== false,
                    locationReason: lastPlaceSearch.locationReason === 'missing' || lastPlaceSearch.locationReason === 'geocode_failed'
                        ? lastPlaceSearch.locationReason
                        : 'resolved'
                };
                applyResolvedSearchContext(resolvedSearch);
                const result = await fetchGoogleInquiryPlaces(
                    googleInquiryQueries.length > 0 ? googleInquiryQueries : lastPlaceSearch.queries,
                    resolvedSearch.location,
                    searchRadiusKm
                );
                applyGoogleInquiryResults(result);
                setLastPlaceSearch((current) => current ? {
                    ...current,
                    location: resolvedSearch.location,
                    locationResolved: result.locationResolved,
                    locationReason: result.locationReason,
                    restored: false
                } : current);
                return;
            }

            await fetchPremiumInquiryPlaces(lastPlaceSearch.queries, Math.max(16, suggestedPlaces.length || 16));
        } catch (error) {
            console.warn('Unable to refresh suggested places.', error);
        } finally {
            setIsRefreshingSuggestions(false);
        }
    };

    const handleToggleFavoritePlace = async (place: PlaceSuggestion) => {
        const identity = getPlaceIdentity(place);
        if (!identity) {
            return;
        }

        const existingFavorite =
            favoritePlacesByIdentity.get(identity) ||
            favoritePlacesByIdentity.get(String(place.place_profile_id || '').trim()) ||
            favoritePlacesByIdentity.get(String(place.id || '').trim()) ||
            favoritePlacesByIdentity.get(String(place.mapsUrl || '').trim());

        setPendingFavoriteKeys((current) => current.includes(identity) ? current : [...current, identity]);

        try {
            if (existingFavorite) {
                const res = await api.delete('/user/favorites/places', {
                    data: {
                        placeId: existingFavorite.external_place_id || existingFavorite.id || place.id || existingFavorite.place_profile_id,
                        mapsUrl: existingFavorite.mapsUrl || place.mapsUrl,
                        name: existingFavorite.name || place.name
                    }
                });

                setFavoritePlaces(Array.isArray(res.data?.favorite_places) ? res.data.favorite_places : []);
                return;
            }

            const res = await api.post('/user/favorites/places', {
                place: {
                    id: place.id,
                    name: place.name,
                    address: place.address,
                    phone: place.phone,
                    rating: place.rating,
                    reviewsCount: place.reviewsCount,
                    website: place.website,
                    mapsUrl: place.mapsUrl,
                    image: place.image,
                    distance_km: place.distance_km,
                    place_kind: place.place_kind,
                    place_profile_id: place.place_profile_id
                }
            });

            setFavoritePlaces(Array.isArray(res.data?.favorite_places) ? res.data.favorite_places : []);
        } catch (error) {
            console.warn('Unable to update favorite place.', error);
        } finally {
            setPendingFavoriteKeys((current) => current.filter((key) => key !== identity));
        }
    };

    const renderPlaceSuggestionCard = (place: PlaceSuggestion, idx: number, sectionKey = 'default') => {
        const placeIdentity = getPlaceIdentity(place);
        const favoritePlace =
            favoritePlacesByIdentity.get(placeIdentity) ||
            favoritePlacesByIdentity.get(String(place.place_profile_id || '').trim()) ||
            favoritePlacesByIdentity.get(String(place.id || '').trim()) ||
            favoritePlacesByIdentity.get(String(place.mapsUrl || '').trim());
        const isFavorited = Boolean(favoritePlace);
        const isFavoritePending = pendingFavoriteKeys.includes(placeIdentity);

        return (
            <motion.div
                key={`${sectionKey}-${placeIdentity || `${place.name}-${idx}`}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{
                    opacity: 1,
                    x: 0,
                    scale: focusedSuggestionIdentity === placeIdentity ? 1.01 : 1
                }}
                ref={(node) => {
                    placeCardRefs.current[placeIdentity] = node;
                    if (place.mapsUrl) {
                        placeCardRefs.current[String(place.mapsUrl).trim()] = node;
                    }
                }}
                className={`p-3 rounded-xl border shadow-sm transition ${
                    focusedSuggestionIdentity === placeIdentity
                        ? 'border-green-300 bg-green-50/70 ring-2 ring-green-100'
                        : isFavorited
                            ? 'border-emerald-200 bg-emerald-50/40'
                            : 'border-gray-100 bg-white'
                }`}
            >
                <div className="flex gap-3">
                    <div className="w-14 h-14 rounded-lg bg-gray-100 shrink-0 overflow-hidden">
                        <PlaceThumbnail image={place.image} name={place.name} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                            <h4 className="text-sm font-bold text-gray-800 leading-snug">{place.name}</h4>
                            {isFavorited ? (
                                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                                    Saved
                                </span>
                            ) : null}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{place.address || 'Address unavailable'}</p>
                        {typeof place.distance_km === 'number' ? (
                            <p className="mt-1 text-[11px] font-semibold text-green-700">
                                {place.distance_km < 1
                                    ? `${Math.round(place.distance_km * 1000)} m away`
                                    : `${place.distance_km.toFixed(1)} km away`}
                            </p>
                        ) : null}
                        <div className="mt-2 space-y-1">
                            {typeof place.rating === 'number' && (
                                <p className="text-xs text-amber-700 font-semibold">
                                    ★ {place.rating.toFixed(1)} ({place.reviewsCount || 0} reviews)
                                </p>
                            )}
                            {place.phone && (
                                <p className="text-xs text-gray-600">{place.phone}</p>
                            )}
                            {place.network_status ? (
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-green-700">
                                    {String(place.network_status).replace(/_/g, ' ')}
                                </p>
                            ) : null}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => requireAuth(() => { void handleToggleFavoritePlace(place); })}
                                disabled={isFavoritePending || isLoadingFavoritePlaces}
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                                    isFavorited
                                        ? 'border-emerald-300 bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                        : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-200 hover:text-emerald-700'
                                } disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill={isFavorited ? 'currentColor' : 'none'} stroke="currentColor">
                                    <path
                                        d="M10 17l-1.45-1.32C4.4 11.9 2 9.72 2 7.05 2 4.88 3.79 3 6 3c1.25 0 2.45.58 3.22 1.5C9.99 3.58 11.19 3 12.44 3 14.65 3 16.44 4.88 16.44 7.05c0 2.67-2.4 4.85-6.55 8.64L10 17z"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                                {isFavoritePending ? 'Saving...' : (isFavorited ? 'Saved' : 'Favorite')}
                            </button>
                            <a
                                href={place.mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-semibold text-blue-600 hover:underline"
                            >
                                Open Map
                            </a>
                            {place.website && (
                                <a
                                    href={place.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-semibold text-green-700 hover:underline"
                                >
                                    Website
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    };

    const handleStartNewChat = () => {
        setSkipAutoRestore(true);
        setCurrentConversationId(null);
        setActiveGroceryBundleKey(null);
        setPendingGroceryBundleKey(null);
        setIsGroceryListModalOpen(false);
        setIsStandaloneGoogleRequested(false);
        setSuggestionPanelMode('suggestions');
        setSuggestionPanelSubject('');
        setLastPlaceSearch(null);
        setSuggestedPlaces([]);
        setSuggestedProducts([]);
        setShowPreview(false);
        setLocationReason('resolved');
        setIsLocationContextRestored(false);
        setPrompt('');
        setSelectedAssistantMessageIndex(null);
        setChatSaveStatus('');
        closeSaveChatModal();
        setChatHistory((prev) => ({
            ...prev,
            chat: [{ role: 'assistant', content: DEFAULT_CHAT_GREETING }]
        }));
        setActiveTab('chat');
    };

    const handleQuickReply = (option: QuickReplyOption) => {
        handleSend(option.prompt);
    };

    const toggleGroceryItemChecked = (bundleKey: string, itemId: string) => {
        updateGroceryBundle(bundleKey, (bundle) => {
            if (!bundle) return bundle;
            return {
                ...bundle,
                items: bundle.items.map((item) => (
                    item.id === itemId
                        ? { ...item, checked: !item.checked }
                        : item
                ))
            };
        });
    };

    if (delegatedDashboard) {
        return delegatedDashboard;
    }

    return (
        <div className="flex w-full h-full">
            {/* Middle Column: Main Content (Dashboard OR Chat) */}
            <div className="flex-1 flex flex-col min-w-0 bg-white relative">

                {/* Content Area */}
                    <div className="flex-1 overflow-y-auto relative bg-gray-50/50 flex flex-col">
                        {/* Dashboard Content */}
                    <div className="flex-1 overflow-y-auto no-scrollbar relative z-0">

                        {/* HOME TAB - PUBLIC PROFILE V2 (Bento Grid) */}
                        {activeTab === 'home' && (
                            <PublicProfileV2 user={user} />
                        )}

                        {activeTab === 'living_library' && (
                            <PublicProfileV2 user={user} />
                        )}

                        {/* IMPACT TAB */}
                        {activeTab === 'impact' && (
                            <ImpactMetrics />
                        )}

                        {activeTab === 'about_you' && (
                            <ProfileWorkspace />
                        )}

                        {/* GUIDE TAB */}
                        {activeTab === 'guide' && (
                            <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500">
                                {/* Header */}
                                <div className="text-center space-y-2">
                                    <h1 className="text-3xl font-bold text-gray-900">Welcome to PLYT</h1>
                                    <p className="text-gray-500">Your guide to growing, earning, and impacting.</p>
                                </div>

                                {/* Video Section */}
                                <div className="rounded-2xl overflow-hidden shadow-xl bg-black aspect-video relative group">
                                    {/* Placeholder Video Overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/30 transition-colors cursor-pointer">
                                        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center pl-1 group-hover:scale-110 transition-transform duration-300">
                                            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                        </div>
                                    </div>
                                    <img src="/assets/images/gallery/indoor_garden.png" alt="Tutorial Video Thumbnail" className="w-full h-full object-cover opacity-80" />
                                </div>

                                {/* Features Grid */}
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-2">Manage Your Systems</h3>
                                        <p className="text-gray-600 leading-relaxed text-sm">Monitor your hydroponic systems, track pH levels, and log your harvests. Keep your plants healthy and productive with AI-driven insights.</p>
                                    </div>
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-2">Earn & Spend Credits</h3>
                                        <p className="text-gray-600 leading-relaxed text-sm">Generate PLYT credits by harvesting produce and reducing carbon. Spend them in the marketplace for seeds, nutrients, and new systems.</p>
                                    </div>
                                </div>

                                {/* How to Generate Credits */}
                                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-3xl border border-green-100">
                                    <h3 className="text-xl font-bold text-green-900 mb-6 flex items-center gap-2">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                        How to Generate Credits
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-4">
                                            <span className="flex-shrink-0 w-6 h-6 bg-green-200 text-green-800 rounded-full flex items-center justify-center font-bold text-sm">1</span>
                                            <div>
                                                <h4 className="font-bold text-green-900">Log Your Harvests</h4>
                                                <p className="text-sm text-green-800/80">Every gram of produce you grow earns you credits based on market value.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <span className="flex-shrink-0 w-6 h-6 bg-green-200 text-green-800 rounded-full flex items-center justify-center font-bold text-sm">2</span>
                                            <div>
                                                <h4 className="font-bold text-green-900">Maintain High Impact</h4>
                                                <p className="text-sm text-green-800/80">Use sustainable methods to boost your Impact Score, earning bonus multipliers.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <span className="flex-shrink-0 w-6 h-6 bg-green-200 text-green-800 rounded-full flex items-center justify-center font-bold text-sm">3</span>
                                            <div>
                                                <h4 className="font-bold text-green-900">Participate in Community</h4>
                                                <p className="text-sm text-green-800/80">Help others in the Chat and share your knowledge to get community rewards.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* CHAT TAB - Unified Interaction */}
                        {activeTab === 'chat' && (
                            <div className="flex-1 flex flex-col md:flex-row overflow-hidden w-full h-full">
                                {/* Chat Area */}
                                <div className="flex-1 flex flex-col overflow-hidden">
                                    <div className="flex-1 overflow-y-auto no-scrollbar">
                                        <div className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 px-4 py-3 shadow-sm backdrop-blur md:px-6">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <NaviAvatar />
                                                    <div>
                                                        <h2 className="text-sm font-bold text-gray-800">Hi, I'm Navi.</h2>
                                                        <p className="text-xs text-gray-400">I find the healthiest foods for your unique profile.</p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleStartNewChat}
                                                    className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-green-300 hover:text-green-700"
                                                >
                                                    New chat
                                                </button>
                                            </div>
                                            {chatSaveStatus ? (
                                                <div className="mt-3 rounded-2xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-800">
                                                    {chatSaveStatus}
                                                </div>
                                            ) : null}
                                            {!user ? (
                                                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                                                    Sign in or create your profile before searching so Navi can personalize results around your health context.
                                                </div>
                                            ) : null}
                                        </div>
                                        <div className={`p-4 md:p-6 space-y-4 ${isMainChatTab ? 'pb-36 md:pb-44' : ''}`}>
                                            {(chatHistory['chat'] || []).map((msg, idx, messages) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`flex w-full mb-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                ref={(node) => {
                                                    if (msg.role === 'assistant') {
                                                        assistantMessageRefs.current[`chat-${idx}`] = node;
                                                    }
                                                }}
                                                className={`max-w-[90%] rounded-2xl px-4 py-3 shadow-sm ${msg.role === 'user'
                                                ? 'bg-green-600 text-white rounded-br-none'
                                                : selectedAssistantMessageIndex === idx
                                                    ? 'bg-white border border-green-300 text-gray-800 rounded-bl-none ring-2 ring-green-100'
                                                    : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'
                                                }`}
                                            >
                                                {msg.role === 'assistant' && !msg.incompleteProfile ? (
                                                    <div className="mb-2 flex items-center justify-between gap-3">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedAssistantMessageIndex((current) => current === idx ? null : idx)}
                                                                className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                                                                    selectedAssistantMessageIndex === idx
                                                                        ? 'border-green-300 bg-green-50 text-green-700'
                                                                        : 'border-gray-200 bg-white text-gray-500 hover:border-green-200 hover:text-green-700'
                                                                }`}
                                                            >
                                                                <span className={`h-3 w-3 rounded-full border ${
                                                                    selectedAssistantMessageIndex === idx
                                                                        ? 'border-green-600 bg-green-600'
                                                                        : 'border-gray-300 bg-white'
                                                                }`} />
                                                                Save target
                                                            </button>
                                                            {isRecipeAssistantMessage(msg) ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => { void handleBuildGroceryList(msg, idx); }}
                                                                    disabled={pendingGroceryBundleKey === buildGroceryBundleKey(idx)}
                                                                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-800 transition hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                                >
                                                                    {pendingGroceryBundleKey === buildGroceryBundleKey(idx) ? 'Building grocery list...' : 'Build grocery list'}
                                                                </button>
                                                            ) : null}
                                                        </div>
                                                        {selectedAssistantMessageIndex === idx ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => requireAuth(() => { void openSaveChatModal(msg, idx); })}
                                                                className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-[11px] font-semibold text-green-700 transition hover:border-green-300 hover:bg-green-100"
                                                            >
                                                                Save to bank
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                ) : null}
                                                {msg.role === 'assistant' ? (
                                                    <div
                                                        className="leading-relaxed text-sm"
                                                        onClick={handleAssistantMessageClick}
                                                        dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(linkSuggestedPlaceMentions(stripPanelPlaceLinks(normalizeSuggestedPlaceLinks(msg.content, suggestedPlaces), suggestedPlaces), [])) }}
                                                    />
                                                ) : (
                                                    <p className="leading-relaxed whitespace-pre-wrap text-sm">{msg.content}</p>
                                                )}
                                                {msg.role === 'assistant' && msg.usedFallback ? (
                                                    <p className="mt-2 text-xs text-gray-400">{getFallbackNotice(msg)}</p>
                                                ) : null}
                                                {msg.role === 'assistant' && msg.incompleteProfile ? (
                                                    <div className="mt-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setActiveTab('about_you');
                                                                router.push('/?tab=about_you&profile=consumer');
                                                            }}
                                                            className="rounded-full bg-green-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700"
                                                        >
                                                            Complete my profile
                                                        </button>
                                                    </div>
                                                ) : null}
                                                {msg.role === 'assistant' && msg.followUpOptions?.length && idx === messages.length - 1 ? (
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        {msg.followUpOptions.map((option) => (
                                                            <button
                                                                key={option.id}
                                                                type="button"
                                                                onClick={() => handleQuickReply(option)}
                                                                className="rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 transition hover:border-green-300 hover:bg-green-100"
                                                            >
                                                                {option.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </motion.div>
                                            ))}
                                            <AnimatePresence>
                                                {isLoading && pendingIntent ? (
                                                    <IntentLoader classification={pendingIntent} />
                                                ) : null}
                                            </AnimatePresence>
                                            <div ref={messagesEndRef} />
                                        </div>
                                    </div>
                                </div>

                                {/* Suggested Products Panel */}
                                 <div className={`w-full md:w-80 shrink-0 bg-white border-l border-gray-100 flex flex-col shadow-[0_0_15px_rgba(0,0,0,0.03)] z-30 md:static transition-all duration-300 overflow-hidden md:overflow-visible ${isPanelOpen ? 'h-80' : 'h-14'} md:h-auto`}>
                                      <div
                                          className="relative z-40 p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 cursor-pointer md:cursor-default"
                                          onClick={() => setIsPanelOpen(!isPanelOpen)}
                                      >
                                         <div className="min-w-0">
                                              <div className="flex items-center gap-2">
                                                  <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">{activeSuggestionPanelMeta.title}</h3>
                                                  <div
                                                      className="relative"
                                                      onMouseEnter={() => {
                                                          if (canHoverInfoPopover) {
                                                              setIsSuggestionModeInfoOpen(true);
                                                          }
                                                      }}
                                                      onMouseLeave={() => {
                                                          if (canHoverInfoPopover) {
                                                              setIsSuggestionModeInfoOpen(false);
                                                          }
                                                      }}
                                                  >
                                                      <button
                                                          type="button"
                                                          onClick={(e) => {
                                                              e.stopPropagation();
                                                              if (!canHoverInfoPopover) {
                                                                  setIsSuggestionModeInfoOpen((current) => !current);
                                                              }
                                                          }}
                                                          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 bg-white text-[10px] font-bold text-gray-500 transition hover:border-green-300 hover:text-green-700"
                                                          aria-label={`About ${activeSuggestionPanelMeta.title}`}
                                                      >
                                                          ?
                                                      </button>
                                                      {isSuggestionModeInfoOpen ? (
                                                          <div className="absolute left-1/2 top-7 z-[70] w-64 max-w-[calc(100vw-3rem)] -translate-x-1/2 rounded-2xl border border-gray-200 bg-white p-3 text-[11px] font-medium leading-relaxed text-gray-600 shadow-2xl md:left-auto md:right-0 md:translate-x-0">
                                                              {activeSuggestionPanelMeta.description}
                                                          </div>
                                                      ) : null}
                                                  </div>
                                                  {!isPanelOpen && collapsedSuggestionPreview ? (
                                                      <span className="md:hidden rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-green-700">
                                                          New
                                                      </span>
                                                  ) : null}
                                              </div>
                                              {activeGroceryBundle ? (
                                                  <p className="mt-1 max-w-[12rem] truncate text-[11px] font-semibold text-gray-600">
                                                      {activeGroceryBundle.title}
                                                  </p>
                                              ) : suggestionPanelSubject ? (
                                                  <p className="mt-1 max-w-[12rem] truncate text-[11px] font-semibold text-gray-600">
                                                      {suggestionPanelSubject}
                                                  </p>
                                              ) : !isPanelOpen && collapsedSuggestionPreview ? (
                                                  <p className="mt-1 max-w-[11rem] truncate text-[11px] font-medium text-gray-500 md:hidden">
                                                      First match: <span className="text-gray-700">{collapsedSuggestionPreview}</span>
                                                  </p>
                                              ) : null}
                                         </div>
                                         <div className="flex items-center gap-2 pl-3">
                                              <span
                                                  className={`md:hidden inline-flex h-7 w-7 items-center justify-center rounded-full transition-all ${
                                                      suggestedPlaces.length > 0 || suggestedProducts.length > 0
                                                          ? isPanelOpen
                                                              ? 'border border-green-300 bg-green-50 text-green-700'
                                                              : 'animate-pulse border-2 border-green-400 bg-green-50/90 text-green-700 shadow-[0_0_0_6px_rgba(34,197,94,0.12)]'
                                                          : 'text-gray-400'
                                                  }`}
                                              >
                                                  <svg className={`w-4 h-4 transition-transform ${isPanelOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                                              </span>
                                              <button
                                                  type="button"
                                                  onClick={(e) => {
                                                     e.stopPropagation();
                                                     void handleRefreshSuggestions();
                                                 }}
                                                 disabled={!lastPlaceSearch || isRefreshingSuggestions}
                                                 className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:border-green-300 hover:text-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                 aria-label="Refresh suggestion list"
                                             >
                                                 <svg className={`h-4 w-4 ${isRefreshingSuggestions ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5" />
                                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 9a8 8 0 00-13.657-4.657L4 9m16 6l-2.343 2.343A8 8 0 014 15" />
                                                 </svg>
                                             </button>
                                             <button
                                                 type="button"
                                                 onClick={(e) => {
                                                     e.stopPropagation();
                                                     setIsSuggestionSettingsOpen((prev) => !prev);
                                                 }}
                                                 className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:border-green-300 hover:text-green-700"
                                                 aria-label="Toggle suggestion settings"
                                             >
                                                 <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                 </svg>
                                             </button>
                                         </div>
                                     </div>
                                     <div className={`border-b border-gray-100 bg-white px-4 transition-all duration-200 overflow-hidden ${isSuggestionSettingsOpen ? 'max-h-60 py-3' : 'max-h-0 py-0 border-b-0'}`}>
                                         <div className="space-y-3">
                                             <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400">
                                                 Search settings
                                             </p>
                                              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                                  <span className="rounded-full bg-gray-100 px-2.5 py-1 font-semibold text-gray-700">
                                                      Based near: {searchAreaLabel}
                                                  </span>
                                                  <span className="rounded-full bg-green-50 px-2.5 py-1 font-semibold text-green-700">
                                                      Radius: {searchRadiusKm} km
                                                  </span>
                                                  <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700 capitalize">
                                                      Source: {locationSourceLabel}
                                                  </span>
                                                  <span className={`rounded-full px-2.5 py-1 font-semibold ${isLocationContextRestored ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                                      Context: {isLocationContextRestored ? 'restored' : 'live'}
                                                  </span>
                                                  <span className={`rounded-full px-2.5 py-1 font-semibold ${locationReason === 'resolved' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                                      Location: {getLocationReasonLabel(locationReason)}
                                                  </span>
                                              </div>
                                              {locationReason !== 'resolved' ? (
                                                  <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                                                      Location unavailable. Enable device location or keep a saved home area so nearby Google results stay local.
                                                  </p>
                                              ) : null}
                                           <div className="flex items-center gap-2">
                                              <label htmlFor="search-radius" className="text-[11px] font-medium text-gray-500">
                                                  Search distance
                                              </label>
                                                 <select
                                                     id="search-radius"
                                                     value={searchRadiusKm}
                                                     onChange={(e) => void handleRadiusChange(Number(e.target.value))}
                                                     className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
                                                 >
                                                     {SEARCH_RADIUS_OPTIONS_KM.map((radius) => (
                                                         <option key={radius} value={radius}>
                                                             {radius} km
                                                         </option>
                                                     ))}
                                                  </select>
                                              </div>
                                          </div>
                                          {showSearchDebug && lastPlaceSearch ? (
                                              <div className="mt-3 rounded-2xl border border-dashed border-amber-300 bg-amber-50/80 p-3 text-[11px] text-amber-900">
                                                   <div className="flex flex-wrap items-center gap-2">
                                                       <span className="rounded-full bg-white/80 px-2 py-0.5 font-semibold">
                                                           Searching near: {searchAreaLabel || lastPlaceSearch.location || 'Unknown area'}
                                                       </span>
                                                       <span className="rounded-full bg-white/80 px-2 py-0.5 font-semibold capitalize">
                                                           Source: {locationSourceLabel || 'unknown'}
                                                       </span>
                                                       <span className="rounded-full bg-white/80 px-2 py-0.5 font-semibold capitalize">
                                                           Context: {lastPlaceSearch.restored ? 'restored' : 'live'}
                                                       </span>
                                                       <span className="rounded-full bg-white/80 px-2 py-0.5 font-semibold">
                                                           Location: {getLocationReasonLabel(lastPlaceSearch.locationReason)}
                                                       </span>
                                                   </div>
                                                  <p className="mt-2 font-semibold text-amber-950">Queries used</p>
                                                  <div className="mt-2 flex flex-wrap gap-2">
                                                      {lastPlaceSearch.queries.map((query) => (
                                                          <span
                                                              key={query}
                                                              className="rounded-full border border-amber-200 bg-white/90 px-2 py-1 font-medium text-amber-800"
                                                          >
                                                              {query}
                                                          </span>
                                                      ))}
                                                  </div>
                                              </div>
                                          ) : null}
                                      </div>
                                      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
                                         {activeGroceryBundle ? (
                                             <>
                                                 <div className="space-y-2">
                                                     <div className="flex items-center justify-between gap-3">
                                                         <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">Premium Findings</h4>
                                                         <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-green-700">
                                                             {activeGroceryBundle.premiumFindings.length} results
                                                         </span>
                                                     </div>
                                                     {activeGroceryBundle.premiumFindings.length > 0 ? (
                                                         activeGroceryBundle.premiumFindings.map((place, idx) => renderPlaceSuggestionCard(place, idx, 'premium'))
                                                     ) : (
                                                         <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-500">
                                                             No network inventories in your area yet.
                                                         </div>
                                                     )}
                                                 </div>
                                                 <button
                                                     type="button"
                                                     onClick={() => { if (activeGroceryBundleKey) { void handleSearchGoogleForBundle(activeGroceryBundleKey); } }}
                                                     disabled={!activeGroceryBundleKey || pendingGroceryBundleKey === activeGroceryBundleKey}
                                                     className="w-full rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                 >
                                                     Search by Google
                                                 </button>
                                                 {activeGroceryBundle.googleRequested ? (
                                                     activeGroceryBundle.googleFindings.length > 0 ? (
                                                         <>
                                                             <div className="flex items-center justify-between gap-3">
                                                                 <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">Found via Google</h4>
                                                                 <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700">
                                                                     {activeGroceryBundle.googleFindings.length} results
                                                                 </span>
                                                             </div>
                                                             {activeGroceryBundle.googleFindings.map((place, idx) => renderPlaceSuggestionCard(place, idx, 'google'))}
                                                         </>
                                                     ) : (
                                                         <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 px-4 py-4 text-sm text-blue-800">
                                                             No results found via Google for this grocery list yet.
                                                         </div>
                                                     )
                                                 ) : null}
                                             </>
                                         ) : activeSuggestionPanelMode === 'grocery_options' ? (
                                             <>
                                                 <div className="space-y-2">
                                                     <div className="flex items-center justify-between gap-3">
                                                         <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">Premium Findings</h4>
                                                         <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-green-700">
                                                             {suggestedPlaces.length} results
                                                         </span>
                                                     </div>
                                                     {suggestedPlaces.length > 0 ? (
                                                         <>
                                                             {visibleSuggestedPlaces.map((place, idx) => renderPlaceSuggestionCard(place, idx, 'grocery-standard'))}
                                                             {suggestedPlaces.length > INITIAL_VISIBLE_PLACE_COUNT ? (
                                                                 <div className="pt-1">
                                                                     {hasMoreSuggestedPlaces ? (
                                                                         <button
                                                                             type="button"
                                                                             onClick={() => setVisiblePlaceCount((current) => Math.min(suggestedPlaces.length, current + PLACE_PANEL_INCREMENT))}
                                                                             className="w-full rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 transition hover:border-green-300 hover:bg-green-100"
                                                                         >
                                                                             Show {Math.min(PLACE_PANEL_INCREMENT, suggestedPlaces.length - visiblePlaceCount)} more matches
                                                                         </button>
                                                                     ) : (
                                                                         <button
                                                                             type="button"
                                                                             onClick={() => setVisiblePlaceCount(INITIAL_VISIBLE_PLACE_COUNT)}
                                                                             className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-gray-300 hover:bg-gray-50"
                                                                         >
                                                                             Show fewer
                                                                         </button>
                                                                     )}
                                                                 </div>
                                                             ) : null}
                                                         </>
                                                     ) : (
                                                         <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-500">
                                                             No network inventories in your area yet.
                                                         </div>
                                                     )}
                                                 </div>
                                                 <button
                                                     type="button"
                                                     onClick={() => { void handleSearchGoogleForCurrentInquiry(); }}
                                                     disabled={!lastPlaceSearch || isRefreshingSuggestions}
                                                     className="w-full rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                 >
                                                     {isRefreshingSuggestions && isStandaloneGoogleRequested ? 'Searching Google...' : 'Search by Google'}
                                                 </button>
                                                 {isStandaloneGoogleRequested ? (
                                                     googleInquiryPlaces.length > 0 ? (
                                                         <>
                                                             <div className="flex items-center justify-between gap-3">
                                                                 <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">Found via Google</h4>
                                                                 <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700">
                                                                     {googleInquiryPlaces.length} results
                                                                 </span>
                                                             </div>
                                                             <div className="space-y-3">
                                                                 {visibleGoogleInquiryPlaces.map((place, idx) => renderPlaceSuggestionCard(place, idx, 'grocery-google'))}
                                                             </div>
                                                             {googleInquiryPlaces.length > INITIAL_VISIBLE_PLACE_COUNT ? (
                                                                 <div className="pt-1">
                                                                     {hasMoreGoogleInquiryPlaces ? (
                                                                         <button
                                                                             type="button"
                                                                             onClick={() => setVisiblePlaceCount((current) => Math.min(googleInquiryPlaces.length, current + PLACE_PANEL_INCREMENT))}
                                                                             className="w-full rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                                                                         >
                                                                             Show {Math.min(PLACE_PANEL_INCREMENT, googleInquiryPlaces.length - visiblePlaceCount)} more matches
                                                                         </button>
                                                                     ) : (
                                                                         <button
                                                                             type="button"
                                                                             onClick={() => setVisiblePlaceCount(INITIAL_VISIBLE_PLACE_COUNT)}
                                                                             className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-gray-300 hover:bg-gray-50"
                                                                         >
                                                                             Show fewer
                                                                         </button>
                                                                     )}
                                                                 </div>
                                                             ) : null}
                                                         </>
                                                     ) : (
                                                         <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 px-4 py-4 text-sm text-blue-800">
                                                             No results found via Google for this inquiry yet.
                                                         </div>
                                                     )
                                                 ) : null}
                                               </>
                                         ) : activeSuggestionPanelMode === 'ready_to_eat' ? (
                                                 <>
                                                     <div className="space-y-2">
                                                         <div className="flex items-center justify-between gap-3">
                                                             <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">Premium Findings</h4>
                                                             <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-orange-700">
                                                                 {suggestedPlaces.length} results
                                                             </span>
                                                         </div>
                                                         {suggestedPlaces.length > 0 ? (
                                                             <>
                                                                 <div className="space-y-3">
                                                                     {visibleSuggestedPlaces.map((place, idx) => renderPlaceSuggestionCard(place, idx, 'ready-to-eat'))}
                                                                 </div>
                                                                 {suggestedPlaces.length > INITIAL_VISIBLE_PLACE_COUNT ? (
                                                                     <div className="pt-1">
                                                                         {hasMoreSuggestedPlaces ? (
                                                                             <button
                                                                                 type="button"
                                                                                 onClick={() => setVisiblePlaceCount((current) => Math.min(suggestedPlaces.length, current + PLACE_PANEL_INCREMENT))}
                                                                                 className="w-full rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 transition hover:border-orange-300 hover:bg-orange-100"
                                                                             >
                                                                                 Show {Math.min(PLACE_PANEL_INCREMENT, suggestedPlaces.length - visiblePlaceCount)} more matches
                                                                             </button>
                                                                         ) : (
                                                                             <button
                                                                                 type="button"
                                                                                 onClick={() => setVisiblePlaceCount(INITIAL_VISIBLE_PLACE_COUNT)}
                                                                                 className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-gray-300 hover:bg-gray-50"
                                                                             >
                                                                                 Show fewer
                                                                             </button>
                                                                         )}
                                                                     </div>
                                                                 ) : null}
                                                             </>
                                                         ) : (
                                                             <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-500">
                                                                 No ready-to-eat premium findings matched this request yet.
                                                             </div>
                                                         )}
                                                     </div>
                                                     <button
                                                         type="button"
                                                         onClick={() => { void handleSearchGoogleForCurrentInquiry(); }}
                                                         disabled={!lastPlaceSearch || isRefreshingSuggestions}
                                                         className="w-full rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                     >
                                                         {isRefreshingSuggestions && isStandaloneGoogleRequested ? 'Searching Google...' : 'Search by Google'}
                                                     </button>
                                                     {isStandaloneGoogleRequested ? (
                                                         googleInquiryPlaces.length > 0 ? (
                                                             <>
                                                                 <div className="flex items-center justify-between gap-3">
                                                                     <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">Found via Google</h4>
                                                                     <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700">
                                                                         {googleInquiryPlaces.length} results
                                                                     </span>
                                                                 </div>
                                                                 <div className="space-y-3">
                                                                     {visibleGoogleInquiryPlaces.map((place, idx) => renderPlaceSuggestionCard(place, idx, 'ready-to-eat-google'))}
                                                                 </div>
                                                             </>
                                                         ) : (
                                                             <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 px-4 py-4 text-sm text-blue-800">
                                                                 No results found via Google for this inquiry yet.
                                                             </div>
                                                         )
                                                     ) : null}
                                                 </>
                                         ) : suggestedPlaces.length > 0 ? (
                                             <>
                                                {visibleSuggestedPlaces.map((place, idx) => {
                                                  const placeIdentity = getPlaceIdentity(place);
                                                  const favoritePlace =
                                                      favoritePlacesByIdentity.get(placeIdentity) ||
                                                      favoritePlacesByIdentity.get(String(place.place_profile_id || '').trim()) ||
                                                      favoritePlacesByIdentity.get(String(place.id || '').trim()) ||
                                                      favoritePlacesByIdentity.get(String(place.mapsUrl || '').trim());
                                                  const isFavorited = Boolean(favoritePlace);
                                                  const isFavoritePending = pendingFavoriteKeys.includes(placeIdentity);

                                                  return (
                                                   <motion.div
                                                       key={`${place.name}-${idx}`}
                                                       initial={{ opacity: 0, x: 20 }}
                                                      animate={{
                                                          opacity: 1,
                                                          x: 0,
                                                          scale: focusedSuggestionIdentity === placeIdentity ? 1.01 : 1
                                                      }}
                                                      ref={(node) => {
                                                          placeCardRefs.current[placeIdentity] = node;
                                                          if (place.mapsUrl) {
                                                              placeCardRefs.current[String(place.mapsUrl).trim()] = node;
                                                          }
                                                      }}
                                                      className={`p-3 rounded-xl border shadow-sm transition ${
                                                          focusedSuggestionIdentity === placeIdentity
                                                              ? 'border-green-300 bg-green-50/70 ring-2 ring-green-100'
                                                              : isFavorited
                                                                  ? 'border-emerald-200 bg-emerald-50/40'
                                                                  : 'border-gray-100 bg-white'
                                                      }`}
                                                  >
                                                     <div className="flex gap-3">
                                                         <div className="w-14 h-14 rounded-lg bg-gray-100 shrink-0 overflow-hidden">
                                                             <PlaceThumbnail image={place.image} name={place.name} />
                                                         </div>
                                                         <div className="flex-1 min-w-0">
                                                             <div className="flex items-start justify-between gap-3">
                                                                 <h4 className="text-sm font-bold text-gray-800 leading-snug">{place.name}</h4>
                                                                 {isFavorited ? (
                                                                     <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                                                                         Saved
                                                                     </span>
                                                                 ) : null}
                                                             </div>
                                                             <p className="text-xs text-gray-500 mt-1">{place.address || 'Address unavailable'}</p>
                                                             {typeof place.distance_km === 'number' ? (
                                                                 <p className="mt-1 text-[11px] font-semibold text-green-700">
                                                                    {place.distance_km < 1
                                                                        ? `${Math.round(place.distance_km * 1000)} m away`
                                                                        : `${place.distance_km.toFixed(1)} km away`}
                                                                </p>
                                                            ) : null}
                                                            <div className="mt-2 space-y-1">
                                                                {typeof place.rating === 'number' && (
                                                                    <p className="text-xs text-amber-700 font-semibold">
                                                                        ★ {place.rating.toFixed(1)} ({place.reviewsCount || 0} reviews)
                                                                    </p>
                                                                )}
                                                                {place.phone && (
                                                                    <p className="text-xs text-gray-600">{place.phone}</p>
                                                                )}
                                                             </div>
                                                             <div className="mt-2 flex flex-wrap gap-3">
                                                                 <button
                                                                     type="button"
                                                                     onClick={() => requireAuth(() => { void handleToggleFavoritePlace(place); })}
                                                                     disabled={isFavoritePending || isLoadingFavoritePlaces}
                                                                     className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                                                                         isFavorited
                                                                             ? 'border-emerald-300 bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                                                             : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-200 hover:text-emerald-700'
                                                                     } disabled:cursor-not-allowed disabled:opacity-60`}
                                                                 >
                                                                     <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill={isFavorited ? 'currentColor' : 'none'} stroke="currentColor">
                                                                         <path
                                                                             d="M10 17l-1.45-1.32C4.4 11.9 2 9.72 2 7.05 2 4.88 3.79 3 6 3c1.25 0 2.45.58 3.22 1.5C9.99 3.58 11.19 3 12.44 3 14.65 3 16.44 4.88 16.44 7.05c0 2.67-2.4 4.85-6.55 8.64L10 17z"
                                                                             strokeWidth="1.5"
                                                                             strokeLinecap="round"
                                                                             strokeLinejoin="round"
                                                                         />
                                                                     </svg>
                                                                     {isFavoritePending ? 'Saving...' : (isFavorited ? 'Saved' : 'Favorite')}
                                                                 </button>
                                                                 <a
                                                                     href={place.mapsUrl}
                                                                     target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-xs font-semibold text-blue-600 hover:underline"
                                                                >
                                                                    Open Map
                                                                </a>
                                                                {place.website && (
                                                                    <a
                                                                        href={place.website}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-xs font-semibold text-green-700 hover:underline"
                                                                    >
                                                                        Website
                                                                    </a>
                                                                )}
                                                             </div>
                                                         </div>
                                                     </div>
                                                  </motion.div>
                                              );
                                              })}
                                             {suggestedPlaces.length > INITIAL_VISIBLE_PLACE_COUNT ? (
                                                 <div className="pt-1">
                                                     {hasMoreSuggestedPlaces ? (
                                                         <button
                                                             type="button"
                                                             onClick={() => setVisiblePlaceCount((current) => Math.min(suggestedPlaces.length, current + PLACE_PANEL_INCREMENT))}
                                                             className="w-full rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 transition hover:border-green-300 hover:bg-green-100"
                                                         >
                                                             Show {Math.min(PLACE_PANEL_INCREMENT, suggestedPlaces.length - visiblePlaceCount)} more matches
                                                         </button>
                                                     ) : (
                                                         <button
                                                             type="button"
                                                             onClick={() => setVisiblePlaceCount(INITIAL_VISIBLE_PLACE_COUNT)}
                                                             className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-gray-300 hover:bg-gray-50"
                                                         >
                                                             Show fewer
                                                         </button>
                                                     )}
                                                 </div>
                                             ) : null}
                                             </>
                                         ) : activeSuggestionPanelMode === 'advice_guidance' ? (
                                             <>
                                                 <div className="space-y-2">
                                                     <div className="flex items-center justify-between gap-3">
                                                         <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">Premium Findings</h4>
                                                         <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-sky-700">
                                                             0 results
                                                         </span>
                                                     </div>
                                                     <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-500">
                                                         No advice profiles or guidance resources are connected for this inquiry yet.
                                                     </div>
                                                 </div>
                                                 <button
                                                     type="button"
                                                     onClick={() => { void handleSearchGoogleForCurrentInquiry(); }}
                                                     disabled={!lastPlaceSearch || isRefreshingSuggestions}
                                                     className="w-full rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                 >
                                                     {isRefreshingSuggestions && isStandaloneGoogleRequested ? 'Searching Google...' : 'Search by Google'}
                                                 </button>
                                                 {isStandaloneGoogleRequested && googleInquiryPlaces.length > 0 ? (
                                                     <>
                                                         <div className="flex items-center justify-between gap-3">
                                                             <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">Found via Google</h4>
                                                             <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700">
                                                                 {googleInquiryPlaces.length} results
                                                             </span>
                                                         </div>
                                                         <div className="space-y-3">
                                                             {visibleGoogleInquiryPlaces.map((place, idx) => renderPlaceSuggestionCard(place, idx, 'advice-google'))}
                                                         </div>
                                                         {googleInquiryPlaces.length > INITIAL_VISIBLE_PLACE_COUNT ? (
                                                             <div className="pt-1">
                                                                 {hasMoreGoogleInquiryPlaces ? (
                                                                     <button
                                                                         type="button"
                                                                         onClick={() => setVisiblePlaceCount((current) => Math.min(googleInquiryPlaces.length, current + PLACE_PANEL_INCREMENT))}
                                                                         className="w-full rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                                                                     >
                                                                         Show {Math.min(PLACE_PANEL_INCREMENT, googleInquiryPlaces.length - visiblePlaceCount)} more matches
                                                                     </button>
                                                                 ) : (
                                                                     <button
                                                                         type="button"
                                                                         onClick={() => setVisiblePlaceCount(INITIAL_VISIBLE_PLACE_COUNT)}
                                                                         className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-gray-300 hover:bg-gray-50"
                                                                     >
                                                                         Show fewer
                                                                     </button>
                                                                 )}
                                                             </div>
                                                         ) : null}
                                                     </>
                                                 ) : null}
                                                 {isStandaloneGoogleRequested && googleInquiryPlaces.length === 0 ? (
                                                     <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 px-4 py-4 text-sm text-blue-800">
                                                         No results found via Google for this inquiry yet.
                                                     </div>
                                                 ) : null}
                                             </>
                                         ) : suggestedProducts.length === 0 ? (
                                            <div className="text-center py-10 opacity-40">
                                                <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                                <p className="text-sm text-gray-400">Relevant items will appear here.</p>
                                            </div>
                                        ) : (
                                            suggestedProducts.map((item) => (
                                                <motion.div
                                                    key={item.id}
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm flex gap-3 group hover:border-green-200 transition-colors"
                                                    onClick={() => setSelectedProduct(item)}
                                                >
                                                    <div className="w-12 h-12 rounded-lg bg-gray-100 shrink-0 overflow-hidden">
                                                        {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm font-bold text-gray-800 truncate">{item.name}</h4>
                                                        <p className="text-xs text-green-600 font-semibold">Rp {item.price.toLocaleString()}</p>
                                                    </div>
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                </div>
                                {/* Chat Tab Product Overlay */}
                                <AnimatePresence>
                                    {selectedProduct && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute inset-0 bg-black/20 backdrop-blur-[1px] z-50 flex justify-end"
                                            onClick={() => setSelectedProduct(null)}
                                        >
                                            <motion.div
                                                initial={{ x: '100%' }}
                                                animate={{ x: 0 }}
                                                exit={{ x: '100%' }}
                                                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                                                className="w-full md:w-96 bg-white h-full shadow-lg relative"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                                    <h3 className="text-lg font-bold text-gray-800">{selectedProduct.name}</h3>
                                                    <button onClick={() => setSelectedProduct(null)} className="text-gray-400 hover:text-gray-600">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                                <div className="p-6 overflow-y-auto h-[calc(100%-73px)]">
                                                    <div className="w-full h-40 bg-gray-100 rounded-xl mb-4 flex items-center justify-center text-gray-300 overflow-hidden">
                                                        {selectedProduct.image ? (
                                                            <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                        )}
                                                    </div>
                                                    <p className="text-gray-600 text-sm mb-4">{selectedProduct.description}</p>
                                                    <div className="space-y-2 mb-4">
                                                        <p className="text-sm text-gray-700"><span className="font-semibold">Farm:</span> {selectedProduct.farm}</p>
                                                        {selectedProduct.specs && <p className="text-sm text-gray-700"><span className="font-semibold">Specs:</span> {selectedProduct.specs.join(', ')}</p>}
                                                    </div>
                                                    <div className="flex items-center justify-between mt-4">
                                                        <p className="text-xl font-bold text-gray-900">Rp {selectedProduct.price.toLocaleString()} <span className="text-sm font-normal text-gray-500">/{selectedProduct.unit}</span></p>
                                                        <button
                                                            onClick={() => {
                                                                if (!user) {
                                                                    requireAuth(() => { });
                                                                    return;
                                                                }
                                                                addToCart({
                                                                    id: selectedProduct.id,
                                                                    name: selectedProduct.name,
                                                                    price: selectedProduct.price,
                                                                    unit: selectedProduct.unit,
                                                                    image: selectedProduct.image,
                                                                    farm: selectedProduct.farm,
                                                                    quantity: 1
                                                                });
                                                                // Removed alert per requirements or keep for feedback? 
                                                                // Keeping simple feedback as requested in previous turn "verified verification" plan said "Verify badge update". 
                                                                // User didn't explicitly say remove alert, but usually better UX to just update badge.
                                                                // I'll leave a small toast or just rely on badge. 
                                                                // Actually, the original request didn't specify feedback mechanism, but I'll stick to badge update.
                                                                setSelectedProduct(null);
                                                            }}
                                                            className="px-4 py-2 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition"
                                                        >
                                                            Add to Cart
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* OTHER TABS */}
                        {activeTab === 'find_produce' && (
                            // --- FIND PRODUCE MODE (Visual Marketplace) ---
                            <div className="flex-1 flex flex-col md:flex-row overflow-hidden w-full h-full">
                                {/* Marketplace Grid (Center/Left) */}
                                <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-8 relative">
                                    <div className="max-w-5xl mx-auto">
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h2 className="text-2xl font-bold text-gray-800">Fresh Local Produce</h2>
                                                <p className="text-gray-500 text-sm">Sourced directly from nearby vertical farms.</p>
                                            </div>
                                            {/* Chat Toggle / Filter could go here */}
                                        </div>

                                        {/* Produce Grid */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                                            {[
                                                { id: '1', name: 'Organic Red Tomatoes', price: 25000, unit: 'kg', plyt: '25', image: '/assets/images/store/cherry_tomatoes.png', description: 'Sweet, vine-ripened tomatoes grown in pesticide-free soil.', specs: ['Vitamin C Rich', 'Vine Ripened'], farm: 'Sunrise Farm', growMethod: 'Soil' },
                                                { id: '2', name: 'Fresh Thai Basil', price: 15000, unit: 'bundle', plyt: '15', image: '/assets/images/store/thai_basil_seeds.png', description: 'Aromatic basil perfect for cooking.', specs: ['Rich Aroma', 'Hydroponic'], farm: 'GreenTech', growMethod: 'Hydroponics' },
                                                { id: '3', name: 'Curly Kale', price: 35000, unit: 'kg', plyt: '35', image: '/assets/images/store/organic_kale.png', description: 'Crunchy, nutrient-dense kale leaves.', specs: ['Superfood', 'Organic'], farm: 'Ubud Organics', growMethod: 'Organic' },
                                                { id: '4', name: 'Sweet Potatoes', price: 18000, unit: 'kg', plyt: '18', image: '/assets/images/systems/gallery_harvest.png', description: 'Purple sweet potatoes, high in antioxidants.', specs: ['High Fiber', 'Local'], farm: 'Bali Root', growMethod: 'Traditional' },
                                                { id: '5', name: 'Bok Choy', price: 12000, unit: 'bundle', plyt: '12', image: '/assets/images/store/bok_choy.png', description: 'Crisp and tender, ideal for stir-fries.', specs: ['Hydroponic', 'Pesticide-Free'], farm: 'CityGreens', growMethod: 'Hydroponics' },
                                                { id: '6', name: 'Red Spinach', price: 14000, unit: 'bundle', plyt: '14', image: '/assets/images/store/red_spinach.png', description: 'Nutrient-rich red spinach leaves.', specs: ['Iron Rich', 'Local'], farm: 'Sunrise Farm', growMethod: 'Soil' },
                                            ].map((product) => (
                                                <div key={product.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group flex flex-col">
                                                    <div
                                                        className="aspect-[4/3] bg-gray-100 relative cursor-pointer overflow-hidden"
                                                        onClick={() => setSelectedProduct({ ...product, quantity: 1 } as any)}
                                                    >
                                                        {product.image ? (
                                                            <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                        ) : (
                                                            <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                                                                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                            </div>
                                                        )}
                                                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold text-green-700 shadow-sm">
                                                            {product.plyt} PLYT
                                                        </div>
                                                    </div>
                                                    <div className="p-4 flex-1 flex flex-col">
                                                        <div className="mb-2">
                                                            <h3 className="font-bold text-gray-900 group-hover:text-green-700 transition-colors cursor-pointer" onClick={() => setSelectedProduct({ ...product, quantity: 1 } as any)}>{product.name}</h3>
                                                            <p className="text-xs text-gray-500">{product.farm}</p>
                                                        </div>
                                                        <div className="mt-auto flex items-center justify-between">
                                                            <p className="font-semibold text-gray-900">Rp {product.price.toLocaleString()} <span className="text-xs text-gray-400 font-normal">/{product.unit}</span></p>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setProduceItems(prev => {
                                                                        const existing = prev.find(p => p.id === product.id);
                                                                        if (existing) {
                                                                            return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
                                                                        }
                                                                        return [...prev, { ...product as any, quantity: 1 }];
                                                                    });
                                                                }}
                                                                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-green-600 hover:text-white transition-all shadow-sm"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Chat Overlay Hint */}
                                        {(chatHistory['find_produce'] || []).length > 1 && (
                                            <div className="bg-green-50 rounded-xl p-4 mb-6 border border-green-100 flex items-start gap-3">
                                                <div className="p-2 bg-green-100 rounded-lg text-green-600">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-green-900 font-medium">Assistant Suggestion:</p>
                                                    <p className="text-sm text-green-800 mt-1">
                                                        {(chatHistory['find_produce'] || []).slice(-1)[0].content}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Produce Panel (Cart) */}
                                <div className={`w-full md:w-80 shrink-0 border-t md:border-t-0 md:border-l border-gray-100 bg-white flex flex-col transition-all duration-300 overflow-hidden relative ${isPanelOpen ? 'h-80' : 'h-14'} md:h-auto z-20 shadow-[-5px_0_15px_rgba(0,0,0,0.02)]`}>
                                    <div
                                        className="p-4 border-b border-gray-100 bg-white flex justify-between items-center cursor-pointer md:cursor-default"
                                        onClick={() => setIsPanelOpen(!isPanelOpen)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Your Cart</h3>
                                            <svg className={`w-4 h-4 text-gray-400 transition-transform md:hidden ${isPanelOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                                        </div>
                                        <span className="bg-green-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">{produceItems.length}</span>
                                    </div>

                                    <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3 pb-20">
                                        {produceItems.length === 0 ? (
                                            <div className="text-center py-10 opacity-40">
                                                <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                                                <p className="text-xs text-gray-400">Suggesting locally available produce...</p>
                                            </div>
                                        ) : (
                                            produceItems.map((item) => (
                                                <motion.div
                                                    key={item.id}
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm flex gap-3 group hover:border-green-200 transition-colors"
                                                >
                                                    {/* Image/Icon */}
                                                    <div
                                                        className="w-16 h-16 rounded-lg bg-gray-100 shrink-0 overflow-hidden relative cursor-pointer"
                                                        onClick={() => setSelectedProduct(item)}
                                                    >
                                                        {item.image ? (
                                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                                                        <div>
                                                            <h4
                                                                className="text-sm font-bold text-gray-800 cursor-pointer hover:text-green-600 truncate"
                                                                onClick={() => setSelectedProduct(item)}
                                                            >
                                                                {item.name}
                                                            </h4>
                                                            <p className="text-[10px] text-gray-400 truncate">{item.farm} • {item.growMethod}</p>
                                                        </div>

                                                        <div className="flex items-center justify-between mt-2">
                                                            <p className="text-xs font-semibold text-gray-600">Rp {item.price.toLocaleString()} <span className="text-[9px] font-normal text-gray-400">/{item.unit}</span></p>

                                                            {/* Qty Controls */}
                                                            <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 h-6">
                                                                <button
                                                                    onClick={() => updateQuantity(setProduceItems, item.id, -1)}
                                                                    className="px-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-l-lg transition h-full flex items-center"
                                                                >
                                                                    -
                                                                </button>
                                                                <span className="text-xs font-bold text-gray-700 w-6 text-center">{item.quantity}</span>
                                                                <button
                                                                    onClick={() => updateQuantity(setProduceItems, item.id, 1)}
                                                                    className="px-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-r-lg transition h-full flex items-center"
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))
                                        )}
                                    </div>

                                    {/* Total Price Footer */}
                                    {produceItems.length > 0 && (
                                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] z-10">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Estimated</span>
                                                <span className="text-lg font-bold text-gray-900">Rp {produceTotal.toLocaleString()}</span>
                                            </div>
                                            <button
                                                onClick={() => requireAuth(() => alert('Proceeding to checkout with Farmers...'))}
                                                className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm shadow-sm transition active:scale-95"
                                            >
                                                Connect with Farmers
                                            </button>
                                        </div>
                                    )}

                                    {/* Product Detail Popup Overlay */}
                                    <AnimatePresence>
                                        {selectedProduct && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="absolute inset-0 bg-black/20 backdrop-blur-[1px] z-50 flex justify-end"
                                                onClick={() => setSelectedProduct(null)}
                                            >
                                                <motion.div
                                                    initial={{ x: '100%' }}
                                                    animate={{ x: 0 }}
                                                    exit={{ x: '100%' }}
                                                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                                                    className="w-full md:w-96 bg-white h-full shadow-lg relative"
                                                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                                                >
                                                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                                        <h3 className="text-lg font-bold text-gray-800">{selectedProduct.name}</h3>
                                                        <button onClick={() => setSelectedProduct(null)} className="text-gray-400 hover:text-gray-600">
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                    <div className="p-6 overflow-y-auto h-[calc(100%-73px)]"> {/* Adjust height based on header */}
                                                        {/* Product Image/Placeholder */}
                                                        <div className="w-full h-40 bg-gray-100 rounded-xl mb-4 flex items-center justify-center text-gray-300 overflow-hidden">
                                                            {selectedProduct.image ? (
                                                                <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                            )}
                                                        </div>
                                                        <p className="text-gray-600 text-sm mb-4">{selectedProduct.description}</p>
                                                        <div className="space-y-2 mb-4">
                                                            <p className="text-sm text-gray-700"><span className="font-semibold">Farm:</span> {selectedProduct.farm}</p>
                                                            <p className="text-sm text-gray-700"><span className="font-semibold">Grow Method:</span> {selectedProduct.growMethod}</p>
                                                            {selectedProduct.specs && selectedProduct.specs.length > 0 && (
                                                                <p className="text-sm text-gray-700"><span className="font-semibold">Specs:</span> {selectedProduct.specs.join(', ')}</p>
                                                            )}
                                                            {selectedProduct.material && (
                                                                <p className="text-sm text-gray-700"><span className="font-semibold">Material:</span> {selectedProduct.material}</p>
                                                            )}
                                                            {selectedProduct.artisan && (
                                                                <p className="text-sm text-gray-700"><span className="font-semibold">Artisan:</span> {selectedProduct.artisan}</p>
                                                            )}
                                                            {selectedProduct.impactScore && (
                                                                <p className="text-sm text-gray-700"><span className="font-semibold">Impact Score:</span> {selectedProduct.impactScore}</p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center justify-between mt-4">
                                                            <p className="text-xl font-bold text-gray-900">Rp {selectedProduct.price.toLocaleString()} <span className="text-sm font-normal text-gray-500">/{selectedProduct.unit}</span></p>
                                                            <button
                                                                onClick={() => requireAuth(() => alert(`Added ${selectedProduct.name} to cart!`))}
                                                                className="px-4 py-2 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition"
                                                            >
                                                                Add to Cart
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        )}

                        {activeTab === 'pick_system' && (
                            // --- PICK SYSTEM MODE (Split with Side Panel) ---
                            <div className="flex-1 flex flex-col md:flex-row overflow-hidden w-full h-full">
                                {/* Marketplace Grid (Center/Left) */}
                                <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-8 relative">
                                    <div className="max-w-5xl mx-auto">
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h2 className="text-2xl font-bold text-gray-800">Grow Systems & Containers</h2>
                                                <p className="text-gray-500 text-sm">Find the perfect setup for your space.</p>
                                            </div>
                                        </div>

                                        {/* Systems Grid */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                                            {[
                                                { id: 's1', name: 'Urban Shelf System', price: 1500000, unit: 'unit', plyt: '1500', image: '/assets/images/systems/shelf_system.png', description: 'Compact vertical shelf system for indoor growing.', specs: ['4 Tiers', 'LED Lights'], farm: 'UrbanGrow', growMethod: 'Hydroponic' },
                                                { id: 's2', name: 'Hydro Tower Green', price: 2200000, unit: 'unit', plyt: '2200', image: '/assets/images/systems/tower_system_green.png', description: 'Space-saving vertical tower with 24 planting sites.', specs: ['24 Sites', 'Auto-Watering'], farm: 'VertiTech', growMethod: 'Aeroponic' },
                                                { id: 's3', name: 'Hydro Tower Pro', price: 2500000, unit: 'unit', plyt: '2500', image: '/assets/images/systems/tower_system_white.png', description: 'Professional grade tower system for maximum yield.', specs: ['36 Sites', 'High Efficiency'], farm: 'VertiTech', growMethod: 'Aeroponic' },
                                                { id: 's4', name: 'Premium Indoor Tower', price: 3500000, unit: 'unit', plyt: '3500', image: '/assets/images/systems/tower_system_indoor.png', description: 'Elegant indoor tower system that fits any decor.', specs: ['Premium Finish', 'Silent Pump'], farm: 'LuxeGrow', growMethod: 'Hydroponic' },
                                                { id: 's5', name: 'Living Wall System', price: 1800000, unit: 'unit', plyt: '1800', image: '/assets/images/systems/wall_system.png', description: 'Modular wall system for vertical gardening.', specs: ['Modular', 'Expandable'], farm: 'GreenWall', growMethod: 'Soil/Hydro' },
                                            ].map((product) => (
                                                <div key={product.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group flex flex-col">
                                                    <div
                                                        className="aspect-[3/4] bg-gray-100 relative cursor-pointer overflow-hidden"
                                                        onClick={() => setSelectedProduct({ ...product, quantity: 1 } as any)}
                                                    >
                                                        {product.image ? (
                                                            <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                        ) : (
                                                            <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                                                                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                                            </div>
                                                        )}
                                                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold text-green-700 shadow-sm">
                                                            {product.plyt} PLYT
                                                        </div>
                                                    </div>
                                                    <div className="p-4 flex-1 flex flex-col">
                                                        <div className="mb-2">
                                                            <h3 className="font-bold text-gray-900 group-hover:text-green-700 transition-colors cursor-pointer" onClick={() => setSelectedProduct({ ...product, quantity: 1 } as any)}>{product.name}</h3>
                                                            <p className="text-xs text-gray-500">{product.specs.join(' • ')}</p>
                                                        </div>
                                                        <div className="mt-auto flex items-center justify-between">
                                                            <p className="font-semibold text-gray-900">Rp {product.price.toLocaleString()} <span className="text-xs text-gray-400 font-normal">/{product.unit}</span></p>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSystemItems(prev => {
                                                                        const existing = prev.find(p => p.id === product.id);
                                                                        if (existing) {
                                                                            return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
                                                                        }
                                                                        return [...prev, { ...product as any, quantity: 1 }];
                                                                    });
                                                                }}
                                                                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-green-600 hover:text-white transition-all shadow-sm"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Chat Overlay Hint */}
                                        {(chatHistory['pick_system'] || []).length > 1 && (
                                            <div className="bg-green-50 rounded-xl p-4 mb-6 border border-green-100 flex items-start gap-3">
                                                <div className="p-2 bg-green-100 rounded-lg text-green-600">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-green-900 font-medium">Assistant Suggestion:</p>
                                                    <p className="text-sm text-green-800 mt-1">
                                                        {(chatHistory['pick_system'] || []).slice(-1)[0].content}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* System/Container Panel (Right/Bottom) */}
                                <div className={`w-full md:w-96 shrink-0 border-t md:border-t-0 md:border-l border-gray-100 bg-gray-50/50 flex flex-col transition-all duration-300 overflow-hidden relative ${isPanelOpen ? 'h-80' : 'h-14'} md:h-auto`}>
                                    <div
                                        className="p-4 border-b border-gray-100 bg-white/50 backdrop-blur-sm flex justify-between items-center cursor-pointer md:cursor-default"
                                        onClick={() => setIsPanelOpen(!isPanelOpen)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Selected Systems</h3>
                                            <svg className={`w-4 h-4 text-gray-400 transition-transform md:hidden ${isPanelOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                                        </div>
                                        <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">{systemItems.length + containerItems.length} Items</span>
                                    </div>

                                    <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3 pb-20">
                                        {systemItems.length === 0 && containerItems.length === 0 ? (
                                            <div className="text-center py-10 opacity-40">
                                                <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                                <p className="text-xs text-gray-400">Suggesting growing systems & containers...</p>
                                            </div>
                                        ) : (
                                            <>
                                                {systemItems.map((item) => (
                                                    <motion.div
                                                        key={item.id}
                                                        initial={{ opacity: 0, x: 20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm flex gap-3 group hover:border-green-200 transition-colors"
                                                    >
                                                        {/* Image/Icon */}
                                                        <div
                                                            className="w-16 h-16 rounded-lg bg-gray-100 shrink-0 overflow-hidden relative cursor-pointer"
                                                            onClick={() => setSelectedProduct(item)}
                                                        >
                                                            {item.image ? (
                                                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                                                            <div>
                                                                <h4
                                                                    className="text-sm font-bold text-gray-800 cursor-pointer hover:text-green-600 truncate"
                                                                    onClick={() => setSelectedProduct(item)}
                                                                >
                                                                    {item.name}
                                                                </h4>
                                                                <p className="text-[10px] text-gray-400 truncate">{item.farm} • {item.growMethod}</p>
                                                            </div>

                                                            <div className="flex items-center justify-between mt-2">
                                                                <p className="text-xs font-semibold text-gray-600">Rp {item.price.toLocaleString()} <span className="text-[9px] font-normal text-gray-400">/{item.unit}</span></p>

                                                                {/* Qty Controls */}
                                                                <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 h-6">
                                                                    <button
                                                                        onClick={() => updateQuantity(setSystemItems, item.id, -1)}
                                                                        className="px-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-l-lg transition h-full flex items-center"
                                                                    >
                                                                        -
                                                                    </button>
                                                                    <span className="text-xs font-bold text-gray-700 w-6 text-center">{item.quantity}</span>
                                                                    <button
                                                                        onClick={() => updateQuantity(setSystemItems, item.id, 1)}
                                                                        className="px-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-r-lg transition h-full flex items-center"
                                                                    >
                                                                        +
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                                {containerItems.map((item) => (
                                                    <motion.div
                                                        key={item.id}
                                                        initial={{ opacity: 0, x: 20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm flex gap-3 group hover:border-green-200 transition-colors"
                                                    >
                                                        {/* Image/Icon */}
                                                        <div
                                                            className="w-16 h-16 rounded-lg bg-gray-100 shrink-0 overflow-hidden relative cursor-pointer"
                                                            onClick={() => setSelectedProduct(item)}
                                                        >
                                                            <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7m-9 4h9" /></svg>
                                                            </div>
                                                        </div>

                                                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                                                            <div>
                                                                <h4
                                                                    className="text-sm font-bold text-gray-800 cursor-pointer hover:text-green-600 truncate"
                                                                    onClick={() => setSelectedProduct(item)}
                                                                >
                                                                    {item.name}
                                                                </h4>
                                                                <p className="text-[10px] text-gray-400 truncate">{item.farm} • {item.growMethod}</p>
                                                            </div>

                                                            <div className="flex items-center justify-between mt-2">
                                                                <p className="text-xs font-semibold text-gray-600">Rp {item.price.toLocaleString()} <span className="text-[9px] font-normal text-gray-400">/{item.unit}</span></p>

                                                                {/* Qty Controls */}
                                                                <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 h-6">
                                                                    <button
                                                                        onClick={() => updateQuantity(setContainerItems, item.id, -1)}
                                                                        className="px-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-l-lg transition h-full flex items-center"
                                                                    >
                                                                        -
                                                                    </button>
                                                                    <span className="text-xs font-bold text-gray-700 w-6 text-center">{item.quantity}</span>
                                                                    <button
                                                                        onClick={() => updateQuantity(setContainerItems, item.id, 1)}
                                                                        className="px-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-r-lg transition h-full flex items-center"
                                                                    >
                                                                        +
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </>
                                        )}
                                    </div>

                                    {/* Total Price Footer */}
                                    {(systemItems.length > 0 || containerItems.length > 0) && (
                                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] z-10">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Estimated</span>
                                                <span className="text-lg font-bold text-gray-900">Rp {systemTotal.toLocaleString()}</span>
                                            </div>
                                            <button
                                                onClick={() => requireAuth(() => alert('Building your custom system...'))}
                                                className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm shadow-sm transition active:scale-95"
                                            >
                                                Build My System
                                            </button>
                                        </div>
                                    )}

                                    {/* Product Detail Popup Overlay */}
                                    <AnimatePresence>
                                        {selectedProduct && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="absolute inset-0 bg-black/20 backdrop-blur-[1px] z-50 flex justify-end"
                                                onClick={() => setSelectedProduct(null)}
                                            >
                                                <motion.div
                                                    initial={{ x: '100%' }}
                                                    animate={{ x: 0 }}
                                                    exit={{ x: '100%' }}
                                                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                                                    className="w-full md:w-96 bg-white h-full shadow-lg relative"
                                                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                                                >
                                                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                                        <h3 className="text-lg font-bold text-gray-800">{selectedProduct.name}</h3>
                                                        <button onClick={() => setSelectedProduct(null)} className="text-gray-400 hover:text-gray-600">
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                    <div className="p-6 overflow-y-auto h-[calc(100%-73px)]"> {/* Adjust height based on header */}
                                                        {/* Product Image/Placeholder */}
                                                        <div className="w-full h-40 bg-gray-100 rounded-xl mb-4 flex items-center justify-center text-gray-300">
                                                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                                        </div>
                                                        <p className="text-gray-600 text-sm mb-4">{selectedProduct.description}</p>
                                                        <div className="space-y-2 mb-4">
                                                            <p className="text-sm text-gray-700"><span className="font-semibold">Farm:</span> {selectedProduct.farm}</p>
                                                            <p className="text-sm text-gray-700"><span className="font-semibold">Grow Method:</span> {selectedProduct.growMethod}</p>
                                                            {selectedProduct.specs && selectedProduct.specs.length > 0 && (
                                                                <p className="text-sm text-gray-700"><span className="font-semibold">Specs:</span> {selectedProduct.specs.join(', ')}</p>
                                                            )}
                                                            {selectedProduct.material && (
                                                                <p className="text-sm text-gray-700"><span className="font-semibold">Material:</span> {selectedProduct.material}</p>
                                                            )}
                                                            {selectedProduct.artisan && (
                                                                <p className="text-sm text-gray-700"><span className="font-semibold">Artisan:</span> {selectedProduct.artisan}</p>
                                                            )}
                                                            {selectedProduct.impactScore && (
                                                                <p className="text-sm text-gray-700"><span className="font-semibold">Impact Score:</span> {selectedProduct.impactScore}</p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center justify-between mt-4">
                                                            <p className="text-xl font-bold text-gray-900">Rp {selectedProduct.price.toLocaleString()} <span className="text-sm font-normal text-gray-500">/{selectedProduct.unit}</span></p>
                                                            <button
                                                                onClick={() => requireAuth(() => alert(`Added ${selectedProduct.name} to cart!`))}
                                                                className="px-4 py-2 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition"
                                                            >
                                                                Add to Cart
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        )
                        }

                        {
                            activeTab === 'learn' && (
                                activeLesson ? (
                                    // --- VIEW LESSON MODE ---
                                    <div className="flex-1 flex overflow-hidden w-full h-full p-6 md:p-10 bg-white">
                                        <article className="prose max-w-4xl mx-auto w-full">
                                            <button
                                                onClick={() => setActiveLesson(null)}
                                                className="mb-6 flex items-center text-sm text-green-600 hover:text-green-700 font-medium"
                                            >
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                                Back to Chat
                                            </button>
                                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{activeLesson.title}</h1>
                                            <p className="text-gray-400 text-sm mb-6">Saved on {activeLesson.date}</p>

                                            <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-100/50 space-y-4 shadow-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                                {activeLesson.content}
                                            </div>
                                        </article>
                                    </div>
                                ) : (
                                    // --- LEARN MODE (Chat + Notes Split Layout) ---
                                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden w-full h-full">
                                        {/* Left: Chat Area */}
                                        <div className="flex-1 flex flex-col relative border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50/30 min-h-0">
                                            <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-6 space-y-4">
                                                {chatHistory['learn'].map((msg, idx) => (
                                                    <motion.div
                                                        key={idx}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className={`flex w-full mb-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                                    >
                                                        <div className={`max-w-[90%] rounded-2xl px-4 py-3 shadow-sm ${msg.role === 'user'
                                                            ? 'bg-green-600 text-white rounded-br-none'
                                                            : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'
                                                            }`}>
                                                            {msg.role === 'assistant' ? (
                                                        <div
                                                            className="leading-relaxed text-sm"
                                                            onClick={handleAssistantMessageClick}
                                                            dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(linkSuggestedPlaceMentions(stripPanelPlaceLinks(normalizeSuggestedPlaceLinks(msg.content, suggestedPlaces), suggestedPlaces), [])) }}
                                                        />
                                                            ) : (
                                                                <p className="leading-relaxed whitespace-pre-wrap text-sm">{msg.content}</p>
                                                            )}

                                                            {/* Render Steps if available */}
                                                            {msg.steps && (
                                                                <ul className="mt-3 space-y-2">
                                                                    {msg.steps.map((step, sIdx) => (
                                                                        <li key={sIdx} className="flex items-start text-sm bg-green-50/50 p-2 rounded-lg">
                                                                            <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-green-100 text-green-700 text-xs font-bold rounded-full mr-2">
                                                                                {sIdx + 1}
                                                                            </span>
                                                                            <span>{step}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            )}

                                                            {/* Render Image if available */}
                                                            {msg.image && (
                                                                <div className="mt-3 rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                                                                    <img src={msg.image} alt="Response visual" className="w-full h-auto object-cover max-h-48" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                ))}
                                                <div ref={messagesEndRef} />
                                            </div>
                                            {/* Chat Input for Learn Mode */}
                                            <div className="p-4 bg-white border-t border-gray-100">
                                                <div className="relative shadow-sm bg-gray-50 border border-gray-200 rounded-2xl">
                                                    <textarea
                                                        value={prompt}
                                                        onChange={(e) => setPrompt(e.target.value)}
                                                        onKeyDown={handleKeyDown}
                                                        placeholder="Ask about growing..."
                                                        className="w-full pl-4 pr-12 py-3 rounded-2xl resize-none focus:outline-none focus:bg-white focus:ring-2 focus:ring-green-500/50 bg-transparent text-gray-700 placeholder:text-gray-400 text-sm"
                                                        rows={1}
                                                        style={{ minHeight: '48px' }}
                                                    />
                                                    <button
                                                        onClick={() => handleSend()}
                                                        disabled={!prompt.trim()}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50 transition"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Notes Panel */}
                                        <div className={`w-full md:w-80 shrink-0 bg-white border-l border-gray-100 flex flex-col shadow-[0_0_15px_rgba(0,0,0,0.03)] z-10 md:static transition-all duration-300 overflow-hidden ${isPanelOpen ? 'h-80' : 'h-14'} md:h-auto`}>
                                            <div
                                                className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 cursor-pointer md:cursor-default"
                                                onClick={() => setIsPanelOpen(!isPanelOpen)}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Start Notes</h3>
                                                    <svg className={`w-4 h-4 text-gray-400 transition-transform md:hidden ${isPanelOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleSaveLesson(); }}
                                                    title="Save to Lessons"
                                                    className="w-8 h-8 flex items-center justify-center bg-green-100 text-green-700 rounded-full hover:bg-green-600 hover:text-white transition-all shadow-sm"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} className="w-5 h-5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
                                                {notes.length === 0 ? (
                                                    <div className="text-center py-10 opacity-40">
                                                        <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                        <p className="text-sm text-gray-400">Highlights from your chat will appear here.</p>
                                                    </div>
                                                ) : (
                                                    notes.map((note, idx) => (
                                                        <div key={idx} className="p-3 bg-yellow-50 rounded-xl border border-yellow-100 text-sm text-gray-700 shadow-sm relative group">
                                                            <div className="absolute -left-1 top-4 w-2 h-2 rounded-full bg-yellow-400"></div>
                                                            <p className="pl-2">{note}</p>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            )
                        }

                    </div>

                    {/* Main Chat Input Area (Hidden in Learn Mode, Visible in Home/Find/Pick) */}
                    {
                        activeTab !== 'learn' && activeTab !== 'about_you' && activeTab !== 'living_library' && activeTab !== 'home' && (
                            <div
                                className={`${isMainChatTab
                                    ? 'fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/92 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur md:px-6 md:pb-[calc(env(safe-area-inset-bottom)+1rem)]'
                                    : 'shrink-0 z-10 p-4 md:p-6 bg-white border-t border-gray-100 transition-all duration-500'}`
                                }
                            >
                                <div className={`mx-auto max-w-3xl transition-all duration-500 relative shadow-xl bg-white border border-gray-200 rounded-3xl ${isMainChatTab ? 'ring-1 ring-white/80' : ''}`}>
                                    <textarea
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder={user ? 'Type your message...' : 'Sign in to start a personalized search...'}
                                        className="w-full pl-6 pr-14 py-4 rounded-3xl resize-none focus:outline-none focus:ring-2 focus:ring-green-500/50 bg-transparent text-gray-700 placeholder:text-gray-400"
                                        rows={1}
                                        style={{ minHeight: '60px' }}
                                    />
                                    <button
                                        onClick={() => handleSend()}
                                        disabled={!prompt.trim() || isLoading}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50 transition shadow-md"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )
                    }

                    {isGroceryListModalOpen && activeGroceryBundle ? (
                        <div className="fixed inset-x-0 bottom-0 top-[calc(4rem+env(safe-area-inset-top))] z-50 bg-black/30 backdrop-blur-sm sm:inset-0 sm:flex sm:items-center sm:justify-center sm:px-4 sm:py-6">
                            <div className="flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-t-[2rem] border border-gray-200 bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:rounded-[2rem]">
                                <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-4 py-4 sm:px-6 sm:py-5">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-600">Recipe Companion</p>
                                        <h3 className="mt-2 text-2xl font-bold text-gray-900">{activeGroceryBundle.title}</h3>
                                        <p className="mt-2 text-sm text-gray-500">
                                            Build your grocery checklist from the recipe, then use the suggestions panel to review `Premium Findings` or choose `Search by Google`.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsGroceryListModalOpen(false)}
                                        className="rounded-full border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-500 transition hover:bg-gray-50"
                                    >
                                        Close
                                    </button>
                                </div>

                                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                                    <div className="rounded-3xl border border-amber-100 bg-amber-50/60 p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Grocery list</p>
                                            <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                                                {activeGroceryBundle.items.filter((item) => item.checked).length}/{activeGroceryBundle.items.length} selected
                                            </span>
                                        </div>
                                        <div className="mt-4 space-y-2">
                                            {activeGroceryBundle.items.length > 0 ? (
                                                activeGroceryBundle.items.map((item) => (
                                                    <label
                                                        key={item.id}
                                                        className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                                                            item.checked
                                                                ? 'border-green-200 bg-green-50'
                                                                : 'border-white bg-white/90 hover:border-amber-200'
                                                        }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={item.checked}
                                                            onChange={() => { if (activeGroceryBundleKey) { toggleGroceryItemChecked(activeGroceryBundleKey, item.id); } }}
                                                            className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                                        />
                                                        <div className="min-w-0">
                                                            <p className={`text-sm font-semibold ${item.checked ? 'text-green-800 line-through' : 'text-gray-900'}`}>
                                                                {item.display || item.name}
                                                            </p>
                                                            {!item.display || item.display === item.name ? null : (
                                                                <p className="mt-1 text-xs text-gray-500">{item.name}</p>
                                                            )}
                                                        </div>
                                                    </label>
                                                ))
                                            ) : (
                                                <div className="rounded-2xl border border-dashed border-amber-200 bg-white/80 px-4 py-4 text-sm text-gray-500">
                                                    No structured ingredients were extracted from this recipe yet.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-4 sm:flex-row sm:justify-end sm:px-6 sm:py-5">
                                    <button
                                        type="button"
                                        onClick={() => setIsGroceryListModalOpen(false)}
                                        className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-50"
                                    >
                                        Close
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => requireAuth(() => { void handleSaveActiveGroceryListChat(); })}
                                        disabled={isSavingChatDocument}
                                        className="rounded-2xl border border-green-200 bg-green-50 px-5 py-3 text-sm font-bold text-green-700 transition hover:border-green-300 hover:bg-green-100 disabled:opacity-60"
                                    >
                                        {isSavingChatDocument ? 'Saving...' : 'Save list'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsPanelOpen(true)}
                                        className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-amber-600"
                                    >
                                        View sourcing panel
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {isSaveChatModalOpen ? (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6 backdrop-blur-sm">
                            <div className="w-full max-w-2xl rounded-[2rem] border border-gray-200 bg-white p-6 shadow-2xl">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-green-600">Knowledge Bank</p>
                                        <h3 className="mt-2 text-2xl font-bold text-gray-900">Save chat response</h3>
                                        <p className="mt-2 text-sm text-gray-500">Save the full response or the highlighted excerpt as Markdown plus structured JSON.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={closeSaveChatModal}
                                        className="rounded-full border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-500 transition hover:bg-gray-50"
                                    >
                                        Close
                                    </button>
                                </div>

                                <div className="mt-5 space-y-4">
                                    {chatSaveSelectionText ? (
                                        <div>
                                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">Save mode</p>
                                            <div className="grid gap-2 sm:grid-cols-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setChatSaveMode('selection')}
                                                    className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${chatSaveMode === 'selection' ? 'border-green-300 bg-green-50 text-green-800' : 'border-gray-200 bg-white text-gray-600'}`}
                                                >
                                                    <p className="font-bold">Selected excerpt</p>
                                                    <p className="mt-1 text-xs">Save only the text you highlighted in the response.</p>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setChatSaveMode('full')}
                                                    className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${chatSaveMode === 'full' ? 'border-green-300 bg-green-50 text-green-800' : 'border-gray-200 bg-white text-gray-600'}`}
                                                >
                                                    <p className="font-bold">Full response</p>
                                                    <p className="mt-1 text-xs">Save the entire assistant message with original markdown formatting.</p>
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">Category</p>
                                            <select
                                                value={chatSaveCategoryId}
                                                onChange={(e) => setChatSaveCategoryId(e.target.value)}
                                                disabled={isLoadingKnowledgeBankCategories}
                                                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-green-500"
                                            >
                                                <option value="">{isLoadingKnowledgeBankCategories ? 'Loading categories...' : 'Select a category'}</option>
                                                {knowledgeBankCategories.map((category) => (
                                                    <option key={category.id} value={category.id}>
                                                        {category.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">Title</p>
                                            <input
                                                type="text"
                                                value={chatSaveTitle}
                                                onChange={(e) => setChatSaveTitle(e.target.value)}
                                                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-green-500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">Description</p>
                                        <textarea
                                            value={chatSaveDescription}
                                            onChange={(e) => setChatSaveDescription(e.target.value)}
                                            className="min-h-24 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-green-500"
                                        />
                                    </div>

                                    <div>
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">Tags</p>
                                        <input
                                            type="text"
                                            value={chatSaveTags}
                                            onChange={(e) => setChatSaveTags(e.target.value)}
                                            placeholder="recipe, anti inflammatory, breakfast"
                                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-green-500"
                                        />
                                    </div>

                                    <div>
                                        <div className="mb-2 flex items-center justify-between gap-3">
                                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">Preview</p>
                                            <p className="text-xs font-medium text-gray-400">
                                                {chatSaveMode === 'selection' && chatSaveSelectionText ? 'Excerpt' : 'Full response'}
                                            </p>
                                        </div>
                                        <div className="max-h-64 overflow-y-auto rounded-3xl border border-gray-200 bg-gray-50 px-4 py-4">
                                            <div
                                                className="prose prose-sm max-w-none text-gray-700"
                                                dangerouslySetInnerHTML={{
                                                    __html: renderMarkdownToHtml(
                                                        chatSaveMode === 'selection' && chatSaveSelectionText
                                                            ? chatSaveSelectionText
                                                            : (chatSaveTargetIndex != null && chatHistory.chat[chatSaveTargetIndex]?.role === 'assistant'
                                                                ? chatHistory.chat[chatSaveTargetIndex].content
                                                                : '')
                                                    )
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                                    <button
                                        type="button"
                                        onClick={closeSaveChatModal}
                                        className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void handleSaveChatResponse()}
                                        disabled={!chatSaveCategoryId || !chatSaveTitle.trim() || isSavingChatDocument}
                                        className="rounded-2xl bg-green-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
                                    >
                                        {isSavingChatDocument ? 'Saving...' : 'Save to Knowledge Bank'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div >
        </div >
    );
}
