'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import api from '../lib/api';
import { useAuth } from '../lib/auth';

interface KYCFormProps {
    onComplete: () => void;
}

const HEALTH_CONDITIONS = [
    { id: 'fibroids', label: 'Fibroids', icon: '🌸' },
    { id: 'no_gallbladder', label: 'No Gallbladder', icon: '🫀' },
    { id: 'diabetes', label: 'Diabetes', icon: '🩸' },
    { id: 'high_blood_pressure', label: 'High Blood Pressure', icon: '💓' },
    { id: 'digestive_issues', label: 'Digestive Issues', icon: '🌿' },
    { id: 'hormonal_imbalance', label: 'Hormonal Imbalance', icon: '⚖️' },
    { id: 'thyroid', label: 'Thyroid Condition', icon: '🦋' },
    { id: 'inflammation', label: 'Chronic Inflammation', icon: '🔥' },
];

const DIETARY_PREFERENCES = [
    { id: 'vegan', label: 'Vegan' },
    { id: 'vegetarian', label: 'Vegetarian' },
    { id: 'raw_vegan', label: 'Raw Vegan' },
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

const PHONE_COUNTRIES = [
    { id: 'US', label: 'United States', dialCode: '1', maxDigits: 10, placeholder: '(555) 123-4567' },
    { id: 'SG', label: 'Singapore', dialCode: '65', maxDigits: 8, placeholder: '8123 4567' },
    { id: 'ID', label: 'Indonesia', dialCode: '62', maxDigits: 11, placeholder: '812 3456 7890' },
    { id: 'IN', label: 'India', dialCode: '91', maxDigits: 10, placeholder: '98765 43210' },
    { id: 'GB', label: 'United Kingdom', dialCode: '44', maxDigits: 10, placeholder: '7400 123456' },
    { id: 'AU', label: 'Australia', dialCode: '61', maxDigits: 9, placeholder: '412 345 678' },
] as const;

function formatLocalPhone(countryId: string, digits: string) {
    if (!digits) return '';
    if (countryId === 'US') {
        const d = digits.slice(0, 10);
        if (d.length <= 3) return d;
        if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
        return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
    }
    if (countryId === 'SG') {
        const d = digits.slice(0, 8);
        if (d.length <= 4) return d;
        return `${d.slice(0, 4)} ${d.slice(4)}`;
    }
    if (countryId === 'IN' || countryId === 'GB') {
        const d = digits.slice(0, 10);
        if (d.length <= 5) return d;
        return `${d.slice(0, 5)} ${d.slice(5)}`;
    }
    const d = digits;
    if (d.length <= 3) return d;
    if (d.length <= 7) return `${d.slice(0, 3)} ${d.slice(3)}`;
    return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}`;
}

export default function KYCForm({ onComplete }: KYCFormProps) {
    const { user, login } = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [phoneCountry, setPhoneCountry] = useState<(typeof PHONE_COUNTRIES)[number]['id']>('US');
    const [phoneLocal, setPhoneLocal] = useState('');

    // Step 1 — Role
    const [role, setRole] = useState<'consumer' | 'farmer' | 'distributor' | 'servicer'>('consumer');

    // Step 2 — Basic info
    const [formData, setFormData] = useState({
        full_name: '',
        phone_number: '',
        location_city: '',
        location_address: '',
    });

    // Step 3 — Health profile
    const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
    const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
    const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
    const [otherAllergy, setOtherAllergy] = useState('');
    const [autoMealPlanEnabled, setAutoMealPlanEnabled] = useState(true);

    const toggle = (list: string[], setList: (v: string[]) => void, id: string) => {
        setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
    };

    const handleUpdate = async () => {
        setLoading(true);

        const allergies = [
            ...selectedAllergies,
            ...(otherAllergy.trim() ? [otherAllergy.trim().toLowerCase()] : [])
        ];
        const countryConfig = PHONE_COUNTRIES.find((c) => c.id === phoneCountry)!;
        const normalizedPhone = phoneLocal ? `+${countryConfig.dialCode}${phoneLocal}` : '';

        const profileData = {
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
            await api.put('/user/profile', {
                ...formData,
                phone_number: normalizedPhone,
                role,
                profile_data: profileData
            });

            try {
                const res = await api.get('/user/me');
                if (res.data) login(localStorage.getItem('token') || '', res.data, undefined);
            } catch { /* ignore */ }

            onComplete();
        } catch (error) {
            console.warn('KYC Update Failed, falling back to local update', error);
            if (user) {
                const updatedUser = { ...user, ...formData, role, profile_data: profileData };
                login(localStorage.getItem('token') || 'mock-token', updatedUser as any, undefined);
            }
            onComplete();
        } finally {
            setLoading(false);
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
            {[1, 2, 3].map(n => (
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
                        onClick={() => setStep(2)}
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
                                    const next = e.target.value as (typeof PHONE_COUNTRIES)[number]['id'];
                                    setPhoneCountry(next);
                                    setPhoneLocal('');
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                            >
                                {PHONE_COUNTRIES.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.label} (+{c.dialCode})
                                    </option>
                                ))}
                            </select>
                            <input
                                type="tel"
                                inputMode="numeric"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                placeholder={PHONE_COUNTRIES.find((c) => c.id === phoneCountry)?.placeholder}
                                value={formatLocalPhone(phoneCountry, phoneLocal)}
                                onChange={(e) => {
                                    const cfg = PHONE_COUNTRIES.find((c) => c.id === phoneCountry)!;
                                    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, cfg.maxDigits);
                                    setPhoneLocal(digitsOnly);
                                }}
                            />
                        </div>
                        <p className="mt-1 text-xs text-gray-400">
                            Saved as international format: {phoneLocal ? `+${PHONE_COUNTRIES.find((c) => c.id === phoneCountry)?.dialCode}${phoneLocal}` : 'Not provided'}
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                placeholder="Your city"
                                value={formData.location_city}
                                onChange={e => setFormData({ ...formData, location_city: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">State / Province / Region</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                placeholder="e.g. California / NSW / Jawa Barat"
                                value={formData.location_address}
                                onChange={e => setFormData({ ...formData, location_address: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={() => setStep(1)}
                            className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-50 rounded-xl transition"
                        >
                            Back
                        </button>
                        <button
                            onClick={() => setStep(3)}
                            disabled={!formData.full_name}
                            className="flex-[2] bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition disabled:opacity-50"
                        >
                            Continue
                        </button>
                    </div>
                </div>
            )}

            {/* ── Step 3: Health Profile ───────────────────────────────────── */}
            {step === 3 && (
                <div className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900">Your Health Profile</h2>
                        <p className="text-gray-500 text-sm">Help us personalize your food recommendations. All info is private.</p>
                    </div>

                    {/* Health Conditions */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Health Conditions <span className="text-gray-400 font-normal">(select all that apply)</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {HEALTH_CONDITIONS.map(c => (
                                <Chip
                                    key={c.id}
                                    label={`${c.icon} ${c.label}`}
                                    selected={selectedConditions.includes(c.id)}
                                    onClick={() => toggle(selectedConditions, setSelectedConditions, c.id)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Dietary Preferences */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Dietary Preferences <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
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
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setAutoMealPlanEnabled(true)}
                                className={`px-3 py-2 rounded-lg border text-sm font-semibold transition ${
                                    autoMealPlanEnabled
                                        ? 'bg-green-600 text-white border-green-600'
                                        : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
                                }`}
                            >
                                Yes
                            </button>
                            <button
                                type="button"
                                onClick={() => setAutoMealPlanEnabled(false)}
                                className={`px-3 py-2 rounded-lg border text-sm font-semibold transition ${
                                    !autoMealPlanEnabled
                                        ? 'bg-green-600 text-white border-green-600'
                                        : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
                                }`}
                            >
                                No
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setStep(2)}
                            className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-50 rounded-xl transition"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleUpdate}
                            disabled={loading}
                            className="flex-[2] bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : '🌱 Start My Journey'}
                        </button>
                    </div>

                    <p className="text-center text-xs text-gray-400">
                        You can update your health profile anytime in settings.
                    </p>
                </div>
            )}
        </motion.div>
    );
}
