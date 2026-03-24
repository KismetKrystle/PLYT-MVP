'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '../../lib/api';
import { useAuth } from '../../lib/auth';

type AnalyticsState = {
    assetId: string;
    totals: {
        views: number;
        likes: number;
        saves: number;
        aiReferrals: number;
    };
    viewer: {
        hasLiked: boolean;
        hasSaved: boolean;
    };
};

type Props = {
    assetId: string;
};

const SESSION_STORAGE_KEY = 'plyt-analytics-session-id';

function getClientSessionId() {
    if (typeof window === 'undefined') return '';

    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;

    const nextId = `sess_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    window.localStorage.setItem(SESSION_STORAGE_KEY, nextId);
    return nextId;
}

export default function DigitalAssetAnalyticsPanel({ assetId }: Props) {
    const searchParams = useSearchParams();
    const { user, openLoginModal } = useAuth();
    const [analytics, setAnalytics] = useState<AnalyticsState | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<'like' | 'save' | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadAnalytics = async () => {
            try {
                const res = await api.get(`/digital-assets/${assetId}/analytics`);
                if (!cancelled) {
                    setAnalytics(res.data);
                }
            } catch (error) {
                console.warn('Failed to load digital asset analytics.', error);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void loadAnalytics();

        return () => {
            cancelled = true;
        };
    }, [assetId, user?.id]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const sessionId = getClientSessionId();
        const referralSource = String(searchParams.get('ref') || '').trim().toLowerCase();
        const viewKey = `plyt-asset-viewed:${assetId}`;
        const referralKey = `plyt-asset-ai-ref:${assetId}:${referralSource}`;

        const trackView = async () => {
            if (window.sessionStorage.getItem(viewKey)) return;

            window.sessionStorage.setItem(viewKey, 'true');
            try {
                const res = await api.post(`/digital-assets/${assetId}/views`, {
                    sessionId,
                    source: referralSource || 'direct'
                });
                setAnalytics(res.data);
            } catch (error) {
                console.warn('Failed to track digital asset view.', error);
            }
        };

        const trackAiReferral = async () => {
            if (!referralSource.startsWith('ai_')) return;
            if (window.sessionStorage.getItem(referralKey)) return;

            window.sessionStorage.setItem(referralKey, 'true');
            try {
                const res = await api.post(`/digital-assets/${assetId}/ai-referrals`, {
                    sessionId,
                    source: referralSource,
                    context: {
                        pathname: window.location.pathname
                    }
                });
                setAnalytics(res.data);
            } catch (error) {
                console.warn('Failed to track digital asset AI referral.', error);
            }
        };

        void trackView();
        void trackAiReferral();
    }, [assetId, searchParams]);

    const requireSignedInAction = () => {
        if (user) return true;
        openLoginModal();
        return false;
    };

    const toggleLike = async () => {
        if (!requireSignedInAction()) return;

        setActionLoading('like');
        try {
            const res = analytics?.viewer.hasLiked
                ? await api.delete(`/digital-assets/${assetId}/likes`)
                : await api.post(`/digital-assets/${assetId}/likes`, { source: 'plyt_app' });
            setAnalytics(res.data);
        } catch (error) {
            console.warn('Failed to toggle digital asset like.', error);
        } finally {
            setActionLoading(null);
        }
    };

    const toggleSave = async () => {
        if (!requireSignedInAction()) return;

        setActionLoading('save');
        try {
            const res = analytics?.viewer.hasSaved
                ? await api.delete(`/digital-assets/${assetId}/saves`)
                : await api.post(`/digital-assets/${assetId}/saves`, { source: 'plyt_app' });
            setAnalytics(res.data);
        } catch (error) {
            console.warn('Failed to toggle digital asset save.', error);
        } finally {
            setActionLoading(null);
        }
    };

    const totals = analytics?.totals || {
        views: 0,
        likes: 0,
        saves: 0,
        aiReferrals: 0
    };

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">PLYT Analytics</h2>
                        <p className="mt-1 text-sm text-gray-500">Views, saves, likes, and AI referrals tracked inside the PLYT app.</p>
                    </div>
                    {loading ? <span className="text-xs font-semibold text-gray-400">Loading...</span> : null}
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        { label: 'Views', value: totals.views },
                        { label: 'Likes', value: totals.likes },
                        { label: 'Saves', value: totals.saves },
                        { label: 'AI Referrals', value: totals.aiReferrals }
                    ].map((item) => (
                        <div key={item.label} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{item.label}</p>
                            <p className="mt-2 text-2xl font-bold text-gray-900">{item.value}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900">Engage On PLYT</h2>
                <div className="mt-4 flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={toggleLike}
                        disabled={actionLoading !== null}
                        className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                            analytics?.viewer.hasLiked
                                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        } disabled:opacity-60`}
                    >
                        {actionLoading === 'like' ? 'Saving...' : analytics?.viewer.hasLiked ? 'Liked on PLYT' : 'Like on PLYT'}
                    </button>
                    <button
                        type="button"
                        onClick={toggleSave}
                        disabled={actionLoading !== null}
                        className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                            analytics?.viewer.hasSaved
                                ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        } disabled:opacity-60`}
                    >
                        {actionLoading === 'save' ? 'Saving...' : analytics?.viewer.hasSaved ? 'Saved on PLYT' : 'Save on PLYT'}
                    </button>
                </div>
            </div>
        </div>
    );
}
