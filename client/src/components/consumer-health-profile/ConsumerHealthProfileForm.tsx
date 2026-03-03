'use client';

import { useState } from 'react';
import api from '../../lib/api';

type ConsumerHealthProfileData = {
    dietary_preferences: string[];
    health_conditions: string[];
    wellness_goals: string[];
    location: string;
};

function parseCsv(input: string) {
    return input
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
}

export default function ConsumerHealthProfileForm({ userId }: { userId: string }) {
    const [dietaryPreferences, setDietaryPreferences] = useState('');
    const [healthConditions, setHealthConditions] = useState('');
    const [wellnessGoals, setWellnessGoals] = useState('');
    const [location, setLocation] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        const profileData: ConsumerHealthProfileData = {
            dietary_preferences: parseCsv(dietaryPreferences),
            health_conditions: parseCsv(healthConditions),
            wellness_goals: parseCsv(wellnessGoals),
            location
        };

        try {
            await api.post('/consumer-health-profile', {
                user_id: userId,
                profile_data: profileData
            });
        } catch (saveError: any) {
            setError(saveError?.response?.data?.error || 'Failed to save profile');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="mb-3 text-lg font-semibold text-gray-900">Consumer Health Profile</h3>
            <div className="space-y-3">
                <input
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Dietary preferences (comma separated)"
                    value={dietaryPreferences}
                    onChange={(e) => setDietaryPreferences(e.target.value)}
                />
                <input
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Health conditions (comma separated)"
                    value={healthConditions}
                    onChange={(e) => setHealthConditions(e.target.value)}
                />
                <input
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Wellness goals (comma separated)"
                    value={wellnessGoals}
                    onChange={(e) => setWellnessGoals(e.target.value)}
                />
                <input
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                />
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                    {saving ? 'Saving...' : 'Save Health Profile'}
                </button>
            </div>
        </div>
    );
}

