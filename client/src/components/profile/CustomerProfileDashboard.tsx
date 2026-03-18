'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '../../lib/api';
import { useAuth } from '../../lib/auth';

type Props = {
    user: any;
};

// ── same mock data as before ──────────────────────────────────────────────────
const journeyFeed = [
    { id: 1, type: 'image', title: 'Week 1: Fresh Start', caption: 'Swapped processed snacks for fresh fruit + nuts.', mediaUrl: '/assets/images/gallery/cherry_tomatoes.png', postedAt: '2 days ago' },
    { id: 2, type: 'image', title: 'Local Market Haul', caption: 'Picked up spinach, basil, and red carrots from local growers.', mediaUrl: '/assets/images/gallery/organic_kale.png', postedAt: '4 days ago' },
];
const pinnedArticles = [
    { id: 1, title: '10 Anti-Inflammatory Foods to Add This Week', author: 'A. Monroe' },
    { id: 2, title: 'How to Build a Realistic Plant-Forward Plate', author: 'J. Patel, RD' },
];
const pinnedVideos = [
    {
        id: 1,
        title: '5 Anti-Inflammatory Foods That Improve Body Pain!',
        channel: 'Dr. Roberto Yano',
        href: 'https://www.youtube.com/watch?v=c3MlI45j-rg',
        previewImage: 'https://i.ytimg.com/vi/c3MlI45j-rg/hqdefault.jpg'
    },
    {
        id: 2,
        title: 'How to Build a Healthy Plate',
        channel: 'NutritionFacts.org',
        href: 'https://www.youtube.com/watch?v=lXXXygDRyBU',
        previewImage: 'https://i.ytimg.com/vi/lXXXygDRyBU/hqdefault.jpg'
    }
];
const resourceLinks = [
    { id: 1, label: 'Raw Food Starter Guide', href: '#' },
    { id: 2, label: 'Community Farm Map', href: '#' },
];
const favoritedExperts = [
    { id: 1, name: 'Dr. Jane Smith', specialty: 'Gut Health' },
    { id: 2, name: 'Marcus Lee, CNS', specialty: 'Plant-Based Nutrition' },
];
const weekMeals = [
    { day: 'Mon', breakfast: 'Berry oats', lunch: 'Kale salad', dinner: 'Lentil bowl' },
    { day: 'Tue', breakfast: 'Green smoothie', lunch: 'Quinoa bowl', dinner: 'Veg stir-fry' },
    { day: 'Wed', breakfast: 'Chia pudding', lunch: 'Chickpea wrap', dinner: 'Miso veggies' },
    { day: 'Thu', breakfast: 'Fruit + nuts', lunch: 'Avocado toast', dinner: 'Bean chili' },
    { day: 'Fri', breakfast: 'Overnight oats', lunch: 'Buddha bowl', dinner: 'Herb pasta' },
    { day: 'Sat', breakfast: 'Yogurt parfait', lunch: 'Roasted veggie wrap', dinner: 'Tofu noodle bowl' },
    { day: 'Sun', breakfast: 'Protein pancakes', lunch: 'Mediterranean salad', dinner: 'Veggie stew' },
];
const foodCart = [
    { id: 1, item: 'Organic Kale', qty: 2, unit: 'bundle', price: 14 },
    { id: 2, item: 'Cherry Tomatoes', qty: 1, unit: 'kg', price: 25 },
];
const foodHistory = [
    { id: 1, order: '#F-2098', date: '2026-02-20', summary: 'Kale, spinach, basil', total: 39 },
    { id: 2, order: '#F-2051', date: '2026-02-14', summary: 'Tomatoes, carrots, lettuce', total: 48 },
];

// ── label maps for display ────────────────────────────────────────────────────
const CONDITION_LABELS: Record<string, string> = {
    fibroids: '🌸 Fibroids',
    no_gallbladder: '🫀 No Gallbladder',
    diabetes: '🩸 Diabetes',
    high_blood_pressure: '💓 High Blood Pressure',
    digestive_issues: '🌿 Digestive Issues',
    hormonal_imbalance: '⚖️ Hormonal Imbalance',
    thyroid: '🦋 Thyroid Condition',
    inflammation: '🔥 Chronic Inflammation',
};
const PREFERENCE_LABELS: Record<string, string> = {
    vegan: 'Vegan', vegetarian: 'Vegetarian', pescatarian: 'Pescatarian', celiac: 'Celiac', raw_vegan: 'Raw Vegan',
    gluten_free: 'Gluten-Free', dairy_free: 'Dairy-Free',
    paleo: 'Paleo', low_sugar: 'Low Sugar', low_fat: 'Low Fat',
};
const GOAL_LABELS: Record<string, string> = {
    reduce_inflammation: 'Reduce Inflammation',
    hormone_balance: 'Balance Hormones',
    weight_management: 'Weight Management',
    gut_health: 'Improve Gut Health',
    energy: 'Increase Energy',
    blood_sugar: 'Stabilize Blood Sugar',
    heart_health: 'Support Heart Health',
    mental_clarity: 'Mental Clarity',
};

function fromCsv(value: string | undefined) {
    return (value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function buildHealthDashboardSummary(profile: any, userRecord: any) {
    const conditions = (profile?.health_conditions || []).map((item: string) => CONDITION_LABELS[item] || item);
    const preferences = (profile?.dietary_preferences || []).map((item: string) => PREFERENCE_LABELS[item] || item);
    const allergies = (profile?.allergies || []).map((item: string) => item);
    const goals = (profile?.wellness_goals || []).map((item: string) => GOAL_LABELS[item] || item);
    const location = typeof profile?.location === 'string'
        ? profile.location
        : [profile?.location?.city, profile?.location?.address].filter(Boolean).join(', ');
    const identityLocation = [userRecord?.location_city, userRecord?.location_address].filter(Boolean).join(', ');
    const notes = profile?.notes?.trim?.() || '';
    const name = userRecord?.full_name || userRecord?.name || userRecord?.email?.split('@')[0] || 'This member';

    const parts = [
        `${name} is tracking ${conditions.length ? conditions.join(', ') : 'no recorded health conditions yet'}.`,
        goals.length ? `Current goals include ${goals.join(', ')}.` : '',
        preferences.length ? `Eating style includes ${preferences.join(', ')}.` : '',
        allergies.length ? `Avoidances include ${allergies.join(', ')}.` : '',
        location ? `Health profile location: ${location}.` : identityLocation ? `About You location: ${identityLocation}.` : '',
        notes ? `Notes: ${notes}.` : ''
    ].filter(Boolean);

    return parts.join(' ');
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
type MealEntry = { breakfast: string; lunch: string; dinner: string; notes: string };
type MealStatus = 'eaten' | 'missed';

function toDateKey(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function startOfWeek(date: Date) {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = copy.getDay();
    copy.setDate(copy.getDate() - day);
    return copy;
}

function defaultMealForDate(date: Date): MealEntry {
    const fallback = weekMeals[date.getDay() === 0 ? 6 : date.getDay() - 1];
    return {
        breakfast: fallback.breakfast,
        lunch: fallback.lunch,
        dinner: fallback.dinner,
        notes: ''
    };
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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
            <div className="mt-4">{children}</div>
        </section>
    );
}

function Pill({ label, color }: { label: string; color: string }) {
    return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${color}`}>
            {label}
        </span>
    );
}

export default function CustomerProfileDashboard({ user }: Props) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { token, loading: authLoading } = useAuth();
    const [avatar, setAvatar] = useState<string>(user?.avatar_url || '/assets/images/gallery/user_avatar.png');
    const [healthyDays] = useState(42);
    const [profileData, setProfileData] = useState<any>(null);
    const [resolvedUser, setResolvedUser] = useState<any>(user || null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [mealByDate, setMealByDate] = useState<Record<string, MealEntry>>({});
    const [mealStatusByDate, setMealStatusByDate] = useState<Record<string, MealStatus>>({});
    const [selectedDateKey, setSelectedDateKey] = useState(toDateKey(new Date()));
    const [mealDraft, setMealDraft] = useState<MealEntry>({ breakfast: '', lunch: '', dinner: '', notes: '' });
    const [isHealthProfileOpen, setIsHealthProfileOpen] = useState(true);
    const [savedChats, setSavedChats] = useState<Array<{ id: string; title: string; updated_at: string }>>([]);
    const weekScrollerRef = useRef<HTMLDivElement | null>(null);
    const todayCardRef = useRef<HTMLButtonElement | null>(null);

    // ── Fetch real profile data from API ─────────────────────────────────────
    useEffect(() => {
        if (authLoading) return;

        const fetchProfile = async () => {
            if (!token && !user?.id) {
                const rawData = user?.profile_data || {};
                const data = rawData?.profile_data && typeof rawData.profile_data === 'object'
                    ? rawData.profile_data
                    : rawData;
                setResolvedUser(user || null);
                setProfileData(data);
                setLoadingProfile(false);
                return;
            }

            try {
                const meRes = await api.get('/user/me');
                const me = meRes.data || user || {};
                setResolvedUser(me);

                if (me?.id) {
                    try {
                        const consumerProfileRes = await api.get(`/consumer-health-profile/${me.id}`);
                        const consumerProfile = consumerProfileRes.data?.profile_data || {};
                        if (consumerProfile && Object.keys(consumerProfile).length > 0) {
                            setProfileData(consumerProfile);
                            return;
                        }
                    } catch {
                        // Fall back to legacy onboarding profile data below.
                    }
                }

                const rawData = me?.profile_data || {};
                const data = rawData?.profile_data && typeof rawData.profile_data === 'object'
                    ? rawData.profile_data
                    : rawData;
                setProfileData(data);
            } catch (err: any) {
                if (err?.response?.status === 401) {
                    console.warn('Profile request returned 401; falling back to local user state.');
                } else {
                    console.error('Failed to fetch profile:', err);
                }
                // Fallback to user prop if available
                const rawData = user?.profile_data || {};
                const data = rawData?.profile_data && typeof rawData.profile_data === 'object'
                    ? rawData.profile_data
                    : rawData;
                setProfileData(data);
            } finally {
                setLoadingProfile(false);
            }
        };
        fetchProfile();
    }, [authLoading, token, user]);

    useEffect(() => {
        if (authLoading || !token) {
            setSavedChats([]);
            return;
        }

        const fetchSavedChats = async () => {
            try {
                const res = await api.get('/chat/history');
                setSavedChats(Array.isArray(res.data) ? res.data.slice(0, 4) : []);
            } catch {
                setSavedChats([]);
            }
        };

        void fetchSavedChats();
    }, [authLoading, token]);

    const conditions: string[] = profileData?.health_conditions || [];
    const preferences: string[] = profileData?.dietary_preferences || [];
    const allergies: string[] = profileData?.allergies || [];
    const goals: string[] = profileData?.wellness_goals || [];
    const location = typeof profileData?.location === 'string'
        ? { address: profileData.location, city: '' }
        : (profileData?.location || {});
    const autoMealPlanEnabled = profileData?.auto_meal_plan_enabled !== false;
    const hasHealthProfile =
        conditions.length > 0 ||
        preferences.length > 0 ||
        allergies.length > 0 ||
        goals.length > 0 ||
        Boolean(profileData?.notes?.trim?.()) ||
        Boolean(profileData?.location);
    const healthSummary = useMemo(() => buildHealthDashboardSummary(profileData, resolvedUser), [profileData, resolvedUser]);
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

    const cartTotal = useMemo(() => foodCart.reduce((s, r) => s + r.price * r.qty, 0), []);
    const weekStart = useMemo(() => startOfWeek(new Date()), []);
    const weekDays = useMemo(
        () => Array.from({ length: 7 }, (_, i) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i)),
        [weekStart]
    );
    const todayKey = useMemo(() => toDateKey(new Date()), []);
    const currentMonthYear = useMemo(() => new Date().toLocaleString(undefined, { month: 'long', year: 'numeric' }), []);

    const monthGrid = useMemo(() => {
        const first = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
        const start = new Date(first);
        start.setDate(first.getDate() - first.getDay());
        return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    }, [calendarMonth]);

    const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatar(URL.createObjectURL(file));
    };

    const getMealForDate = (date: Date): MealEntry | null => {
        const key = toDateKey(date);
        return mealByDate[key] || null;
    };

    useEffect(() => {
        setMealDraft(mealByDate[selectedDateKey] || { breakfast: '', lunch: '', dinner: '', notes: '' });
    }, [selectedDateKey, mealByDate]);

    useEffect(() => {
        if (!profileData || !autoMealPlanEnabled) return;
        setMealByDate((prev) => {
            if (Object.keys(prev).length > 0) return prev;
            const next = { ...prev };
            weekDays.forEach((date, idx) => {
                const key = toDateKey(date);
                next[key] = buildAutoMealForDay(idx, profileData);
            });
            return next;
        });
    }, [profileData, autoMealPlanEnabled, weekDays]);

    const saveMealForDate = () => {
        setMealByDate((prev) => ({ ...prev, [selectedDateKey]: mealDraft }));
    };

    const deleteMealForDate = () => {
        setMealByDate((prev) => {
            const next = { ...prev };
            delete next[selectedDateKey];
            return next;
        });
        setMealStatusByDate((prev) => {
            const next = { ...prev };
            delete next[selectedDateKey];
            return next;
        });
        setMealDraft({ breakfast: '', lunch: '', dinner: '', notes: '' });
    };

    const isPastDate = (date: Date) => {
        const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const today = new Date();
        const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        return d < t;
    };

    const isMealCompleted = (entry?: MealEntry) => {
        if (!entry) return false;
        return Boolean(entry.breakfast.trim() && entry.lunch.trim() && entry.dinner.trim());
    };

    const markSelectedMealStatus = (status: MealStatus) => {
        if (!mealByDate[selectedDateKey]) return;
        setMealStatusByDate((prev) => ({ ...prev, [selectedDateKey]: status }));
    };

    useEffect(() => {
        const scroller = weekScrollerRef.current;
        const todayCard = todayCardRef.current;
        if (!scroller || !todayCard) return;

        // Center today's card on initial render for horizontal mobile view.
        todayCard.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
    }, []);

    useEffect(() => {
        const mealPlanView = searchParams.get('mealPlan');
        if (mealPlanView !== 'full-month') return;

        setIsCalendarOpen(true);

        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.delete('mealPlan');
        const nextQuery = nextParams.toString();
        router.replace(nextQuery ? `/?${nextQuery}` : '/', { scroll: false });
    }, [router, searchParams]);

    return (
        <div className="mx-auto w-full max-w-7xl p-4 md:p-8">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">

                {/* ── Hero Header ────────────────────────────────────────── */}
                <section className="rounded-3xl border border-green-100 bg-gradient-to-br from-white to-green-50 p-6 shadow-sm md:col-span-3">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                        <div className="relative h-24 w-24 overflow-hidden rounded-2xl border border-white shadow">
                            <Image src={avatar} alt="Profile" fill className="object-cover" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {user?.name || profileData?.full_name || user?.email?.split('@')[0] || 'My Profile'}
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">{user?.email}</p>
                            {(location.city || location.address) && (
                                <p className="mt-1 text-sm text-gray-500">
                                    📍 {[location.city, location.address].filter(Boolean).join(', ')}
                                </p>
                            )}
                            <label className="mt-3 inline-flex cursor-pointer rounded-xl bg-white px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50">
                                Update Photo
                                <input type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
                            </label>
                        </div>
                    </div>
                </section>

                {/* ── Streak ─────────────────────────────────────────────── */}
                <Card title="Healthy Day Streak">
                    <p className="text-4xl font-extrabold text-green-600">{healthyDays}</p>
                    <p className="mt-1 text-sm text-gray-500">Days of consistent healthy choices</p>
                </Card>

                <section className="md:col-span-4 rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-white p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">My Health Profile</h3>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setIsHealthProfileOpen((v) => !v)}
                                aria-label={isHealthProfileOpen ? 'Collapse health profile' : 'Expand health profile'}
                                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                            >
                                <svg
                                    className={`h-3 w-3 transition-transform ${isHealthProfileOpen ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {isHealthProfileOpen && (
                        <>
                            {loadingProfile ? (
                                <p className="text-sm text-gray-400">Loading your health profile...</p>
                            ) : !hasHealthProfile ? (
                                <div className="text-center py-6">
                                    <p className="text-sm text-gray-500 mb-3">No health profile set up yet.</p>
                                    <Link href="/?tab=health_profiles&profile=consumer" className="text-green-600 text-sm font-semibold hover:underline">
                                        Complete your health profile &rarr;
                                    </Link>
                                </div>
                            ) : (
                                <div className="rounded-2xl bg-gradient-to-br from-green-600 to-emerald-700 p-5 text-white shadow-sm">
                                    <div className="flex flex-wrap items-end justify-between gap-4">
                                        <div>
                                            <div className="flex flex-wrap gap-3">
                                                <div className="rounded-xl bg-white/15 px-4 py-3 text-center">
                                                    <p className="text-2xl font-bold">{conditions.length}</p>
                                                    <p className="text-xs text-white/80">Conditions</p>
                                                </div>
                                                <div className="rounded-xl bg-white/15 px-4 py-3 text-center">
                                                    <p className="text-2xl font-bold">{goals.length}</p>
                                                    <p className="text-xs text-white/80">Health Goals</p>
                                                </div>
                                                <div className="rounded-xl bg-white/15 px-4 py-3 text-center">
                                                    <p className="text-2xl font-bold">{allergies.length}</p>
                                                    <p className="text-xs text-white/80">Allergies</p>
                                                </div>
                                            </div>
                                            <p className="mt-3 text-xs text-white/70">{new Date().toLocaleDateString()}</p>
                                        </div>
                                        <Link
                                            href="/?tab=health_profiles&profile=consumer"
                                            className="inline-flex rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15"
                                        >
                                            View Full Report
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {conditions.length > 0 && (
                                <div className="mt-4 p-3 bg-green-100 rounded-xl text-sm text-green-800 flex items-center gap-2">
                                    <span>?</span>
                                    <span>Your AI food recommendations are personalized based on your health profile. <a href="/?tab=chat" className="font-semibold underline">Ask the assistant</a> what to eat today.</span>
                                </div>
                            )}
                        </>
                    )}
                </section>

                {/* ── Journey Feed ───────────────────────────────────────── */}
                <section className="md:col-span-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <h3 className="text-base font-bold text-gray-900">
                            Meal Plan Calendar
                            <span className="ml-2 text-sm font-medium text-gray-500">{currentMonthYear}</span>
                        </h3>
                        <button
                            onClick={() => setIsCalendarOpen(true)}
                            className="px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition"
                        >
                            Open Full Month
                        </button>
                    </div>
                    <div ref={weekScrollerRef} className="no-scrollbar flex md:grid md:grid-cols-7 gap-3 overflow-x-auto md:overflow-visible pb-2 md:pb-0 snap-x snap-mandatory">
                        {weekDays.map((date) => {
                            const meals = getMealForDate(date);
                            const key = toDateKey(date);
                            const isToday = key === todayKey;
                            const isSelected = key === selectedDateKey;
                            const isPast = isPastDate(date);
                            const hasMeal = !!mealByDate[key];
                            const explicitEntry = mealByDate[key];
                            const noMealsYet = !hasMeal && !autoMealPlanEnabled;
                            const status: MealStatus | null = isPast && hasMeal
                                ? mealStatusByDate[key] || (isMealCompleted(explicitEntry) ? 'eaten' : 'missed')
                                : null;
                            return (
                                <button
                                    key={key}
                                    ref={isToday ? todayCardRef : null}
                                    type="button"
                                    onClick={() => setSelectedDateKey(key)}
                                    className={`relative min-w-[132px] sm:min-w-[140px] md:min-w-0 md:w-full aspect-square rounded-2xl border bg-gradient-to-br p-3 overflow-hidden text-left transition snap-center ${
                                        isToday
                                            ? 'scale-105 border-4 border-black shadow-xl shadow-black/35 from-green-50 to-white'
                                            : 'border-gray-200 from-gray-50 to-white'
                                    } ${isSelected ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                                >
                                    {isPast && status && (
                                        <>
                                            <div
                                                className={`absolute inset-0 ${
                                                    status === 'eaten' ? 'bg-green-500/50' : 'bg-red-500/50'
                                                }`}
                                            />
                                            <div
                                                className={`absolute inset-0 z-10 flex items-center justify-center font-black text-6xl ${
                                                    status === 'eaten' ? 'text-green-900' : 'text-red-900'
                                                }`}
                                            >
                                                {status === 'eaten' ? '\u2713' : '\u2715'}
                                            </div>
                                        </>
                                    )}
                                    {noMealsYet && (
                                        <div className="absolute inset-0 z-10 bg-gray-900/35 flex items-center justify-center p-3">
                                            <p className="text-xs font-bold uppercase tracking-wide text-white text-center">
                                                No meals yet
                                            </p>
                                        </div>
                                    )}
                                    <div className={`relative z-20 ${isToday ? 'font-bold' : ''}`}>
                                        <p className={`text-xs uppercase tracking-wide ${isToday ? 'font-extrabold text-gray-800' : 'font-bold text-gray-500'}`}>
                                            {DAY_LABELS[date.getDay()]} {date.getDate()}
                                        </p>
                                        <div className="mt-3 space-y-1">
                                            <p className={`text-xs ${isToday ? 'font-semibold text-gray-900' : 'text-gray-700'}`}><span className="font-semibold">B:</span> {meals?.breakfast || '-'}</p>
                                            <p className={`text-xs ${isToday ? 'font-semibold text-gray-900' : 'text-gray-700'}`}><span className="font-semibold">L:</span> {meals?.lunch || '-'}</p>
                                            <p className={`text-xs ${isToday ? 'font-semibold text-gray-900' : 'text-gray-700'}`}><span className="font-semibold">D:</span> {meals?.dinner || '-'}</p>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => markSelectedMealStatus('eaten')}
                            disabled={!mealByDate[selectedDateKey]}
                            className="px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Mark Eaten
                        </button>
                        <button
                            type="button"
                            onClick={() => markSelectedMealStatus('missed')}
                            disabled={!mealByDate[selectedDateKey]}
                            className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Mark Missed
                        </button>
                    </div>
                </section>

                <Card title="Wellness Journey Feed">
                    <div className="space-y-3">
                        {journeyFeed.map((item) => (
                            <article key={item.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                                <div className="mb-2 relative h-28 w-full overflow-hidden rounded-lg">
                                    <Image src={item.mediaUrl} alt={item.title} fill className="object-cover" />
                                </div>
                                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                                <p className="text-xs text-gray-600 mt-1">{item.caption}</p>
                                <p className="text-[11px] text-gray-400 mt-1">{item.type.toUpperCase()} • {item.postedAt}</p>
                            </article>
                        ))}
                    </div>
                </Card>

                {/* ── Wallet ─────────────────────────────────────────────── */}

            </div>

            {isCalendarOpen && (
                <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-6xl max-h-[90vh] overflow-auto rounded-2xl bg-white border border-gray-200 shadow-xl p-4 md:p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Monthly Meal Planner</h3>
                            <button
                                onClick={() => setIsCalendarOpen(false)}
                                className="px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
                            >
                                Close
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
                            <section>
                                <div className="flex items-center justify-between mb-3">
                                    <button
                                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
                                    >
                                        Prev
                                    </button>
                                    <p className="font-semibold text-gray-900">
                                        {calendarMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
                                    </p>
                                    <button
                                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
                                    >
                                        Next
                                    </button>
                                </div>

                                <div className="grid grid-cols-7 gap-2 text-center mb-2">
                                    {DAY_LABELS.map((d) => (
                                        <p key={d} className="text-xs font-bold uppercase text-gray-400">{d}</p>
                                    ))}
                                </div>

                                <div className="grid grid-cols-7 gap-2">
                                    {monthGrid.map((date) => {
                                        const dateKey = toDateKey(date);
                                        const inMonth = date.getMonth() === calendarMonth.getMonth();
                                        const isSelected = dateKey === selectedDateKey;
                                        const hasPlan = !!mealByDate[dateKey];
                                        return (
                                            <button
                                                key={dateKey}
                                                onClick={() => setSelectedDateKey(dateKey)}
                                                className={`h-16 rounded-xl border text-sm font-medium transition ${
                                                    isSelected
                                                        ? 'border-green-500 bg-green-50 text-green-700'
                                                        : inMonth
                                                            ? 'border-gray-200 hover:bg-gray-50 text-gray-700'
                                                            : 'border-gray-100 bg-gray-50 text-gray-300'
                                                }`}
                                            >
                                                <div className="flex h-full flex-col items-center justify-center">
                                                    <span>{date.getDate()}</span>
                                                    {hasPlan && <span className="mt-1 w-1.5 h-1.5 rounded-full bg-green-500" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>

                            <section className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                                <p className="text-sm font-semibold text-gray-900 mb-3">
                                    Plan for {new Date(selectedDateKey).toLocaleDateString()}
                                </p>
                                <div className="space-y-3">
                                    <input
                                        value={mealDraft.breakfast}
                                        onChange={(e) => setMealDraft((prev) => ({ ...prev, breakfast: e.target.value }))}
                                        placeholder="Breakfast"
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                                    />
                                    <input
                                        value={mealDraft.lunch}
                                        onChange={(e) => setMealDraft((prev) => ({ ...prev, lunch: e.target.value }))}
                                        placeholder="Lunch"
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                                    />
                                    <input
                                        value={mealDraft.dinner}
                                        onChange={(e) => setMealDraft((prev) => ({ ...prev, dinner: e.target.value }))}
                                        placeholder="Dinner"
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                                    />
                                    <textarea
                                        value={mealDraft.notes}
                                        onChange={(e) => setMealDraft((prev) => ({ ...prev, notes: e.target.value }))}
                                        placeholder="Notes"
                                        rows={4}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm resize-none"
                                    />
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <button
                                        onClick={saveMealForDate}
                                        className="flex-1 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={deleteMealForDate}
                                        className="px-3 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

