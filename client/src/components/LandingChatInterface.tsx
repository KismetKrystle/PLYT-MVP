'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import MarketTicker from './MarketTicker';
import Logo from './Logo';
import { useAuth } from '../lib/auth';

// Preset tags for the subject chips
const PRESET_TAGS = [
    'Fresh',
    'Cooked',
    'Receipes',
    'Advice',
];

function describeGeolocationError(error: unknown) {
    if (typeof window !== 'undefined' && 'GeolocationPositionError' in window && error instanceof GeolocationPositionError) {
        switch (error.code) {
            case error.PERMISSION_DENIED:
                return 'permission denied';
            case error.POSITION_UNAVAILABLE:
                return 'position unavailable';
            case error.TIMEOUT:
                return 'request timed out';
            default:
                return error.message || 'unknown geolocation error';
        }
    }

    if (error && typeof error === 'object' && 'code' in error) {
        const maybeCode = Number((error as { code?: unknown }).code);
        if (maybeCode === 1) return 'permission denied';
        if (maybeCode === 2) return 'position unavailable';
        if (maybeCode === 3) return 'request timed out';
    }

    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as { message?: unknown }).message || 'unknown geolocation error');
    }

    return 'unknown geolocation error';
}

export default function LandingChatInterface() {
    const router = useRouter();
    const [prompt, setPrompt] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isMobileHeaderVisible, setIsMobileHeaderVisible] = useState(true);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const lastScrollYRef = useRef(0);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [prompt]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleScroll = () => {
            if (window.innerWidth >= 768) {
                setIsMobileHeaderVisible(true);
                lastScrollYRef.current = 0;
                return;
            }

            const nextScrollY = window.scrollY;
            const delta = nextScrollY - lastScrollYRef.current;

            if (nextScrollY <= 16) {
                setIsMobileHeaderVisible(true);
            } else if (delta > 8) {
                setIsMobileHeaderVisible(false);
            } else if (delta < -8) {
                setIsMobileHeaderVisible(true);
            }

            lastScrollYRef.current = nextScrollY;
        };

        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (typeof document === 'undefined') return;

        const previousBodyOverflow = document.body.style.overflow;
        const previousHtmlOverflow = document.documentElement.style.overflow;

        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousBodyOverflow;
            document.documentElement.style.overflow = previousHtmlOverflow;
        };
    }, []);

    const handleTagClick = (tag: string) => {
        if (!selectedTags.includes(tag)) {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setSelectedTags(selectedTags.filter((tag) => tag !== tagToRemove));
    };

    const handleTickerItemClick = (itemName: string) => {
        // Add as a tag if not already present
        if (!selectedTags.includes(itemName)) {
            setSelectedTags((prev) => [...prev, itemName]);
        }
    };

    const [isLoading, setIsLoading] = useState(false);
    const { user, openLoginModal } = useAuth();
    const homeLocation = (user?.location_address || user?.location_city || '').trim();

    const queuePendingPrompt = (location: string) => {
        localStorage.setItem('pendingChatPrompt', JSON.stringify({
            tags: selectedTags,
            text: prompt,
            scope: 'local',
            location,
            freshChat: true
        }));
    };

    const resolveSearchLocation = async () => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            return homeLocation;
        }

        try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    resolve,
                    reject,
                    { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
                );
            });
            return `Lat: ${pos.coords.latitude}, Lng: ${pos.coords.longitude}`;
        } catch (e) {
            console.warn(`Geolocation unavailable on landing search, falling back to saved home area: ${describeGeolocationError(e)}.`);
            return homeLocation;
        }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!prompt.trim() && selectedTags.length === 0) return;

        const finalLocation = await resolveSearchLocation();

        if (!user) {
            queuePendingPrompt(finalLocation);
            openLoginModal();
            return;
        }

        setIsLoading(true);
        try {
            queuePendingPrompt(finalLocation);
            router.push('/?tab=chat');
        } catch (error: any) {
            console.error('Chat error:', error);
            queuePendingPrompt(finalLocation);
            router.push('/?tab=chat');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="relative flex h-[100dvh] w-full max-w-full flex-col overflow-hidden bg-gradient-to-br from-gray-50 via-white to-green-50/30">
            {/* Background Ambience */}
            <div className="pointer-events-none absolute right-0 top-0 h-[240px] w-[240px] -translate-y-1/3 translate-x-1/3 rounded-full bg-green-200/20 blur-3xl md:h-[500px] md:w-[500px] md:-translate-y-1/2 md:translate-x-1/2" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-[280px] w-[280px] translate-y-1/3 -translate-x-1/4 rounded-full bg-emerald-100/30 blur-3xl md:h-[600px] md:w-[600px] md:translate-y-1/2" />

            {/* Header / Nav Area */}
            <header
                className={`fixed inset-x-0 top-0 z-20 flex shrink-0 items-center justify-between px-3 pb-3 pt-[max(2rem,env(safe-area-inset-top))] transition-transform duration-300 md:relative md:translate-y-0 md:px-6 md:pb-6 md:pt-8 md:transition-none ${
                    isMobileHeaderVisible ? 'translate-y-0' : '-translate-y-full'
                }`}
            >
                <Logo variant="dark" width={90} />
                {user ? (
                    <button
                        type="button"
                        onClick={() => router.push('/?tab=living_library')}
                        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-gray-700 shadow-sm backdrop-blur transition hover:border-green-200 hover:text-green-700 md:px-4 md:py-2 md:text-sm"
                    >
                        <svg className="h-3.5 w-3.5 md:h-4 md:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        Living Library
                    </button>
                ) : (
                    <div className="flex gap-2 md:gap-4">
                        <button
                            onClick={openLoginModal}
                            className="text-sm font-medium text-gray-600 transition-colors hover:text-green-700 md:text-base"
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => router.push('/signup')}
                            className="rounded-full bg-green-600 px-3 py-1.5 text-[11px] font-medium text-white shadow-lg shadow-green-600/20 transition-all hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-xl md:px-5 md:py-2 md:text-sm"
                        >
                            Join Network
                        </button>
                    </div>
                )}
            </header>

            {/* Main Content Area */}
            <main className={`relative z-10 mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col items-center justify-center space-y-4 overflow-hidden px-3 pb-[max(3.5rem,env(safe-area-inset-bottom))] md:px-4 md:space-y-8 md:pb-20 md:pt-16 ${
                isMobileHeaderVisible ? 'pt-[calc(9rem+env(safe-area-inset-top))]' : 'pt-24'
            }`}>

                {/* Hero Text */}
                <div className="mb-0 shrink-0 space-y-2 text-center md:mb-2 md:space-y-4">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[2rem] font-extrabold leading-[1.05] tracking-tight text-gray-900 md:text-6xl"
                    >
                        What's your <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-emerald-600">
                            craving?
                        </span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-sm md:text-lg text-gray-500 font-light max-w-xl mx-auto hidden md:block" // Hide subtitle on small mobile to save space? Or just make it smaller.
                     >
                         Food advice that actually knows you.
                     </motion.p>
                    <motion.p // Mobile subtitle
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mx-auto max-w-[18rem] text-sm font-light text-gray-500 md:hidden"
                     >
                         Know what you eat. Own how you feel.
                     </motion.p>
                    {!user ? (
                        <p className="text-xs text-emerald-700 max-w-xl mx-auto">
                            Sign in or create your profile before searching so Navi can tailor results to your health context from the start.
                        </p>
                    ) : null}
                    <p className="mx-auto max-w-xl text-[11px] text-gray-400 md:text-xs">
                        Mention a city, area, ZIP code, or neighborhood if you want search outside your current location.
                    </p>
                </div>

                {/* Chat Interface Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="w-full max-w-full shrink-0 overflow-hidden rounded-[1.75rem] bg-white p-1 shadow-2xl shadow-green-900/5 ring-1 ring-gray-100 md:rounded-3xl md:p-2"
                >
                    {/* Active Tags Area */}
                    <AnimatePresence>
                        {selectedTags.length > 0 && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="flex flex-wrap gap-2 px-3 pt-3 pb-1 md:px-4 md:pt-4 md:pb-2"
                            >
                                {selectedTags.map((tag) => (
                                    <motion.span
                                        key={tag}
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.8, opacity: 0 }}
                                        className="inline-flex items-center gap-1 px-2 py-1 md:px-3 bg-green-50 text-green-700 text-xs md:text-sm font-semibold rounded-full border border-green-100"
                                    >
                                        {tag}
                                        <button
                                            onClick={() => handleRemoveTag(tag)}
                                            className="hover:text-green-900 focus:outline-none"
                                        >
                                            ×
                                        </button>
                                    </motion.span>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Input Area */}
                    <div className="p-2">
                        <div className="flex items-end gap-2 rounded-[1.4rem] bg-transparent px-1 py-1 md:gap-3 md:px-2">
                            <textarea
                                ref={textareaRef}
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={user ? 'Ask me anything...' : 'Sign in to start a personalized search...'}
                                className="min-w-0 flex-1 text-base md:text-lg text-gray-800 placeholder:text-gray-300 bg-transparent border-0 focus:ring-0 resize-none max-h-40 md:max-h-60 py-2 md:py-3 px-2 md:px-4 leading-relaxed"
                                rows={1}
                            />
                            <button
                                onClick={() => handleSubmit()}
                                disabled={(prompt.length === 0 && selectedTags.length === 0) || isLoading}
                                className="mb-1 shrink-0 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white p-2 md:p-3 rounded-xl transition-all shadow-md disabled:shadow-none min-w-[3rem] flex items-center justify-center"
                                aria-label={user ? 'Start search' : 'Sign in to start search'}
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 md:w-5 md:h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Subject Chips */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mb-1 flex shrink-0 flex-wrap justify-center gap-2 md:mb-8 md:gap-3"
                >
                    {PRESET_TAGS.map((tag) => (
                        <button
                            key={tag}
                            onClick={() => handleTagClick(tag)}
                            className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full border text-xs md:text-sm font-medium transition-all duration-300 ${selectedTags.includes(tag)
                                ? 'bg-green-600 text-white border-green-600'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-600 hover:bg-green-50'
                                }`}
                        >
                            {tag}
                        </button>
                    ))}
                </motion.div>

                {/* Market Ticker (Moved Closer) */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-4 w-full max-w-full shrink-0 md:mt-5"
                >
                    <div className="text-center mb-1 md:mb-2 text-[10px] md:text-xs text-gray-300 font-medium uppercase tracking-widest">
                        Live Market
                    </div>
                    <MarketTicker onItemClick={handleTickerItemClick} />
                </motion.div>
            </main>

            {/* Simple Footer */}
            <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 py-3 text-center text-[10px] text-gray-300 md:py-4 md:text-xs">
                © 2026 Plyant. All rights reserved.
            </footer>
        </div>
    );
}
