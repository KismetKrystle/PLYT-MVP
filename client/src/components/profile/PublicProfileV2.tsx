'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';
import { useAuth } from '../../lib/auth';

interface ProfileProps {
    user: any;
    isOwner?: boolean; // Optional prop to determine if the viewer is the profile owner
}

// -- Reuse Mock Data from PublicProfile --
const FOOD_GALLERY = [
    { id: 1, title: 'Cherry Tomatoes', image: '/assets/images/gallery/cherry_tomatoes.png', status: 'Harvested' },
    { id: 2, title: 'Organic Kale', image: '/assets/images/gallery/organic_kale.png', status: 'Growing' },
    { id: 3, title: 'Basil', image: '/assets/images/gallery/fresh_herbs.png', status: 'Harvested' },
    { id: 4, title: 'Spinach', image: '/assets/images/gallery/spinach.png', status: 'Planted' },
];

const VIDEO_GALLERY = [
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

const RECIPES = [
    { id: 1, title: 'Fresh Kale Salad', image: '/assets/images/gallery/organic_kale.png', likes: 124 },
    { id: 2, title: 'Tomato Basil Pasta', image: '/assets/images/gallery/cherry_tomatoes.png', likes: 85 },
];

const DIET_JOURNEYS = [
    { id: 1, title: 'My 30 Day Plant-Based Challenge', date: 'Oct 2024' },
    { id: 2, title: 'Reducing Sugar with Homegrown Stevia', date: 'Sep 2024' },
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

const WALL_POSTS = [
    { id: 1, type: 'image', user: 'Urban Gardener', content: 'Just harvested my first batch of hydroponic lettuce! 🥬 #UrbanFarming #Hydroponics', image: '/assets/images/gallery/organic_kale.png', likes: 24, comments: 5, time: '2h ago' },
    { id: 2, type: 'status', user: 'Urban Gardener', content: 'Thinking about expanding to aquaponics next season. Anyone have experience with Tilapia? 🐟', likes: 12, comments: 8, time: '5h ago' },
    { id: 3, type: 'image', user: 'Urban Gardener', content: 'Beautiful sunset over the community garden today. Grateful for this space.', image: '/assets/images/gallery/community_garden.png', likes: 45, comments: 2, time: '1d ago' },
];

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

type MealEntry = { breakfast: string; lunch: string; dinner: string; notes: string };

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

export default function PublicProfileV2({ user, isOwner = true }: ProfileProps) {
    const { token, loading: authLoading } = useAuth();
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [usefulLinks, setUsefulLinks] = useState(USEFUL_LINKS);
    const [isEditingUsefulLinks, setIsEditingUsefulLinks] = useState(false);
    const [newUsefulLink, setNewUsefulLink] = useState('');
    const [profileData, setProfileData] = useState<any>(() => extractProfileData(user));
    const [savedChats, setSavedChats] = useState<Array<{ id: string; title: string; updated_at?: string }>>([]);
    const [healthyDays] = useState(42);
    const featuredVideo = VIDEO_GALLERY[VIDEO_GALLERY.length - 1];

    // Edit Profile Form State
    const [editForm, setEditForm] = useState({
        full_name: user?.full_name || '',
        location_city: user?.location_city || '',
        location_address: user?.location_address || '',
        bio: user?.bio || ''
    });

    const router = useRouter();

    useEffect(() => {
        setProfileData(extractProfileData(user));
    }, [user]);

    useEffect(() => {
        if (authLoading || !token || !isOwner) {
            if (!isOwner) {
                setSavedChats([]);
            }
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

        void fetchFreshProfileData();
        void fetchSavedChats();

        return () => {
            isCancelled = true;
        };
    }, [authLoading, isOwner, token]);

    const favoritedPlaces = useMemo(() => {
        const candidates =
            profileData?.favorite_places ||
            profileData?.favorited_places ||
            profileData?.saved_places ||
            [];

        return Array.isArray(candidates) ? candidates : [];
    }, [profileData]);

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
            emptyState: 'No favorite places yet.'
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

    // Common Action Button Component
    const ActionButton = ({ type, modal }: { type: 'edit' | 'like', modal?: string }) => (
        <button
            className="absolute top-4 right-4 bg-white/30 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/50 transition z-20"
            onClick={(e) => {
                e.stopPropagation();
                if (type === 'edit') setActiveModal(modal || 'edit');
                else console.log('Like clicked');
            }}
        >
            {type === 'edit' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            )}
        </button>
    );

    return (
        <div className="w-full h-full overflow-y-auto bg-gray-50 p-4 md:p-8 no-scrollbar relative">
            <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-min">

                {/* -- Box 1: Identity (Row 1, Col 1-2) -- */}
                <div className="col-span-2 md:col-span-4 bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 transition-all duration-300 flex items-center gap-6 relative overflow-hidden group">
                    {isOwner && <ActionButton type="edit" modal="edit" />}
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
                        <h1 className="text-2xl font-bold text-gray-900">{user?.full_name || user?.email?.split('@')[0] || 'Urban Gardener'}</h1>
                        <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                            {user?.bio || 'Passionate about sustainable living. Join me on my journey! 🌱'}
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
                    <p className="text-xs text-green-600 font-medium mt-2 bg-green-50 px-2 py-1 rounded-full">Improving Daily</p>
                </Link>

                {/* -- Box 4: Food I Eat (Row 2, Col 2-4) -- */}
                <div
                    onClick={() => setActiveModal('food')}
                    className="md:col-span-3 bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 transition-all duration-300 relative overflow-hidden group cursor-pointer"
                >
                    <ActionButton type={isOwner ? 'edit' : 'like'} />
                    {/* Background Image (Cover) */}
                    <div className="absolute inset-0">
                        <Image
                            src={FOOD_GALLERY[0].image}
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
                            <button className="text-xs text-white/90 hover:text-white bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/30 transition-colors">View All (4)</button>
                        </div>
                        <div>
                            <p className="text-white text-2xl font-bold border-l-4 border-green-500 pl-3">{FOOD_GALLERY[0].title}</p>
                            <p className="text-white/80 text-sm mt-1 pl-4">{FOOD_GALLERY[0].status} • +3 others</p>
                        </div>
                    </div>
                </div>

                {/* -- Box 5: Videos I Love (Vertical) -- */}
                <div
                    onClick={() => setActiveModal('grow')}
                    className="col-span-1 md:col-span-1 md:row-span-2 bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 transition-all duration-300 relative overflow-hidden group cursor-pointer"
                >
                    <ActionButton type={isOwner ? 'edit' : 'like'} />
                    <div className="absolute inset-0">
                        <img
                            src={featuredVideo.image}
                            alt={featuredVideo.title}
                            className="h-full w-full object-cover scale-125 group-hover:scale-[1.32] transition duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                    </div>

                    <div className="relative z-10 h-full flex flex-col justify-between" style={{ minHeight: '160px' }}>
                        <h3 className="font-extrabold text-white flex items-center gap-2 text-3xl tracking-tight leading-none">
                            <span className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)] shrink-0"></span>
                            Videos <br /> I Love
                        </h3>
                        <div>
                            <p className="text-white text-xl font-bold border-l-4 border-blue-500 pl-3">{featuredVideo.title}</p>
                            <p className="text-white/80 text-sm pl-4">{featuredVideo.channel}</p>
                        </div>
                    </div>
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
                        "To plant a garden is to believe in tomorrow."
                    </p>
                    <p className="text-gray-400 text-xs mt-3 uppercase tracking-wider font-bold">- Audrey Hepburn</p>
                </div>

                {/* -- Box 6: Knowledge Bank (Row 3, Col 3-4) -- */}
                <div
                    onClick={() => router.push('/knowledge-bank')}
                    className="col-span-2 md:col-span-2 bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 transition-all duration-300 cursor-pointer group"
                >
                    <ActionButton type={isOwner ? 'edit' : 'like'} />
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v11.494m0-11.494C10.832 5.477 9.246 5 7.5 5A4.5 4.5 0 003 9.5v8A2.5 2.5 0 005.5 20H12m0-13.747C13.168 5.477 14.754 5 16.5 5A4.5 4.5 0 0121 9.5v8a2.5 2.5 0 01-2.5 2.5H12" />
                                </svg>
                            </span>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Knowledge Bank</h3>
                                <p className="mt-1 text-sm font-medium text-gray-500">
                                    ❤️ {USEFUL_LINKS.length + PINNED_ARTICLES.length + 218} total likes
                                </p>
                            </div>
                        </div>
                        <span className="text-4xl font-extrabold leading-none text-gray-900">
                            {usefulLinks.length + PINNED_ARTICLES.length}
                        </span>
                    </div>
                </div>

                {/* -- Box 7: Recipes (Row 4, Col 1) -- */}
                <div
                    onClick={() => setActiveModal('recipes')}
                    className="bg-white rounded-3xl p-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 transition-all duration-300 overflow-hidden group relative cursor-pointer"
                >
                    <ActionButton type={isOwner ? 'edit' : 'like'} />
                    <div className="absolute inset-0">
                        <Image
                            src={RECIPES[0].image}
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
                        <p className="text-white text-lg font-bold leading-tight mb-1 border-l-4 border-yellow-400 pl-3">{RECIPES[0].title}</p>
                        <p className="text-white/70 text-xs pl-4">❤️ {RECIPES[0].likes} Likes</p>
                    </div>
                </div>

                {/* -- Box 8: Diet Journeys (Row 4, Col 2) -- */}
                <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 transition-all duration-300">
                    <h3 className="font-bold text-gray-900 text-sm mb-4 uppercase tracking-wide">Journeys</h3>
                    <div className="space-y-4">
                        {DIET_JOURNEYS.map(item => (
                            <div key={item.id} className="border-l-2 border-purple-100 pl-3 py-1">
                                <p className="text-[10px] text-purple-600 font-bold mb-0.5">{item.date}</p>
                                <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug hover:text-purple-700 cursor-pointer">{item.title}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 transition-all duration-300">
                    <div className="flex flex-col items-start gap-3">
                        <div>
                            <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Meals of the Day</h3>
                        </div>
                        <Link
                            href="/?tab=customer_profile&mealPlan=full-month"
                            className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-[11px] font-bold text-green-700 transition hover:bg-green-100"
                        >
                            View Full Meal Plan
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    </div>

                    {todayMeal ? (
                        <div className="mt-5 space-y-3">
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

                <div className="col-span-2 md:col-span-2 md:col-start-2 bg-white rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
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

                {/* -- Box 9: Wall of Posts (Feed) -- */}
                <div className="col-span-2 md:col-span-4 bg-transparent rounded-3xl p-0 mt-4 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-bold text-gray-900">Community Wall</h3>
                        <button className="text-sm font-semibold text-green-600 bg-white px-4 py-2 rounded-full shadow-sm hover:shadow-md transition">Create Post +</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {WALL_POSTS.map(post => (
                            <div key={post.id} className="bg-white rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 transition-all duration-300 flex flex-col h-full">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-green-100 overflow-hidden relative border border-gray-100">
                                        <Image src="/assets/images/gallery/user_avatar.png" alt="User" fill className="object-cover" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{post.user}</p>
                                        <p className="text-[10px] text-gray-400">{post.time}</p>
                                    </div>
                                </div>

                                {post.image && (
                                    <div className="aspect-video relative rounded-2xl overflow-hidden mb-3 shadow-inner">
                                        <Image src={post.image} alt="Post content" fill className="object-cover" />
                                    </div>
                                )}

                                <p className="text-sm text-gray-700 leading-relaxed mb-4 flex-grow">
                                    {post.content}
                                </p>

                                <div className="flex items-center gap-4 border-t border-gray-100 pt-3 mt-auto">
                                    <button className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-red-500 transition">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                        {post.likes}
                                    </button>
                                    <button className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-blue-500 transition">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                        {post.comments}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

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
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setActiveModal(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {activeModal === 'food' && 'Food I Eat'}
                                    {activeModal === 'grow' && 'Videos I Love'}
                                    {activeModal === 'recipes' && 'Shared Recipes'}
                                    {activeModal === 'learn' && 'Useful Links'}
                                    {activeModal === 'edit' && 'Edit Profile'}
                                    {(activeModal && FAVORITE_MODAL_TITLES[activeModal]) || ''}
                                </h2>
                                <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-gray-100 rounded-full transition">
                                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            {/* Content Scroller */}
                            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                                {activeModal === 'edit' && (
                                    <div className="space-y-6">
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
                                    <div className="flex flex-col gap-6">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                            {FOOD_GALLERY.map(item => (
                                                <div key={item.id} className="group cursor-pointer">
                                                    <div className="aspect-square relative rounded-xl overflow-hidden mb-3 shadow-md">
                                                        <Image src={item.image} alt={item.title} fill className="object-cover group-hover:scale-105 transition duration-500" />
                                                        <div className="absolute top-2 right-2 bg-white/90 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide text-green-800 backdrop-blur-sm shadow-sm">{item.status}</div>
                                                    </div>
                                                    <h3 className="font-bold text-gray-900">{item.title}</h3>
                                                    <p className="text-xs text-gray-400">Harvested 2 days ago</p>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-4 pt-6 border-t border-gray-100 flex justify-center">
                                            <Link
                                                href="/?tab=find_produce"
                                                className="inline-flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                                Order More Food
                                            </Link>
                                        </div>
                                    </div>
                                )}

                                {activeModal === 'grow' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {VIDEO_GALLERY.map(item => (
                                            <a
                                                href={item.link}
                                                target="_blank"
                                                rel="noreferrer"
                                                key={item.id}
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
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                )}

                                {activeModal === 'recipes' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {RECIPES.map(item => (
                                            <div key={item.id} className="flex gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-lg transition cursor-pointer group">
                                                <div className="w-24 h-24 rounded-xl overflow-hidden relative shrink-0">
                                                    <Image src={item.image} alt={item.title} fill className="object-cover" />
                                                </div>
                                                <div className="flex flex-col justify-center">
                                                    <h3 className="font-bold text-gray-900 group-hover:text-green-600 transition">{item.title}</h3>
                                                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">A delicious and healthy recipe featuring fresh ingredients from the garden.</p>
                                                    <p className="text-xs text-red-500 font-medium mt-2">❤️ {item.likes} Likes</p>
                                                </div>
                                            </div>
                                        ))}
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
                                        {favoritedPlaces.length > 0 ? favoritedPlaces.map((place: any, index: number) => {
                                            const label = place?.name || place?.title || place?.label || `Saved place ${index + 1}`;
                                            const detail = place?.location || place?.address || place?.city || place?.notes || '';
                                            const mapsUrl = place?.mapsUrl || place?.map_url || place?.url;

                                            const content = (
                                                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 transition hover:border-emerald-200 hover:bg-emerald-50/50">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-900">{label}</p>
                                                            {detail ? <p className="mt-1 text-sm text-gray-500">{detail}</p> : null}
                                                        </div>
                                                        {place?.rating ? (
                                                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-700 shadow-sm">
                                                                {Number(place.rating).toFixed(1)}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            );

                                            return mapsUrl ? (
                                                <a key={`${label}-${index}`} href={mapsUrl} target="_blank" rel="noreferrer" className="block">
                                                    {content}
                                                </a>
                                            ) : (
                                                <div key={`${label}-${index}`}>{content}</div>
                                            );
                                        }) : (
                                            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-8 text-center text-sm text-gray-500">
                                                No favorite places yet.
                                            </div>
                                        )}
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
