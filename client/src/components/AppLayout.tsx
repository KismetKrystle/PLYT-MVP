'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../lib/auth';
import { useLessons } from '../context/LessonContext';
import { useCart } from '../context/CartContext';
import Logo from './Logo';
import { FormEvent, MouseEvent, useEffect, useState } from 'react';
import RightSidebar from './RightSidebar';
import api from '../lib/api';

import { formatCurrency, Currency } from '../lib/currency';
import OnboardingTour from './onboarding/OnboardingTour';

type ChatConversationSummary = {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
};

function extractFavoriteConversationIds(favoriteChats: unknown): string[] {
    if (!Array.isArray(favoriteChats)) return [];

    return favoriteChats
        .map((entry) => {
            if (typeof entry === 'string') return entry.trim();
            if (!entry || typeof entry !== 'object') return '';
            return String((entry as { id?: unknown }).id || '').trim();
        })
        .filter(Boolean);
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { logout, user, loading, openLoginModal } = useAuth();
    const { totalItems } = useCart();

    const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
    const [isDesktopOpen, setIsDesktopOpen] = useState(true);
    const [isLessonsOpen, setIsLessonsOpen] = useState(false);
    const [isChatsOpen, setIsChatsOpen] = useState(searchParams.get('tab') === 'chat');
    const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [currency, setCurrency] = useState<Currency>('IDR');
    const [isSearchTipOpen, setIsSearchTipOpen] = useState(false);
    const [conversationList, setConversationList] = useState<ChatConversationSummary[]>([]);
    const [favoriteConversationIds, setFavoriteConversationIds] = useState<string[]>([]);
    const [conversationActionIds, setConversationActionIds] = useState<string[]>([]);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [feedbackCategory, setFeedbackCategory] = useState<'suggestion' | 'bug'>('suggestion');
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [feedbackEmail, setFeedbackEmail] = useState('');
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
    const [feedbackStatus, setFeedbackStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const { savedLessons, activeLesson, setActiveLesson } = useLessons();

    const requestSignIn = () => {
        setLeftSidebarOpen(false);
        setIsProfileOpen(false);
        openLoginModal();
    };

    const handleProtectedNavigation = (event: MouseEvent<HTMLElement>) => {
        if (user) return false;
        event.preventDefault();
        requestSignIn();
        return true;
    };

    const openFeedbackModal = () => {
        setFeedbackStatus(null);
        setFeedbackEmail(user?.email || '');
        setIsProfileOpen(false);
        setIsFeedbackOpen(true);
    };

    const closeFeedbackModal = () => {
        if (isSubmittingFeedback) return;
        setIsFeedbackOpen(false);
        setFeedbackStatus(null);
    };

    const handleSubmitFeedback = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const trimmedMessage = feedbackMessage.trim();
        if (!trimmedMessage) {
            setFeedbackStatus({ type: 'error', message: 'Please share a short note before sending.' });
            return;
        }

        setIsSubmittingFeedback(true);
        setFeedbackStatus(null);

        try {
            const currentLocation = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
            await api.post('/messages-to-admin', {
                subject: feedbackCategory === 'bug' ? 'bug_report' : 'product_feedback',
                message: trimmedMessage,
                context: currentLocation,
                email: feedbackEmail.trim()
            });

            setFeedbackMessage('');
            if (!user) {
                setFeedbackEmail('');
            }
            setFeedbackCategory('suggestion');
            setFeedbackStatus({ type: 'success', message: 'Thanks. Your note was sent to the team.' });
        } catch (error) {
            console.warn('Unable to submit feedback.', error);
            setFeedbackStatus({ type: 'error', message: 'We could not send that note just now. Please try again.' });
        } finally {
            setIsSubmittingFeedback(false);
        }
    };

    useEffect(() => {
        if (searchParams.get('tab') === 'chat') {
            setIsChatsOpen(true);
        }
    }, [searchParams]);

    useEffect(() => {
        if (!user?.id) {
            setConversationList([]);
            setFavoriteConversationIds([]);
            return;
        }

        const fetchConversationList = async () => {
            const [historyResult, favoritesResult] = await Promise.allSettled([
                api.get('/chat/history'),
                api.get('/favorites')
            ]);

            if (historyResult.status === 'fulfilled') {
                setConversationList(Array.isArray(historyResult.value.data) ? historyResult.value.data : []);
            } else {
                console.warn('Unable to load chat history list in sidebar.', historyResult.reason);
            }

            if (favoritesResult.status === 'fulfilled') {
                setFavoriteConversationIds(
                    extractFavoriteConversationIds(favoritesResult.value.data?.favorite_chats)
                );
            } else {
                console.warn('Unable to load favorite chats in sidebar.', favoritesResult.reason);
            }
        };

        void fetchConversationList();
    }, [user?.id, searchParams]);

    const updateConversationBusyState = (conversationId: string, isBusy: boolean) => {
        setConversationActionIds((current) => {
            if (isBusy) {
                return current.includes(conversationId) ? current : [...current, conversationId];
            }

            return current.filter((id) => id !== conversationId);
        });
    };

    const handleToggleFavoriteConversation = async (
        event: MouseEvent<HTMLButtonElement>,
        conversation: ChatConversationSummary
    ) => {
        event.preventDefault();
        event.stopPropagation();

        if (!user) {
            requestSignIn();
            return;
        }

        if (conversationActionIds.includes(conversation.id)) {
            return;
        }

        const isFavorite = favoriteConversationIds.includes(conversation.id);
        updateConversationBusyState(conversation.id, true);

        try {
            const response = isFavorite
                ? await api.delete(`/favorites/chats/${conversation.id}`)
                : await api.post('/favorites/chats', {
                    conversationId: conversation.id,
                    title: conversation.title
                });

            setFavoriteConversationIds(
                extractFavoriteConversationIds(response.data?.favorite_chats)
            );
        } catch (error) {
            console.warn('Unable to update favorite chat state.', error);
        } finally {
            updateConversationBusyState(conversation.id, false);
        }
    };

    const handleDeleteConversation = async (
        event: MouseEvent<HTMLButtonElement>,
        conversation: ChatConversationSummary
    ) => {
        event.preventDefault();
        event.stopPropagation();

        if (!user) {
            requestSignIn();
            return;
        }

        if (conversationActionIds.includes(conversation.id)) {
            return;
        }

        if (!window.confirm(`Delete "${conversation.title}" from your chat history?`)) {
            return;
        }

        updateConversationBusyState(conversation.id, true);

        try {
            await api.delete(`/chat/history/${conversation.id}`);
            setConversationList((current) => current.filter((entry) => entry.id !== conversation.id));
            setFavoriteConversationIds((current) => current.filter((id) => id !== conversation.id));

            if (searchParams.get('conversationId') === conversation.id) {
                router.push('/?tab=chat&newChat=1');
            }
        } catch (error) {
            console.warn('Unable to delete chat history item.', error);
        } finally {
            updateConversationBusyState(conversation.id, false);
        }
    };

    useEffect(() => {
        if (!user?.id) {
            setIsSearchTipOpen(false);
            return;
        }

        const storageKey = `plyt-search-tip-seen-${user.id}`;
        const hasSeenTip = localStorage.getItem(storageKey) === 'true';
        setIsSearchTipOpen(!hasSeenTip);
    }, [user?.id]);

    const closeSearchTip = () => {
        if (user?.id) {
            localStorage.setItem(`plyt-search-tip-seen-${user.id}`, 'true');
        }
        setIsSearchTipOpen(false);
    };

    // 1. Auth & Loading Guard
    if (loading) return <div className="min-h-screen bg-white"></div>;

    // Hide the app chrome on standalone auth flows so the forms stay centered.
    if (pathname === '/signup' || pathname === '/login' || pathname === '/auth/complete') {
        return <>{children}</>;
    }

    const NAV_ITEMS = [
        {
            name: 'About You', href: '/?tab=customer_profile', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            )
        },
        {
            name: 'Chats', href: '/?tab=chat', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            )
        },
        // {
        //     name: 'Living Library', href: '/knowledge-bank', icon: (
        //         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        //             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V6a4 4 0 118 0v1M6 7h12a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2zm6 4v4m-2-2h4" />
        //         </svg>
        //     )
        // },
        // {
        //     name: 'Lessons', href: '#', icon: (
        //         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
        //     )
        // },
        // {
        //     name: 'Your Systems', href: '/systems', icon: (
        //         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
        //     )
        // },
        // {
        //     name: 'Impact Score', href: '/impact', icon: (
        //         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
        //     )
        // },
        // {
        //     name: 'Store', href: '/store', icon: (
        //         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
        //     )
        // },
        // {
        //     name: 'Orders', href: '/orders', icon: (
        //         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
        //     )
        // },
        // {
        //     name: 'Wallet', href: '/wallet', icon: (
        //         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
        //     )
        // },
        // {
        //     name: 'Guide', href: '/?tab=guide', icon: (
        //         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
        //     )
        // },
    ];

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden relative">
            {user && isSearchTipOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-gray-200">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-600">Search Tips</p>
                                <h2 className="mt-2 text-2xl font-bold text-gray-900">PLYT now searches for you automatically</h2>
                            </div>
                            <button
                                type="button"
                                onClick={closeSearchTip}
                                className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                                aria-label="Close search tips"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="mt-4 space-y-3 text-sm text-gray-600">
                            <p>PLYT uses broad health guidance to decide what foods fit you best.</p>
                            <p>When it helps you source produce or ready-to-eat food, it searches local-first using your current location, then your saved home location if live location is unavailable.</p>
                            <p>If you want another area, just type it naturally in chat, like “find produce in Austin.”</p>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button
                                type="button"
                                onClick={closeSearchTip}
                                className="rounded-full bg-green-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {isFeedbackOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-gray-200">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-600">Feedback</p>
                                <h2 className="mt-2 text-2xl font-bold text-gray-900">Share a suggestion or bug</h2>
                                <p className="mt-2 text-sm text-gray-500">
                                    Tell us what you noticed and we will use it to keep improving PLYT.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeFeedbackModal}
                                className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                                aria-label="Close feedback form"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmitFeedback} className="mt-6 space-y-4">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">Type</label>
                                <div className="flex gap-2">
                                    {[
                                        { value: 'suggestion', label: 'Suggestion' },
                                        { value: 'bug', label: 'Bug' }
                                    ].map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setFeedbackCategory(option.value as 'suggestion' | 'bug')}
                                            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                                                feedbackCategory === option.value
                                                    ? 'bg-green-600 text-white shadow-sm'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label htmlFor="feedback-message" className="mb-2 block text-sm font-medium text-gray-700">
                                    What would you like us to know?
                                </label>
                                {!user ? (
                                    <div className="mb-3">
                                        <label htmlFor="feedback-email" className="mb-2 block text-sm font-medium text-gray-700">
                                            Email
                                        </label>
                                        <input
                                            id="feedback-email"
                                            type="email"
                                            value={feedbackEmail}
                                            onChange={(event) => setFeedbackEmail(event.target.value)}
                                            placeholder="Optional, if you want us to follow up"
                                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-500/10"
                                        />
                                    </div>
                                ) : null}
                                <textarea
                                    id="feedback-message"
                                    value={feedbackMessage}
                                    onChange={(event) => setFeedbackMessage(event.target.value)}
                                    placeholder="Share a bug, a suggestion, or anything that felt confusing."
                                    rows={6}
                                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-500/10"
                                />
                            </div>

                            {feedbackStatus ? (
                                <div
                                    className={`rounded-2xl px-4 py-3 text-sm ${
                                        feedbackStatus.type === 'success'
                                            ? 'bg-green-50 text-green-700'
                                            : 'bg-red-50 text-red-600'
                                    }`}
                                >
                                    {feedbackStatus.message}
                                </div>
                            ) : null}

                            <div className="flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeFeedbackModal}
                                    className="rounded-full px-4 py-2 text-sm font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingFeedback}
                                    className="rounded-full bg-green-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-400"
                                >
                                    {isSubmittingFeedback ? 'Sending...' : 'Send'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}

            {/* Mobile Overlay (Backdrop) */}
            {leftSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-20 md:hidden backdrop-blur-sm"
                    onClick={() => setLeftSidebarOpen(false)}
                />
            )}

            {/* LEFT SIDEBAR - Desktop & Mobile Drawer */}
            <aside className={`
                fixed inset-y-0 left-0 z-30 bg-white border-r border-gray-200 transform transition-all duration-300 ease-in-out flex flex-col shadow-xl md:shadow-none
                ${leftSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0 md:static
                ${isDesktopOpen ? 'md:w-64' : 'md:w-0 md:overflow-hidden'}
            `}>
                <div className={`p-6 flex justify-between items-center shrink-0 ${!isDesktopOpen && 'hidden md:flex'}`}>
                    <div className="min-w-[100px]">
                        <Link href="/?tab=landing">
                            <Logo variant="dark" width={100} />
                        </Link>
                    </div>
                    <button onClick={() => setLeftSidebarOpen(false)} className="md:hidden text-gray-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar w-64">
                    <nav className="px-4 space-y-2 mt-2">
                        {NAV_ITEMS.map((item) => {
                            const currentTab = searchParams.get('tab');
                            const isChats = item.name === 'Chats';
                            const isActive = isChats ? currentTab === 'chat' : pathname === item.href;
                            const isLessons = item.name === 'Lessons';

                            if (isLessons) {
                                return (
                                    <div key={item.name} className="flex flex-col">
                                        <button
                                            onClick={() => setIsLessonsOpen(!isLessonsOpen)}
                                            className={`flex items-center justify-between w-full px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${isActive || isLessonsOpen
                                                ? 'bg-green-50 text-green-700 shadow-sm border border-green-100'
                                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                                                }`}
                                        >
                                            <div className="flex items-center">
                                                <div className={`mr-3 transition-colors ${isActive || isLessonsOpen ? 'text-green-600' : 'text-gray-400 group-hover:text-gray-500'}`}>
                                                    {item.icon}
                                                </div>
                                                {item.name}
                                            </div>
                                            <svg
                                                className={`w-4 h-4 transition-transform duration-200 ${isLessonsOpen ? 'rotate-180' : ''}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isLessonsOpen ? 'max-h-48 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                                            <div className="pl-11 pr-2 space-y-1">
                                                {savedLessons.map((lesson) => (
                                                    <div
                                                        key={lesson.id}
                                                        className={`px-3 py-2 text-xs font-medium rounded-lg hover:bg-gray-50 hover:text-green-600 cursor-pointer truncate transition-colors border border-transparent hover:border-gray-100 ${activeLesson?.id === lesson.id ? 'text-green-600 bg-green-50 shadow-sm' : 'text-gray-500'
                                                            }`}
                                                        onClick={() => {
                                                            setActiveLesson(lesson);
                                                            setLeftSidebarOpen(false);
                                                        }}
                                                    >
                                                        {lesson.title}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            if (isChats) {
                                return (
                                    <div key={item.name} className="flex flex-col">
                                        <button
                                            onClick={(event) => {
                                                if (handleProtectedNavigation(event)) return;
                                                setIsChatsOpen(!isChatsOpen);
                                            }}
                                            className={`flex items-center justify-between w-full px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${isActive || isChatsOpen
                                                ? 'bg-green-50 text-green-700 shadow-sm border border-green-100'
                                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                                                }`}
                                        >
                                            <div className="flex items-center">
                                                <div className={`mr-3 transition-colors ${isActive || isChatsOpen ? 'text-green-600' : 'text-gray-400 group-hover:text-gray-500'}`}>
                                                    {item.icon}
                                                </div>
                                                {item.name}
                                            </div>
                                            <svg
                                                className={`w-4 h-4 transition-transform duration-200 ${isChatsOpen ? 'rotate-180' : ''}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isChatsOpen ? 'max-h-[32rem] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                                            <div className="pl-11 pr-2 space-y-1">
                                                <Link
                                                    href="/?tab=chat&newChat=1"
                                                    onClick={(event) => {
                                                        if (handleProtectedNavigation(event)) return;
                                                        setLeftSidebarOpen(false);
                                                    }}
                                                    className="block px-3 py-2 text-xs font-medium rounded-lg text-gray-500 hover:bg-gray-50 hover:text-green-600 transition-colors border border-transparent hover:border-gray-100"
                                                >
                                                    New chat
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        if (handleProtectedNavigation(event)) return;
                                                        setIsChatHistoryOpen((prev) => !prev);
                                                    }}
                                                    className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium rounded-lg text-gray-500 hover:bg-gray-50 hover:text-green-600 transition-colors border border-transparent hover:border-gray-100"
                                                >
                                                    <span>History</span>
                                                    <svg
                                                        className={`w-3.5 h-3.5 transition-transform duration-200 ${isChatHistoryOpen ? 'rotate-180' : ''}`}
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </button>
                                                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isChatHistoryOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
                                                    <div className="pl-2 space-y-1">
                                                        {conversationList.length > 0 ? (
                                                            conversationList.map((conversation) => (
                                                                <div
                                                                    key={conversation.id}
                                                                    className={`block rounded-lg px-3 py-2 text-xs transition-colors border ${
                                                                        searchParams.get('conversationId') === conversation.id
                                                                            ? 'border-green-200 bg-green-50 text-green-700'
                                                                            : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-green-600 hover:border-gray-100'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-start gap-2">
                                                                        <Link
                                                                            href={`/?tab=chat&conversationId=${conversation.id}`}
                                                                            onClick={(event) => {
                                                                                if (handleProtectedNavigation(event)) return;
                                                                                setLeftSidebarOpen(false);
                                                                            }}
                                                                            className="min-w-0 flex-1"
                                                                        >
                                                                            <p className="truncate font-medium">{conversation.title}</p>
                                                                            <p className="mt-0.5 text-[10px] text-gray-400">
                                                                                {new Date(conversation.updated_at).toLocaleDateString()}
                                                                            </p>
                                                                        </Link>
                                                                        <div className="flex shrink-0 items-center gap-1">
                                                                            <button
                                                                                type="button"
                                                                                onClick={(event) => handleToggleFavoriteConversation(event, conversation)}
                                                                                disabled={conversationActionIds.includes(conversation.id)}
                                                                                className={`rounded-full p-1 transition-colors ${
                                                                                    favoriteConversationIds.includes(conversation.id)
                                                                                        ? 'text-amber-500 hover:bg-amber-50'
                                                                                        : 'text-gray-400 hover:bg-gray-100 hover:text-amber-500'
                                                                                } disabled:cursor-not-allowed disabled:opacity-50`}
                                                                                aria-label={
                                                                                    favoriteConversationIds.includes(conversation.id)
                                                                                        ? `Remove ${conversation.title} from favorites`
                                                                                        : `Add ${conversation.title} to favorites`
                                                                                }
                                                                                title={
                                                                                    favoriteConversationIds.includes(conversation.id)
                                                                                        ? 'Remove favorite'
                                                                                        : 'Favorite chat'
                                                                                }
                                                                            >
                                                                                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.12 3.445a1 1 0 00.95.69h3.622c.969 0 1.371 1.24.588 1.81l-2.931 2.13a1 1 0 00-.364 1.118l1.12 3.445c.3.921-.755 1.688-1.538 1.118l-2.931-2.13a1 1 0 00-1.176 0l-2.931 2.13c-.783.57-1.838-.197-1.539-1.118l1.12-3.445a1 1 0 00-.363-1.118l-2.93-2.13c-.784-.57-.381-1.81.587-1.81h3.623a1 1 0 00.95-.69l1.12-3.445z" />
                                                                                </svg>
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={(event) => handleDeleteConversation(event, conversation)}
                                                                                disabled={conversationActionIds.includes(conversation.id)}
                                                                                className="rounded-full p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                                                                                aria-label={`Delete ${conversation.title}`}
                                                                                title="Delete chat"
                                                                            >
                                                                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7 18.133 19.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3M4 7h16" />
                                                                                </svg>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <p className="px-3 py-2 text-[11px] text-gray-400">No saved chats yet.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={(event) => {
                                        if (handleProtectedNavigation(event)) return;
                                        setLeftSidebarOpen(false);
                                    }}
                                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${isActive
                                        ? 'bg-green-50 text-green-700 shadow-sm border border-green-100'
                                        : item.name === 'Guide'
                                            ? 'bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 shadow-sm'
                                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                                        }`}
                                >
                                    <div className={`mr-3 transition-colors ${isActive ? 'text-green-600' : item.name === 'Guide' ? 'text-yellow-600' : 'text-gray-400 group-hover:text-gray-500'}`}>
                                        {item.icon}
                                    </div>
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="mx-4 my-2 border-t border-gray-100"></div>
                    <RightSidebar />
                </div>

                <div className="p-4 border-t border-gray-100 shrink-0 bg-white z-10 w-64 text-center text-xs text-gray-300">
                    <p>PLYT v0.1.0 Beta</p>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col min-w-0 h-full relative transition-all duration-300">

                {/* Universal Top Header (Mobile & Desktop) */}
                <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-6 z-40 md:relative md:border-gray-200 md:shrink-0 transition-all">

                    {/* Mobile: Back Button & Logo */}
                    <div className="flex items-center gap-4 md:hidden w-full">
                        <button
                            type="button"
                            onClick={() => {
                                if (window.history.length > 1) {
                                    router.back();
                                    return;
                                }
                                router.push('/?tab=customer_profile');
                                setIsProfileOpen(false);
                            }}
                            className="text-gray-600"
                            aria-label="Go back"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </button>
                        <div className="flex-1 flex justify-center">
                            <Link href="/?tab=landing">
                                <Logo variant="dark" width={80} />
                            </Link>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={openFeedbackModal}
                                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-base font-semibold text-gray-600 shadow-sm transition hover:border-green-200 hover:text-green-700"
                                aria-label="Share feedback"
                                title="Share feedback"
                            >
                                ?
                            </button>
                            <div className="relative">
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-inner hover:ring-2 hover:ring-green-500/20 transition-all border border-green-100 ${
                                    user
                                        ? 'bg-gradient-to-br from-green-100 to-emerald-200 text-green-800'
                                        : 'bg-gray-100 text-gray-500'
                                }`}
                            >
                                {user ? (user.email?.[0].toUpperCase() || 'U') : 'G'}
                            </button>

                            {isProfileOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-30"
                                        onClick={() => setIsProfileOpen(false)}
                                    />
                                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 divide-y divide-gray-100 z-40 overflow-hidden text-sm animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="px-5 py-4 bg-gray-50/50">
                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                {user ? 'Kismet' : 'Guest User'}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">
                                                {user ? user.email : 'Sign in to sync your data'}
                                            </p>
                                        </div>

                                        <div className="py-2">
                                            <Link
                                                href={user ? "/?tab=customer_profile" : "#"}
                                                onClick={user ? () => setIsProfileOpen(false) : (e) => { e.preventDefault(); openLoginModal(); setIsProfileOpen(false); }}
                                                className="flex items-center gap-3 px-5 py-2.5 text-gray-700 hover:bg-gray-50 hover:text-green-600 transition-colors"
                                            >
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A10 10 0 1118.88 17.8M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                About You
                                            </Link>
                                            <Link
                                                href={user ? "/settings" : "#"}
                                                onClick={user ? () => setIsProfileOpen(false) : (e) => { e.preventDefault(); openLoginModal(); setIsProfileOpen(false); }}
                                                className="flex items-center gap-3 px-5 py-2.5 text-gray-700 hover:bg-gray-50 hover:text-green-600 transition-colors"
                                            >
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                Settings
                                            </Link>
                                        </div>
                                        <div className="py-2 bg-red-50/30">
                                            {user ? (
                                                <button
                                                    onClick={logout}
                                                    className="w-full text-left flex items-center gap-3 px-5 py-2.5 text-red-600 hover:bg-red-50 transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                                    Sign Out
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        openLoginModal();
                                                        setIsProfileOpen(false);
                                                    }}
                                                    className="w-full text-left flex items-center gap-3 px-5 py-2.5 text-green-600 hover:bg-green-50 transition-colors font-medium"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                                                    Sign In / Sign Up
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                            </div>
                        </div>
                    </div>

                    {/* Desktop: Sidebar Toggle & Search (Hidden on Mobile) */}
                    <div className="hidden md:flex items-center gap-4 w-full">
                        <button
                            onClick={() => setIsDesktopOpen(!isDesktopOpen)}
                            className="text-gray-500 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                            title={isDesktopOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                        >
                            {isDesktopOpen ? (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                            ) : (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                            )}
                        </button>

                        <div className="flex-1 max-w-md bg-gray-100 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-green-500/20 transition-all flex items-center">
                            <svg className="w-5 h-5 text-gray-400 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input
                                type="text"
                                placeholder="Search..."
                                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-gray-400 text-gray-700 min-w-[100px]"
                            />
                        </div>

                        <div className="flex items-center gap-4 ml-auto">
                        {false && user && (
                            <Link href="/wallet" className="hidden lg:flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-100 hover:bg-green-100 transition-colors">
                                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-[10px] text-white font-bold">P</div>
                                <div className="flex flex-col leading-none">
                                    <span className="text-xs font-bold text-gray-900">1,250 PLYT</span>
                                    <span className="text-[10px] text-green-600">≈ $12.50</span>
                                </div>
                            </Link>
                        )}

                        {false && (
                            <Link href="/cart" className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                                {totalItems > 0 && (
                                    <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold border-2 border-white">{totalItems}</span>
                                )}
                            </Link>
                        )}
                        </div>

                        <button
                            type="button"
                            onClick={openFeedbackModal}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-base font-semibold text-gray-600 shadow-sm transition hover:border-green-200 hover:text-green-700"
                            aria-label="Share feedback"
                            title="Share feedback"
                        >
                            ?
                        </button>

                        <div className="relative ml-2">
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-inner hover:ring-2 hover:ring-green-500/20 transition-all border border-green-100 ${user
                                    ? 'bg-gradient-to-br from-green-100 to-emerald-200 text-green-800'
                                    : 'bg-gray-100 text-gray-500'}`}
                            >
                                {user ? (user.email?.[0].toUpperCase() || 'U') : 'G'}
                            </button>

                            {isProfileOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-30"
                                        onClick={() => setIsProfileOpen(false)}
                                    />
                                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 divide-y divide-gray-100 z-40 overflow-hidden text-sm animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="px-5 py-4 bg-gray-50/50">
                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                {user ? 'Kismet' : 'Guest User'}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">
                                                {user ? user.email : 'Sign in to sync your data'}
                                            </p>
                                        </div>

                                        {false && (
                                        <div className="px-5 py-3 hover:bg-green-50 transition-colors group cursor-default">
                                            <div className="flex justify-between items-center mb-1">
                                                <Link
                                                    href={user ? "/wallet" : "#"}
                                                    onClick={user ? () => setIsProfileOpen(false) : () => { }}
                                                    className="text-xs font-semibold text-gray-500 uppercase tracking-wide group-hover:text-green-600 flex items-center gap-1"
                                                >
                                                    Wallet Balance
                                                    <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                                </Link>

                                                <div className="flex bg-gray-100 rounded-lg p-0.5 text-[10px] font-bold" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => setCurrency('IDR')}
                                                        className={`px-2 py-0.5 rounded-md transition-all ${currency === 'IDR' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                                    >
                                                        IDR
                                                    </button>
                                                    <button
                                                        onClick={() => setCurrency('USD')}
                                                        className={`px-2 py-0.5 rounded-md transition-all ${currency === 'USD' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                                    >
                                                        USD
                                                    </button>
                                                </div>
                                            </div>
                                            <Link href={user ? "/wallet" : "#"} onClick={user ? () => setIsProfileOpen(false) : () => { }}>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="font-bold text-gray-900 text-lg group-hover:text-green-700">
                                                        {user ? '1,250 PLYT' : '--- PLYT'}
                                                    </span>
                                                    <span className="text-gray-400 text-xs font-medium">
                                                        {user ? `≈ ${formatCurrency(12.50, currency)}` : 'Guest'}
                                                    </span>
                                                </div>
                                            </Link>
                                        </div>
                                        )}

                                        <div className="py-2">
                                            <Link
                                                href={user ? "/?tab=customer_profile" : "#"}
                                                onClick={user ? () => setIsProfileOpen(false) : (e) => { e.preventDefault(); openLoginModal(); setIsProfileOpen(false); }}
                                                className="flex items-center gap-3 px-5 py-2.5 text-gray-700 hover:bg-gray-50 hover:text-green-600 transition-colors"
                                            >
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A10 10 0 1118.88 17.8M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                About You
                                            </Link>
                                            {/* <Link
                                                href={user ? "/?tab=health_profiles&profile=consumer" : "#"}
                                                onClick={user ? () => setIsProfileOpen(false) : (e) => { e.preventDefault(); openLoginModal(); setIsProfileOpen(false); }}
                                                className="flex items-center gap-3 px-5 py-2.5 text-gray-700 hover:bg-gray-50 hover:text-green-600 transition-colors"
                                            >
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                                Consumer Health Profile
                                            </Link>
                                            <Link
                                                href={user ? "/?tab=health_profiles&profile=business" : "#"}
                                                onClick={user ? () => setIsProfileOpen(false) : (e) => { e.preventDefault(); openLoginModal(); setIsProfileOpen(false); }}
                                                className="flex items-center gap-3 px-5 py-2.5 text-gray-700 hover:bg-gray-50 hover:text-green-600 transition-colors"
                                            >
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" /></svg>
                                                Farmer / Distributor Profile
                                            </Link>
                                            <Link
                                                href={user ? "/?tab=health_profiles&profile=expert" : "#"}
                                                onClick={user ? () => setIsProfileOpen(false) : (e) => { e.preventDefault(); openLoginModal(); setIsProfileOpen(false); }}
                                                className="flex items-center gap-3 px-5 py-2.5 text-gray-700 hover:bg-gray-50 hover:text-green-600 transition-colors"
                                            >
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A10 10 0 1118.88 17.8M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                Expert Profile
                                            </Link>
                                            <Link
                                                href={user ? "/admin" : "#"}
                                                onClick={user ? () => setIsProfileOpen(false) : (e) => { e.preventDefault(); openLoginModal(); setIsProfileOpen(false); }}
                                                className="flex items-center gap-3 px-5 py-2.5 text-gray-700 hover:bg-gray-50 hover:text-green-600 transition-colors"
                                            >
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                {user ? 'Admin Dashboard' : 'Admin Login'}
                                            </Link> */}
                                            <Link
                                                href={user ? "/settings" : "#"}
                                                onClick={user ? () => setIsProfileOpen(false) : (e) => { e.preventDefault(); openLoginModal(); setIsProfileOpen(false); }}
                                                className="flex items-center gap-3 px-5 py-2.5 text-gray-700 hover:bg-gray-50 hover:text-green-600 transition-colors"
                                            >
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                Settings
                                            </Link>
                                        </div>
                                        <div className="py-2 bg-red-50/30">
                                            {user ? (
                                                <button
                                                    onClick={logout}
                                                    className="w-full text-left flex items-center gap-3 px-5 py-2.5 text-red-600 hover:bg-red-50 transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                                    Sign Out
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        openLoginModal();
                                                        setIsProfileOpen(false);
                                                    }}
                                                    className="w-full text-left flex items-center gap-3 px-5 py-2.5 text-green-600 hover:bg-green-50 transition-colors font-medium"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                                                    Sign In / Sign Up
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Scrollable Main Content Layout & Padding for Mobile Header/Footer */}
                <main className="flex-1 overflow-hidden relative flex flex-row pt-16 md:pt-0 pb-20 md:pb-0">
                    <div className="flex-1 overflow-y-auto bg-gray-50 relative">
                        {children}
                    </div>
                </main>

                {/* Mobile Navigation Footer (Fixed Bottom) */}
                <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 md:hidden z-50 flex items-center justify-around px-2">
                    <Link
                        href="/?tab=customer_profile&focus=favorites"
                        onClick={(event) => {
                            if (handleProtectedNavigation(event)) return;
                        }}
                        className={`flex flex-col items-center p-2 ${searchParams.get('tab') === 'customer_profile' && searchParams.get('focus') === 'favorites' ? 'text-green-600' : 'text-gray-400'}`}
                    >
                        <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    </Link>

                    <Link
                        href="/?tab=chat"
                        onClick={(event) => {
                            if (handleProtectedNavigation(event)) return;
                        }}
                        className={`flex flex-col items-center p-2 ${searchParams.get('tab') === 'chat' ? 'text-green-600' : 'text-gray-400'}`}
                    >
                        <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    </Link>

                    <div className="relative -top-5">
                        <Link
                            href={user ? "/?tab=customer_profile" : "#"}
                            onClick={(event) => {
                                if (handleProtectedNavigation(event)) return;
                                setLeftSidebarOpen(false);
                            }}
                            className="w-14 h-14 bg-green-600 rounded-full flex items-center justify-center text-white shadow-lg border-4 border-gray-50"
                        >
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                        </Link>
                    </div>

                    <Link
                        href="/?tab=health_profiles&profile=consumer"
                        onClick={(event) => {
                            if (handleProtectedNavigation(event)) return;
                        }}
                        className={`flex flex-col items-center p-2 ${searchParams.get('tab') === 'health_profiles' ? 'text-green-600' : 'text-gray-400'}`}
                    >
                        <span className="mb-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-current px-1.5 text-[11px] font-bold leading-none">
                            HP
                        </span>
                    </Link>

                    <button onClick={() => setLeftSidebarOpen((prev) => !prev)} className="flex flex-col items-center p-2 text-gray-400">
                        <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>
                </div>
            </div>
            {/* Global Overlays */}
            <OnboardingTour />
        </div>
    );
}
