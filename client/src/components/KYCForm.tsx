'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../lib/api';
import { useAuth } from '../lib/auth';
import { useRouter } from 'next/navigation';
import { AsYouType, getCountries, getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js/min';
import type { CountryCode } from 'libphonenumber-js';

interface KYCFormProps {
    onComplete: () => void;
}

const DIETARY_PREFERENCES = [
    { id: 'vegan', label: 'Vegan' },
    { id: 'vegetarian', label: 'Vegetarian' },
    { id: 'pescetarian', label: 'Pescetarian' },
    { id: 'raw_vegan', label: 'Raw Vegan' },
    { id: 'celiac', label: 'Celiac' },
    { id: 'gluten_free', label: 'Gluten-Free' },
    { id: 'dairy_free', label: 'Dairy-Free' },
    { id: 'paleo', label: 'Paleo' },
    { id: 'low_sugar', label: 'Low Sugar' },
    { id: 'low_fat', label: 'Low Fat' },
];

const COMMON_ALLERGIES = [
    { id: 'peanuts', label: 'Peanuts' },
    { id: 'tree_nuts', label: 'Tree Nuts' },
    { id: 'shellfish', label: 'Shellfish' },
    { id: 'dairy', label: 'Dairy' },
    { id: 'gluten', label: 'Gluten' },
    { id: 'soy', label: 'Soy' },
    { id: 'eggs', label: 'Eggs' },
];

const HEALTH_AREAS = [
    { id: 'hormones', label: 'Hormonal Health', icon: '⚖️', hint: 'Cycles, fibroids, thyroid, PCOS' },
    { id: 'digestion', label: 'Digestive Health', icon: '🌿', hint: 'Gut, bloating, gallbladder, IBS' },
    { id: 'blood_sugar', label: 'Blood Sugar', icon: '🩸', hint: 'Energy stability and metabolic support' },
    { id: 'heart_health', label: 'Heart Health', icon: '💓', hint: 'Blood pressure, cholesterol, circulation' },
    { id: 'inflammation', label: 'Inflammation', icon: '🔥', hint: 'Chronic pain, arthritis, autoimmune' },
    { id: 'mental', label: 'Mental Wellness', icon: '🧠', hint: 'Mood, stress, brain fog, sleep' },
    { id: 'general_wellness', label: 'General Wellness', icon: '✨', hint: 'Everyday healthy eating and better routines' },
];

type LocationSuggestion = {
    placeId: string;
    description: string;
    primaryText: string;
    secondaryText: string;
};

const PREFERRED_COUNTRIES: CountryCode[] = ['US', 'GB', 'AU', 'SG', 'IN', 'ID'];

const CONDITIONS_BY_AREA: Record<string, { id: string; label: string }[]> = {
    hormones: [
        { id: 'fibroids', label: 'Fibroids' },
        { id: 'pcos', label: 'PCOS' },
        { id: 'thyroid', label: 'Thyroid Condition' },
        { id: 'hormonal_imbalance', label: 'Hormonal Imbalance' },
        { id: 'endometriosis', label: 'Endometriosis' },
        { id: 'menopause', label: 'Menopause' },
    ],
    digestion: [
        { id: 'no_gallbladder', label: 'No Gallbladder' },
        { id: 'ibs', label: 'IBS' },
        { id: 'crohns', label: "Crohn's Disease" },
        { id: 'acid_reflux', label: 'Acid Reflux' },
        { id: 'leaky_gut', label: 'Leaky Gut' },
        { id: 'constipation', label: 'Chronic Constipation' },
    ],
    blood_sugar: [
        { id: 'diabetes', label: 'Diabetes (Type 1 or 2)' },
        { id: 'prediabetes', label: 'Pre-Diabetes' },
        { id: 'insulin_resistance', label: 'Insulin Resistance' },
        { id: 'weight_management', label: 'Weight Management' },
        { id: 'fatigue', label: 'Chronic Fatigue' },
    ],
    heart_health: [
        { id: 'high_blood_pressure', label: 'High Blood Pressure' },
        { id: 'high_cholesterol', label: 'High Cholesterol' },
        { id: 'heart_disease', label: 'Heart Disease' },
        { id: 'anemia', label: 'Anemia' },
    ],
    inflammation: [
        { id: 'chronic_inflammation', label: 'Chronic Inflammation' },
        { id: 'arthritis', label: 'Arthritis' },
        { id: 'lupus', label: 'Lupus' },
        { id: 'autoimmune', label: 'Other Autoimmune' },
        { id: 'allergies_env', label: 'Environmental Allergies' },
    ],
    mental: [
        { id: 'anxiety', label: 'Anxiety' },
        { id: 'depression', label: 'Depression' },
        { id: 'brain_fog', label: 'Brain Fog' },
        { id: 'poor_sleep', label: 'Poor Sleep' },
        { id: 'stress', label: 'Chronic Stress' },
    ],
    general_wellness: [],
};

function StepCard({
    icon,
    title,
    hint,
    selected,
    onClick
}: {
    icon: string;
    title: string;
    hint: string;
    selected: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                selected ? 'border-green-500 bg-green-50' : 'border-gray-100 hover:border-green-200 bg-white'
            }`}
        >
            <span className="text-2xl shrink-0">{icon}</span>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm">{title}</p>
                {hint ? <p className="text-xs text-gray-500 mt-0.5">{hint}</p> : null}
            </div>
            {selected ? (
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            ) : null}
        </button>
    );
}

export default function KYCForm({ onComplete }: KYCFormProps) {
    const { user, login } = useAuth();
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [phoneCountry, setPhoneCountry] = useState<CountryCode>('US');
    const [phoneInput, setPhoneInput] = useState('');
    const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
    const [isLocationSearching, setIsLocationSearching] = useState(false);
    const [locationStatus, setLocationStatus] = useState<string | null>(null);
    const [isAddressConfirmed, setIsAddressConfirmed] = useState(false);
    const [isLocatingHome, setIsLocatingHome] = useState(false);

    // Step 1 — Role
    const [role, setRole] = useState<'consumer' | 'farmer' | 'distributor' | 'servicer'>('consumer');

    // Step 2 — Basic info
    const [formData, setFormData] = useState({
        full_name: '',
        phone_number: '',
        location_city: '',
        location_address: '',
    });

    const countryOptions = useMemo(() => {
        const names = typeof Intl !== 'undefined' && 'DisplayNames' in Intl
            ? new Intl.DisplayNames(['en'], { type: 'region' })
            : null;
        const all = getCountries().map((code) => ({
            code,
            label: names?.of(code) || code,
            dialCode: getCountryCallingCode(code)
        }));
        const preferred = all.filter((item) => PREFERRED_COUNTRIES.includes(item.code));
        const others = all
            .filter((item) => !PREFERRED_COUNTRIES.includes(item.code))
            .sort((a, b) => a.label.localeCompare(b.label));
        return [...preferred, ...others];
    }, []);

    const normalizedPhone = useMemo(() => {
        const parsed = parsePhoneNumberFromString(phoneInput, phoneCountry);
        return parsed?.number || '';
    }, [phoneCountry, phoneInput]);

    useEffect(() => {
        if (step !== 2) return;
        if (isAddressConfirmed) return;
        const query = formData.location_address.trim();
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
                    params: { q: query, country: phoneCountry }
                });
                const suggestions = Array.isArray(res.data?.suggestions) ? res.data.suggestions : [];
                setLocationSuggestions(suggestions);
                if (suggestions.length > 0) {
                    setLocationStatus('Choose a suggested address, area, or place name, or keep what you typed.');
                } else {
                    setLocationStatus('No address suggestions found yet. You can still continue with your typed address.');
                }
            } catch {
                setLocationSuggestions([]);
                setLocationStatus('Address lookup is unavailable right now. You can still continue with your typed address.');
            } finally {
                setIsLocationSearching(false);
            }
        }, 250);

        return () => window.clearTimeout(timeoutId);
    }, [formData.location_address, isAddressConfirmed, phoneCountry, step]);

    // Step 3 — Health profile
    const [selectedAreas, setSelectedAreas] = useState<string[]>(['general_wellness']);
    const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
    const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
    const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
    const [otherAllergy, setOtherAllergy] = useState('');
    const [autoMealPlanEnabled, setAutoMealPlanEnabled] = useState(true);

    const availableConditionGroups = useMemo(
        () =>
            selectedAreas
                .map((areaId) => ({
                    areaId,
                    areaInfo: HEALTH_AREAS.find((h) => h.id === areaId),
                    conditions: CONDITIONS_BY_AREA[areaId] || [],
                }))
                .filter((group) => group.conditions.length > 0),
        [selectedAreas]
    );

    const hasConditions = availableConditionGroups.length > 0;
    const totalSteps = hasConditions ? 5 : 4;

    const toggle = (list: string[], setList: (v: string[]) => void, id: string) => {
        setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
    };

    const handleNext = async () => {
        if (step === 3 && !hasConditions) {
            setStep(4);
            return;
        }

        if (step < totalSteps) {
            setStep((current) => current + 1);
            return;
        }

        setSaving(true);

        const allergies = [
            ...selectedAllergies,
            ...(otherAllergy.trim() ? [otherAllergy.trim().toLowerCase()] : [])
        ];

        const profileData = {
            health_areas: selectedAreas,
            health_conditions: selectedConditions,
            dietary_preferences: selectedPreferences,
            allergies,
            auto_meal_plan_enabled: autoMealPlanEnabled,
            location: {
                city: formData.location_city,
                address: formData.location_address,
            }
        };

        try {
            const updateRes = await api.put('/user/profile', {
                ...formData,
                phone_number: normalizedPhone,
                role,
                profile_data: profileData
            });

            if (updateRes.data) {
                login(localStorage.getItem('token') || '', updateRes.data, undefined);
            }

            onComplete();
        } catch (error) {
            console.warn('KYC Update Failed, falling back to local update', error);
            if (user) {
                const updatedUser = { ...user, ...formData, role, profile_data: profileData };
                login(localStorage.getItem('token') || 'mock-token', updatedUser as any, undefined);
            }
            onComplete();
        } finally {
            setSaving(false);
        }
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

            setFormData((prev) => ({
                ...prev,
                location_address: detectedAddress,
                location_city: detectedCity
            }));
            setIsAddressConfirmed(true);
            setLocationStatus('Home location pinned from your current location.');
        } catch (error: any) {
            console.error('Pin current location failed:', error);
            setLocationStatus('Could not access your current location. Please allow location access or type your home address.');
        } finally {
            setIsLocatingHome(false);
        }
    };

    // ── Chip button helper ──────────────────────────────────────────────────
    const Chip = ({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) => (
        <button
            type="button"
            onClick={onClick}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                selected
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
            }`}
        >
            {label}
        </button>
    );

    // ── Progress indicator ──────────────────────────────────────────────────
    const Progress = () => (
        <div className="flex items-center justify-center gap-2 mb-6">
            {Array.from({ length: totalSteps }, (_, idx) => idx + 1).map(n => (
                <div key={n} className={`h-2 rounded-full transition-all ${
                    n === step ? 'w-8 bg-green-600' : n < step ? 'w-4 bg-green-400' : 'w-4 bg-gray-200'
                }`} />
            ))}
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg border border-gray-100"
        >
            <Progress />

            {/* ── Step 1: Role ─────────────────────────────────────────────── */}
            {step === 1 && (
                <div className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900">Choose your Role</h2>
                        <p className="text-gray-500 text-sm">How will you participate in the network?</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { id: 'consumer', label: 'Consumer', icon: '🥗', desc: 'I want to buy fresh produce.' },
                            { id: 'farmer', label: 'Farmer', icon: '👩‍🌾', desc: 'I grow food to sell.' },
                            { id: 'distributor', label: 'Distributor', icon: '🚚', desc: 'I move food across the network.' },
                            { id: 'servicer', label: 'Servicer', icon: '🔧', desc: 'I maintain grow systems.' },
                        ].map(option => (
                            <div
                                key={option.id}
                                onClick={() => setRole(option.id as any)}
                                className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
                                    role === option.id ? 'border-green-500 bg-green-50' : 'border-gray-100 hover:border-green-200'
                                }`}
                            >
                                <div className="text-2xl mb-2">{option.icon}</div>
                                <h3 className="font-bold text-gray-900">{option.label}</h3>
                                <p className="text-xs text-gray-500 leading-tight mt-1">{option.desc}</p>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={handleNext}
                        className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition"
                    >
                        Continue as {role.charAt(0).toUpperCase() + role.slice(1)}
                    </button>
                </div>
            )}

            {/* ── Step 2: Basic Info ───────────────────────────────────────── */}
            {step === 2 && (
                <div className="space-y-4">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Complete Profile</h2>
                        <p className="text-gray-500 text-sm">Tell us a bit about yourself.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                            placeholder="Your full name"
                            value={formData.full_name}
                            onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-2">
                            <select
                                value={phoneCountry}
                                onChange={(e) => {
                                    const next = e.target.value as CountryCode;
                                    setPhoneCountry(next);
                                    if (!phoneInput.trim()) return;
                                    const digits = phoneInput.replace(/[^\d+]/g, '');
                                    setPhoneInput(new AsYouType(next).input(digits));
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                            >
                                {countryOptions.map((c) => (
                                    <option key={c.code} value={c.code}>
                                        {c.label} (+{c.dialCode})
                                    </option>
                                ))}
                            </select>
                            <input
                                type="tel"
                                inputMode="tel"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                placeholder="Enter your phone number"
                                value={phoneInput}
                                onChange={(e) => {
                                    setPhoneInput(new AsYouType(phoneCountry).input(e.target.value));
                                }}
                            />
                        </div>
                        <p className="mt-1 text-xs text-gray-400">
                            Saved as international format: {normalizedPhone || 'Not provided'}
                        </p>
                    </div>
                    <div>
                        <div className="mb-1 flex items-center justify-between gap-3">
                            <label className="block text-sm font-medium text-gray-700">Address</label>
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
                                {isLocatingHome ? 'Pinning home...' : 'Use my current location as home'}
                            </button>
                        </div>
                        <input
                            type="text"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                            placeholder="Start typing your street, area, landmark, city, ZIP code, or postcode"
                            value={formData.location_address}
                            onChange={e => {
                                setIsAddressConfirmed(false);
                                setFormData({ ...formData, location_address: e.target.value });
                            }}
                        />
                        <p className="mt-2 text-xs text-gray-400">
                            You can type a neighborhood, landmark, village, or place name and choose the best match.
                        </p>
                        {isLocationSearching ? (
                            <p className="mt-2 text-xs text-gray-400">Searching addresses...</p>
                        ) : locationStatus ? (
                            <p className="mt-2 text-xs text-gray-400">{locationStatus}</p>
                        ) : null}
                        {locationSuggestions.length > 0 ? (
                            <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white">
                                {locationSuggestions.map((suggestion) => (
                                    <button
                                        key={`${suggestion.placeId}-${suggestion.description}`}
                                        type="button"
                                        onClick={() => {
                                            setFormData({
                                                ...formData,
                                                location_address: suggestion.description,
                                                location_city: suggestion.secondaryText.split(',')[0]?.trim() || ''
                                            });
                                            setIsAddressConfirmed(true);
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
                        {formData.location_city ? (
                            <p className="mt-2 text-xs text-gray-400">Detected area: {formData.location_city}</p>
                        ) : null}
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={() => setStep(1)}
                            className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-50 rounded-xl transition"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={!formData.full_name}
                            className="flex-[2] bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition disabled:opacity-50"
                        >
                            Continue
                        </button>
                    </div>
                </div>
            )}

            {/* ── Step 3: Health Areas ─────────────────────────────────────── */}
            {step === 3 && (
                <div className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900">What's your health focus?</h2>
                        <p className="text-gray-500 text-sm">Select all areas that matter to you right now.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {HEALTH_AREAS.map((area) => (
                            <StepCard
                                key={area.id}
                                onClick={() => toggle(selectedAreas, setSelectedAreas, area.id)}
                                selected={selectedAreas.includes(area.id)}
                                icon={area.icon}
                                title={area.label}
                                hint={area.hint}
                            />
                        ))}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setStep(2)}
                            className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-50 rounded-xl transition"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={selectedAreas.length === 0}
                            className="flex-[2] bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition disabled:opacity-50"
                        >
                            Continue
                        </button>
                    </div>
                </div>
            )}

            {/* ── Step 4: Health Conditions ────────────────────────────────── */}
            {step === 4 && hasConditions && (
                <div className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900">Any specific conditions?</h2>
                        <p className="text-gray-500 text-sm">This helps us give you more targeted recommendations.</p>
                    </div>

                    <div className="space-y-5">
                        {availableConditionGroups.map(({ areaId, areaInfo, conditions }) => (
                            <div key={areaId}>
                                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">
                                    {areaInfo?.icon} {areaInfo?.label}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {conditions.map((condition) => (
                                        <button
                                            key={condition.id}
                                            type="button"
                                            onClick={() => toggle(selectedConditions, setSelectedConditions, condition.id)}
                                            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                                                selectedConditions.includes(condition.id)
                                                    ? 'border-green-600 bg-green-600 text-white'
                                                    : 'border-gray-300 bg-white text-gray-700 hover:border-green-300'
                                            }`}
                                        >
                                            {condition.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <p className="text-xs text-gray-400 pt-1">
                            Don't see yours? You can add more detail in your full health profile later.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setStep(3)}
                            className="flex-1 py-3 text-gray-600 font-bold border border-gray-200 rounded-2xl hover:bg-gray-50 transition"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleNext}
                            className="flex-[2] bg-green-600 text-white py-3 rounded-2xl font-bold hover:bg-green-700 transition"
                        >
                            Continue →
                        </button>
                    </div>
                </div>
            )}

            {/* ── Final Step: Food Preferences ─────────────────────────────── */}
            {((step === 4 && !hasConditions) || (step === 5 && hasConditions)) && (
                <div className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900">How do you eat?</h2>
                        <p className="text-gray-500 text-sm">Finish with your food preferences, allergy filters, and whether you want an auto-generated meal plan.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Dietary Preferences <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <p className="mb-3 text-xs text-gray-500">Choose the eating styles that best reflect how you want recommendations to work.</p>
                        <div className="flex flex-wrap gap-2">
                            {DIETARY_PREFERENCES.map(p => (
                                <Chip
                                    key={p.id}
                                    label={p.label}
                                    selected={selectedPreferences.includes(p.id)}
                                    onClick={() => toggle(selectedPreferences, setSelectedPreferences, p.id)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Allergies */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Allergies <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <p className="mb-3 text-xs text-gray-500">Mark anything the assistant should always filter out from meals and food ideas.</p>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {COMMON_ALLERGIES.map(a => (
                                <Chip
                                    key={a.id}
                                    label={a.label}
                                    selected={selectedAllergies.includes(a.id)}
                                    onClick={() => toggle(selectedAllergies, setSelectedAllergies, a.id)}
                                />
                            ))}
                        </div>
                        <input
                            type="text"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
                            placeholder="Other allergy (e.g. sesame)"
                            value={otherAllergy}
                            onChange={e => setOtherAllergy(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Auto-generate a weekly meal plan?
                        </label>
                        <p className="mb-3 text-xs text-gray-500">Turn this on if you want PLYT to suggest a ready-made weekly structure based on your profile.</p>
                        <div className="grid grid-cols-2 gap-2">
                            {[true, false].map((value) => (
                                <button
                                    key={String(value)}
                                    type="button"
                                    onClick={() => setAutoMealPlanEnabled(value)}
                                    className={`px-3 py-2 rounded-lg border text-sm font-semibold transition ${
                                        autoMealPlanEnabled === value
                                            ? 'bg-green-600 text-white border-green-600'
                                            : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
                                    }`}
                                >
                                    {value ? 'Yes' : 'No'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setStep(hasConditions ? 4 : 3)}
                            className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-50 rounded-xl transition"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={saving}
                            className="flex-[2] bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Finish Setup'}
                        </button>
                    </div>

                    <p className="text-center text-xs text-gray-400">
                        You can update your health profile anytime in settings.
                    </p>
                    <button
                        type="button"
                        onClick={() => router.push('/')}
                        className="w-full text-center text-sm font-medium text-green-600 hover:underline"
                    >
                        Skip for now and explore the app
                    </button>
                </div>
            )}
        </motion.div>
    );
}
