'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth';
import api from '../../lib/api';

type ResponseStyle = 'concise' | 'detailed';
type FulfillmentPreference = 'balanced' | 'recipe_first' | 'order_first';
type ChatRetentionPreference = '1_day' | '7_days' | '30_days' | 'keep_saved_only';

type UserSettings = {
    response_style: ResponseStyle;
    fulfillment_preference: FulfillmentPreference;
    proactive_follow_up: boolean;
    default_search_radius_km: number;
    chat_retention_preference: ChatRetentionPreference;
};

const DEFAULT_SETTINGS: UserSettings = {
    response_style: 'concise',
    fulfillment_preference: 'balanced',
    proactive_follow_up: true,
    default_search_radius_km: 25,
    chat_retention_preference: '7_days'
};

const SEARCH_RADIUS_OPTIONS = [5, 10, 25, 50, 80, 120];

function normalizeSettings(raw: any): UserSettings {
    const responseStyle = raw?.response_style === 'detailed' ? 'detailed' : 'concise';
    const fulfillmentPreference =
        raw?.fulfillment_preference === 'recipe_first' || raw?.fulfillment_preference === 'order_first'
            ? raw.fulfillment_preference
            : 'balanced';
    const defaultSearchRadius = SEARCH_RADIUS_OPTIONS.includes(Number(raw?.default_search_radius_km))
        ? Number(raw.default_search_radius_km)
        : DEFAULT_SETTINGS.default_search_radius_km;
    const retentionPreference =
        raw?.chat_retention_preference === '1_day' ||
        raw?.chat_retention_preference === '30_days' ||
        raw?.chat_retention_preference === 'keep_saved_only'
            ? raw.chat_retention_preference
            : '7_days';

    return {
        response_style: responseStyle,
        fulfillment_preference: fulfillmentPreference,
        proactive_follow_up: raw?.proactive_follow_up !== false,
        default_search_radius_km: defaultSearchRadius,
        chat_retention_preference: retentionPreference
    };
}

export default function SettingsPage() {
    const { user, token, login, loading, openLoginModal } = useAuth();
    const initialSettings = useMemo(
        () => normalizeSettings(user?.profile_data?.user_settings),
        [user?.profile_data?.user_settings]
    );
    const [settings, setSettings] = useState<UserSettings>(initialSettings);
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);

    if (loading) {
        return <div className="min-h-screen bg-gray-50" />;
    }

    if (!user) {
        return (
            <div className="mx-auto max-w-3xl px-6 py-12">
                <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
                    <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                    <p className="mt-3 text-sm leading-6 text-gray-600">
                        Sign in to manage your AI preferences and chat retention settings.
                    </p>
                    <button
                        type="button"
                        onClick={openLoginModal}
                        className="mt-6 rounded-full bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
                    >
                        Sign in
                    </button>
                </div>
            </div>
        );
    }

    const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
        setSettings((current) => ({ ...current, [key]: value }));
        setSaveMessage(null);
        setSaveError(null);
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveMessage(null);
        setSaveError(null);

        try {
            const response = await api.put('/user/profile', {
                profile_data: {
                    user_settings: settings
                }
            });

            if (token && response.data) {
                login(token, response.data);
            }

            setSaveMessage('Settings saved.');
        } catch (error: any) {
            setSaveError(error?.response?.data?.error || 'Could not save your settings right now.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mx-auto max-w-4xl px-6 py-10">
            <div className="rounded-[28px] border border-gray-200 bg-white p-8 shadow-sm">
                <div className="border-b border-gray-100 pb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                            Adjust how Navi responds, how proactive it is, how far it searches by default, and how long unsaved chats stay around.
                        </p>
                    </div>
                </div>

                <div className="grid gap-8 py-8 lg:grid-cols-[1.35fr_0.9fr]">
                    <section className="space-y-8">
                        <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5">
                            <h2 className="text-lg font-semibold text-gray-900">AI response style</h2>
                            <p className="mt-1 text-sm text-gray-600">Choose whether replies should stay compact or give a bit more detail.</p>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                {[
                                    { id: 'concise', label: 'Concise', description: 'Short, quick-to-scan answers with just the key point.' },
                                    { id: 'detailed', label: 'Detailed', description: 'A little more explanation and context when it helps.' }
                                ].map((option) => (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => updateSetting('response_style', option.id as ResponseStyle)}
                                        className={`rounded-2xl border px-4 py-4 text-left transition ${
                                            settings.response_style === option.id
                                                ? 'border-green-500 bg-green-50'
                                                : 'border-gray-200 bg-white hover:border-green-300'
                                        }`}
                                    >
                                        <p className="font-semibold text-gray-900">{option.label}</p>
                                        <p className="mt-1 text-sm text-gray-600">{option.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5">
                            <h2 className="text-lg font-semibold text-gray-900">Food guidance bias</h2>
                            <p className="mt-1 text-sm text-gray-600">For broad cravings, decide whether Navi should lean toward cooking, ordering, or stay balanced.</p>
                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                {[
                                    { id: 'balanced', label: 'Balanced' },
                                    { id: 'recipe_first', label: 'Recipe-first' },
                                    { id: 'order_first', label: 'Order-first' }
                                ].map((option) => (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => updateSetting('fulfillment_preference', option.id as FulfillmentPreference)}
                                        className={`rounded-2xl border px-4 py-4 text-left transition ${
                                            settings.fulfillment_preference === option.id
                                                ? 'border-green-500 bg-green-50'
                                                : 'border-gray-200 bg-white hover:border-green-300'
                                        }`}
                                    >
                                        <p className="font-semibold text-gray-900">{option.label}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Proactive follow-up</h2>
                                    <p className="mt-1 text-sm text-gray-600">Let Navi ask short clarifying questions when your request is broad or could use a little more direction.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => updateSetting('proactive_follow_up', !settings.proactive_follow_up)}
                                    className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition ${settings.proactive_follow_up ? 'bg-green-600' : 'bg-gray-300'}`}
                                    aria-pressed={settings.proactive_follow_up}
                                >
                                    <span
                                        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${settings.proactive_follow_up ? 'left-6' : 'left-1'}`}
                                    />
                                </button>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5">
                            <h2 className="text-lg font-semibold text-gray-900">Default search radius</h2>
                            <p className="mt-1 text-sm text-gray-600">Set the distance Navi should use first when it searches nearby places for you.</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {SEARCH_RADIUS_OPTIONS.map((radius) => (
                                    <button
                                        key={radius}
                                        type="button"
                                        onClick={() => updateSetting('default_search_radius_km', radius)}
                                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                                            settings.default_search_radius_km === radius
                                                ? 'border-green-600 bg-green-600 text-white'
                                                : 'border-gray-200 bg-white text-gray-700 hover:border-green-300'
                                        }`}
                                    >
                                        {radius} km
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>

                    <aside className="space-y-6">
                        <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5">
                            <h2 className="text-lg font-semibold text-gray-900">Chat retention</h2>
                            <p className="mt-1 text-sm text-gray-600">Choose how long ordinary chats stay saved. Saved chats and health-relevant chats continue to be preserved.</p>
                            <div className="mt-4 space-y-2">
                                {[
                                    { id: '1_day', label: '1 day' },
                                    { id: '7_days', label: '7 days' },
                                    { id: '30_days', label: '30 days' },
                                    { id: 'keep_saved_only', label: 'Keep saved chats only' }
                                ].map((option) => (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => updateSetting('chat_retention_preference', option.id as ChatRetentionPreference)}
                                        className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                                            settings.chat_retention_preference === option.id
                                                ? 'border-green-500 bg-green-50'
                                                : 'border-gray-200 bg-white hover:border-green-300'
                                        }`}
                                    >
                                        <span className="font-medium text-gray-900">{option.label}</span>
                                        {settings.chat_retention_preference === option.id ? (
                                            <span className="text-xs font-bold uppercase tracking-wide text-green-700">Active</span>
                                        ) : null}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5">
                            <h2 className="text-lg font-semibold text-gray-900">Account security</h2>
                            <p className="mt-1 text-sm text-gray-600">
                                Email, password, and forgot-password flows stay managed securely through Clerk.
                            </p>
                            <div className="mt-4 space-y-2 text-sm">
                                <Link className="inline-flex font-semibold text-green-700 hover:underline" href="/login?redirect=/settings">
                                    Open sign-in and recovery options
                                </Link>
                                <p className="text-gray-500">
                                    If you need to reset your password, Clerk will handle the recovery flow for you there.
                                </p>
                            </div>
                        </div>

                    </aside>
                </div>

                <div className="border-t border-gray-100 pt-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-h-[24px]">
                            {saveMessage ? (
                                <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                                    {saveMessage}
                                </div>
                            ) : null}
                            {saveError ? (
                                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    {saveError}
                                </div>
                            ) : null}
                        </div>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="inline-flex items-center justify-center rounded-full bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
                        >
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
