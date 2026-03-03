'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '../../lib/api';
import { useAuth } from '../../lib/auth';

type ProfileMode = 'consumer' | 'business' | 'expert';

type ConsumerProfile = {
    dietary_preferences: string[];
    health_conditions: string[];
    wellness_goals: string[];
    location: string;
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

function toCsv(values: string[] | undefined) {
    return (values || []).join(', ');
}

function fromCsv(value: string) {
    return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
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
        title: 'Consumer Health Profile',
        subtitle: 'Personalize your food and wellness recommendations based on your needs.'
    };
}

function SectionCard({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
    return (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
            <p className="mt-1 text-xs text-gray-500">{hint}</p>
            <div className="mt-4 space-y-3">{children}</div>
        </section>
    );
}

const inputCls =
    'w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500';

export default function ProfileWorkspace() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const mode = getMode(searchParams.get('profile'));
    const route = useMemo(() => getRoute(mode), [mode]);
    const heading = getHeading(mode);

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [hasProfile, setHasProfile] = useState(false);
    const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

    const [consumerForm, setConsumerForm] = useState({
        dietary_preferences: '',
        health_conditions: '',
        wellness_goals: '',
        location: ''
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
                    const p = data as ConsumerProfile;
                    setConsumerForm({
                        dietary_preferences: toCsv(p.dietary_preferences),
                        health_conditions: toCsv(p.health_conditions),
                        wellness_goals: toCsv(p.wellness_goals),
                        location: p.location || ''
                    });
                } else if (mode === 'business') {
                    const p = data as BusinessProfile;
                    setBusinessForm({
                        business_name: p.business_name || '',
                        description: p.description || '',
                        location: p.location || '',
                        product_types: toCsv(p.product_types),
                        subscription_tier: p.subscription_tier || 'free'
                    });
                } else {
                    const p = data as ExpertProfile;
                    setExpertForm({
                        display_name: p.display_name || '',
                        credentials: p.credentials || '',
                        expertise_areas: toCsv(p.expertise_areas),
                        bio: p.bio || ''
                    });
                }
            } catch (error: any) {
                if (error?.response?.status === 404) {
                    setHasProfile(false);
                } else {
                    setStatus(error?.response?.data?.error || 'Could not load your profile right now.');
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadProfile();
    }, [mode, route, user?.id]);

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
            dietary_preferences: fromCsv(consumerForm.dietary_preferences),
            health_conditions: fromCsv(consumerForm.health_conditions),
            wellness_goals: fromCsv(consumerForm.wellness_goals),
            location: consumerForm.location
        };
    };

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
            <div className="rounded-3xl border border-green-100 bg-gradient-to-br from-white to-green-50 p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900">{heading.title}</h2>
                <p className="mt-1 text-sm text-gray-600">{heading.subtitle}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                    <span className="rounded-full bg-white px-3 py-1 border border-gray-200">
                        Role: {user?.role || 'guest'}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 border border-gray-200">
                        Status: {hasProfile ? 'Saved' : 'Not saved'}
                    </span>
                    {lastUpdatedAt ? (
                        <span className="rounded-full bg-white px-3 py-1 border border-gray-200">
                            Updated: {lastUpdatedAt}
                        </span>
                    ) : null}
                </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                {mode === 'consumer' ? (
                    <>
                        <SectionCard
                            title="How You Eat"
                            hint="Share your dietary preferences so recommendations match your lifestyle."
                        >
                            <input
                                className={inputCls}
                                placeholder="Vegan, gluten-free, pescatarian..."
                                value={consumerForm.dietary_preferences}
                                onChange={(e) => setConsumerForm({ ...consumerForm, dietary_preferences: e.target.value })}
                            />
                        </SectionCard>
                        <SectionCard
                            title="Health Priorities"
                            hint="Add any conditions or goals you want the assistant to consider."
                        >
                            <input
                                className={inputCls}
                                placeholder="Diabetes, hypertension..."
                                value={consumerForm.health_conditions}
                                onChange={(e) => setConsumerForm({ ...consumerForm, health_conditions: e.target.value })}
                            />
                            <input
                                className={inputCls}
                                placeholder="Weight loss, better energy, gut health..."
                                value={consumerForm.wellness_goals}
                                onChange={(e) => setConsumerForm({ ...consumerForm, wellness_goals: e.target.value })}
                            />
                            <input
                                className={inputCls}
                                placeholder="City or area (for local food suggestions)"
                                value={consumerForm.location}
                                onChange={(e) => setConsumerForm({ ...consumerForm, location: e.target.value })}
                            />
                        </SectionCard>
                    </>
                ) : null}

                {mode === 'business' ? (
                    <>
                        <SectionCard
                            title="Business Identity"
                            hint="Help buyers understand who you are and what makes your food offer unique."
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

            <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                {isLoading ? <p className="text-sm text-gray-500">Loading profile...</p> : null}
                {status ? <p className="text-sm text-gray-700">{status}</p> : null}
                <div className="mt-3 flex flex-wrap gap-3">
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
            </div>
        </div>
    );
}

