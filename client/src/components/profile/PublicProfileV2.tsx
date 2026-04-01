'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatJournalDate, JournalEntry, loadJournalEntries, saveJournalEntries } from '../../lib/journal';
import AboutYouListPanel from './about-you/AboutYouListPanel';
import HerbsModalSection from './about-you/HerbsModalSection';
import SupplementsModalSection from './about-you/SupplementsModalSection';
import { normalizeSupplements, truncateText } from './about-you/helpers';
import { AboutListSection, MealPlanDay, ProduceEntry, RecipeEntry, SupplementEntry, VideoEntry } from './about-you/types';

interface ProfileProps {
    user: any;
    isOwner?: boolean; // Optional prop to determine if the viewer is the profile owner
}

const PRODUCE_LIBRARY: ProduceEntry[] = [
    { id: 1, title: 'Spinach', image: '/assets/images/gallery/spinach.png', nutrients: ['Iron', 'Folate', 'Vitamin K'], benefits: ['Supports energy and oxygen transport', 'Helps maintain healthy bones', 'Easy base for salads and sautés'] },
    { id: 2, title: 'Kale', image: '/assets/images/gallery/organic_kale.png', nutrients: ['Vitamin C', 'Vitamin A', 'Fiber'], benefits: ['Great for immune support', 'Adds satisfying volume to meals', 'Pairs well in soups, smoothies, and salads'] },
    { id: 3, title: 'Cherry Tomatoes', image: '/assets/images/gallery/cherry_tomatoes.png', nutrients: ['Lycopene', 'Vitamin C', 'Potassium'], benefits: ['Bright flavor for bowls and snacks', 'Supports hydration', 'Easy way to add color and antioxidants'] },
    { id: 4, title: 'Basil', image: '/assets/images/gallery/fresh_herbs.png', nutrients: ['Vitamin K', 'Antioxidants', 'Manganese'], benefits: ['Adds flavor without much sodium', 'Freshens sauces and salads', 'Useful for simple herb-forward meals'] },
    { id: 5, title: 'Broccoli', image: '/assets/images/gallery/organic_kale.png', nutrients: ['Vitamin C', 'Fiber', 'Folate'], benefits: ['Supports fullness', 'Great roasted or steamed', 'Easy side for lunch or dinner'] },
    { id: 6, title: 'Bell Peppers', image: '/assets/images/gallery/cherry_tomatoes.png', nutrients: ['Vitamin C', 'Vitamin A', 'B6'], benefits: ['Adds crunch and sweetness', 'Works raw or cooked', 'Good for snacks and stir-fries'] },
    { id: 7, title: 'Cucumber', image: '/assets/images/gallery/spinach.png', nutrients: ['Water', 'Vitamin K', 'Potassium'], benefits: ['Very hydrating', 'Light, cooling snack option', 'Easy to add to salads and wraps'] },
    { id: 8, title: 'Carrots', image: '/assets/images/gallery/cherry_tomatoes.png', nutrients: ['Beta-carotene', 'Fiber', 'Potassium'], benefits: ['Naturally sweet crunch', 'Great for roasting or dipping', 'Helpful when you want a simple snack vegetable'] },
    { id: 9, title: 'Zucchini', image: '/assets/images/gallery/organic_kale.png', nutrients: ['Vitamin C', 'Manganese', 'Water'], benefits: ['Versatile in sautés and bowls', 'Light texture for easy meals', 'Works well with herbs and grilled proteins'] },
    { id: 10, title: 'Mushrooms', image: '/assets/images/gallery/fresh_herbs.png', nutrients: ['Selenium', 'Copper', 'B Vitamins'], benefits: ['Savory, satisfying texture', 'Great for plant-forward meals', 'Adds depth to pasta, bowls, and eggs'] }
];

const INITIAL_SUPPLEMENTS: SupplementEntry[] = [
    {
        id: 1,
        title: 'Magnesium Glycinate',
        image: '/assets/images/gallery/user_avatar.png',
        nutrients: ['Magnesium', 'Glycine'],
        benefits: ['Often used to support relaxation and muscle recovery', 'Can be easier on the stomach than some other forms'],
        notes: 'Commonly taken in the evening.'
    },
    {
        id: 2,
        title: 'Vitamin D3',
        image: '/assets/images/gallery/cherry_tomatoes.png',
        nutrients: ['Vitamin D'],
        benefits: ['Supports bone health', 'Helpful when daily sunlight exposure is low'],
        notes: 'Often paired with a meal containing fat.'
    },
    {
        id: 3,
        title: 'Omega-3',
        image: '/assets/images/gallery/fresh_herbs.png',
        nutrients: ['EPA', 'DHA'],
        benefits: ['Supports heart and brain health', 'Useful when oily fish is not eaten regularly'],
        notes: 'A fish oil or algae-based option can work.'
    }
];

const INITIAL_HERBS: SupplementEntry[] = [
    {
        id: 1,
        title: 'Tulsi',
        image: '/assets/images/gallery/fresh_herbs.png',
        nutrients: ['Eugenol', 'Antioxidants'],
        benefits: ['Often kept around for calming tea blends', 'Easy herbal staple for daily routines'],
        notes: 'Useful as a simple tea or infusion.'
    },
    {
        id: 2,
        title: 'Peppermint',
        image: '/assets/images/gallery/fresh_herbs.png',
        nutrients: ['Menthol', 'Volatile oils'],
        benefits: ['Often used for cooling herbal drinks', 'Helpful to keep on hand for simple digestive support habits'],
        notes: 'Works well fresh or dried.'
    },
    {
        id: 3,
        title: 'Rosemary',
        image: '/assets/images/gallery/fresh_herbs.png',
        nutrients: ['Rosmarinic acid', 'Antioxidants'],
        benefits: ['Good savory herb for cooking', 'Adds aroma and depth to simple meals and infusions'],
        notes: 'Nice for roasted vegetables and broths.'
    }
];

const INITIAL_VIDEO_GALLERY: VideoEntry[] = [
    {
        id: 1,
        title: '5 Anti-Inflammatory Foods That Improve Body Pain!',
        image: 'https://i.ytimg.com/vi/c3MlI45j-rg/hqdefault.jpg',
        channel: 'Dr. Roberto Yano',
        type: 'Wellness',
        link: 'https://www.youtube.com/watch?v=c3MlI45j-rg'
    },
    {
        id: 2,
        title: 'How to Build a Healthy Plate',
        image: 'https://i.ytimg.com/vi/lXXXygDRyBU/hqdefault.jpg',
        channel: 'NutritionFacts.org',
        type: 'Nutrition',
        link: 'https://www.youtube.com/watch?v=lXXXygDRyBU'
    },
];

const USEFUL_LINKS = [
    { id: 1, title: 'Raw Food Starter Guide', link: '#', type: 'Link' },
    { id: 2, title: 'Community Farm Map', link: '#', type: 'Link' },
];

const INITIAL_RECIPES: RecipeEntry[] = [
    {
        id: 1,
        title: 'Fresh Kale Salad',
        image: '/assets/images/gallery/organic_kale.png',
        likes: 124,
        description: 'A crisp, herb-forward salad that works as a light lunch or an easy side.',
        ingredients: ['2 cups chopped kale', '1/2 avocado, sliced', '1/4 cup pumpkin seeds', '1/2 cup cherry tomatoes', 'Lemon olive oil dressing'],
        instructions: ['Massage the kale with a little dressing until tender.', 'Layer in tomatoes, avocado, and pumpkin seeds.', 'Toss again and finish with extra dressing before serving.'],
        tags: ['fresh', 'greens', 'quick']
    },
    {
        id: 2,
        title: 'Tomato Basil Pasta',
        image: '/assets/images/gallery/cherry_tomatoes.png',
        likes: 85,
        description: 'Comforting pasta with bright basil and tomatoes for an easy weeknight dinner.',
        ingredients: ['8 oz pasta', '2 cups cherry tomatoes', '2 cloves garlic', '1/4 cup fresh basil', 'Olive oil', 'Salt and pepper'],
        instructions: ['Cook the pasta until al dente and save a little pasta water.', 'Saute garlic and tomatoes in olive oil until the tomatoes soften.', 'Stir in pasta, basil, and a splash of pasta water, then season to taste.'],
        tags: ['comfort', 'pasta', 'dinner']
    },
];

const PINNED_ARTICLES = [
    { id: 1, title: '10 Anti-Inflammatory Foods to Add This Week', author: 'A. Monroe', link: '#' },
    { id: 2, title: 'How to Build a Realistic Plant-Forward Plate', author: 'J. Patel, RD', link: '#' },
];

const LEARN_GALLERY = USEFUL_LINKS.map((item) => ({
    ...item,
    progress: 'Saved'
}));

const RESOURCES = PINNED_ARTICLES.map((item) => ({
    ...item,
    type: 'Article'
}));

const JOURNAL_PREVIEW_ENTRIES = [
    { id: 1, type: 'image', user: 'Urban Gardener', content: 'Just harvested my first batch of hydroponic lettuce! 🥬 #UrbanFarming #Hydroponics', image: '/assets/images/gallery/organic_kale.png', likes: 24, comments: 5, time: '2h ago' },
    { id: 2, type: 'status', user: 'Urban Gardener', content: 'Thinking about expanding to aquaponics next season. Anyone have experience with Tilapia? 🐟', likes: 12, comments: 8, time: '5h ago' },
    { id: 3, type: 'image', user: 'Urban Gardener', content: 'Beautiful sunset over the community garden today. Grateful for this space.', image: '/assets/images/gallery/community_garden.png', likes: 45, comments: 2, time: '1d ago' },
];

const JOURNAL_WALL_MOCK_ENTRIES: JournalEntry[] = [
    {
        id: 1001,
        entryDate: '2026-03-29',
        content: 'Today felt steadier. I kept lunch simple with greens, roasted vegetables, and enough water through the afternoon, and my energy stayed much more even.',
        imageUrl: '/assets/images/gallery/organic_kale.png',
        tags: ['energy', 'greens', 'routine'],
        createdAt: '2026-03-29T10:15:00.000Z'
    },
    {
        id: 1002,
        entryDate: '2026-03-27',
        content: 'Noticed I tend to crave something salty when I rush through the morning. Slowing down for breakfast helped a lot more than I expected.',
        tags: ['cravings', 'breakfast', 'awareness'],
        createdAt: '2026-03-27T13:00:00.000Z'
    },
    {
        id: 1003,
        entryDate: '2026-03-24',
        content: 'Tried a simple produce restock this week: spinach, mushrooms, cherry tomatoes, and cucumbers. Having easy ingredients around made dinner decisions much easier.',
        imageUrl: '/assets/images/gallery/cherry_tomatoes.png',
        tags: ['shopping', 'meal prep', 'produce'],
        createdAt: '2026-03-24T18:30:00.000Z'
    }
];

function getHiddenJournalExamplesKey(userId: string | number | undefined) {
    return `plyt-journal-hidden-examples:${userId ?? 'guest'}`;
}

function getJournalExampleOverridesKey(userId: string | number | undefined) {
    return `plyt-journal-example-overrides:${userId ?? 'guest'}`;
}

const FAVORITE_MODAL_TITLES: Record<string, string> = {
    favorites_places: 'Favorite Places',
    favorites_chats: 'Favorite Chats',
    favorites_experts: 'Favorite Experts'
};

function extractProfileData(record: any) {
    const rawData = record?.profile_data || {};
    return rawData?.profile_data && typeof rawData.profile_data === 'object'
        ? rawData.profile_data
        : rawData;
}

function extractLegacyFavoritePlaces(profile: any) {
    const candidates =
        profile?.favorite_places ||
        profile?.favorited_places ||
        profile?.saved_places ||
        [];

    return Array.isArray(candidates) ? candidates : [];
}

function createEmptyPlaceVisitForm() {
    return {
        visited_at: getLocalIsoDate(),
        meal_name: '',
        meal_notes: '',
        rating: '',
        body_response: '',
        liked_it: '',
        would_repeat: '',
        keep_as_favorite: ''
    };
}

function visitToFormState(visit: any) {
    return {
        visited_at: visit?.visited_at ? String(visit.visited_at).slice(0, 10) : getLocalIsoDate(),
        meal_name: visit?.meal_name ? String(visit.meal_name) : '',
        meal_notes: visit?.meal_notes ? String(visit.meal_notes) : '',
        rating: Number.isFinite(Number(visit?.rating)) ? String(visit.rating) : '',
        body_response: visit?.body_response ? String(visit.body_response) : '',
        liked_it: typeof visit?.liked_it === 'boolean' ? (visit.liked_it ? 'yes' : 'no') : '',
        would_repeat: typeof visit?.would_repeat === 'boolean' ? (visit.would_repeat ? 'yes' : 'no') : '',
        keep_as_favorite: typeof visit?.keep_as_favorite === 'boolean' ? (visit.keep_as_favorite ? 'yes' : 'no') : ''
    };
}

function parseBooleanChoice(value: string) {
    if (value === 'yes') return true;
    if (value === 'no') return false;
    return null;
}

type MealEntry = { breakfast: string; lunch: string; dinner: string; notes: string };

function getLocalIsoDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = `${now.getMonth() + 1}`.padStart(2, '0');
    const day = `${now.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function buildAutoMealForDay(dayOffset: number, profile: any): MealEntry {
    const preferences: string[] = profile?.dietary_preferences || [];
    const conditions: string[] = profile?.health_conditions || [];
    const allergies: string[] = profile?.allergies || [];

    const veganBreakfasts = ['Chia pudding + berries', 'Green smoothie bowl', 'Overnight oats + flax'];
    const veganLunches = ['Kale quinoa bowl', 'Chickpea wrap + greens', 'Lentil salad + herbs'];
    const veganDinners = ['Tofu stir-fry + brown rice', 'Veggie bean chili', 'Roasted veg + hummus plate'];

    const standardBreakfasts = ['Greek yogurt + berries', 'Egg scramble + spinach', 'Protein oats + banana'];
    const standardLunches = ['Grilled chicken salad', 'Salmon + quinoa bowl', 'Turkey veggie wrap'];
    const standardDinners = ['Baked fish + greens', 'Lean protein stir-fry', 'Chicken + roasted vegetables'];

    const useVegan = preferences.includes('vegan') || preferences.includes('raw_vegan') || preferences.includes('vegetarian');
    const breakfasts = useVegan ? veganBreakfasts : standardBreakfasts;
    const lunches = useVegan ? veganLunches : standardLunches;
    const dinners = useVegan ? veganDinners : standardDinners;

    const notes: string[] = [];
    if (conditions.includes('diabetes')) notes.push('Low-sugar emphasis');
    if (conditions.includes('high_blood_pressure')) notes.push('Low-sodium emphasis');
    if (conditions.includes('digestive_issues')) notes.push('Gut-friendly foods');
    if (allergies.length > 0) notes.push(`Avoid: ${allergies.join(', ')}`);

    return {
        breakfast: breakfasts[dayOffset % breakfasts.length],
        lunch: lunches[dayOffset % lunches.length],
        dinner: dinners[dayOffset % dinners.length],
        notes: notes.join(' | ')
    };
}

function buildInitialMealPlan(profile: any): MealPlanDay[] {
    const today = new Date();

    return Array.from({ length: 7 }).map((_, index) => {
        const dayDate = new Date(today);
        dayDate.setDate(today.getDate() + index);
        const dayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(dayDate);
        const generated = buildAutoMealForDay(index, profile);

        return {
            id: `${dayLabel}-${index}`,
            dayLabel,
            breakfast: generated.breakfast,
            lunch: generated.lunch,
            dinner: generated.dinner,
            notes: generated.notes
        };
    });
}

export default function PublicProfileV2({ user, isOwner = true }: ProfileProps) {
    const { token, loading: authLoading } = useAuth();
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
    const [selectedListSection, setSelectedListSection] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [usefulLinks, setUsefulLinks] = useState(USEFUL_LINKS);
    const [videos, setVideos] = useState(INITIAL_VIDEO_GALLERY);
    const [recipes, setRecipes] = useState(INITIAL_RECIPES);
    const [isEditingVideos, setIsEditingVideos] = useState(false);
    const [editingVideoId, setEditingVideoId] = useState<number | null>(null);
    const [newVideoTitle, setNewVideoTitle] = useState('');
    const [newVideoLink, setNewVideoLink] = useState('');
    const [newVideoChannel, setNewVideoChannel] = useState('');
    const [newVideoType, setNewVideoType] = useState('Wellness');
    const [newVideoTags, setNewVideoTags] = useState('');
    const [isEditingRecipes, setIsEditingRecipes] = useState(false);
    const [editingRecipeId, setEditingRecipeId] = useState<number | null>(null);
    const [newRecipeTitle, setNewRecipeTitle] = useState('');
    const [newRecipeImage, setNewRecipeImage] = useState('');
    const [newRecipeDescription, setNewRecipeDescription] = useState('');
    const [newRecipeIngredients, setNewRecipeIngredients] = useState('');
    const [newRecipeInstructions, setNewRecipeInstructions] = useState('');
    const [newRecipeTags, setNewRecipeTags] = useState('');
    const [selectedRecipe, setSelectedRecipe] = useState<RecipeEntry | null>(INITIAL_RECIPES[0] ?? null);
    const [isEditingUsefulLinks, setIsEditingUsefulLinks] = useState(false);
    const [newUsefulLink, setNewUsefulLink] = useState('');
    const [profileData, setProfileData] = useState<any>(() => extractProfileData(user));
    const [favoritePlaces, setFavoritePlaces] = useState<any[] | null>(null);
    const [isLoadingFavoritePlaces, setIsLoadingFavoritePlaces] = useState(false);
    const [selectedFavoritePlace, setSelectedFavoritePlace] = useState<any | null>(null);
    const [placeVisits, setPlaceVisits] = useState<any[]>([]);
    const [isLoadingPlaceVisits, setIsLoadingPlaceVisits] = useState(false);
    const [isSavingPlaceVisit, setIsSavingPlaceVisit] = useState(false);
    const [editingPlaceVisitId, setEditingPlaceVisitId] = useState<string | null>(null);
    const [placeVisitForm, setPlaceVisitForm] = useState(createEmptyPlaceVisitForm);
    const [savedChats, setSavedChats] = useState<Array<{ id: string; title: string; updated_at?: string }>>([]);
    const [healthyDays, setHealthyDays] = useState(1);
    const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
    const [hiddenJournalExampleIds, setHiddenJournalExampleIds] = useState<number[]>([]);
    const [journalExampleOverrides, setJournalExampleOverrides] = useState<Record<number, string>>({});
    const [activeWallMenuId, setActiveWallMenuId] = useState<number | null>(null);
    const [editingWallEntryId, setEditingWallEntryId] = useState<number | null>(null);
    const [editingWallContent, setEditingWallContent] = useState('');
    const [selectedProduce, setSelectedProduce] = useState<ProduceEntry | null>(null);
    const [produceSearch, setProduceSearch] = useState('');
    const [visibleProduceCount, setVisibleProduceCount] = useState(6);
    const [supplements, setSupplements] = useState(INITIAL_SUPPLEMENTS);
    const [selectedSupplement, setSelectedSupplement] = useState<SupplementEntry | null>(INITIAL_SUPPLEMENTS[0] ?? null);
    const [supplementSearch, setSupplementSearch] = useState('');
    const [visibleSupplementCount, setVisibleSupplementCount] = useState(6);
    const [isEditingSupplements, setIsEditingSupplements] = useState(false);
    const [editingSupplementId, setEditingSupplementId] = useState<number | null>(null);
    const [newSupplementTitle, setNewSupplementTitle] = useState('');
    const [newSupplementImage, setNewSupplementImage] = useState('');
    const [newSupplementNutrients, setNewSupplementNutrients] = useState('');
    const [newSupplementBenefits, setNewSupplementBenefits] = useState('');
    const [newSupplementNotes, setNewSupplementNotes] = useState('');
    const [herbs, setHerbs] = useState(INITIAL_HERBS);
    const [selectedHerb, setSelectedHerb] = useState<SupplementEntry | null>(INITIAL_HERBS[0] ?? null);
    const [herbSearch, setHerbSearch] = useState('');
    const [visibleHerbCount, setVisibleHerbCount] = useState(6);
    const [isEditingHerbs, setIsEditingHerbs] = useState(false);
    const [editingHerbId, setEditingHerbId] = useState<number | null>(null);
    const [newHerbTitle, setNewHerbTitle] = useState('');
    const [newHerbImage, setNewHerbImage] = useState('');
    const [newHerbNutrients, setNewHerbNutrients] = useState('');
    const [newHerbBenefits, setNewHerbBenefits] = useState('');
    const [newHerbNotes, setNewHerbNotes] = useState('');
    const [mealPlan, setMealPlan] = useState<MealPlanDay[]>([]);
    const [isEditingMealPlan, setIsEditingMealPlan] = useState(false);
    const featuredVideo = videos[videos.length - 1] || null;
    const featuredRecipe = recipes[0] || null;
    const featuredProduce = PRODUCE_LIBRARY[0];
    const featuredSupplement = supplements[0] || null;
    const featuredHerb = herbs[0] || null;
    const profileDisplayName = user?.full_name || user?.email?.split('@')[0] || 'Urban Gardener';
    const profileBio = user?.bio || 'Passionate about sustainable living. Join me on my journey!';
    const profileLocation = [user?.location_city, user?.location_address].filter(Boolean).join(', ');
    const quoteText = 'To plant a garden is to believe in tomorrow.';
    const favoritesEnabled = isOwner;
    const visibleJournalExampleEntries = useMemo(
        () => JOURNAL_WALL_MOCK_ENTRIES
            .filter((entry) => !hiddenJournalExampleIds.includes(entry.id))
            .map((entry) => ({
                ...entry,
                content: journalExampleOverrides[entry.id] ?? entry.content
            })),
        [hiddenJournalExampleIds, journalExampleOverrides]
    );
    const journalWallEntries = useMemo(() => (
        [...journalEntries, ...visibleJournalExampleEntries].sort(
            (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
        )
    ), [journalEntries, visibleJournalExampleEntries]);
    const hasVisibleJournalExamples = visibleJournalExampleEntries.length > 0;
    const filteredProduce = useMemo(() => {
        const normalizedQuery = produceSearch.trim().toLowerCase();

        if (!normalizedQuery) {
            return PRODUCE_LIBRARY;
        }

        return PRODUCE_LIBRARY.filter((item) => {
            const haystacks = [item.title, ...item.nutrients, ...item.benefits];
            return haystacks.some((value) => value.toLowerCase().includes(normalizedQuery));
        });
    }, [produceSearch]);
    const visibleProduce = filteredProduce.slice(0, visibleProduceCount);
    const filteredSupplements = useMemo(() => {
        const normalizedQuery = supplementSearch.trim().toLowerCase();

        if (!normalizedQuery) {
            return supplements;
        }

        return supplements.filter((item) => {
            const haystacks = [item.title, item.notes || '', ...item.nutrients, ...item.benefits];
            return haystacks.some((value) => value.toLowerCase().includes(normalizedQuery));
        });
    }, [supplementSearch, supplements]);
    const visibleSupplements = filteredSupplements.slice(0, visibleSupplementCount);
    const filteredHerbs = useMemo(() => {
        const normalizedQuery = herbSearch.trim().toLowerCase();

        if (!normalizedQuery) {
            return herbs;
        }

        return herbs.filter((item) => {
            const haystacks = [item.title, item.notes || '', ...item.nutrients, ...item.benefits];
            return haystacks.some((value) => value.toLowerCase().includes(normalizedQuery));
        });
    }, [herbSearch, herbs]);
    const visibleHerbs = filteredHerbs.slice(0, visibleHerbCount);

    // Edit Profile Form State
    const [editForm, setEditForm] = useState({
        full_name: user?.full_name || '',
        location_city: user?.location_city || '',
        location_address: user?.location_address || '',
        bio: user?.bio || ''
    });

    const router = useRouter();
    const searchParams = useSearchParams();
    const favoritesSectionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setProfileData(extractProfileData(user));
    }, [user]);

    useEffect(() => {
        const savedSupplements = normalizeSupplements(profileData?.supplements);
        const nextSupplements = savedSupplements.length > 0 ? savedSupplements : INITIAL_SUPPLEMENTS;
        setSupplements(nextSupplements);
        setSelectedSupplement((current) => {
            if (current && nextSupplements.some((item) => item.id === current.id)) {
                return nextSupplements.find((item) => item.id === current.id) || nextSupplements[0] || null;
            }
            return nextSupplements[0] || null;
        });
    }, [profileData?.supplements]);

    useEffect(() => {
        const savedHerbs = normalizeSupplements(profileData?.herbs);
        const nextHerbs = savedHerbs.length > 0 ? savedHerbs : INITIAL_HERBS;
        setHerbs(nextHerbs);
        setSelectedHerb((current) => {
            if (current && nextHerbs.some((item) => item.id === current.id)) {
                return nextHerbs.find((item) => item.id === current.id) || nextHerbs[0] || null;
            }
            return nextHerbs[0] || null;
        });
    }, [profileData?.herbs]);

    useEffect(() => {
        setEditForm({
            full_name: user?.full_name || '',
            location_city: user?.location_city || '',
            location_address: user?.location_address || '',
            bio: user?.bio || ''
        });
    }, [user]);

    useEffect(() => {
        const streakKey = `plyt-health-streak:${user?.id ?? 'guest'}`;
        const today = getLocalIsoDate();

        try {
            const raw = localStorage.getItem(streakKey);
            const parsed = raw ? JSON.parse(raw) : null;

            if (!parsed) {
                const initial = { count: 1, lastActiveDate: today };
                localStorage.setItem(streakKey, JSON.stringify(initial));
                setHealthyDays(initial.count);
                return;
            }

            if (parsed.lastActiveDate !== today) {
                const next = {
                    count: Number(parsed.count || 0) + 1,
                    lastActiveDate: today
                };
                localStorage.setItem(streakKey, JSON.stringify(next));
                setHealthyDays(next.count);
                return;
            }

            setHealthyDays(Number(parsed.count || 1));
        } catch {
            setHealthyDays(1);
        }
    }, [user?.id]);

    useEffect(() => {
        if (!user?.id) {
            setJournalEntries([]);
            return;
        }

        setJournalEntries(loadJournalEntries(user.id));
    }, [user?.id]);

    useEffect(() => {
        if (!user?.id) {
            setHiddenJournalExampleIds([]);
            return;
        }

        try {
            const raw = localStorage.getItem(getHiddenJournalExamplesKey(user.id));
            if (!raw) {
                setHiddenJournalExampleIds([]);
                return;
            }

            const parsed = JSON.parse(raw);
            setHiddenJournalExampleIds(Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'number') : []);
        } catch {
            setHiddenJournalExampleIds([]);
        }
    }, [user?.id]);

    useEffect(() => {
        if (!user?.id) return;
        localStorage.setItem(getHiddenJournalExamplesKey(user.id), JSON.stringify(hiddenJournalExampleIds));
    }, [hiddenJournalExampleIds, user?.id]);

    useEffect(() => {
        if (!user?.id) {
            setJournalExampleOverrides({});
            return;
        }

        try {
            const raw = localStorage.getItem(getJournalExampleOverridesKey(user.id));
            if (!raw) {
                setJournalExampleOverrides({});
                return;
            }

            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                setJournalExampleOverrides({});
                return;
            }

            const nextOverrides = Object.entries(parsed).reduce<Record<number, string>>((acc, [key, value]) => {
                const numericKey = Number(key);
                if (!Number.isNaN(numericKey) && typeof value === 'string') {
                    acc[numericKey] = value;
                }
                return acc;
            }, {});

            setJournalExampleOverrides(nextOverrides);
        } catch {
            setJournalExampleOverrides({});
        }
    }, [user?.id]);

    useEffect(() => {
        if (!user?.id) return;
        localStorage.setItem(getJournalExampleOverridesKey(user.id), JSON.stringify(journalExampleOverrides));
    }, [journalExampleOverrides, user?.id]);

    useEffect(() => {
        const mealPlanKey = `plyt-meal-plan:${user?.id ?? 'guest'}`;

        try {
            const raw = localStorage.getItem(mealPlanKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setMealPlan(parsed);
                    return;
                }
            }
        } catch {
            // fall through to generated plan
        }

        setMealPlan(buildInitialMealPlan(profileData));
    }, [profileData, user?.id]);

    useEffect(() => {
        if (mealPlan.length === 0) return;
        localStorage.setItem(`plyt-meal-plan:${user?.id ?? 'guest'}`, JSON.stringify(mealPlan));
    }, [mealPlan, user?.id]);

    useEffect(() => {
        setVisibleProduceCount(6);
    }, [produceSearch]);

    useEffect(() => {
        if (activeModal !== 'food') return;

        if (filteredProduce.length === 0) {
            setSelectedProduce(null);
            return;
        }

        if (!selectedProduce || !filteredProduce.some((item) => item.id === selectedProduce.id)) {
            setSelectedProduce(filteredProduce[0]);
        }
    }, [activeModal, filteredProduce, selectedProduce]);

    useEffect(() => {
        setVisibleSupplementCount(6);
    }, [supplementSearch]);

    useEffect(() => {
        if (activeModal !== 'supplements') return;

        if (filteredSupplements.length === 0) {
            setSelectedSupplement(null);
            return;
        }

        if (!selectedSupplement || !filteredSupplements.some((item) => item.id === selectedSupplement.id)) {
            setSelectedSupplement(filteredSupplements[0]);
        }
    }, [activeModal, filteredSupplements, selectedSupplement]);

    useEffect(() => {
        setVisibleHerbCount(6);
    }, [herbSearch]);

    useEffect(() => {
        if (activeModal !== 'herbs') return;

        if (filteredHerbs.length === 0) {
            setSelectedHerb(null);
            return;
        }

        if (!selectedHerb || !filteredHerbs.some((item) => item.id === selectedHerb.id)) {
            setSelectedHerb(filteredHerbs[0]);
        }
    }, [activeModal, filteredHerbs, selectedHerb]);

    useEffect(() => {
        if (recipes.length === 0) {
            setSelectedRecipe(null);
            return;
        }

        if (!selectedRecipe || !recipes.some((item) => item.id === selectedRecipe.id)) {
            setSelectedRecipe(recipes[0]);
            return;
        }

        const matchingRecipe = recipes.find((item) => item.id === selectedRecipe.id);
        if (matchingRecipe && matchingRecipe !== selectedRecipe) {
            setSelectedRecipe(matchingRecipe);
        }
    }, [recipes, selectedRecipe]);

    useEffect(() => {
        if (!favoritesEnabled) {
            return;
        }

        if (searchParams.get('focus') !== 'favorites') {
            return;
        }

        favoritesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (viewMode === 'list') {
            setSelectedListSection('favorites');
        }
    }, [favoritesEnabled, searchParams, viewMode]);

    useEffect(() => {
        if (authLoading || !token || !isOwner) {
            if (!isOwner) {
                setSavedChats([]);
            }
            setFavoritePlaces(null);
            setIsLoadingFavoritePlaces(false);
            return;
        }

        let isCancelled = false;

        const fetchFreshProfileData = async () => {
            try {
                const meRes = await api.get('/user/me');
                const me = meRes.data || {};
                if (isCancelled) return;

                setProfileData((current: any) => ({
                    ...current,
                    ...extractProfileData(me)
                }));

                if (me?.id) {
                    try {
                        const consumerProfileRes = await api.get(`/consumer-health-profile/${me.id}`);
                        const consumerProfile = consumerProfileRes.data?.profile_data || {};
                        if (!isCancelled && consumerProfile && typeof consumerProfile === 'object') {
                            setProfileData((current: any) => ({
                                ...current,
                                ...consumerProfile
                            }));
                        }
                    } catch {
                        // Fall back to the user record data already loaded above.
                    }
                }
            } catch {
                // Fall back to the user prop data when auth-backed refresh is unavailable.
            }
        };

        const fetchSavedChats = async () => {
            try {
                const res = await api.get('/chat/history');
                if (!isCancelled) {
                    setSavedChats(Array.isArray(res.data) ? res.data.slice(0, 50) : []);
                }
            } catch {
                if (!isCancelled) {
                    setSavedChats([]);
                }
            }
        };

        const fetchFavoritePlaces = async () => {
            if (isCancelled) return;

            setIsLoadingFavoritePlaces(true);

            try {
                const res = await api.get('/user/favorites/places');
                if (!isCancelled) {
                    setFavoritePlaces(Array.isArray(res.data?.favorite_places) ? res.data.favorite_places : []);
                }
            } catch {
                if (!isCancelled) {
                    setFavoritePlaces(null);
                }
            } finally {
                if (!isCancelled) {
                    setIsLoadingFavoritePlaces(false);
                }
            }
        };

        void fetchFreshProfileData();
        void fetchSavedChats();
        void fetchFavoritePlaces();

        return () => {
            isCancelled = true;
        };
    }, [authLoading, isOwner, token]);

    const favoritedPlaces = useMemo(() => {
        if (Array.isArray(favoritePlaces)) {
            return favoritePlaces;
        }

        return extractLegacyFavoritePlaces(profileData);
    }, [favoritePlaces, profileData]);

    const favoritedChats = useMemo(() => {
        const candidates = profileData?.favorite_chats || profileData?.favorited_chats;
        if (Array.isArray(candidates) && candidates.length > 0) {
            return candidates;
        }

        return savedChats;
    }, [profileData, savedChats]);

    const favoritedExperts = useMemo(() => {
        const candidates =
            profileData?.favorite_experts ||
            profileData?.favorited_experts ||
            profileData?.saved_experts ||
            [];

        return Array.isArray(candidates) ? candidates : [];
    }, [profileData]);

    const autoMealPlanEnabled = profileData?.auto_meal_plan_enabled !== false;
    const todayMeal = useMemo(() => {
        if (!profileData || !autoMealPlanEnabled) return null;
        return buildAutoMealForDay(new Date().getDay(), profileData);
    }, [autoMealPlanEnabled, profileData]);

    const favoriteSections = [
        {
            key: 'favorites_places',
            label: 'Places',
            count: favoritedPlaces.length,
            items: favoritedPlaces,
            emptyState: isLoadingFavoritePlaces ? 'Loading favorite places...' : 'No favorite places yet.'
        },
        {
            key: 'favorites_chats',
            label: 'Chats',
            count: favoritedChats.length,
            items: favoritedChats,
            emptyState: 'No favorite chats yet.'
        },
        {
            key: 'favorites_experts',
            label: 'Experts',
            count: favoritedExperts.length,
            items: favoritedExperts,
            emptyState: 'No favorite experts yet.'
        }
    ];

    const openExternalLink = (url: string) => {
        if (typeof window !== 'undefined') {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    const resetPlaceVisitEditor = () => {
        setEditingPlaceVisitId(null);
        setPlaceVisitForm(createEmptyPlaceVisitForm());
    };

    const loadPlaceVisits = async (place: any) => {
        const placeProfileId = String(place?.place_profile_id || '').trim();
        if (!placeProfileId || !token) {
            setPlaceVisits([]);
            setIsLoadingPlaceVisits(false);
            return;
        }

        setIsLoadingPlaceVisits(true);

        try {
            const res = await api.get(`/place-profiles/${placeProfileId}/visits/mine`);
            setPlaceVisits(Array.isArray(res.data?.visits) ? res.data.visits : []);
        } catch {
            setPlaceVisits([]);
        } finally {
            setIsLoadingPlaceVisits(false);
        }
    };

    const handleOpenPlaceVisits = async (place: any) => {
        setSelectedFavoritePlace(place);
        resetPlaceVisitEditor();
        setPlaceVisits([]);
        setActiveModal('favorite_place_visits');
        await loadPlaceVisits(place);
    };

    const handleEditPlaceVisit = (visit: any) => {
        setEditingPlaceVisitId(String(visit?.id || ''));
        setPlaceVisitForm(visitToFormState(visit));
    };

    const handleSavePlaceVisit = async () => {
        const placeProfileId = String(selectedFavoritePlace?.place_profile_id || '').trim();
        if (!placeProfileId || !token) {
            return;
        }

        setIsSavingPlaceVisit(true);

        try {
            const payload = {
                visit: {
                    visited_at: placeVisitForm.visited_at ? `${placeVisitForm.visited_at}T12:00:00.000Z` : null,
                    meal_name: placeVisitForm.meal_name.trim(),
                    meal_notes: placeVisitForm.meal_notes.trim(),
                    rating: placeVisitForm.rating ? Number(placeVisitForm.rating) : null,
                    body_response: placeVisitForm.body_response.trim(),
                    liked_it: parseBooleanChoice(placeVisitForm.liked_it),
                    would_repeat: parseBooleanChoice(placeVisitForm.would_repeat),
                    keep_as_favorite: parseBooleanChoice(placeVisitForm.keep_as_favorite)
                }
            };

            const res = editingPlaceVisitId
                ? await api.put(`/place-profiles/visits/${editingPlaceVisitId}`, payload)
                : await api.post(`/place-profiles/${placeProfileId}/visits`, payload);

            setPlaceVisits(Array.isArray(res.data?.visits) ? res.data.visits : []);
            resetPlaceVisitEditor();

            if (editingPlaceVisitId == null) {
                setFavoritePlaces((current) => Array.isArray(current)
                    ? current.map((place) => (
                        String(place?.place_profile_id || '') === placeProfileId
                            ? {
                                ...place,
                                visit_count: Number(place?.visit_count || 0) + 1
                            }
                            : place
                    ))
                    : current);
            }
        } catch {
            // Keep the form state intact so the user does not lose their entry.
        } finally {
            setIsSavingPlaceVisit(false);
        }
    };

    const handleDeletePlaceVisit = async (visitId: string) => {
        if (!visitId || !token || !selectedFavoritePlace?.place_profile_id) {
            return;
        }

        setIsSavingPlaceVisit(true);

        try {
            const res = await api.delete(`/place-profiles/visits/${visitId}`);
            setPlaceVisits(Array.isArray(res.data?.visits) ? res.data.visits : []);

            setFavoritePlaces((current) => Array.isArray(current)
                ? current.map((place) => (
                    String(place?.place_profile_id || '') === String(selectedFavoritePlace.place_profile_id)
                        ? {
                            ...place,
                            visit_count: Math.max(0, Number(place?.visit_count || 0) - 1)
                        }
                        : place
                ))
                : current);

            if (editingPlaceVisitId === visitId) {
                resetPlaceVisitEditor();
            }
        } catch {
            // Leave current state in place on failure.
        } finally {
            setIsSavingPlaceVisit(false);
        }
    };

    const aboutYouListSections: AboutListSection[] = [
        {
            id: 'overview',
            title: 'Profile Overview',
            description: 'Identity, health profile access, and personal details.',
            items: [
                {
                    id: 'overview-profile',
                    title: profileDisplayName,
                    subtitle: profileBio,
                    meta: isOwner ? 'Edit profile' : 'Profile',
                    kind: 'Profile',
                    onClick: isOwner ? () => setActiveModal('edit') : undefined
                },
                {
                    id: 'overview-health-record',
                    title: 'Health Record',
                    subtitle: 'Open your health profile and consumer health details.',
                    meta: 'Open',
                    kind: 'Health',
                    onClick: () => router.push('/?tab=health_profiles&profile=consumer')
                },
                ...(profileLocation
                    ? [{
                        id: 'overview-location',
                        title: profileLocation,
                        subtitle: 'Saved location details from About You.',
                        meta: 'Location',
                        kind: 'Info',
                        onClick: isOwner ? () => setActiveModal('edit') : undefined
                    }]
                    : [])
            ]
        },
        {
            id: 'streak',
            title: 'Health Streak',
            description: 'Your consistency tracker from the About You grid.',
            items: [
                {
                    id: 'streak-summary',
                    title: `${healthyDays} day${healthyDays === 1 ? '' : 's'} in a row`,
                    subtitle: 'Showing up for your health.',
                    meta: 'Open',
                    kind: 'Streak',
                    onClick: () => router.push('/health-challenges')
                }
            ]
        },
        {
            id: 'food',
            title: 'Food I Eat',
            description: 'Produce titles from your food gallery.',
            items: [
                {
                    id: 'food-summary',
                    title: 'Open produce gallery',
                    subtitle: 'Fresh produce gallery with nutrition facts and benefits.',
                    meta: `${PRODUCE_LIBRARY.length} items`,
                    kind: 'Section',
                    onClick: () => setActiveModal('food')
                },
                ...PRODUCE_LIBRARY.map((item) => ({
                    id: `food-${item.id}`,
                    title: item.title,
                    subtitle: item.nutrients.slice(0, 3).join(' | ') || item.benefits[0],
                    meta: 'Food',
                    kind: 'Produce',
                    onClick: () => {
                        setSelectedProduce(item);
                        setActiveModal('food');
                    }
                }))
            ]
        },
        {
            id: 'videos',
            title: 'Videos I Love',
            description: 'Saved video titles from the video card.',
            items: [
                {
                    id: 'videos-summary',
                    title: 'Manage saved videos',
                    subtitle: 'Open the videos panel to add, edit, or review saved creators and talks.',
                    meta: `${videos.length} saved`,
                    kind: 'Section',
                    onClick: () => setActiveModal('grow')
                },
                ...videos.map((item) => ({
                    id: `video-${item.id}`,
                    title: item.title,
                    subtitle: item.channel,
                    meta: item.type,
                    kind: 'Video',
                    onClick: () => openExternalLink(item.link)
                }))
            ],
            emptyState: 'No saved videos yet.'
        },
        {
            id: 'quote',
            title: 'Quote & Status',
            description: 'The quote tile from the card layout.',
            items: [
                {
                    id: 'quote-summary',
                    title: quoteText,
                    subtitle: 'Audrey Hepburn',
                    meta: 'Quote',
                    kind: 'Status'
                }
            ]
        },
        {
            id: 'supplements',
            title: 'Supplements',
            description: 'Your supplement shelf in a title-first view.',
            items: [
                {
                    id: 'supplements-summary',
                    title: 'Open supplement shelf',
                    subtitle: 'Manage current supplements, notes, nutrients, and benefits.',
                    meta: `${supplements.length} saved`,
                    kind: 'Section',
                    onClick: () => setActiveModal('supplements')
                },
                ...supplements.map((item) => ({
                    id: `supplement-${item.id}`,
                    title: item.title,
                    subtitle: item.notes || item.benefits[0] || 'Open to view supplement details.',
                    meta: item.nutrients[0] || 'Supplement',
                    kind: 'Supplement',
                    onClick: () => {
                        setSelectedSupplement(item);
                        setActiveModal('supplements');
                    }
                }))
            ],
            emptyState: 'No supplements saved yet.'
        },
        {
            id: 'recipes',
            title: 'Recipes',
            description: 'Recipe titles from your saved recipe card.',
            items: [
                {
                    id: 'recipes-summary',
                    title: 'Open recipes',
                    subtitle: 'Review or edit the recipes you want to keep close.',
                    meta: `${recipes.length} saved`,
                    kind: 'Section',
                    onClick: () => {
                        setSelectedRecipe(null);
                        setActiveModal('recipes');
                    }
                },
                ...recipes.map((item) => ({
                    id: `recipe-${item.id}`,
                    title: item.title,
                    subtitle: truncateText(item.description, 80),
                    meta: item.tags?.[0] || 'Recipe',
                    kind: 'Recipe',
                    onClick: () => {
                        setSelectedRecipe(item);
                        setActiveModal('recipes');
                    }
                }))
            ],
            emptyState: 'No recipes saved yet.'
        },
        {
            id: 'herbs',
            title: 'Herbs',
            description: 'Your herb shelf in a title-first view.',
            items: [
                {
                    id: 'herbs-summary',
                    title: 'Open herb shelf',
                    subtitle: 'Review the herbs you use, save notes, and keep simple reminders together.',
                    meta: `${herbs.length} saved`,
                    kind: 'Section',
                    onClick: () => setActiveModal('herbs')
                },
                ...herbs.map((item) => ({
                    id: `herb-${item.id}`,
                    title: item.title,
                    subtitle: item.notes || item.benefits[0] || 'Open to view herb details.',
                    meta: item.nutrients[0] || 'Herb',
                    kind: 'Herb',
                    onClick: () => {
                        setSelectedHerb(item);
                        setActiveModal('herbs');
                    }
                }))
            ],
            emptyState: 'No herbs saved yet.'
        },
        {
            id: 'meal-plan',
            title: 'Meal Plan',
            description: 'The meal plan card and each day in the current plan.',
            items: [
                {
                    id: 'meal-plan-summary',
                    title: 'Open full meal plan',
                    subtitle: todayMeal
                        ? `Today: ${todayMeal.breakfast} | ${todayMeal.lunch} | ${todayMeal.dinner}`
                        : 'No generated meal plan is available yet.',
                    meta: `${mealPlan.length} days`,
                    kind: 'Section',
                    onClick: () => setActiveModal('meal_plan')
                },
                ...mealPlan.map((day) => ({
                    id: `meal-plan-${day.id}`,
                    title: day.dayLabel,
                    subtitle: truncateText(`Breakfast: ${day.breakfast} | Lunch: ${day.lunch} | Dinner: ${day.dinner}`, 110),
                    meta: day.notes || 'Meals',
                    kind: 'Day',
                    onClick: () => setActiveModal('meal_plan')
                }))
            ]
        },
        ...(favoritesEnabled ? [{
            id: 'favorites',
            title: 'Favorites',
            description: 'Favorite categories plus saved places, chats, and experts.',
            items: [
                ...favoriteSections.map((section) => ({
                    id: `favorite-group-${section.key}`,
                    title: section.label,
                    subtitle: section.count > 0 ? `${section.count} saved` : section.emptyState,
                    meta: `${section.count}`,
                    kind: 'Group',
                    onClick: () => setActiveModal(section.key)
                })),
                ...favoritedPlaces.map((place: any, index: number) => {
                    const label = place?.name || place?.title || place?.label || `Saved place ${index + 1}`;
                    const detail = place?.location || place?.address || place?.city || place?.notes || 'Saved place';
                    const mapsUrl = place?.mapsUrl || place?.map_url || place?.url;

                    return {
                        id: `favorite-place-${index}`,
                        title: label,
                        subtitle: detail,
                        meta: place?.rating ? `${Number(place.rating).toFixed(1)}` : 'Place',
                        kind: 'Place',
                        onClick: mapsUrl ? () => openExternalLink(mapsUrl) : () => setActiveModal('favorites_places')
                    };
                }),
                ...favoritedChats.map((chat: any, index: number) => {
                    const chatId = String(chat?.id || chat?.conversationId || index);
                    const title = chat?.title || chat?.label || `Saved chat ${index + 1}`;
                    const updatedAt = chat?.updated_at
                        ? `Updated ${new Date(chat.updated_at).toLocaleDateString()}`
                        : 'Saved chat';

                    return {
                        id: `favorite-chat-${chatId}`,
                        title,
                        subtitle: updatedAt,
                        meta: 'Chat',
                        kind: 'Chat',
                        onClick: () => router.push(`/?tab=chat&conversationId=${chatId}`)
                    };
                }),
                ...favoritedExperts.map((expert: any, index: number) => {
                    const name = expert?.name || expert?.title || expert?.full_name || expert?.label || `Saved expert ${index + 1}`;
                    const specialty = expert?.specialty || expert?.focus || expert?.headline || expert?.notes || 'Saved expert';
                    const href = expert?.href || expert?.url || expert?.profileUrl;

                    return {
                        id: `favorite-expert-${index}`,
                        title: name,
                        subtitle: specialty,
                        meta: 'Expert',
                        kind: 'Expert',
                        onClick: href ? () => openExternalLink(href) : () => setActiveModal('favorites_experts')
                    };
                })
            ]
        }] : []),
        {
            id: 'journal-wall',
            title: 'Journal Wall',
            description: 'Journal entries previewed on the About You page.',
            items: [
                {
                    id: 'journal-summary',
                    title: 'Open journal',
                    subtitle: 'Share your journey, reflect on your progress, and track what changes over time.',
                    meta: `${journalWallEntries.length} entries`,
                    kind: 'Section',
                    onClick: () => router.push('/journal')
                },
                ...journalWallEntries.map((entry) => ({
                    id: `journal-${entry.id}`,
                    title: `Entry for ${formatJournalDate(entry.entryDate)}`,
                    subtitle: truncateText(entry.content, 110),
                    meta: entry.tags && entry.tags.length > 0 ? entry.tags.slice(0, 2).join(', ') : 'Journal',
                    kind: 'Entry',
                    onClick: () => router.push('/journal')
                }))
            ]
        }
    ];

    const persistSupplements = async (nextSupplements: SupplementEntry[]) => {
        if (!isOwner || authLoading || !token) {
            return;
        }

        try {
            const response = await api.put('/user/profile', {
                profile_data: {
                    supplements: nextSupplements
                }
            });

            const refreshedProfile = extractProfileData(response.data);
            setProfileData((current: any) => ({
                ...current,
                ...refreshedProfile,
                supplements: normalizeSupplements(refreshedProfile?.supplements).length > 0
                    ? normalizeSupplements(refreshedProfile?.supplements)
                    : nextSupplements
            }));
        } catch (error) {
            console.error('Failed to persist supplements:', error);
        }
    };

    const persistHerbs = async (nextHerbs: SupplementEntry[]) => {
        if (!isOwner || authLoading || !token) {
            return;
        }

        try {
            const response = await api.put('/user/profile', {
                profile_data: {
                    herbs: nextHerbs
                }
            });

            const refreshedProfile = extractProfileData(response.data);
            setProfileData((current: any) => ({
                ...current,
                ...refreshedProfile,
                herbs: normalizeSupplements(refreshedProfile?.herbs).length > 0
                    ? normalizeSupplements(refreshedProfile?.herbs)
                    : nextHerbs
            }));
        } catch (error) {
            console.error('Failed to persist herbs:', error);
        }
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            await api.put('/user/profile', editForm);
            alert('Profile updated successfully!');
            setActiveModal(null);
            router.refresh();
        } catch (error) {
            console.error('Failed to update profile:', error);
            alert('Failed to update profile.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddUsefulLink = () => {
        const rawValue = newUsefulLink.trim();
        if (!rawValue) return;

        const normalizedLink = /^https?:\/\//i.test(rawValue) ? rawValue : `https://${rawValue}`;

        let derivedTitle = rawValue;
        try {
            const parsed = new URL(normalizedLink);
            derivedTitle = parsed.hostname.replace(/^www\./i, '');
        } catch {
            derivedTitle = rawValue;
        }

        setUsefulLinks((current) => [
            ...current,
            {
                id: Date.now(),
                title: derivedTitle,
                link: normalizedLink,
                type: 'Link'
            }
        ]);
        setNewUsefulLink('');
    };

    const handleRemoveUsefulLink = (id: number) => {
        setUsefulLinks((current) => current.filter((item) => item.id !== id));
    };

    const handleAddVideo = () => {
        const rawTitle = newVideoTitle.trim();
        const rawLink = newVideoLink.trim();
        const rawChannel = newVideoChannel.trim();
        if (!rawTitle || !rawLink) return;

        const normalizedLink = /^https?:\/\//i.test(rawLink) ? rawLink : `https://${rawLink}`;
        let image = 'https://i.ytimg.com/vi/c3MlI45j-rg/hqdefault.jpg';

        try {
            const url = new URL(normalizedLink);
            const videoId =
                url.hostname.includes('youtu.be')
                    ? url.pathname.replace('/', '')
                    : url.searchParams.get('v');
            if (videoId) {
                image = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
            }
        } catch {
            image = 'https://i.ytimg.com/vi/c3MlI45j-rg/hqdefault.jpg';
        }

        const tags = newVideoTags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean);

        if (editingVideoId) {
            setVideos((current) =>
                current.map((item) =>
                    item.id === editingVideoId
                        ? {
                            ...item,
                            title: rawTitle,
                            image,
                            channel: rawChannel || 'Saved Video',
                            type: newVideoType || 'Wellness',
                            link: normalizedLink,
                            tags
                        }
                        : item
                )
            );
        } else {
            setVideos((current) => [
                ...current,
                {
                    id: Date.now(),
                    title: rawTitle,
                    image,
                    channel: rawChannel || 'Saved Video',
                    type: newVideoType || 'Wellness',
                    link: normalizedLink,
                    tags
                }
            ]);
        }
        setNewVideoTitle('');
        setNewVideoLink('');
        setNewVideoChannel('');
        setNewVideoType('Wellness');
        setNewVideoTags('');
        setEditingVideoId(null);
        setIsEditingVideos(false);
    };

    const handleRemoveVideo = (id: number) => {
        setVideos((current) => current.filter((item) => item.id !== id));
        if (editingVideoId === id) {
            setEditingVideoId(null);
            setNewVideoTitle('');
            setNewVideoLink('');
            setNewVideoChannel('');
            setNewVideoType('Wellness');
            setNewVideoTags('');
        }
    };

    const handleEditVideo = (item: VideoEntry) => {
        setEditingVideoId(item.id);
        setNewVideoTitle(item.title);
        setNewVideoLink(item.link);
        setNewVideoChannel(item.channel);
        setNewVideoType(item.type);
        setNewVideoTags((item.tags || []).join(', '));
        setIsEditingVideos(true);
    };

    const handleAddRecipe = () => {
        const rawTitle = newRecipeTitle.trim();
        const rawDescription = newRecipeDescription.trim();
        const ingredients = newRecipeIngredients
            .split('\n')
            .map((value) => value.trim())
            .filter(Boolean);
        const instructions = newRecipeInstructions
            .split('\n')
            .map((value) => value.trim())
            .filter(Boolean);
        if (!rawTitle || !rawDescription) return;

        const tags = newRecipeTags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean);

        const image = newRecipeImage.trim() || '/assets/images/gallery/organic_kale.png';
        const nextRecipe: RecipeEntry = {
            id: editingRecipeId || Date.now(),
            title: rawTitle,
            description: rawDescription,
            image,
            likes: editingRecipeId
                ? recipes.find((item) => item.id === editingRecipeId)?.likes || 0
                : 0,
            ingredients,
            instructions,
            tags
        };

        if (editingRecipeId) {
            setRecipes((current) =>
                current.map((item) =>
                    item.id === editingRecipeId ? nextRecipe : item
                )
            );
        } else {
            setRecipes((current) => [
                nextRecipe,
                ...current
            ]);
        }

        setSelectedRecipe(nextRecipe);
        setNewRecipeTitle('');
        setNewRecipeImage('');
        setNewRecipeDescription('');
        setNewRecipeIngredients('');
        setNewRecipeInstructions('');
        setNewRecipeTags('');
        setEditingRecipeId(null);
        setIsEditingRecipes(false);
    };

    const handleEditRecipe = (item: RecipeEntry) => {
        setEditingRecipeId(item.id);
        setNewRecipeTitle(item.title);
        setNewRecipeImage(item.image);
        setNewRecipeDescription(item.description);
        setNewRecipeIngredients(item.ingredients.join('\n'));
        setNewRecipeInstructions(item.instructions.join('\n'));
        setNewRecipeTags((item.tags || []).join(', '));
        setSelectedRecipe(item);
        setIsEditingRecipes(true);
    };

    const handleRemoveRecipe = (id: number) => {
        const nextRecipes = recipes.filter((item) => item.id !== id);
        setRecipes(nextRecipes);
        if (editingRecipeId === id) {
            setEditingRecipeId(null);
            setNewRecipeTitle('');
            setNewRecipeImage('');
            setNewRecipeDescription('');
            setNewRecipeIngredients('');
            setNewRecipeInstructions('');
            setNewRecipeTags('');
        }
        if (selectedRecipe?.id === id) {
            setSelectedRecipe(nextRecipes[0] || null);
        }
    };

    const handleAddSupplement = () => {
        const rawTitle = newSupplementTitle.trim();
        if (!rawTitle) return;

        const nutrients = newSupplementNutrients
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);

        const benefits = newSupplementBenefits
            .split('\n')
            .map((value) => value.trim())
            .filter(Boolean);

        const image = newSupplementImage.trim() || '/assets/images/gallery/user_avatar.png';
        const nextSupplement: SupplementEntry = {
            id: editingSupplementId || Date.now(),
            title: rawTitle,
            image,
            nutrients,
            benefits,
            notes: newSupplementNotes.trim()
        };

        let nextSupplements: SupplementEntry[] = [];
        if (editingSupplementId) {
            nextSupplements = supplements.map((item) => (item.id === editingSupplementId ? nextSupplement : item));
            setSupplements(nextSupplements);
            setSelectedSupplement(nextSupplement);
        } else {
            nextSupplements = [nextSupplement, ...supplements];
            setSupplements(nextSupplements);
            setSelectedSupplement(nextSupplement);
        }

        setNewSupplementTitle('');
        setNewSupplementImage('');
        setNewSupplementNutrients('');
        setNewSupplementBenefits('');
        setNewSupplementNotes('');
        setEditingSupplementId(null);
        setIsEditingSupplements(false);
        void persistSupplements(nextSupplements);
    };

    const handleEditSupplement = (item: SupplementEntry) => {
        setEditingSupplementId(item.id);
        setNewSupplementTitle(item.title);
        setNewSupplementImage(item.image);
        setNewSupplementNutrients(item.nutrients.join(', '));
        setNewSupplementBenefits(item.benefits.join('\n'));
        setNewSupplementNotes(item.notes || '');
        setSelectedSupplement(item);
        setIsEditingSupplements(true);
    };

    const handleRemoveSupplement = (id: number) => {
        const nextSupplements = supplements.filter((item) => item.id !== id);
        setSupplements(nextSupplements);
        if (editingSupplementId === id) {
            setEditingSupplementId(null);
            setNewSupplementTitle('');
            setNewSupplementImage('');
            setNewSupplementNutrients('');
            setNewSupplementBenefits('');
            setNewSupplementNotes('');
            setIsEditingSupplements(false);
        }
        if (selectedSupplement?.id === id) {
            setSelectedSupplement(nextSupplements[0] || null);
        }
        void persistSupplements(nextSupplements);
    };

    const handleAddHerb = () => {
        const rawTitle = newHerbTitle.trim();
        if (!rawTitle) return;

        const nutrients = newHerbNutrients
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);

        const benefits = newHerbBenefits
            .split('\n')
            .map((value) => value.trim())
            .filter(Boolean);

        const image = newHerbImage.trim() || '/assets/images/gallery/fresh_herbs.png';
        const nextHerb: SupplementEntry = {
            id: editingHerbId || Date.now(),
            title: rawTitle,
            image,
            nutrients,
            benefits,
            notes: newHerbNotes.trim()
        };

        let nextHerbs: SupplementEntry[] = [];
        if (editingHerbId) {
            nextHerbs = herbs.map((item) => (item.id === editingHerbId ? nextHerb : item));
            setHerbs(nextHerbs);
            setSelectedHerb(nextHerb);
        } else {
            nextHerbs = [nextHerb, ...herbs];
            setHerbs(nextHerbs);
            setSelectedHerb(nextHerb);
        }

        setNewHerbTitle('');
        setNewHerbImage('');
        setNewHerbNutrients('');
        setNewHerbBenefits('');
        setNewHerbNotes('');
        setEditingHerbId(null);
        setIsEditingHerbs(false);
        void persistHerbs(nextHerbs);
    };

    const handleEditHerb = (item: SupplementEntry) => {
        setEditingHerbId(item.id);
        setNewHerbTitle(item.title);
        setNewHerbImage(item.image);
        setNewHerbNutrients(item.nutrients.join(', '));
        setNewHerbBenefits(item.benefits.join('\n'));
        setNewHerbNotes(item.notes || '');
        setSelectedHerb(item);
        setIsEditingHerbs(true);
    };

    const handleRemoveHerb = (id: number) => {
        const nextHerbs = herbs.filter((item) => item.id !== id);
        setHerbs(nextHerbs);
        if (editingHerbId === id) {
            setEditingHerbId(null);
            setNewHerbTitle('');
            setNewHerbImage('');
            setNewHerbNutrients('');
            setNewHerbBenefits('');
            setNewHerbNotes('');
            setIsEditingHerbs(false);
        }
        if (selectedHerb?.id === id) {
            setSelectedHerb(nextHerbs[0] || null);
        }
        void persistHerbs(nextHerbs);
    };

    const resetVideoEditor = () => {
        setEditingVideoId(null);
        setNewVideoTitle('');
        setNewVideoLink('');
        setNewVideoChannel('');
        setNewVideoType('Wellness');
        setNewVideoTags('');
        setIsEditingVideos(false);
    };

    const resetRecipeEditor = () => {
        setEditingRecipeId(null);
        setNewRecipeTitle('');
        setNewRecipeImage('');
        setNewRecipeDescription('');
        setNewRecipeIngredients('');
        setNewRecipeInstructions('');
        setNewRecipeTags('');
        setIsEditingRecipes(false);
    };

    const resetSupplementEditor = () => {
        setEditingSupplementId(null);
        setNewSupplementTitle('');
        setNewSupplementImage('');
        setNewSupplementNutrients('');
        setNewSupplementBenefits('');
        setNewSupplementNotes('');
        setIsEditingSupplements(false);
    };

    const resetHerbEditor = () => {
        setEditingHerbId(null);
        setNewHerbTitle('');
        setNewHerbImage('');
        setNewHerbNutrients('');
        setNewHerbBenefits('');
        setNewHerbNotes('');
        setIsEditingHerbs(false);
    };

    const toggleViewMode = (mode: 'cards' | 'list') => {
        setViewMode(mode);
        setSelectedListSection(null);
    };

    const toggleSupplementEditor = () => {
        setEditingSupplementId(null);
        setNewSupplementTitle('');
        setNewSupplementImage('');
        setNewSupplementNutrients('');
        setNewSupplementBenefits('');
        setNewSupplementNotes('');
        setIsEditingSupplements((value) => !value);
    };

    const toggleHerbEditor = () => {
        setEditingHerbId(null);
        setNewHerbTitle('');
        setNewHerbImage('');
        setNewHerbNutrients('');
        setNewHerbBenefits('');
        setNewHerbNotes('');
        setIsEditingHerbs((value) => !value);
    };

    const handleClearEditForm = () => {
        setEditForm({
            full_name: '',
            location_city: '',
            location_address: '',
            bio: ''
        });
    };

    const handleMealPlanFieldChange = (dayId: string, field: keyof Omit<MealPlanDay, 'id' | 'dayLabel'>, value: string) => {
        setMealPlan((current) =>
            current.map((day) =>
                day.id === dayId
                    ? {
                        ...day,
                        [field]: value
                    }
                    : day
            )
        );
    };

    const resetMealPlan = () => {
        setMealPlan(buildInitialMealPlan(profileData));
        setIsEditingMealPlan(false);
    };

    const handleDeleteWallEntry = (entry: JournalEntry) => {
        setActiveWallMenuId(null);

        if (JOURNAL_WALL_MOCK_ENTRIES.some((mockEntry) => mockEntry.id === entry.id)) {
            setHiddenJournalExampleIds((current) => current.includes(entry.id) ? current : [...current, entry.id]);
            if (editingWallEntryId === entry.id) {
                setEditingWallEntryId(null);
                setEditingWallContent('');
            }
            return;
        }

        const nextEntries = journalEntries.filter((journalEntry) => journalEntry.id !== entry.id);
        setJournalEntries(nextEntries);
        saveJournalEntries(user?.id, nextEntries);
        if (editingWallEntryId === entry.id) {
            setEditingWallEntryId(null);
            setEditingWallContent('');
        }
    };

    const handleStartWallEdit = (entry: JournalEntry) => {
        setActiveWallMenuId(null);
        setEditingWallEntryId(entry.id);
        setEditingWallContent(entry.content);
    };

    const handleCancelWallEdit = () => {
        setEditingWallEntryId(null);
        setEditingWallContent('');
    };

    const handleSaveWallEdit = (entry: JournalEntry) => {
        const trimmed = editingWallContent.trim();
        if (!trimmed) return;

        if (JOURNAL_WALL_MOCK_ENTRIES.some((mockEntry) => mockEntry.id === entry.id)) {
            setJournalExampleOverrides((current) => ({
                ...current,
                [entry.id]: trimmed
            }));
        } else {
            const nextEntries = journalEntries.map((journalEntry) => (
                journalEntry.id === entry.id
                    ? { ...journalEntry, content: trimmed }
                    : journalEntry
            ));
            setJournalEntries(nextEntries);
            saveJournalEntries(user?.id, nextEntries);
        }

        setEditingWallEntryId(null);
        setEditingWallContent('');
    };

    return (
        <div className="relative h-full w-full overflow-y-auto overflow-x-hidden bg-gray-50 p-4 md:p-8 no-scrollbar">
            <AboutYouListPanel
                viewMode={viewMode}
                onViewModeChange={toggleViewMode}
                selectedListSection={selectedListSection}
                onSelectListSection={setSelectedListSection}
                aboutYouListSections={aboutYouListSections}
                favoritesSectionRef={favoritesSectionRef}
            />

            {viewMode !== 'list' && (
            <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 auto-rows-min md:grid-cols-4">

                {/* -- Box 1: Identity (Row 1, Col 1-2) -- */}
                <div
                    onClick={() => {
                        if (isOwner) setActiveModal('edit');
                    }}
                    className={`col-span-2 md:col-span-4 bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 transition-all duration-300 flex items-center gap-6 relative overflow-hidden group ${isOwner ? 'cursor-pointer' : ''}`}
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white shadow-lg overflow-hidden shrink-0 relative z-10">
                        <Image
                            src={user?.avatar_url || "/assets/images/gallery/user_avatar.png"}
                            alt="Profile Avatar"
                            fill
                            className="object-cover"
                        />
                    </div>
                    <div className="relative z-10">
                        <h1 className="text-2xl font-bold text-gray-900">{profileDisplayName}</h1>
                        <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                            {profileBio}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                            <Link href="/?tab=health_profiles&profile=consumer" className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-full hover:bg-green-100 transition-colors">
                                View Health Record
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </Link>
                            {user?.location_city && (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    {user.location_city}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* -- Box 3: Stats (Row 2, Col 1) -- */}
                {/* -- Box 3: Stats (Row 2, Col 1) -- */}
                <Link href="/health-challenges" className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 transition-all duration-300 flex flex-col justify-center items-center text-center hover:border-green-400 cursor-pointer group">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider group-hover:text-green-600 transition-colors">Health Streak</p>
                    <p className="text-5xl font-extrabold text-gray-900 mt-2 group-hover:scale-110 transition-transform">{healthyDays}</p>
                    <p className="text-xs text-green-600 font-medium mt-2 bg-green-50 px-2 py-1 rounded-full">Showing up for your health</p>
                </Link>

                {/* -- Box 4: Food I Eat (Row 2, Col 2-4) -- */}
                <div
                    onClick={() => setActiveModal('food')}
                    className="md:col-span-3 bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 transition-all duration-300 relative overflow-hidden group cursor-pointer"
                >
                    {/* Background Image (Cover) */}
                    <div className="absolute inset-0">
                        <Image
                            src={featuredProduce.image}
                            alt="Food Cover"
                            fill
                            className="object-cover group-hover:scale-105 transition duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                    </div>

                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <h3 className="font-extrabold text-white flex items-center gap-2 text-3xl shadow-sm tracking-tight">
                                <span className="w-3 h-3 bg-green-500 rounded-full box-shadow-green shadow-[0_0_10px_rgba(34,197,94,0.8)]"></span>
                                Food I Eat
                            </h3>
                            <span className="text-xs text-white/90 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/30">Fresh produce gallery</span>
                        </div>
                        <div>
                            <p className="text-white text-2xl font-bold border-l-4 border-green-500 pl-3">{featuredProduce.title}</p>
                            <p className="text-white/80 text-sm mt-1 pl-4">Tap to view nutrition facts and benefits</p>
                        </div>
                    </div>
                </div>

                {/* -- Box 5: Videos I Love (Vertical) -- */}
                <div
                    onClick={() => setActiveModal('grow')}
                    className="col-span-1 min-w-0 md:col-span-1 md:row-span-2 bg-white rounded-3xl p-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 transition-all duration-300 relative overflow-hidden group cursor-pointer"
                >
                    {featuredVideo ? (
                        <>
                            <div className="absolute inset-0">
                                <img
                                    src={featuredVideo.image}
                                    alt={featuredVideo.title}
                                    className="h-full w-full object-cover scale-125 group-hover:scale-[1.32] transition duration-700"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                            </div>

                            <div className="relative z-10 flex h-full min-h-[220px] flex-col justify-end px-2 pb-3 pt-4 md:px-3 md:pb-4 md:pt-5">
                                <h3 className="mb-2 flex items-center gap-2 text-[1.65rem] font-extrabold tracking-tight text-white md:text-[1.9rem]">
                                    <span className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)] shrink-0"></span>
                                    Videos
                                </h3>
                                <div className="min-w-0">
                                    <p className="mb-1 border-l-4 border-blue-500 pl-2 text-lg font-bold leading-tight text-white">{featuredVideo.title}</p>
                                    <p className="pl-3 text-sm text-white/80">{featuredVideo.channel}</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="relative z-10 flex h-full min-h-[220px] flex-col justify-end p-6">
                            <h3 className="mb-2 flex items-center gap-2 whitespace-nowrap text-[1.9rem] font-extrabold tracking-tight text-gray-900">
                                <span className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.35)] shrink-0"></span>
                                Videos that help
                            </h3>
                            <div>
                                <p className="text-lg font-bold text-gray-900">No videos saved yet</p>
                                <p className="text-sm text-gray-500 mt-2">Add a few creators or talks that support your journey.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* -- Box 5b: Favorite Quote / Status (Mobile Gap Filler) -- */}
                {/*  Next to 'How I Grow' on Mobile, stacked elsewhere on Desktop if needed  */}
                <div className="col-span-1 md:col-span-1 md:row-span-1 bg-white rounded-3xl p-6 relative overflow-hidden flex flex-col justify-center items-center text-center group">
                    {isOwner && (
                        <button className="absolute top-2 right-2 text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                    )}
                    <div className="absolute top-0 right-0 text-9xl text-gray-100 -mr-4 -mt-8 font-serif">"</div>
                    <p className="text-gray-800 font-serif italic text-sm md:text-base relative z-10">
                        "{quoteText}"
                    </p>
                    <p className="text-gray-400 text-xs mt-3 uppercase tracking-wider font-bold">- Audrey Hepburn</p>
                </div>

                {/* -- Box 6: Supplements (Row 3, Col 3-4) -- */}
                <div
                    onClick={() => setActiveModal('supplements')}
                    className="order-3 min-w-0 bg-white rounded-3xl p-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 transition-all duration-300 cursor-pointer group overflow-hidden"
                >
                    <div className="relative h-36 bg-emerald-50">
                        {featuredSupplement ? (
                            <>
                                <Image
                                    src={featuredSupplement.image}
                                    alt={featuredSupplement.title}
                                    fill
                                    className="object-cover group-hover:scale-105 transition duration-700"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent"></div>
                            </>
                        ) : (
                            <div className="flex h-full items-center justify-center text-emerald-700">
                                <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m7-7H5" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 9h10v6H7z" />
                                </svg>
                            </div>
                        )}
                    </div>
                    <div className="flex items-start justify-between gap-4 p-5">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Supplements</h3>
                                <p className="hidden">
                                    ❤️ {USEFUL_LINKS.length + PINNED_ARTICLES.length + 218} total likes
                                </p>
                                <p className="mt-1 text-sm font-medium text-gray-500">
                                    {featuredSupplement ? featuredSupplement.title : 'Build your supplement list'}
                                </p>
                            </div>
                        <span className="text-4xl font-extrabold leading-none text-gray-900">
                            {supplements.length}
                        </span>
                    </div>
                </div>

                {/* -- Box 7: Recipes (Row 4, Col 1) -- */}
                <div
                    onClick={() => {
                        setSelectedRecipe(featuredRecipe || null);
                        setActiveModal('recipes');
                    }}
                    className="order-4 bg-white rounded-3xl p-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 transition-all duration-300 overflow-hidden group relative cursor-pointer"
                >
                    {featuredRecipe ? (
                        <>
                            <div className="absolute inset-0">
                                <Image
                                    src={featuredRecipe.image}
                                    alt="Recipe Cover"
                                    fill
                                    className="object-cover group-hover:scale-105 transition duration-700"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                            </div>
                            <div className="relative z-10 p-6 h-full flex flex-col justify-end" style={{ minHeight: '220px' }}>
                                <h3 className="font-extrabold text-white flex items-center gap-2 text-3xl shadow-sm tracking-tight mb-2">
                                    <span className="w-3 h-3 bg-yellow-400 rounded-full shadow-[0_0_10px_rgba(250,204,21,0.8)]"></span>
                                    Recipes
                                </h3>
                                <p className="text-white text-lg font-bold leading-tight mb-1 border-l-4 border-yellow-400 pl-3">{featuredRecipe.title}</p>
                                <p className="text-white/70 text-xs pl-4">❤️ {featuredRecipe.likes} Likes</p>
                            </div>
                        </>
                    ) : (
                        <div className="relative z-10 flex h-full min-h-[220px] flex-col justify-end p-6">
                            <h3 className="font-extrabold text-gray-900 flex items-center gap-2 text-3xl shadow-sm tracking-tight mb-2">
                                <span className="w-3 h-3 bg-yellow-400 rounded-full shadow-[0_0_10px_rgba(250,204,21,0.35)]"></span>
                                Recipes
                            </h3>
                            <p className="text-lg font-bold text-gray-900">No recipes saved yet</p>
                            <p className="mt-2 text-sm text-gray-500">Add recipes you cook often or want to remember.</p>
                        </div>
                    )}
                </div>

                <div
                    onClick={() => setActiveModal('herbs')}
                    className="order-2 bg-white rounded-3xl p-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 transition-all duration-300 cursor-pointer group overflow-hidden"
                >
                    <div className="relative h-36 bg-lime-50">
                        {featuredHerb ? (
                            <>
                                <Image
                                    src={featuredHerb.image}
                                    alt={featuredHerb.title}
                                    fill
                                    className="object-cover group-hover:scale-105 transition duration-700"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent"></div>
                            </>
                        ) : (
                            <div className="flex h-full items-center justify-center text-lime-700">
                                <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21c4.97-4.17 8-7.39 8-11a4 4 0 00-7.2-2.4L12 8.4l-.8-.8A4 4 0 004 10c0 3.61 3.03 6.83 8 11z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.5 1.5-2.5 3.4-2.5 5.5" />
                                </svg>
                            </div>
                        )}
                    </div>
                    <div className="flex items-start justify-between gap-4 p-5">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Herbs</h3>
                            <p className="mt-1 text-sm font-medium text-gray-500">
                                {featuredHerb ? featuredHerb.title : 'Build your herb shelf'}
                            </p>
                        </div>
                        <span className="text-4xl font-extrabold leading-none text-gray-900">
                            {herbs.length}
                        </span>
                    </div>
                </div>

                <div
                    onClick={() => setActiveModal('meal_plan')}
                    className="order-1 col-span-2 md:col-span-2 bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 transition-all duration-300 cursor-pointer group"
                >
                    <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                        <div className="max-w-xl">
                            <p className="text-xs font-bold uppercase tracking-[0.22em] text-green-600">Meal Plan</p>
                            <h3 className="mt-2 text-2xl font-bold text-gray-900">
                                {todayMeal ? 'Meals of the day' : 'Build your meal plan'}
                            </h3>
                            <p className="mt-2 text-sm text-gray-500">
                                {todayMeal
                                    ? 'A wider snapshot of today’s breakfast, lunch, and dinner.'
                                    : 'Open your meal plan to add a daily rhythm for breakfast, lunch, and dinner.'}
                            </p>
                        </div>
                        <div className="flex items-center gap-3 md:flex-col md:items-end">
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setActiveModal('meal_plan');
                                }}
                                className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-[11px] font-bold text-green-700 transition hover:bg-green-100"
                            >
                                View Full Meal Plan
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                            <span className="text-4xl font-extrabold leading-none text-gray-900">
                                {mealPlan.length}
                            </span>
                        </div>
                    </div>

                    {todayMeal ? (
                        <div className="mt-5 grid gap-3 md:grid-cols-3">
                            <div className="rounded-2xl border border-green-100 bg-green-50/70 px-4 py-3">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-green-700">Breakfast</p>
                                <p className="mt-1 text-sm font-semibold text-gray-900">{todayMeal.breakfast}</p>
                            </div>
                            <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700">Lunch</p>
                                <p className="mt-1 text-sm font-semibold text-gray-900">{todayMeal.lunch}</p>
                            </div>
                            <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-sky-700">Dinner</p>
                                <p className="mt-1 text-sm font-semibold text-gray-900">{todayMeal.dinner}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-5 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                            No generated meal plan is available yet.
                        </div>
                    )}
                </div>

                {favoritesEnabled ? (
                <div ref={favoritesSectionRef} className="order-5 col-span-2 md:col-span-2 md:col-start-2 bg-white rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {favoriteSections.map((section) => (
                            <button
                                key={`${section.key}-link`}
                                type="button"
                                onClick={() => setActiveModal(section.key)}
                                className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gradient-to-r from-white to-gray-50 px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-gray-200 hover:shadow-sm"
                            >
                                <div>
                                    <p className="text-sm font-bold text-gray-900">❤️ {section.label}</p>
                                    <p className="mt-1 text-xs text-gray-500">{section.emptyState}</p>
                                </div>
                                <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-gray-900 px-2 py-1 text-[11px] font-bold text-white">
                                    {section.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
                ) : null}

                {/* -- Box 9: Wall of Posts (Feed) -- */}
                <div
                    onClick={() => router.push('/journal')}
                    className="order-6 col-span-2 md:col-span-4 bg-transparent rounded-3xl p-0 mt-4 flex cursor-pointer flex-col gap-6"
                >
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900">Journal Wall</h3>
                            <p className="mt-1 text-sm text-gray-500">Share your journey, reflect on your progress, and keep track of what is changing over time.</p>
                        </div>
                        <Link
                            href="/journal"
                            onClick={(event) => event.stopPropagation()}
                            className="text-sm font-semibold text-green-600 bg-white px-4 py-2 rounded-full shadow-sm hover:shadow-md transition"
                        >
                            Open Journal
                        </Link>
                    </div>

                    {hasVisibleJournalExamples ? (
                        <div className="rounded-2xl border border-dashed border-green-200 bg-green-50/60 px-4 py-3 text-sm text-green-800">
                            Example posts are included below so people can visualize the wall. You can remove any example post whenever you want.
                        </div>
                    ) : null}

                    {journalWallEntries.length > 0 ? (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                            {journalWallEntries.map((entry) => {
                                const isExampleEntry = JOURNAL_WALL_MOCK_ENTRIES.some((mockEntry) => mockEntry.id === entry.id);

                                return (
                                    <div key={entry.id} className="flex h-full flex-col rounded-3xl border border-gray-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                                        <div className="mb-3 flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="relative h-10 w-10 overflow-hidden rounded-full border border-gray-100 bg-green-100">
                                                    <Image src="/assets/images/gallery/user_avatar.png" alt="User" fill className="object-cover" />
                                                </div>
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="text-sm font-bold text-gray-900">
                                                            {isExampleEntry ? 'Journal example' : (user?.full_name || user?.email?.split('@')[0] || 'Your Journal')}
                                                        </p>
                                                        {isExampleEntry ? (
                                                            <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-700">
                                                                Example
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    <p className="text-[10px] text-gray-400">{formatJournalDate(entry.entryDate)}</p>
                                                </div>
                                            </div>
                                            {isOwner ? (
                                                <div className="relative">
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            setActiveWallMenuId((current) => current === entry.id ? null : entry.id);
                                                        }}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-50"
                                                        aria-label="Open journal post options"
                                                    >
                                                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                                            <circle cx="12" cy="5" r="1.75" />
                                                            <circle cx="12" cy="12" r="1.75" />
                                                            <circle cx="12" cy="19" r="1.75" />
                                                        </svg>
                                                    </button>
                                                    {activeWallMenuId === entry.id ? (
                                                        <div
                                                            className="absolute right-0 top-10 z-10 min-w-[140px] overflow-hidden rounded-2xl border border-gray-200 bg-white py-1 shadow-lg"
                                                            onClick={(event) => event.stopPropagation()}
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() => handleStartWallEdit(entry)}
                                                                className="block w-full px-4 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                                                            >
                                                                Edit text
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteWallEntry(entry)}
                                                                className="block w-full px-4 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            ) : null}
                                        </div>

                                        {entry.imageUrl ? (
                                            <div className="relative mb-3 aspect-video overflow-hidden rounded-2xl shadow-inner">
                                                <Image src={entry.imageUrl} alt="Journal entry" fill className="object-cover" unoptimized />
                                            </div>
                                        ) : null}

                                        {editingWallEntryId === entry.id ? (
                                            <div className="mb-4 flex-grow">
                                                <textarea
                                                    value={editingWallContent}
                                                    onChange={(event) => setEditingWallContent(event.target.value)}
                                                    onClick={(event) => event.stopPropagation()}
                                                    rows={5}
                                                    className="w-full resize-none rounded-2xl border border-green-200 bg-green-50/30 px-4 py-3 text-sm leading-relaxed text-gray-700 outline-none transition focus:border-green-400"
                                                />
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            handleSaveWallEdit(entry);
                                                        }}
                                                        className="inline-flex items-center justify-center rounded-full bg-green-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-green-700"
                                                    >
                                                        Save text
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            handleCancelWallEdit();
                                                        }}
                                                        className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="mb-4 flex-grow line-clamp-5 text-sm leading-relaxed text-gray-700">
                                                {entry.content}
                                            </p>
                                        )}

                                        {entry.tags && entry.tags.length > 0 ? (
                                            <div className="mt-auto flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                                                {entry.tags.map((tag) => (
                                                    <span key={`${entry.id}-${tag}`} className="rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-green-700">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="rounded-3xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
                            <p className="text-lg font-semibold text-gray-900">No journal posts yet</p>
                            <p className="mt-2 text-sm text-gray-600">
                                Add a post in your journal whenever you want this wall to start filling up again.
                            </p>
                        </div>
                    )}
                </div>

            </div>
            )}

            <div className="text-center mt-8 pb-4 flex flex-col items-center gap-2">
                <p className="text-xs text-gray-300 font-medium">Bento Grid Layout v1.0</p>
            </div>

            {/* -- Expanded Content Modal -- */}
            <AnimatePresence>
                {activeModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[70] flex items-start justify-center bg-black/50 p-3 pt-4 backdrop-blur-sm sm:items-center sm:p-4"
                        onClick={() => setActiveModal(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl max-h-[calc(100dvh-1rem)] sm:max-h-[90vh]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {activeModal === 'food' && 'Food I Eat'}
                                    {activeModal === 'supplements' && 'Supplements'}
                                    {activeModal === 'herbs' && 'Herbs'}
                                    {activeModal === 'grow' && 'Videos that help'}
                                    {activeModal === 'recipes' && (selectedRecipe ? selectedRecipe.title : 'Recipes')}
                                    {activeModal === 'meal_plan' && 'Meal Plan'}
                                    {activeModal === 'learn' && 'Useful Links'}
                                    {activeModal === 'edit' && 'Edit Profile'}
                                    {activeModal === 'favorite_place_visits' && (
                                        selectedFavoritePlace?.name || selectedFavoritePlace?.title
                                            ? `${selectedFavoritePlace?.name || selectedFavoritePlace?.title} visit notes`
                                            : 'Place visits'
                                    )}
                                    {(activeModal && FAVORITE_MODAL_TITLES[activeModal]) || ''}
                                </h2>
                                <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-gray-100 rounded-full transition">
                                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            {/* Content Scroller */}
                            <div className="overflow-y-auto p-6 pb-24 max-h-[calc(100dvh-5.5rem)] sm:max-h-[calc(90vh-80px)] sm:pb-6">
                                {activeModal === 'edit' && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between rounded-2xl border border-green-100 bg-green-50/70 px-4 py-3">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">Profile details</p>
                                                <p className="text-xs text-gray-600">Make your updates here once you open the profile card.</p>
                                            </div>
                                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-green-200 bg-white text-green-600">
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Full Name</label>
                                                <input
                                                    type="text"
                                                    value={editForm.full_name}
                                                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all outline-none"
                                                    placeholder="Enter your full name"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">City / Region</label>
                                                <input
                                                    type="text"
                                                    value={editForm.location_city}
                                                    onChange={(e) => setEditForm({ ...editForm, location_city: e.target.value })}
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all outline-none"
                                                    placeholder="e.g. San Francisco, CA"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Home Address (Private)</label>
                                            <textarea
                                                value={editForm.location_address}
                                                onChange={(e) => setEditForm({ ...editForm, location_address: e.target.value })}
                                                rows={2}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all outline-none resize-none"
                                                placeholder="Enter your home address for local AI discovery"
                                            />
                                            <p className="text-[10px] text-gray-400 mt-1 italic">Used by AI to find local food and systems nearby. Not shared publicly.</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Bio</label>
                                            <textarea
                                                value={editForm.bio}
                                                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                                                rows={3}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all outline-none resize-none"
                                                placeholder="Tell your local community about yourself"
                                            />
                                        </div>
                                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                            <button
                                                type="button"
                                                onClick={handleClearEditForm}
                                                className="px-6 py-2.5 rounded-xl font-bold text-red-500 hover:bg-red-50 transition-colors"
                                            >
                                                Clear
                                            </button>
                                            <button
                                                onClick={() => setActiveModal(null)}
                                                className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSaveProfile}
                                                disabled={isSaving}
                                                className="px-8 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none"
                                            >
                                                {isSaving ? 'Saving...' : 'Save Profile'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {activeModal === 'food' && (
                                    <div className="space-y-6">
                                        <div className="rounded-2xl border border-green-100 bg-green-50/70 p-5">
                                            <p className="text-sm font-semibold text-gray-900">Fresh produce gallery</p>
                                            <p className="mt-1 text-sm text-gray-600">Choose produce you enjoy most, then explore the details at the top while browsing the wider library below.</p>
                                        </div>

                                        {selectedProduce ? (
                                            <div className="rounded-3xl border border-green-200 bg-white p-5 shadow-sm">
                                                <div className="flex items-start gap-4">
                                                    <div>
                                                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-600">Nutrition snapshot</p>
                                                        <h3 className="mt-2 text-2xl font-bold text-gray-900">{selectedProduce.title}</h3>
                                                        <p className="mt-2 text-sm text-gray-600">A quick look at what this produce brings to your plate and why it can be worth keeping around.</p>
                                                    </div>
                                                </div>

                                                <div className="mt-5 grid gap-5 md:grid-cols-[0.8fr_1.2fr]">
                                                    <div className="relative aspect-square overflow-hidden rounded-2xl border border-gray-100">
                                                        <Image src={selectedProduce.image} alt={selectedProduce.title} fill className="object-cover" />
                                                    </div>
                                                    <div className="space-y-5">
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-900">Key nutrients</p>
                                                            <div className="mt-3 flex flex-wrap gap-2">
                                                                {selectedProduce.nutrients.map((nutrient) => (
                                                                    <span key={`${selectedProduce.id}-${nutrient}`} className="rounded-full bg-green-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-green-700">
                                                                        {nutrient}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-900">Benefits</p>
                                                            <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-600">
                                                                {selectedProduce.benefits.map((benefit) => (
                                                                    <li key={`${selectedProduce.id}-${benefit}`} className="flex gap-2">
                                                                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                                                                        <span>{benefit}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
                                                No produce selected yet. Pick something from the gallery below to open its nutrition snapshot.
                                            </div>
                                        )}

                                        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                                            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">Browse the produce library</p>
                                                    <p className="mt-1 text-sm text-gray-500">This is a starter in-app library for now and can grow into a fuller produce database over time.</p>
                                                </div>
                                                <div className="w-full md:max-w-sm">
                                                    <label htmlFor="produce-search" className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                                                        Search produce
                                                    </label>
                                                    <input
                                                        id="produce-search"
                                                        type="text"
                                                        value={produceSearch}
                                                        onChange={(event) => setProduceSearch(event.target.value)}
                                                        placeholder="Search spinach, hydration, iron, fiber..."
                                                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-green-400"
                                                    />
                                                </div>
                                            </div>

                                            <div className="mt-5 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                                                <span>{filteredProduce.length} match{filteredProduce.length === 1 ? '' : 'es'}</span>
                                                {produceSearch ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setProduceSearch('')}
                                                        className="rounded-full border border-gray-200 px-3 py-1 text-[11px] font-bold tracking-normal text-gray-600 transition hover:bg-gray-50"
                                                    >
                                                        Clear search
                                                    </button>
                                                ) : null}
                                            </div>

                                            {visibleProduce.length > 0 ? (
                                                <div className="mt-5 grid grid-cols-2 gap-6 md:grid-cols-4">
                                                    {visibleProduce.map((item) => (
                                                        <button
                                                            key={item.id}
                                                            type="button"
                                                            onClick={() => setSelectedProduce(item)}
                                                            className={`group rounded-2xl border bg-white p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                                                                selectedProduce?.id === item.id
                                                                    ? 'border-green-300 ring-2 ring-green-100'
                                                                    : 'border-gray-100 hover:border-green-200'
                                                            }`}
                                                        >
                                                            <div className="aspect-square relative overflow-hidden rounded-xl shadow-sm">
                                                                <Image src={item.image} alt={item.title} fill className="object-cover transition duration-500 group-hover:scale-105" />
                                                            </div>
                                                            <h3 className="mt-3 font-bold text-gray-900">{item.title}</h3>
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="mt-5 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                                                    No produce matches that search yet. Try a vegetable name, nutrient, or benefit.
                                                </div>
                                            )}

                                            {filteredProduce.length > visibleProduce.length ? (
                                                <div className="mt-5 flex justify-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => setVisibleProduceCount((count) => count + 6)}
                                                        className="rounded-full border border-green-200 px-4 py-2 text-sm font-bold text-green-700 transition hover:bg-green-50"
                                                    >
                                                        Show more produce
                                                    </button>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                )}

                                {activeModal === 'supplements' && (
                                    <SupplementsModalSection
                                        isOwner={isOwner}
                                        selectedSupplement={selectedSupplement}
                                        isEditingSupplements={isEditingSupplements}
                                        editingSupplementId={editingSupplementId}
                                        newSupplementTitle={newSupplementTitle}
                                        setNewSupplementTitle={setNewSupplementTitle}
                                        newSupplementImage={newSupplementImage}
                                        setNewSupplementImage={setNewSupplementImage}
                                        newSupplementNutrients={newSupplementNutrients}
                                        setNewSupplementNutrients={setNewSupplementNutrients}
                                        newSupplementBenefits={newSupplementBenefits}
                                        setNewSupplementBenefits={setNewSupplementBenefits}
                                        newSupplementNotes={newSupplementNotes}
                                        setNewSupplementNotes={setNewSupplementNotes}
                                        resetSupplementEditor={resetSupplementEditor}
                                        toggleSupplementEditor={toggleSupplementEditor}
                                        handleAddSupplement={handleAddSupplement}
                                        handleRemoveSupplement={handleRemoveSupplement}
                                        filteredSupplements={filteredSupplements}
                                        supplementSearch={supplementSearch}
                                        setSupplementSearch={setSupplementSearch}
                                        visibleSupplements={visibleSupplements}
                                        setSelectedSupplement={setSelectedSupplement}
                                        handleEditSupplement={handleEditSupplement}
                                        showMoreSupplements={() => setVisibleSupplementCount((count) => count + 6)}
                                        hasMoreSupplements={filteredSupplements.length > visibleSupplements.length}
                                    />
                                )}

                                {activeModal === 'herbs' && (
                                    <HerbsModalSection
                                        isOwner={isOwner}
                                        selectedHerb={selectedHerb}
                                        isEditingHerbs={isEditingHerbs}
                                        editingHerbId={editingHerbId}
                                        newHerbTitle={newHerbTitle}
                                        setNewHerbTitle={setNewHerbTitle}
                                        newHerbImage={newHerbImage}
                                        setNewHerbImage={setNewHerbImage}
                                        newHerbNutrients={newHerbNutrients}
                                        setNewHerbNutrients={setNewHerbNutrients}
                                        newHerbBenefits={newHerbBenefits}
                                        setNewHerbBenefits={setNewHerbBenefits}
                                        newHerbNotes={newHerbNotes}
                                        setNewHerbNotes={setNewHerbNotes}
                                        resetHerbEditor={resetHerbEditor}
                                        toggleHerbEditor={toggleHerbEditor}
                                        handleAddHerb={handleAddHerb}
                                        handleRemoveHerb={handleRemoveHerb}
                                        filteredHerbs={filteredHerbs}
                                        herbSearch={herbSearch}
                                        setHerbSearch={setHerbSearch}
                                        visibleHerbs={visibleHerbs}
                                        setSelectedHerb={setSelectedHerb}
                                        handleEditHerb={handleEditHerb}
                                        showMoreHerbs={() => setVisibleHerbCount((count) => count + 6)}
                                        hasMoreHerbs={filteredHerbs.length > visibleHerbs.length}
                                    />
                                )}

                                {activeModal === 'grow' && (
                                    <div className="space-y-6">
                                        {isOwner ? (
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">Saved videos</p>
                                                    <p className="text-sm text-gray-500">Add creator videos, talks, or recipes you want to revisit.</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {isEditingVideos ? (
                                                        <button
                                                            type="button"
                                                            onClick={resetVideoEditor}
                                                            className="rounded-full border border-gray-200 px-3 py-1 text-xs font-bold text-gray-600 transition hover:bg-gray-50"
                                                        >
                                                            Close
                                                        </button>
                                                    ) : null}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingVideoId(null);
                                                            setNewVideoTitle('');
                                                            setNewVideoLink('');
                                                            setNewVideoChannel('');
                                                            setNewVideoType('Wellness');
                                                            setNewVideoTags('');
                                                            setIsEditingVideos((value) => !value);
                                                        }}
                                                        className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-200 bg-white text-blue-600 transition hover:bg-blue-50"
                                                        aria-label="Add a video"
                                                    >
                                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ) : null}

                                        {isEditingVideos ? (
                                            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 md:grid-cols-2">
                                                <input
                                                    type="text"
                                                    value={newVideoTitle}
                                                    onChange={(e) => setNewVideoTitle(e.target.value)}
                                                    placeholder="Video title"
                                                    className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-blue-400"
                                                />
                                                <input
                                                    type="text"
                                                    value={newVideoChannel}
                                                    onChange={(e) => setNewVideoChannel(e.target.value)}
                                                    placeholder="Channel or creator"
                                                    className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-blue-400"
                                                />
                                                <input
                                                    type="text"
                                                    value={newVideoLink}
                                                    onChange={(e) => setNewVideoLink(e.target.value)}
                                                    placeholder="Paste a YouTube or video link"
                                                    className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-blue-400 md:col-span-2"
                                                />
                                                <input
                                                    type="text"
                                                    value={newVideoTags}
                                                    onChange={(e) => setNewVideoTags(e.target.value)}
                                                    placeholder="Add tags separated by commas"
                                                    className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-blue-400 md:col-span-2"
                                                />
                                                <div className="flex flex-col gap-3 md:col-span-2 md:flex-row md:items-center md:justify-between">
                                                    <select
                                                        value={newVideoType}
                                                        onChange={(e) => setNewVideoType(e.target.value)}
                                                        className="rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-blue-400"
                                                    >
                                                        <option value="Wellness">Wellness</option>
                                                        <option value="Nutrition">Nutrition</option>
                                                        <option value="Recipe">Recipe</option>
                                                        <option value="Motivation">Motivation</option>
                                                    </select>
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={handleAddVideo}
                                                            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                                                        >
                                                            {editingVideoId ? 'Update Video' : 'Add Video'}
                                                        </button>
                                                        {editingVideoId ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    handleRemoveVideo(editingVideoId);
                                                                    resetVideoEditor();
                                                                }}
                                                                className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-500 transition hover:bg-red-50"
                                                            >
                                                                Delete Video
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : null}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {videos.map(item => (
                                                <div key={item.id} className="relative">
                                                    <a
                                                        href={item.link}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="block relative aspect-video rounded-2xl overflow-hidden group shadow-md cursor-pointer hover:ring-4 hover:ring-green-500/30 transition-all"
                                                    >
                                                        <img src={item.image} alt={item.title} className="h-full w-full object-cover group-hover:scale-105 transition duration-500" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex flex-col justify-end p-6">
                                                            <span className="mb-3 inline-flex w-fit rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-gray-900">
                                                                {item.type}
                                                            </span>
                                                            <h3 className="text-white text-xl font-bold flex items-center gap-2">
                                                                {item.title}
                                                                <svg className="w-5 h-5 text-green-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                            </h3>
                                                            <p className="mt-1 text-white/80">{item.channel}</p>
                                                            {item.tags && item.tags.length > 0 ? (
                                                                <div className="mt-3 flex flex-wrap gap-2">
                                                                    {item.tags.map((tag) => (
                                                                        <span key={`${item.id}-${tag}`} className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/90">
                                                                            {tag}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </a>
                                                    {isOwner ? (
                                                        <div className="absolute right-3 top-3">
                                                            <button
                                                                type="button"
                                                                onClick={(event) => {
                                                                    event.preventDefault();
                                                                    event.stopPropagation();
                                                                    handleEditVideo(item);
                                                                }}
                                                                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/50 bg-white/90 text-gray-700 transition hover:bg-white"
                                                                aria-label={`Edit ${item.title}`}
                                                            >
                                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            ))}
                                        </div>

                                        {videos.length === 0 ? (
                                            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                                                No saved videos yet. Add a few to build this part of your profile.
                                            </div>
                                        ) : null}
                                    </div>
                                )}

                                {activeModal === 'recipes' && (
                                    <div className="space-y-6">
                                        {isOwner ? (
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">Saved recipes</p>
                                                    <p className="text-sm text-gray-500">Add recipes you want to keep, adjust, or follow inside your own library.</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {isEditingRecipes ? (
                                                        <button
                                                            type="button"
                                                            onClick={resetRecipeEditor}
                                                            className="rounded-full border border-gray-200 px-3 py-1 text-xs font-bold text-gray-600 transition hover:bg-gray-50"
                                                        >
                                                            Close
                                                        </button>
                                                    ) : null}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            resetRecipeEditor();
                                                            setSelectedRecipe(null);
                                                            setIsEditingRecipes((value) => !value);
                                                        }}
                                                        className="flex h-9 w-9 items-center justify-center rounded-full border border-yellow-200 bg-white text-yellow-600 transition hover:bg-yellow-50"
                                                        aria-label="Add a recipe"
                                                    >
                                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ) : null}

                                        {isEditingRecipes ? (
                                            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-yellow-100 bg-yellow-50/50 p-4">
                                                <input
                                                    type="text"
                                                    value={newRecipeTitle}
                                                    onChange={(e) => setNewRecipeTitle(e.target.value)}
                                                    placeholder="Recipe title"
                                                    className="w-full rounded-xl border border-yellow-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-yellow-400"
                                                />
                                                <input
                                                    type="text"
                                                    value={newRecipeImage}
                                                    onChange={(e) => setNewRecipeImage(e.target.value)}
                                                    placeholder="Optional image URL"
                                                    className="w-full rounded-xl border border-yellow-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-yellow-400"
                                                />
                                                <textarea
                                                    value={newRecipeDescription}
                                                    onChange={(e) => setNewRecipeDescription(e.target.value)}
                                                    rows={4}
                                                    placeholder="Why you like it, when you make it, or what makes it useful."
                                                    className="w-full rounded-xl border border-yellow-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-yellow-400 resize-none"
                                                />
                                                <textarea
                                                    value={newRecipeIngredients}
                                                    onChange={(e) => setNewRecipeIngredients(e.target.value)}
                                                    rows={5}
                                                    placeholder="Ingredients, one per line"
                                                    className="w-full rounded-xl border border-yellow-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-yellow-400 resize-none"
                                                />
                                                <textarea
                                                    value={newRecipeInstructions}
                                                    onChange={(e) => setNewRecipeInstructions(e.target.value)}
                                                    rows={5}
                                                    placeholder="Instructions, one step per line"
                                                    className="w-full rounded-xl border border-yellow-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-yellow-400 resize-none"
                                                />
                                                <input
                                                    type="text"
                                                    value={newRecipeTags}
                                                    onChange={(e) => setNewRecipeTags(e.target.value)}
                                                    placeholder="Add tags separated by commas"
                                                    className="w-full rounded-xl border border-yellow-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-yellow-400"
                                                />
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={handleAddRecipe}
                                                        className="inline-flex items-center justify-center rounded-xl bg-yellow-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-yellow-600"
                                                    >
                                                        {editingRecipeId ? 'Update Recipe' : 'Add Recipe'}
                                                    </button>
                                                    {editingRecipeId ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                handleRemoveRecipe(editingRecipeId);
                                                                resetRecipeEditor();
                                                            }}
                                                            className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-500 transition hover:bg-red-50"
                                                        >
                                                            Delete Recipe
                                                        </button>
                                                    ) : null}
                                                </div>
                                            </div>
                                        ) : null}

                                        {selectedRecipe && !isEditingRecipes ? (
                                            <div className="space-y-6">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedRecipe(null)}
                                                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                                                >
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                                    </svg>
                                                    Back to recipes
                                                </button>

                                                <div className="overflow-hidden rounded-3xl border border-yellow-100 bg-yellow-50/40">
                                                    <div className="relative aspect-[16/7] w-full">
                                                        <Image src={selectedRecipe.image} alt={selectedRecipe.title} fill className="object-cover" />
                                                    </div>
                                                    <div className="space-y-6 p-6">
                                                        <div>
                                                            <h3 className="text-3xl font-bold text-gray-900">{selectedRecipe.title}</h3>
                                                            <p className="mt-3 text-sm leading-7 text-gray-600">{selectedRecipe.description}</p>
                                                            {selectedRecipe.tags && selectedRecipe.tags.length > 0 ? (
                                                                <div className="mt-4 flex flex-wrap gap-2">
                                                                    {selectedRecipe.tags.map((tag) => (
                                                                        <span key={`${selectedRecipe.id}-${tag}`} className="rounded-full bg-yellow-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-yellow-800">
                                                                            {tag}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            ) : null}
                                                        </div>

                                                        <div className="grid gap-6 md:grid-cols-2">
                                                            <div className="rounded-2xl border border-gray-100 bg-white p-5">
                                                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-600">Ingredients</p>
                                                                {selectedRecipe.ingredients.length > 0 ? (
                                                                    <ul className="mt-4 space-y-3">
                                                                        {selectedRecipe.ingredients.map((ingredient, index) => (
                                                                            <li key={`${selectedRecipe.id}-ingredient-${index}`} className="flex items-start gap-3 text-sm text-gray-700">
                                                                                <span className="mt-1 h-2 w-2 rounded-full bg-yellow-400" />
                                                                                <span>{ingredient}</span>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                ) : (
                                                                    <p className="mt-4 text-sm text-gray-500">No ingredients added yet.</p>
                                                                )}
                                                            </div>

                                                            <div className="rounded-2xl border border-gray-100 bg-white p-5">
                                                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-600">Instructions</p>
                                                                {selectedRecipe.instructions.length > 0 ? (
                                                                    <ol className="mt-4 space-y-4">
                                                                        {selectedRecipe.instructions.map((instruction, index) => (
                                                                            <li key={`${selectedRecipe.id}-instruction-${index}`} className="flex items-start gap-3 text-sm text-gray-700">
                                                                                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-[11px] font-bold text-yellow-800">
                                                                                    {index + 1}
                                                                                </span>
                                                                                <span className="pt-0.5">{instruction}</span>
                                                                            </li>
                                                                        ))}
                                                                    </ol>
                                                                ) : (
                                                                    <p className="mt-4 text-sm text-gray-500">No instructions added yet.</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {recipes.map(item => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => setSelectedRecipe(item)}
                                                    className="relative flex gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-lg transition group text-left"
                                                >
                                                    <div className="w-24 h-24 rounded-xl overflow-hidden relative shrink-0">
                                                        <Image src={item.image} alt={item.title} fill className="object-cover" />
                                                    </div>
                                                    <div className="flex flex-col justify-center pr-20">
                                                        <h3 className="font-bold text-gray-900 group-hover:text-green-600 transition">{item.title}</h3>
                                                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                                                        <p className="text-xs text-red-500 font-medium mt-2">❤️ {item.likes} Likes</p>
                                                        {item.tags && item.tags.length > 0 ? (
                                                            <div className="mt-3 flex flex-wrap gap-2">
                                                                {item.tags.map((tag) => (
                                                                    <span key={`${item.id}-${tag}`} className="rounded-full bg-yellow-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-yellow-800">
                                                                        {tag}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                    {isOwner ? (
                                                        <div className="absolute right-4 top-4">
                                                            <button
                                                                type="button"
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    handleEditRecipe(item);
                                                                }}
                                                                className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50"
                                                                aria-label={`Edit ${item.title}`}
                                                            >
                                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    ) : null}
                                                </button>
                                            ))}
                                        </div>
                                        )}

                                        {recipes.length === 0 ? (
                                            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                                                No recipes saved yet. Add one to get started.
                                            </div>
                                        ) : null}
                                    </div>
                                )}

                                {activeModal === 'meal_plan' && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between gap-4 rounded-2xl border border-green-100 bg-green-50/70 p-5">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">This week at a glance</p>
                                                <p className="mt-1 text-sm text-gray-600">This is the meal-plan editor for now. It grew out of the old auto-plan flow rather than a dedicated page.</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsEditingMealPlan((value) => !value)}
                                                    className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                                                        isEditingMealPlan
                                                            ? 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                                            : 'bg-green-600 text-white hover:bg-green-700'
                                                    }`}
                                                >
                                                    {isEditingMealPlan ? 'Done' : 'Edit'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={resetMealPlan}
                                                    className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50"
                                                >
                                                    Rest
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            {mealPlan.map((dayPlan, index) => {
                                                return (
                                                    <div key={dayPlan.id} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                                                        <div className="flex items-center justify-between gap-4">
                                                            <div>
                                                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-600">{dayPlan.dayLabel}</p>
                                                                <p className="mt-1 text-sm text-gray-500">{index === 0 ? 'Today' : `${index} day${index > 1 ? 's' : ''} ahead`}</p>
                                                            </div>
                                                            {dayPlan.notes && !isEditingMealPlan ? (
                                                                <span className="rounded-full bg-green-50 px-3 py-1 text-[11px] font-bold text-green-700">
                                                                    {dayPlan.notes}
                                                                </span>
                                                            ) : null}
                                                        </div>

                                                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                                                            <div className="rounded-2xl border border-green-100 bg-green-50/70 px-4 py-3">
                                                                <p className="text-[11px] font-bold uppercase tracking-wide text-green-700">Breakfast</p>
                                                                {isEditingMealPlan ? (
                                                                    <input
                                                                        type="text"
                                                                        value={dayPlan.breakfast}
                                                                        onChange={(event) => handleMealPlanFieldChange(dayPlan.id, 'breakfast', event.target.value)}
                                                                        className="mt-2 w-full rounded-xl border border-green-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-green-400"
                                                                    />
                                                                ) : (
                                                                    <p className="mt-1 text-sm font-semibold text-gray-900">{dayPlan.breakfast}</p>
                                                                )}
                                                            </div>
                                                            <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3">
                                                                <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700">Lunch</p>
                                                                {isEditingMealPlan ? (
                                                                    <input
                                                                        type="text"
                                                                        value={dayPlan.lunch}
                                                                        onChange={(event) => handleMealPlanFieldChange(dayPlan.id, 'lunch', event.target.value)}
                                                                        className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-amber-400"
                                                                    />
                                                                ) : (
                                                                    <p className="mt-1 text-sm font-semibold text-gray-900">{dayPlan.lunch}</p>
                                                                )}
                                                            </div>
                                                            <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3">
                                                                <p className="text-[11px] font-bold uppercase tracking-wide text-sky-700">Dinner</p>
                                                                {isEditingMealPlan ? (
                                                                    <input
                                                                        type="text"
                                                                        value={dayPlan.dinner}
                                                                        onChange={(event) => handleMealPlanFieldChange(dayPlan.id, 'dinner', event.target.value)}
                                                                        className="mt-2 w-full rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-sky-400"
                                                                    />
                                                                ) : (
                                                                    <p className="mt-1 text-sm font-semibold text-gray-900">{dayPlan.dinner}</p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                                                            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-600">Notes</p>
                                                            {isEditingMealPlan ? (
                                                                <textarea
                                                                    value={dayPlan.notes}
                                                                    onChange={(event) => handleMealPlanFieldChange(dayPlan.id, 'notes', event.target.value)}
                                                                    rows={2}
                                                                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-400 resize-none"
                                                                />
                                                            ) : (
                                                                <p className="mt-1 text-sm text-gray-600">{dayPlan.notes || 'No notes added yet.'}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {activeModal === 'learn' && (
                                    <div className="space-y-8">
                                        <div>
                                            <div className="mb-4 flex items-center justify-between gap-4">
                                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                                                    Useful Links
                                                </h3>
                                                {isOwner ? (
                                                    <div className="flex items-center gap-2">
                                                        {isEditingUsefulLinks ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setIsEditingUsefulLinks(false);
                                                                    setNewUsefulLink('');
                                                                }}
                                                                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-bold text-gray-600 transition hover:bg-gray-50"
                                                            >
                                                                Save
                                                            </button>
                                                        ) : null}
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsEditingUsefulLinks((value) => !value)}
                                                            className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-200 bg-white text-amber-600 transition hover:bg-amber-50"
                                                            aria-label="Add a useful link"
                                                        >
                                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ) : null}
                                            </div>
                                            {isEditingUsefulLinks ? (
                                                <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-amber-100 bg-amber-50/50 p-4 md:flex-row md:items-center">
                                                    <input
                                                        type="text"
                                                        value={newUsefulLink}
                                                        onChange={(e) => setNewUsefulLink(e.target.value)}
                                                        placeholder="Paste a useful link"
                                                        className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-amber-400"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleAddUsefulLink}
                                                        className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-amber-600"
                                                    >
                                                        Enter
                                                    </button>
                                                </div>
                                            ) : null}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {usefulLinks.map(item => (
                                                    <div key={item.id} className="relative">
                                                        <Link href={item.link} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-200 transition group">
                                                            <div className="w-10 h-10 rounded-lg bg-white text-amber-500 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition">
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-gray-900 group-hover:text-amber-700 transition">{item.title}</h4>
                                                                <p className="text-sm text-amber-600">{item.type}</p>
                                                            </div>
                                                        </Link>
                                                        {isEditingUsefulLinks ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveUsefulLink(item.id)}
                                                                className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border border-red-200 bg-white text-red-500 transition hover:bg-red-50"
                                                                aria-label={`Delete ${item.title}`}
                                                            >
                                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                                Pinned Articles
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {PINNED_ARTICLES.map(item => (
                                                    <Link href={item.link} key={item.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-200 transition group">
                                                        <div className="w-10 h-10 rounded-lg bg-white text-blue-500 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" /></svg>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-gray-900 group-hover:text-blue-700 transition">{item.title}</h4>
                                                            <p className="text-xs text-blue-400 font-medium">{item.author}</p>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeModal === 'learn_legacy' && (
                                    <div className="space-y-8">
                                        {/* Certifications / Progress */}
                                        <div>
                                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                                                Useful Links
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {LEARN_GALLERY.map(item => (
                                                    <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-200 transition group">
                                                        <div className="w-10 h-10 rounded-lg bg-white text-amber-500 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition">
                                                            {item.progress === 'Completed' ? '✓' : '%'}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-gray-900">{item.title}</h4>
                                                            <p className="text-sm text-gray-500">{item.progress}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Resources Section */}
                                        <div>
                                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                                My Resources
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {RESOURCES.map(item => (
                                                    <Link href={item.link} key={item.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-200 transition group">
                                                        <div className="w-10 h-10 rounded-lg bg-white text-blue-500 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition">
                                                            {item.type === 'Link' ? (
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                                            ) : (
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-gray-900 group-hover:text-blue-700 transition">{item.title}</h4>
                                                            <p className="text-xs text-blue-400 font-medium uppercase tracking-wide">{item.type}</p>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeModal === 'favorites_places' && (
                                    <div className="space-y-4">
                                        {isLoadingFavoritePlaces ? (
                                            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-8 text-center text-sm text-gray-500">
                                                Loading favorite places...
                                            </div>
                                        ) : favoritedPlaces.length > 0 ? favoritedPlaces.map((place: any, index: number) => {
                                            const label = place?.name || place?.title || place?.label || `Saved place ${index + 1}`;
                                            const detail = place?.location || place?.address || place?.city || place?.notes || '';
                                            const mapsUrl = place?.mapsUrl || place?.map_url || place?.url;
                                            const visitCount = Number(place?.visit_count || 0);

                                            return (
                                                <div key={`${label}-${index}`} className="rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 transition hover:border-emerald-200 hover:bg-emerald-50/50">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <p className="text-sm font-bold text-gray-900">{label}</p>
                                                                {visitCount > 0 ? (
                                                                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 shadow-sm">
                                                                        {visitCount} visit{visitCount === 1 ? '' : 's'}
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                            {detail ? <p className="mt-1 text-sm text-gray-500">{detail}</p> : null}
                                                        </div>
                                                        {place?.rating ? (
                                                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-700 shadow-sm">
                                                                {Number(place.rating).toFixed(1)}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    <div className="mt-4 flex flex-wrap gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => void handleOpenPlaceVisits(place)}
                                                            className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50"
                                                        >
                                                            {visitCount > 0 ? 'Open visit log' : 'Add first visit'}
                                                        </button>
                                                        {mapsUrl ? (
                                                            <a
                                                                href={mapsUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-100"
                                                            >
                                                                Open map
                                                            </a>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            );
                                        }) : (
                                            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-8 text-center text-sm text-gray-500">
                                                No favorite places yet.
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeModal === 'favorite_place_visits' && (
                                    <div className="space-y-6">
                                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
                                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {selectedFavoritePlace?.name || selectedFavoritePlace?.title || 'Track how each visit went'}
                                                    </p>
                                                    <p className="mt-1 text-sm text-gray-600">
                                                        Add different meals, reactions, and repeat-visit notes for {selectedFavoritePlace?.name || selectedFavoritePlace?.title || 'this place'} over time.
                                                    </p>
                                                </div>
                                                {selectedFavoritePlace?.mapsUrl ? (
                                                    <a
                                                        href={selectedFavoritePlace.mapsUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                                                    >
                                                        Open map
                                                    </a>
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                                            <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900">
                                                            {editingPlaceVisitId ? 'Edit visit entry' : 'Log a new visit'}
                                                        </p>
                                                        <p className="mt-1 text-sm text-gray-500">
                                                            Capture the meal, how it felt, and whether you would go back.
                                                        </p>
                                                    </div>
                                                    {editingPlaceVisitId ? (
                                                        <button
                                                            type="button"
                                                            onClick={resetPlaceVisitEditor}
                                                            className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition hover:bg-gray-50"
                                                        >
                                                            Cancel edit
                                                        </button>
                                                    ) : null}
                                                </div>

                                                <div className="mt-5 space-y-4">
                                                    <div className="grid gap-4 md:grid-cols-2">
                                                        <div>
                                                            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Visit date</label>
                                                            <input
                                                                type="date"
                                                                value={placeVisitForm.visited_at}
                                                                onChange={(event) => setPlaceVisitForm((current) => ({ ...current, visited_at: event.target.value }))}
                                                                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-emerald-400"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Rating</label>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max="5"
                                                                step="1"
                                                                value={placeVisitForm.rating}
                                                                onChange={(event) => setPlaceVisitForm((current) => ({ ...current, rating: event.target.value }))}
                                                                placeholder="1 to 5"
                                                                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-emerald-400"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Meal</label>
                                                        <input
                                                            type="text"
                                                            value={placeVisitForm.meal_name}
                                                            onChange={(event) => setPlaceVisitForm((current) => ({ ...current, meal_name: event.target.value }))}
                                                            placeholder="Example: grilled salmon bowl"
                                                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-emerald-400"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Meal notes</label>
                                                        <textarea
                                                            rows={3}
                                                            value={placeVisitForm.meal_notes}
                                                            onChange={(event) => setPlaceVisitForm((current) => ({ ...current, meal_notes: event.target.value }))}
                                                            placeholder="What did you order, what stood out, or what ingredients mattered?"
                                                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-emerald-400 resize-none"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Body response</label>
                                                        <textarea
                                                            rows={3}
                                                            value={placeVisitForm.body_response}
                                                            onChange={(event) => setPlaceVisitForm((current) => ({ ...current, body_response: event.target.value }))}
                                                            placeholder="How did it make you feel afterward?"
                                                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-emerald-400 resize-none"
                                                        />
                                                    </div>

                                                    <div className="grid gap-4 md:grid-cols-3">
                                                        <div>
                                                            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Liked it?</label>
                                                            <select
                                                                value={placeVisitForm.liked_it}
                                                                onChange={(event) => setPlaceVisitForm((current) => ({ ...current, liked_it: event.target.value }))}
                                                                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-emerald-400"
                                                            >
                                                                <option value="">Not set</option>
                                                                <option value="yes">Yes</option>
                                                                <option value="no">No</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Would repeat?</label>
                                                            <select
                                                                value={placeVisitForm.would_repeat}
                                                                onChange={(event) => setPlaceVisitForm((current) => ({ ...current, would_repeat: event.target.value }))}
                                                                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-emerald-400"
                                                            >
                                                                <option value="">Not set</option>
                                                                <option value="yes">Yes</option>
                                                                <option value="no">No</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Keep saved?</label>
                                                            <select
                                                                value={placeVisitForm.keep_as_favorite}
                                                                onChange={(event) => setPlaceVisitForm((current) => ({ ...current, keep_as_favorite: event.target.value }))}
                                                                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-emerald-400"
                                                            >
                                                                <option value="">Not set</option>
                                                                <option value="yes">Yes</option>
                                                                <option value="no">No</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
                                                    <button
                                                        type="button"
                                                        onClick={resetPlaceVisitEditor}
                                                        className="rounded-full border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-50"
                                                    >
                                                        Reset
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleSavePlaceVisit}
                                                        disabled={isSavingPlaceVisit || !selectedFavoritePlace?.place_profile_id}
                                                        className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        {isSavingPlaceVisit ? 'Saving...' : (editingPlaceVisitId ? 'Update visit' : 'Save visit')}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900">Your visit history</p>
                                                        <p className="mt-1 text-sm text-gray-500">
                                                            Each visit stays separate so your notes can evolve over time.
                                                        </p>
                                                    </div>
                                                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
                                                        {placeVisits.length}
                                                    </span>
                                                </div>

                                                <div className="mt-5 space-y-3">
                                                    {isLoadingPlaceVisits ? (
                                                        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-8 text-center text-sm text-gray-500">
                                                            Loading visits...
                                                        </div>
                                                    ) : placeVisits.length > 0 ? placeVisits.map((visit: any) => (
                                                        <div key={visit.id} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div>
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <p className="text-sm font-bold text-gray-900">
                                                                            {visit?.meal_name || 'Visit entry'}
                                                                        </p>
                                                                        {visit?.rating ? (
                                                                            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 shadow-sm">
                                                                                {Number(visit.rating).toFixed(0)}/5
                                                                            </span>
                                                                        ) : null}
                                                                    </div>
                                                                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                                                                        {visit?.visited_at ? new Date(visit.visited_at).toLocaleDateString() : 'Date not set'}
                                                                    </p>
                                                                </div>
                                                                <div className="flex flex-wrap gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleEditPlaceVisit(visit)}
                                                                        className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 transition hover:bg-gray-100"
                                                                    >
                                                                        Edit
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => void handleDeletePlaceVisit(String(visit.id || ''))}
                                                                        disabled={isSavingPlaceVisit}
                                                                        className="rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {visit?.meal_notes ? (
                                                                <p className="mt-3 text-sm text-gray-600">{visit.meal_notes}</p>
                                                            ) : null}
                                                            {visit?.body_response ? (
                                                                <p className="mt-2 text-sm text-gray-500">{visit.body_response}</p>
                                                            ) : null}

                                                            <div className="mt-3 flex flex-wrap gap-2">
                                                                {typeof visit?.liked_it === 'boolean' ? (
                                                                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-600">
                                                                        {visit.liked_it ? 'Liked it' : 'Did not like it'}
                                                                    </span>
                                                                ) : null}
                                                                {typeof visit?.would_repeat === 'boolean' ? (
                                                                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-600">
                                                                        {visit.would_repeat ? 'Would repeat' : 'Would not repeat'}
                                                                    </span>
                                                                ) : null}
                                                                {typeof visit?.keep_as_favorite === 'boolean' ? (
                                                                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-600">
                                                                        {visit.keep_as_favorite ? 'Keep saved' : 'Do not keep saved'}
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    )) : (
                                                        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-8 text-center text-sm text-gray-500">
                                                            No visits logged yet for this place.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeModal === 'favorites_chats' && (
                                    <div className="space-y-4">
                                        {favoritedChats.length > 0 ? favoritedChats.map((chat: any, index: number) => {
                                            const chatId = String(chat?.id || chat?.conversationId || index);
                                            const title = chat?.title || chat?.label || `Saved chat ${index + 1}`;
                                            const updatedAt = chat?.updated_at
                                                ? new Date(chat.updated_at).toLocaleDateString()
                                                : null;

                                            return (
                                                <Link
                                                    key={chatId}
                                                    href={`/?tab=chat&conversationId=${chatId}`}
                                                    className="block rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 transition hover:border-sky-200 hover:bg-sky-50/50"
                                                >
                                                    <p className="text-sm font-bold text-gray-900">{title}</p>
                                                    {updatedAt ? <p className="mt-1 text-sm text-gray-500">Updated {updatedAt}</p> : null}
                                                </Link>
                                            );
                                        }) : (
                                            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-8 text-center text-sm text-gray-500">
                                                No favorite chats yet.
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeModal === 'favorites_experts' && (
                                    <div className="space-y-4">
                                        {favoritedExperts.length > 0 ? favoritedExperts.map((expert: any, index: number) => {
                                            const name = expert?.name || expert?.title || expert?.full_name || expert?.label || `Saved expert ${index + 1}`;
                                            const specialty = expert?.specialty || expert?.focus || expert?.headline || expert?.notes || '';
                                            const href = expert?.href || expert?.url || expert?.profileUrl;

                                            const content = (
                                                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 transition hover:border-amber-200 hover:bg-amber-50/50">
                                                    <p className="text-sm font-bold text-gray-900">{name}</p>
                                                    {specialty ? <p className="mt-1 text-sm text-gray-500">{specialty}</p> : null}
                                                </div>
                                            );

                                            return href ? (
                                                <a key={`${name}-${index}`} href={href} target="_blank" rel="noreferrer" className="block">
                                                    {content}
                                                </a>
                                            ) : (
                                                <div key={`${name}-${index}`}>{content}</div>
                                            );
                                        }) : (
                                            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-8 text-center text-sm text-gray-500">
                                                No favorite experts yet.
                                            </div>
                                        )}
                                    </div>
                                )}

                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
