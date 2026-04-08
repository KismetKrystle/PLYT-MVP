'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '../../lib/api';
import { useAuth } from '../../lib/auth';

type ProfileMode = 'consumer' | 'business' | 'expert';

type ConsumerProfile = {
    dietary_preferences: string[];
    health_conditions: string[];
    allergies?: string[];
    wellness_goals: string[];
    notes?: string;
    health_documents?: HealthDocument[];
    location: string | { city?: string; address?: string };
    location_city?: string;
    location_address?: string;
};

type BusinessProfile = {
    business_name: string;
    description: string;
    location: string;
    product_types: string[];
    subscription_tier: string;
};

type ExpertProfile = {
    display_name: string;
    credentials: string;
    expertise_areas: string[];
    bio: string;
};

type LocationSuggestion = {
    placeId: string;
    description: string;
    primaryText: string;
    secondaryText: string;
};

type HealthDocument = {
    id: string;
    name: string;
    type: string;
    size: number;
    lastModified: number;
    ai_context: string;
};

type HealthConditionOption = (typeof HEALTH_CONDITIONS)[number];

function fromCsv(value: string) {
    return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function formatBytes(size: number) {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
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

async function buildHealthDocument(file: File): Promise<HealthDocument> {
    let aiContext = `Uploaded health document: ${file.name} (${file.type || 'unknown type'}).`;

    if (isTextLikeFile(file)) {
        try {
            const text = await file.text();
            const trimmed = text.trim().slice(0, 6000);
            if (trimmed) {
                aiContext = `Uploaded health document: ${file.name}\n${trimmed}`;
            }
        } catch {
            aiContext = `Uploaded health document: ${file.name}. Text extraction failed in browser.`;
        }
    } else if (file.type === 'application/pdf') {
        aiContext = `Uploaded health document: ${file.name}. PDF uploaded; text extraction is not available in-browser yet.`;
    } else if (file.type.startsWith('image/')) {
        aiContext = `Uploaded health document: ${file.name}. Image uploaded; OCR is not available in-browser yet.`;
    }

    return {
        id: `${file.name}-${file.lastModified}-${file.size}`,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        lastModified: file.lastModified,
        ai_context: aiContext
    };
}

const HEALTH_CONDITIONS = [
    { id: 'fibroids', label: 'Fibroids', category: 'Reproductive Health' },
    { id: 'no_gallbladder', label: 'No Gallbladder', category: 'Digestive Health' },
    { id: 'diabetes', label: 'Diabetes', category: 'Metabolic Health' },
    { id: 'high_blood_pressure', label: 'High Blood Pressure', category: 'Cardiovascular' },
    { id: 'digestive_issues', label: 'Digestive Issues', category: 'Digestive Health' },
    { id: 'hormonal_imbalance', label: 'Hormonal Imbalance', category: 'Hormonal Health' },
    { id: 'thyroid', label: 'Thyroid Condition', category: 'Hormonal Health' },
    { id: 'inflammation', label: 'Chronic Inflammation', category: 'Immune Health' },
    { id: 'pcos', label: 'PCOS', category: 'Reproductive Health' },
    { id: 'anemia', label: 'Anemia', category: 'Blood Health' },
    { id: 'cholesterol', label: 'High Cholesterol', category: 'Cardiovascular' },
    { id: 'arthritis', label: 'Arthritis', category: 'Inflammatory' }
] as const;

const DIETARY_PREFERENCES = [
    { id: 'omnivore', label: 'Omnivore / Meat Eater' },
    { id: 'vegan', label: 'Vegan' },
    { id: 'vegetarian', label: 'Vegetarian' },
    { id: 'pescatarian', label: 'Pescatarian' },
    { id: 'celiac', label: 'Celiac' },
    { id: 'raw_vegan', label: 'Raw Vegan' },
    { id: 'halal', label: 'Halal' },
    { id: 'kosher', label: 'Kosher' },
    { id: 'gluten_free', label: 'Gluten-Free' },
    { id: 'dairy_free', label: 'Dairy-Free' },
    { id: 'no_garlic', label: 'No Garlic' },
    { id: 'no_onion', label: 'No Onion' },
    { id: 'paleo', label: 'Paleo' },
    { id: 'low_sugar', label: 'Low Sugar' },
    { id: 'low_fat', label: 'Low Fat' }
] as const;

const COMMON_ALLERGIES = [
    { id: 'peanuts', label: 'Peanuts' },
    { id: 'tree_nuts', label: 'Tree Nuts' },
    { id: 'shellfish', label: 'Shellfish' },
    { id: 'dairy', label: 'Dairy' },
    { id: 'gluten', label: 'Gluten' },
    { id: 'soy', label: 'Soy' },
    { id: 'eggs', label: 'Eggs' },
    { id: 'sesame', label: 'Sesame' }
] as const;

const HEALTH_GOALS = [
    { id: 'reduce_inflammation', label: 'Reduce Inflammation' },
    { id: 'hormone_balance', label: 'Balance Hormones' },
    { id: 'weight_management', label: 'Weight Management' },
    { id: 'gut_health', label: 'Improve Gut Health' },
    { id: 'energy', label: 'Increase Energy' },
    { id: 'blood_sugar', label: 'Stabilize Blood Sugar' },
    { id: 'heart_health', label: 'Support Heart Health' },
    { id: 'mental_clarity', label: 'Mental Clarity' }
] as const;

const CONDITION_COLORS: Record<string, string> = {
    'Reproductive Health': 'border-rose-200 bg-rose-50 text-rose-700',
    'Digestive Health': 'border-emerald-200 bg-emerald-50 text-emerald-700',
    'Metabolic Health': 'border-blue-200 bg-blue-50 text-blue-700',
    Cardiovascular: 'border-red-200 bg-red-50 text-red-700',
    'Hormonal Health': 'border-purple-200 bg-purple-50 text-purple-700',
    'Immune Health': 'border-orange-200 bg-orange-50 text-orange-700',
    'Blood Health': 'border-pink-200 bg-pink-50 text-pink-700',
    Inflammatory: 'border-amber-200 bg-amber-50 text-amber-700'
};

const HEALTH_CONDITION_LABELS = Object.fromEntries(HEALTH_CONDITIONS.map((item) => [item.id, item.label]));
const DIETARY_PREFERENCE_LABELS = Object.fromEntries(DIETARY_PREFERENCES.map((item) => [item.id, item.label]));
const ALLERGY_LABELS = Object.fromEntries(COMMON_ALLERGIES.map((item) => [item.id, item.label]));
const HEALTH_GOAL_LABELS = Object.fromEntries(HEALTH_GOALS.map((item) => [item.id, item.label]));

function normalizeLocation(value: ConsumerProfile['location']) {
    if (typeof value === 'string') return value;
    if (!value) return '';
    return [value.city, value.address].filter(Boolean).join(', ');
}

function toConsumerFormState(data: Partial<ConsumerProfile> | Record<string, any>) {
    const rawData = data as Record<string, any>;
    const knownAllergyIds = new Set<string>(COMMON_ALLERGIES.map((item) => item.id));
    const knownConditionIds = new Set<string>(HEALTH_CONDITIONS.map((item) => item.id));
    const knownDietIds = new Set<string>(DIETARY_PREFERENCES.map((item) => item.id));
    const knownGoalIds = new Set<string>(HEALTH_GOALS.map((item) => item.id));
    const allergies = Array.isArray(rawData?.allergies) ? rawData.allergies : [];
    const conditions = Array.isArray(rawData?.health_conditions) ? rawData.health_conditions : [];
    const dietaryPreferences = Array.isArray(rawData?.dietary_preferences) ? rawData.dietary_preferences : [];
    const wellnessGoals = Array.isArray(rawData?.wellness_goals) ? rawData.wellness_goals : [];

    const rawLocation = rawData?.location;
    const locationAddress =
        typeof rawLocation === 'string'
            ? rawLocation
            : (rawLocation?.address || rawData?.location_address || '');
    const locationCity =
        typeof rawLocation === 'object' && rawLocation
            ? (rawLocation.city || rawData?.location_city || '')
            : (rawData?.location_city || '');

    return {
        dietary_preferences: dietaryPreferences.filter((item) => knownDietIds.has(item)),
        other_dietary_preferences: dietaryPreferences.filter((item) => !knownDietIds.has(item)).join(', '),
        health_conditions: conditions.filter((item) => knownConditionIds.has(item)),
        other_conditions: conditions.filter((item) => !knownConditionIds.has(item)).join(', '),
        allergies: allergies.filter((item) => knownAllergyIds.has(item)),
        other_allergies: allergies.filter((item) => !knownAllergyIds.has(item)).join(', '),
        wellness_goals: wellnessGoals.filter((item) => knownGoalIds.has(item)),
        other_wellness_goals: wellnessGoals.filter((item) => !knownGoalIds.has(item)).join(', '),
        location: normalizeLocation(locationAddress as ConsumerProfile['location']),
        location_city: String(locationCity || '').trim(),
        notes: typeof rawData?.notes === 'string' ? rawData.notes : '',
        health_documents: Array.isArray(rawData?.health_documents) ? rawData.health_documents : []
    };
}

function getMode(param: string | null): ProfileMode {
    if (param === 'business') return 'business';
    if (param === 'expert') return 'expert';
    return 'consumer';
}

function getRoute(mode: ProfileMode) {
    if (mode === 'business') return '/farmer-profiles';
    if (mode === 'expert') return '/expert-profiles';
    return '/consumer-health-profile';
}

function getHeading(mode: ProfileMode) {
    if (mode === 'business') {
        return {
            title: 'Farmer / Distributor Profile',
            subtitle: 'Show what you grow, where you serve, and what products you offer.'
        };
    }
    if (mode === 'expert') {
        return {
            title: 'Expert Profile',
            subtitle: 'Tell members your background, specialty areas, and approach to guidance.'
        };
    }
    return {
        title: 'About You',
        subtitle: 'Shape the health, preference, and habit context Navi uses to support you better.'
    };
}

const PROFILE_MODE_LINKS: Array<{ mode: ProfileMode; label: string; href: string }> = [
    { mode: 'consumer', label: 'About You', href: '/?tab=about_you&profile=consumer' },
    { mode: 'business', label: 'Producer Profile', href: '/?tab=about_you&profile=business' },
    { mode: 'expert', label: 'Expert Studio', href: '/?tab=about_you&profile=expert' }
];

function joinLabels(values: string[], labels: Record<string, string>) {
    return values
        .map((value) => labels[value] || value)
        .filter(Boolean);
}

function buildHealthInsightSummary(input: {
    fullName?: string;
    aboutYouLocation?: string;
    conditions: string[];
    diets: string[];
    allergies: string[];
    goals: string[];
    notes: string;
    aboutYouBio?: string;
    documentCount: number;
}) {
    const name = input.fullName?.trim() || 'This member';
    const overviewParts = [
        input.conditions.length ? `is currently tracking ${input.conditions.join(', ')}` : 'has not recorded any conditions yet',
        input.goals.length ? `with a focus on ${input.goals.join(', ')}` : '',
        input.diets.length ? `and follows ${input.diets.join(', ')}` : ''
    ].filter(Boolean);

    const riskParts = [];
    if (input.allergies.length) riskParts.push(`Food exclusions include ${input.allergies.join(', ')}.`);
    if (input.notes.trim()) riskParts.push(`Notes mention: ${input.notes.trim()}.`);
    if (input.aboutYouBio?.trim()) riskParts.push(`Living Library context: ${input.aboutYouBio.trim()}.`);

    const contextParts = [];
    if (input.aboutYouLocation?.trim()) contextParts.push(`Primary location is ${input.aboutYouLocation.trim()}.`);
    if (input.documentCount > 0) contextParts.push(`${input.documentCount} uploaded health document${input.documentCount === 1 ? '' : 's'} can inform future AI guidance.`);

    return [
        `${name} ${overviewParts.join(' ')}.`.replace(/\s+\./g, '.'),
        riskParts.length ? riskParts.join(' ') : 'No additional risks or special notes are currently recorded.',
        contextParts.length ? contextParts.join(' ') : 'Refresh this summary after updating your About You details or health uploads.'
    ].join(' ');
}

function getDisplayName(user: any) {
    const fullName = typeof user?.full_name === 'string' ? user.full_name.trim() : '';
    if (fullName) return fullName;

    const name = typeof user?.name === 'string' ? user.name.trim() : '';
    if (name) return name;

    const emailPrefix = typeof user?.email === 'string' ? user.email.split('@')[0].trim() : '';
    return emailPrefix || 'Member';
}

function SectionCard({ title, hint, children, className = '' }: { title: string; hint: string; children: React.ReactNode; className?: string }) {
    return (
        <section className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}>
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
            <p className="mt-1 text-xs text-gray-500">{hint}</p>
            <div className="mt-4 space-y-3">{children}</div>
        </section>
    );
}

function ChipButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                selected
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-green-400 hover:text-green-700'
            }`}
        >
            {label}
        </button>
    );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
        <div className="mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">{title}</h3>
            {subtitle ? <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p> : null}
        </div>
    );
}

const inputCls =
    'w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500';

export default function ProfileWorkspace() {
    const { user, login } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const mode = getMode(searchParams.get('profile'));
    const route = useMemo(() => getRoute(mode), [mode]);
    const heading = getHeading(mode);

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [hasProfile, setHasProfile] = useState(false);
    const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
    const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
    const [isLocationSearching, setIsLocationSearching] = useState(false);
    const [isLocatingHome, setIsLocatingHome] = useState(false);
    const [locationStatus, setLocationStatus] = useState<string | null>(null);
    const [isEditingLocation, setIsEditingLocation] = useState(false);
    const [consumerTab, setConsumerTab] = useState<'profile' | 'report'>('report');
    const [healthInsightSummary, setHealthInsightSummary] = useState('');
    const [lastSummaryRefreshAt, setLastSummaryRefreshAt] = useState<string | null>(null);
    const [noteDraft, setNoteDraft] = useState('');

    const [consumerForm, setConsumerForm] = useState({
        dietary_preferences: [] as string[],
        other_dietary_preferences: '',
        health_conditions: [] as string[],
        other_conditions: '',
        allergies: [] as string[],
        other_allergies: '',
        wellness_goals: [] as string[],
        other_wellness_goals: '',
        location: '',
        location_city: '',
        notes: '',
        health_documents: [] as HealthDocument[]
    });

    const [businessForm, setBusinessForm] = useState({
        business_name: '',
        description: '',
        location: '',
        product_types: '',
        subscription_tier: 'free'
    });

    const [expertForm, setExpertForm] = useState({
        display_name: '',
        credentials: '',
        expertise_areas: '',
        bio: ''
    });

    const toggleListValue = (key: 'dietary_preferences' | 'health_conditions' | 'allergies' | 'wellness_goals', value: string) => {
        setConsumerForm((prev) => ({
            ...prev,
            [key]: prev[key].includes(value)
                ? prev[key].filter((item) => item !== value)
                : [...prev[key], value]
        }));
    };

    const addCustomListValues = (
        listKey: 'dietary_preferences' | 'health_conditions' | 'allergies' | 'wellness_goals',
        inputKey: 'other_dietary_preferences' | 'other_conditions' | 'other_allergies' | 'other_wellness_goals'
    ) => {
        const customValues = fromCsv(consumerForm[inputKey])
            .map((item) => item.toLowerCase());

        if (customValues.length === 0) return;

        setConsumerForm((prev) => ({
            ...prev,
            [listKey]: Array.from(new Set([...prev[listKey], ...customValues])),
            [inputKey]: ''
        }));
    };

    const addCustomConditions = () => addCustomListValues('health_conditions', 'other_conditions');
    const addCustomAllergies = () => addCustomListValues('allergies', 'other_allergies');
    const addCustomWellnessGoals = () => addCustomListValues('wellness_goals', 'other_wellness_goals');
    const addCustomDietaryPreferences = () => addCustomListValues('dietary_preferences', 'other_dietary_preferences');
    const addPersonalNote = () => {
        const trimmedDraft = noteDraft.trim();
        if (!trimmedDraft) return;

        setConsumerForm((prev) => ({
            ...prev,
            notes: prev.notes.trim() ? `${prev.notes.trim()}\n${trimmedDraft}` : trimmedDraft
        }));
        setNoteDraft('');
    };

    useEffect(() => {
        const loadProfile = async () => {
            if (!user?.id) return;
            setIsLoading(true);
            setStatus(null);
            setLastUpdatedAt(null);

            try {
                const res = await api.get(`${route}/${user.id}`);
                const data = res.data?.profile_data || {};
                setHasProfile(true);
                if (res.data?.updated_at) {
                    setLastUpdatedAt(new Date(res.data.updated_at).toLocaleString());
                }

                if (mode === 'consumer') {
                    setConsumerForm(
                        toConsumerFormState({
                            ...((user as any)?.profile_data || {}),
                            ...(data as ConsumerProfile)
                        })
                    );
                    setNoteDraft('');
                } else if (mode === 'business') {
                    const p = data as BusinessProfile;
                    setBusinessForm({
                        business_name: p.business_name || '',
                        description: p.description || '',
                        location: p.location || '',
                        product_types: (p.product_types || []).join(', '),
                        subscription_tier: p.subscription_tier || 'free'
                    });
                } else {
                    const p = data as ExpertProfile;
                    setExpertForm({
                        display_name: p.display_name || '',
                        credentials: p.credentials || '',
                        expertise_areas: (p.expertise_areas || []).join(', '),
                        bio: p.bio || ''
                    });
                }
            } catch (error: any) {
                if (error?.response?.status === 404) {
                    setHasProfile(false);
                    if (mode === 'consumer') {
                        const legacyProfile = (user as any)?.profile_data || {};
                        if (legacyProfile && Object.keys(legacyProfile).length > 0) {
                            setConsumerForm(toConsumerFormState(legacyProfile));
                            setStatus('Loaded your saved onboarding answers. Save once to create your dedicated health profile record.');
                        }
                    }
                } else {
                    setStatus(error?.response?.data?.error || 'Could not load your profile right now.');
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadProfile();
    }, [mode, route, user?.id]);

    useEffect(() => {
        if (mode !== 'consumer') return;

        const query = consumerForm.location.trim();
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
                setLocationSuggestions(Array.isArray(res.data?.suggestions) ? res.data.suggestions : []);
                const providerStatus = String(res.data?.providerStatus || '');
                if (providerStatus === 'OK') {
                    setLocationStatus('Select a suggestion below, or keep your typed location.');
                } else if (providerStatus === 'ZERO_RESULTS') {
                    setLocationStatus('No Google matches found. You can still use what you typed.');
                } else if (providerStatus === 'MISSING_KEY') {
                    setLocationStatus('Google location suggestions are not configured yet. You can still save what you typed.');
                } else if (providerStatus === 'REQUEST_DENIED' || providerStatus === 'REQUEST_FAILED') {
                    setLocationStatus('Google location lookup is unavailable right now. You can still save what you typed.');
                } else {
                    setLocationStatus('You can use your typed location or pick a suggestion below if available.');
                }
            } catch {
                setLocationSuggestions([]);
                setLocationStatus('Location lookup failed. You can still save what you typed.');
            } finally {
                setIsLocationSearching(false);
            }
        }, 250);

        return () => window.clearTimeout(timeoutId);
    }, [consumerForm.location, mode]);

    const buildProfileData = (): ConsumerProfile | BusinessProfile | ExpertProfile => {
        if (mode === 'business') {
            return {
                business_name: businessForm.business_name,
                description: businessForm.description,
                location: businessForm.location,
                product_types: fromCsv(businessForm.product_types),
                subscription_tier: businessForm.subscription_tier
            };
        }
        if (mode === 'expert') {
            return {
                display_name: expertForm.display_name,
                credentials: expertForm.credentials,
                expertise_areas: fromCsv(expertForm.expertise_areas),
                bio: expertForm.bio
            };
        }
        return {
            dietary_preferences: [
                ...consumerForm.dietary_preferences,
                ...fromCsv(consumerForm.other_dietary_preferences.toLowerCase())
            ],
            health_conditions: [
                ...consumerForm.health_conditions,
                ...fromCsv(consumerForm.other_conditions.toLowerCase())
            ],
            allergies: [
                ...consumerForm.allergies,
                ...fromCsv(consumerForm.other_allergies.toLowerCase())
            ],
            wellness_goals: [
                ...consumerForm.wellness_goals,
                ...fromCsv(consumerForm.other_wellness_goals.toLowerCase())
            ],
            location: {
                city: consumerForm.location_city.trim(),
                address: consumerForm.location.trim()
            },
            location_city: consumerForm.location_city.trim(),
            location_address: consumerForm.location.trim(),
            notes: consumerForm.notes.trim(),
            health_documents: consumerForm.health_documents
        };
    };

    const groupedConditionOptions = useMemo(() => {
        return HEALTH_CONDITIONS.reduce<Record<string, HealthConditionOption[]>>((acc, condition) => {
            const category = condition.category;
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(condition);
            return acc;
        }, {});
    }, []);

    const selectedConditionObjects = useMemo(() => {
        return HEALTH_CONDITIONS.filter((item) => consumerForm.health_conditions.includes(item.id));
    }, [consumerForm.health_conditions]);

    const groupedSelectedConditions = useMemo(() => {
        return selectedConditionObjects.reduce<Record<string, HealthConditionOption[]>>((acc, condition) => {
            if (!acc[condition.category]) acc[condition.category] = [];
            acc[condition.category].push(condition);
            return acc;
        }, {});
    }, [selectedConditionObjects]);

    const selectedGoalValues = useMemo(() => {
        return [...consumerForm.wellness_goals, ...fromCsv(consumerForm.other_wellness_goals)];
    }, [consumerForm.wellness_goals, consumerForm.other_wellness_goals]);

    const noteEntries = useMemo(() => {
        return consumerForm.notes
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean);
    }, [consumerForm.notes]);

    const displayName = useMemo(() => getDisplayName(user), [user]);

    const aboutYouLocation = useMemo(() => {
        return [user?.location_city, user?.location_address].filter(Boolean).join(', ');
    }, [user?.location_address, user?.location_city]);

    const selectedDietValues = useMemo(() => {
        return [...consumerForm.dietary_preferences, ...fromCsv(consumerForm.other_dietary_preferences)];
    }, [consumerForm.dietary_preferences, consumerForm.other_dietary_preferences]);

    const selectedAllergyValues = useMemo(() => {
        return [...consumerForm.allergies, ...fromCsv(consumerForm.other_allergies)];
    }, [consumerForm.allergies, consumerForm.other_allergies]);

    const selectedConditionValues = useMemo(() => {
        return [...consumerForm.health_conditions, ...fromCsv(consumerForm.other_conditions)];
    }, [consumerForm.health_conditions, consumerForm.other_conditions]);

    const refreshHealthInsightSummary = () => {
        setHealthInsightSummary(
            buildHealthInsightSummary({
                fullName: displayName,
                aboutYouLocation,
                conditions: joinLabels(selectedConditionValues, HEALTH_CONDITION_LABELS),
                diets: joinLabels(selectedDietValues, DIETARY_PREFERENCE_LABELS),
                allergies: joinLabels(selectedAllergyValues, ALLERGY_LABELS),
                goals: joinLabels(selectedGoalValues, HEALTH_GOAL_LABELS),
                notes: consumerForm.notes,
                aboutYouBio: user?.bio,
                documentCount: consumerForm.health_documents.length
            })
        );
        setLastSummaryRefreshAt(new Date().toLocaleString());
    };

    const handleHealthDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;

        const nextDocuments = await Promise.all(files.map((file) => buildHealthDocument(file)));
        setConsumerForm((prev) => ({
            ...prev,
            health_documents: [
                ...prev.health_documents,
                ...nextDocuments.filter((doc) => !prev.health_documents.some((existing) => existing.id === doc.id))
            ]
        }));
        event.target.value = '';
    };

    const removeHealthDocument = (documentId: string) => {
        setConsumerForm((prev) => ({
            ...prev,
            health_documents: prev.health_documents.filter((doc) => doc.id !== documentId)
        }));
    };

    const handleUseCurrentLocation = async () => {
        setIsLocatingHome(true);
        setLocationStatus('Detecting your current location...');
        setLocationSuggestions([]);

        try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    resolve,
                    reject,
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
                );
            });

            const res = await api.get('/consumer-health-profile/location-suggestions/reverse-geocode', {
                params: {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                }
            });

            const detectedAddress = String(res.data?.address || '').trim();
            const detectedCity = String(res.data?.city || '').trim();

            if (!detectedAddress) {
                setLocationStatus('We found your location, but could not turn it into an address. You can still type it manually.');
                return;
            }

            setConsumerForm((prev) => ({
                ...prev,
                location: detectedAddress,
                location_city: detectedCity
            }));
            setIsEditingLocation(false);
            setLocationStatus('Home location pinned from your current location.');
        } catch (error) {
            console.error('Pin current location failed:', error);
            setLocationStatus('Could not access your current location. Please allow location access or type your home address.');
        } finally {
            setIsLocatingHome(false);
        }
    };

    useEffect(() => {
        if (!consumerForm.location.trim()) {
            setIsEditingLocation(true);
        }
    }, [consumerForm.location]);

    useEffect(() => {
        if (mode !== 'consumer') return;
        refreshHealthInsightSummary();
    }, [
        mode,
        displayName,
        user?.email,
        user?.bio,
        aboutYouLocation,
        consumerForm.notes,
        consumerForm.health_documents.length,
        selectedConditionValues,
        selectedDietValues,
        selectedAllergyValues,
        selectedGoalValues
    ]);

    const onSave = async () => {
        if (!user?.id) {
            setStatus('Please sign in to save your profile.');
            return;
        }
        setIsSaving(true);
        setStatus(null);
        try {
            await api.post(route, {
                user_id: user.id,
                profile_data: buildProfileData()
            });
            try {
                const meRes = await api.get('/user/me');
                const currentToken = localStorage.getItem('token') || '';
                if (currentToken && meRes.data) {
                    login(currentToken, meRes.data, undefined);
                }
            } catch (refreshError) {
                console.warn('Unable to refresh user session after health profile save.', refreshError);
            }
            setHasProfile(true);
            setLastUpdatedAt(new Date().toLocaleString());
            setStatus('Saved successfully.');
        } catch (error: any) {
            setStatus(error?.response?.data?.error || 'Save failed. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const onDelete = async () => {
        if (!user?.id) {
            setStatus('Please sign in to delete your profile.');
            return;
        }
        setIsSaving(true);
        setStatus(null);
        try {
            await api.delete(`${route}/${user.id}`);
            setHasProfile(false);
            setLastUpdatedAt(null);
            setStatus('Profile removed.');
        } catch (error: any) {
            setStatus(error?.response?.data?.error || 'Delete failed. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="mx-auto w-full max-w-6xl p-4 md:p-8">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900">{heading.title}</h2>
                <p className="mt-1 text-sm text-gray-600">{heading.subtitle}</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
                {PROFILE_MODE_LINKS.map((item) => (
                    <Link
                        key={item.mode}
                        href={item.href}
                        className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                            mode === item.mode
                                ? 'border-green-600 bg-green-600 text-white'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-green-300 hover:text-green-700'
                        }`}
                    >
                        {item.label}
                    </Link>
                ))}
            </div>

            {mode === 'expert' ? (
                <div className="mt-4 space-y-4">
                    <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-[#f4fbf5] via-white to-[#eef8f2] p-6 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="max-w-2xl">
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Coming Soon</p>
                                <h3 className="mt-2 text-2xl font-bold text-gray-900">Expert Studio Preview</h3>
                                <p className="mt-2 text-sm leading-6 text-gray-600">
                                    This is where verified practitioners, coaches, and educators will shape their public expert presence inside PLYT. You can already sketch the profile basics below while the rest of the operating layer is still in preview.
                                </p>
                            </div>
                            <div className="rounded-2xl border border-emerald-200 bg-white/90 px-4 py-3 text-sm text-emerald-900 shadow-sm">
                                <p className="font-semibold">XRPL tie-in planned</p>
                                <p className="mt-1 text-emerald-700">Wallet-linked payouts, token-gated assets, and credential-backed expert drops.</p>
                            </div>
                        </div>
                        <div className="mt-5 grid gap-3 md:grid-cols-3">
                            {[
                                {
                                    title: 'Credentialed presence',
                                    description: 'Display your background, specialties, and proof points in a member-facing expert card.'
                                },
                                {
                                    title: 'Programs and digital drops',
                                    description: 'Package protocols, recipe systems, guides, and premium content into mintable expert resources.'
                                },
                                {
                                    title: 'Payout and royalty rails',
                                    description: 'Support creator payouts, affiliate splits, and secondary-sale participation from the same asset layer.'
                                }
                            ].map((item) => (
                                <div key={item.title} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                                    <p className="text-sm font-bold text-gray-900">{item.title}</p>
                                    <p className="mt-2 text-sm leading-6 text-gray-600">{item.description}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-5 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => router.push('/wallet')}
                                className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
                            >
                                Open Wallet Preview
                            </button>
                            <button
                                type="button"
                                onClick={() => router.push('/?tab=living_library')}
                                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-green-300 hover:text-green-700"
                            >
                                View Living Library
                            </button>
                        </div>
                    </section>
                </div>
            ) : null}

            {mode === 'consumer' ? (
                <div className="mt-4 space-y-3">
                    <button
                        type="button"
                        onClick={() => router.push('/?tab=living_library')}
                        className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-green-500 hover:text-green-700"
                    >
                        <span aria-hidden="true">←</span>
                        Back to Profile
                    </button>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="min-w-[260px] flex-1">
                        {consumerTab === 'report' ? (
                            <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                                <p className="truncate text-sm font-medium text-gray-800">{consumerForm.location.trim() || 'Location not set'}</p>
                            </div>
                        ) : consumerForm.location.trim() && !isEditingLocation ? (
                            <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                                <p className="truncate text-sm font-medium text-gray-800">{consumerForm.location}</p>
                                <button
                                    type="button"
                                    onClick={() => setIsEditingLocation(true)}
                                    className="shrink-0 rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-white"
                                    aria-label="Edit location"
                                    title="Edit location"
                                >
                                    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
                                        <path
                                            d="M13.75 3.75a1.768 1.768 0 0 1 2.5 2.5l-8.5 8.5-3.5 1 1-3.5 8.5-8.5Z"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div className="mb-2 flex items-center justify-between gap-3">
                                    <p className="text-xs text-gray-500">Set the home area PLYT should use when live location is unavailable.</p>
                                    <button
                                        type="button"
                                        onClick={handleUseCurrentLocation}
                                        disabled={isLocatingHome}
                                        className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-[11px] font-semibold text-green-700 transition hover:bg-green-100 disabled:opacity-60"
                                    >
                                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v3m0 12v3m9-9h-3M6 12H3m15.364 6.364-2.121-2.121M8.757 8.757 6.636 6.636m11.728 0-2.121 2.121M8.757 15.243l-2.121 2.121" />
                                            <circle cx="12" cy="12" r="3" strokeWidth="2" />
                                        </svg>
                                        {isLocatingHome ? 'Pinning home...' : 'Use current location'}
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        className={inputCls}
                                        placeholder="Address, area, ZIP code, or postcode"
                                        value={consumerForm.location}
                                        onChange={(e) => setConsumerForm({ ...consumerForm, location: e.target.value, location_city: '' })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setLocationSuggestions([]);
                                            setIsEditingLocation(false);
                                        }}
                                        disabled={!consumerForm.location.trim()}
                                        className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-white disabled:opacity-50"
                                    >
                                        Save
                                    </button>
                                </div>
                                {locationSuggestions.length > 0 ? (
                                    <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white">
                                        {locationSuggestions.map((suggestion) => (
                                            <button
                                                key={`${suggestion.placeId}-${suggestion.description}`}
                                                type="button"
                                                onClick={() => {
                                                    setConsumerForm({
                                                        ...consumerForm,
                                                        location: suggestion.description,
                                                        location_city: suggestion.secondaryText.split(',')[0]?.trim() || ''
                                                    });
                                                    setLocationSuggestions([]);
                                                    setIsEditingLocation(false);
                                                }}
                                                className="flex w-full flex-col items-start border-b border-gray-100 px-4 py-3 text-left last:border-b-0 hover:bg-gray-50"
                                            >
                                                <span className="text-sm font-medium text-gray-800">{suggestion.primaryText}</span>
                                                <span className="text-xs text-gray-500">{suggestion.secondaryText || suggestion.description}</span>
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                                {consumerForm.location_city ? (
                                    <p className="mt-2 text-xs text-gray-400">Detected area: {consumerForm.location_city}</p>
                                ) : null}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-gray-100 p-1">
                        {(['report', 'profile'] as const).map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setConsumerTab(tab)}
                                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                                    consumerTab === tab ? 'bg-green-600 text-white' : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                {tab === 'report' ? 'About You Report' : 'Edit About You'}
                            </button>
                        ))}
                    </div>
                </div>
                </div>
            ) : null}

            {mode === 'consumer' && consumerTab === 'report' ? (
                <div className="mt-4 space-y-4">
                    <section className="rounded-2xl bg-gradient-to-br from-green-600 to-emerald-700 p-6 text-white shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">About You Report</p>
                                <h3 className="mt-2 text-2xl font-bold">{displayName} Health Summary</h3>
                                <p className="mt-1 text-sm text-white/80">{consumerForm.location.trim() || 'Location not set'}</p>
                            </div>
                            <p className="text-xs text-white/70">{new Date().toLocaleDateString()}</p>
                        </div>
                        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                            <section className="rounded-2xl border border-white/20 bg-white/12 p-5 backdrop-blur-sm">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">My About You Snapshot</p>
                                <div className="mt-4 flex flex-wrap gap-3">
                                    <div className="rounded-xl bg-white/15 px-4 py-3 text-center">
                                        <p className="text-2xl font-bold">{consumerForm.health_conditions.length + fromCsv(consumerForm.other_conditions).length}</p>
                                        <p className="text-xs text-white/80">Conditions</p>
                                    </div>
                                    <div className="rounded-xl bg-white/15 px-4 py-3 text-center">
                                        <p className="text-2xl font-bold">{selectedGoalValues.length}</p>
                                        <p className="text-xs text-white/80">Health Goals</p>
                                    </div>
                                    <div className="rounded-xl bg-white/15 px-4 py-3 text-center">
                                        <p className="text-2xl font-bold">{consumerForm.allergies.length + fromCsv(consumerForm.other_allergies).length}</p>
                                        <p className="text-xs text-white/80">Allergies</p>
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-2xl border border-white/20 bg-white/12 p-5 backdrop-blur-sm">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">AI Summary</p>
                                        <p className="mt-1 text-xs text-white/70">Generated from your About You details, Living Library context, and uploaded health documents.</p>
                                    </div>
                                    <div className="text-right">
                                        <button
                                            type="button"
                                            onClick={refreshHealthInsightSummary}
                                            className="rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15"
                                        >
                                            Refresh Summary
                                        </button>
                                        {lastSummaryRefreshAt ? (
                                            <p className="mt-2 text-[11px] text-white/65">Updated {lastSummaryRefreshAt}</p>
                                        ) : null}
                                    </div>
                                </div>
                                <p className="mt-4 text-sm leading-6 text-white/90">{healthInsightSummary}</p>
                            </section>
                        </div>
                    </section>

                    {Object.keys(groupedSelectedConditions).length > 0 ? (
                        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                            <SectionHeader title="Active Health Conditions" subtitle="Grouped by health area for a clearer report view." />
                            <div className="space-y-4">
                                {Object.entries(groupedSelectedConditions).map(([category, items]) => (
                                    <div key={category}>
                                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">{category}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {items.map((condition) => (
                                                <span
                                                    key={condition.id}
                                                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${CONDITION_COLORS[condition.category] || 'border-gray-200 bg-gray-50 text-gray-700'}`}
                                                >
                                                    {condition.label}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ) : null}

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                            <SectionHeader title="Dietary Preferences" subtitle="How you eat right now." />
                            <div className="flex flex-wrap gap-2">
                                {[...consumerForm.dietary_preferences, ...fromCsv(consumerForm.other_dietary_preferences)].length > 0 ? (
                                    [...consumerForm.dietary_preferences, ...fromCsv(consumerForm.other_dietary_preferences)].map((item) => (
                                        <span key={item} className="rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                                            {DIETARY_PREFERENCE_LABELS[item] || item}
                                        </span>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-400">None recorded</p>
                                )}
                            </div>
                        </section>

                        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                            <SectionHeader title="Allergies" subtitle="Foods to avoid in recommendations." />
                            <div className="flex flex-wrap gap-2">
                                {[...consumerForm.allergies, ...fromCsv(consumerForm.other_allergies)].length > 0 ? (
                                    [...consumerForm.allergies, ...fromCsv(consumerForm.other_allergies)].map((item) => (
                                        <span key={item} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                                            {ALLERGY_LABELS[item] || item}
                                        </span>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-400">None recorded</p>
                                )}
                            </div>
                        </section>
                    </div>

                    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                        <SectionHeader title="Health Goals" subtitle="What this profile is trying to support." />
                        <div className="flex flex-wrap gap-2">
                            {selectedGoalValues.length > 0 ? (
                                selectedGoalValues.map((item) => (
                                    <span key={item} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                                        {HEALTH_GOAL_LABELS[item] || item}
                                    </span>
                                ))
                            ) : (
                                <p className="text-sm text-gray-400">None recorded</p>
                            )}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                        <SectionHeader title="Personal Notes" subtitle="Captured directly from your health profile." />
                        <p className="text-sm leading-6 text-gray-700">
                            {consumerForm.notes.trim() || 'No personal notes recorded yet.'}
                        </p>
                    </section>

                    <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm">
                        <div>
                            <p className="text-sm font-bold text-green-800">Your assistant can use this profile directly.</p>
                            <p className="text-xs text-green-700">Ask what to eat, what to avoid, or how to shop based on these conditions and goals.</p>
                        </div>
                        <Link href="/?tab=chat" className="rounded-xl bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700">
                            Ask Assistant
                        </Link>
                    </section>
                </div>
            ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
                {mode === 'consumer' ? (
                    <>
                        <SectionCard
                            title="Health Conditions"
                            hint="Select all that apply. This is the strongest signal for personalization."
                            className="lg:col-span-4"
                        >
                            <div className="space-y-4">
                                {Object.entries(groupedConditionOptions).map(([category, items]) => (
                                    <div key={category}>
                                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">{category}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {items.map((item) => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => toggleListValue('health_conditions', item.id)}
                                                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                                                        consumerForm.health_conditions.includes(item.id)
                                                            ? CONDITION_COLORS[item.category] || 'border-green-600 bg-green-600 text-white'
                                                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                                    }`}
                                                >
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                <input
                                    className={inputCls}
                                    placeholder="Other conditions, separated by commas"
                                    value={consumerForm.other_conditions}
                                    onChange={(e) => setConsumerForm({ ...consumerForm, other_conditions: e.target.value })}
                                />
                                <button
                                    type="button"
                                    onClick={addCustomConditions}
                                    aria-label="Add custom conditions"
                                    className="rounded-xl border border-green-600 bg-white px-4 py-2 text-base font-bold text-green-600 transition hover:bg-green-50"
                                >
                                    +
                                </button>
                            </div>
                        </SectionCard>
                        <div className="grid gap-4 lg:col-span-8 lg:grid-cols-2 lg:items-start">
                            <div className="space-y-2">
                                <SectionCard
                                    title="Health Goals"
                                    hint="Choose the outcomes you want your recommendations to support."
                                    className="self-start"
                                >
                                    <div className="flex flex-wrap gap-2">
                                        {HEALTH_GOALS.map((item) => (
                                            <ChipButton
                                                key={item.id}
                                                label={item.label}
                                                selected={consumerForm.wellness_goals.includes(item.id)}
                                                onClick={() => toggleListValue('wellness_goals', item.id)}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <input
                                            className={inputCls}
                                            placeholder="Other goals, separated by commas"
                                            value={consumerForm.other_wellness_goals}
                                            onChange={(e) => setConsumerForm({ ...consumerForm, other_wellness_goals: e.target.value })}
                                        />
                                        <button
                                            type="button"
                                            onClick={addCustomWellnessGoals}
                                            aria-label="Add custom health goals"
                                            className="rounded-xl border border-green-600 bg-white px-4 py-2 text-base font-bold text-green-600 transition hover:bg-green-50"
                                        >
                                            +
                                        </button>
                                    </div>
                                </SectionCard>
                                <SectionCard
                                    title="Allergies"
                                    hint="Mark ingredients the assistant should always avoid."
                                    className="self-start"
                                >
                                    <div className="flex flex-wrap gap-2">
                                        {COMMON_ALLERGIES.map((item) => (
                                            <ChipButton
                                                key={item.id}
                                                label={item.label}
                                                selected={consumerForm.allergies.includes(item.id)}
                                                onClick={() => toggleListValue('allergies', item.id)}
                                            />
                                        ))}
                                    </div>
                                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                        <input
                                            className={inputCls}
                                            placeholder="Other allergies, separated by commas"
                                            value={consumerForm.other_allergies}
                                            onChange={(e) => setConsumerForm({ ...consumerForm, other_allergies: e.target.value })}
                                        />
                                        <button
                                            type="button"
                                            onClick={addCustomAllergies}
                                            aria-label="Add custom allergies"
                                            className="rounded-xl border border-green-600 bg-white px-4 py-2 text-base font-bold text-green-600 transition hover:bg-green-50"
                                        >
                                            +
                                        </button>
                                    </div>
                                </SectionCard>
                            </div>
                            <div className="space-y-4">
                            <SectionCard
                                title="Personal Notes"
                                hint="Add notes and upload supporting health documents for AI context."
                                className="self-start"
                            >
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                                    <textarea
                                        rows={5}
                                        className={inputCls}
                                        placeholder="Add context such as surgery history, medication sensitivities, or anything else the assistant should consider."
                                        value={noteDraft}
                                        onChange={(e) => setNoteDraft(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={addPersonalNote}
                                        aria-label="Add personal note"
                                        className="rounded-xl border border-green-600 bg-white px-4 py-2 text-base font-bold text-green-600 transition hover:bg-green-50"
                                    >
                                        +
                                    </button>
                                </div>
                                {noteEntries.length > 0 ? (
                                    <div className="space-y-2">
                                        {noteEntries.map((entry, index) => (
                                            <div key={`${entry}-${index}`} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm leading-6 text-gray-700">
                                                {entry}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400">No personal notes recorded yet.</p>
                                )}
                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-gray-700">Health documents</label>
                                    <input
                                        type="file"
                                        multiple
                                        onChange={handleHealthDocumentUpload}
                                        className="block w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-green-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-green-700 hover:file:bg-green-100"
                                    />
                                    <p className="text-xs text-gray-500">
                                        Text-based documents are added to the saved AI context. PDFs and images are listed for reference until extraction support is added.
                                    </p>
                                    {consumerForm.health_documents.length > 0 ? (
                                        <div className="space-y-2">
                                            {consumerForm.health_documents.map((doc) => (
                                                <div key={doc.id} className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium text-gray-800">{doc.name}</p>
                                                        <p className="text-xs text-gray-500">{doc.type} · {formatBytes(doc.size)}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeHealthDocument(doc.id)}
                                                        className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-white"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            </SectionCard>
                            <SectionCard
                                title="How You Eat"
                                hint="Choose the eating patterns that fit you."
                                className="self-start"
                            >
                                <div className="flex flex-wrap gap-2">
                                    {DIETARY_PREFERENCES.map((item) => (
                                        <ChipButton
                                            key={item.id}
                                            label={item.label}
                                            selected={consumerForm.dietary_preferences.includes(item.id)}
                                            onClick={() => toggleListValue('dietary_preferences', item.id)}
                                        />
                                    ))}
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <input
                                        className={inputCls}
                                        placeholder="Other diets, separated by commas"
                                        value={consumerForm.other_dietary_preferences}
                                        onChange={(e) => setConsumerForm({ ...consumerForm, other_dietary_preferences: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={addCustomDietaryPreferences}
                                        aria-label="Add custom dietary preferences"
                                        className="rounded-xl border border-green-600 bg-white px-4 py-2 text-base font-bold text-green-600 transition hover:bg-green-50"
                                    >
                                        +
                                    </button>
                                </div>
                            </SectionCard>
                            </div>
                        </div>
                    </>
                ) : null}

                {mode === 'business' ? (
                    <>
                        <SectionCard
                            title="Business Identity"
                            hint="Help buyers understand who you are and what makes your food offer unique."
                            className="lg:col-span-6"
                        >
                            <input
                                className={inputCls}
                                placeholder="Business or farm name"
                                value={businessForm.business_name}
                                onChange={(e) => setBusinessForm({ ...businessForm, business_name: e.target.value })}
                            />
                            <textarea
                                className={inputCls}
                                rows={3}
                                placeholder="Short description of your farm/distribution operation"
                                value={businessForm.description}
                                onChange={(e) => setBusinessForm({ ...businessForm, description: e.target.value })}
                            />
                        </SectionCard>
                        <SectionCard
                            title="Products & Service Area"
                            hint="Define what you offer so the assistant can connect you with relevant demand."
                            className="lg:col-span-6"
                        >
                            <input
                                className={inputCls}
                                placeholder="Vegetables, herbs, dairy..."
                                value={businessForm.product_types}
                                onChange={(e) => setBusinessForm({ ...businessForm, product_types: e.target.value })}
                            />
                            <input
                                className={inputCls}
                                placeholder="Location / region served"
                                value={businessForm.location}
                                onChange={(e) => setBusinessForm({ ...businessForm, location: e.target.value })}
                            />
                            <select
                                className={inputCls}
                                value={businessForm.subscription_tier}
                                onChange={(e) => setBusinessForm({ ...businessForm, subscription_tier: e.target.value })}
                            >
                                <option value="free">Free Tier</option>
                                <option value="paid">Paid Tier</option>
                            </select>
                        </SectionCard>
                    </>
                ) : null}

                {mode === 'expert' ? (
                    <>
                        <SectionCard
                            title="Professional Identity"
                            hint="Let users know your credentials and how you support food/wellness outcomes."
                            className="lg:col-span-6"
                        >
                            <input
                                className={inputCls}
                                placeholder="Display name"
                                value={expertForm.display_name}
                                onChange={(e) => setExpertForm({ ...expertForm, display_name: e.target.value })}
                            />
                            <input
                                className={inputCls}
                                placeholder="Credentials (e.g., PhD Nutrition, RD)"
                                value={expertForm.credentials}
                                onChange={(e) => setExpertForm({ ...expertForm, credentials: e.target.value })}
                            />
                        </SectionCard>
                        <SectionCard
                            title="Expertise & Bio"
                            hint="Focus areas help the assistant surface your strongest guidance context."
                            className="lg:col-span-6"
                        >
                            <input
                                className={inputCls}
                                placeholder="Gut health, plant-based diets, metabolic health..."
                                value={expertForm.expertise_areas}
                                onChange={(e) => setExpertForm({ ...expertForm, expertise_areas: e.target.value })}
                            />
                            <textarea
                                className={inputCls}
                                rows={4}
                                placeholder="Short bio"
                                value={expertForm.bio}
                                onChange={(e) => setExpertForm({ ...expertForm, bio: e.target.value })}
                            />
                        </SectionCard>
                    </>
                ) : null}
            </div>
            )}

            {!(mode === 'consumer' && consumerTab === 'report') ? (
            <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                {isLoading ? <p className="text-sm text-gray-500">Loading profile...</p> : null}
                {status ? <p className="text-sm text-gray-700">{status}</p> : null}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={onSave}
                            disabled={isSaving || !user?.id}
                            className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                        >
                            {isSaving ? 'Saving...' : 'Save Profile'}
                        </button>
                        <button
                            onClick={onDelete}
                            disabled={isSaving || !user?.id || !hasProfile}
                            className="rounded-xl border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                            Delete Profile
                        </button>
                    </div>
                    <p className="text-right text-xs text-gray-500">
                        {lastUpdatedAt ? `Last saved: ${lastUpdatedAt}` : 'Not saved yet'}
                    </p>
                </div>
            </div>
            ) : null}
        </div>
    );
}

