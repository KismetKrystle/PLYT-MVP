'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import MarketTicker from './MarketTicker';
import Logo from './Logo';
import api from '../lib/api';
import { useAuth } from '../lib/auth';

// Preset tags for the suggestion chips
const PRESET_TAGS = [
    'Find Produce',
    'Learn to Grow',
    'Pick a System',
    'Sell Produce',
    'Get Service',
];

export default function LandingChatInterface() {
    const router = useRouter();
    const [prompt, setPrompt] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [prompt]);

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
    const { user } = useAuth();

    // AI Research Scope & Location State
    const [searchScope, setSearchScope] = useState<'local' | 'global'>('global'); // Default to global for guest
    const [locationType, setLocationType] = useState<'home' | 'live' | 'custom'>('live');
    const [customLocation, setCustomLocation] = useState('');

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!prompt.trim() && selectedTags.length === 0) return;

        let finalLocation = '';
        if (searchScope === 'local') {
            if (locationType === 'live') {
                try {
                    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject);
                    });
                    finalLocation = `Lat: ${pos.coords.latitude}, Lng: ${pos.coords.longitude}`;
                } catch (e) {
                    console.error('Geolocation failed:', e);
                    finalLocation = user?.location_address || user?.location_city || 'Unknown';
                }
            } else if (locationType === 'custom') {
                finalLocation = customLocation;
            } else {
                finalLocation = user?.location_address || user?.location_city || 'Unknown';
            }
        }

        if (!user) {
            const payload = {
                tags: selectedTags,
                text: prompt,
                scope: searchScope,
                location: finalLocation
            };
            localStorage.setItem('pendingChatPrompt', JSON.stringify(payload));
            router.push('/login');
            return;
        }

        setIsLoading(true);
        try {
            console.log('Sending chat request...'); // Debug log
            const res = await api.post('/chat', {
                message: prompt,
                tags: selectedTags,
                scope: searchScope,
                location: finalLocation
            });
            console.log('Chat response success:', res.data); // Debug log
            router.push(`/?tab=chat&conversationId=${res.data.conversationId}`);
        } catch (error: any) {
            console.error('Chat error:', error);
            // Alert the user so they see what's wrong
            alert(`Chat Error: ${error.response?.data?.error || error.message || 'Unknown error'}`);

            localStorage.setItem('pendingChatPrompt', JSON.stringify({
                tags: selectedTags,
                text: prompt,
                scope: searchScope,
                location: finalLocation
            }));
            // Still try to redirect to chat tab in case it's just a partial failure? 
            // Or maybe stay here so they can retry? 
            // Let's redirect as fallback behavior, but the alert helps debugging.
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
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-green-50/30 overflow-hidden relative">
            {/* Background Ambience */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

            {/* Header / Nav Area */}
            <header className="p-4 md:p-6 flex justify-between items-center z-10 relative shrink-0">
                <Logo variant="dark" width={90} />
                <div className="flex gap-3 md:gap-4">
                    <button
                        onClick={() => router.push('/login')}
                        className="text-gray-600 font-medium hover:text-green-700 transition-colors text-sm md:text-base"
                    >
                        Sign In
                    </button>
                    <button
                        onClick={() => router.push('/signup')}
                        className="px-4 py-1.5 md:px-5 md:py-2 bg-green-600 text-white rounded-full font-medium shadow-lg shadow-green-600/20 hover:bg-green-700 hover:shadow-xl hover:-translate-y-0.5 transition-all text-xs md:text-sm"
                    >
                        Join Network
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl mx-auto px-4 z-10 relative space-y-4 md:space-y-8 min-h-0">

                {/* Hero Text */}
                <div className="text-center space-y-2 md:space-y-4 mb-0 md:mb-2 shrink-0">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl md:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight"
                    >
                        What do you want to <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-emerald-600">
                            eat, grow, or sell?
                        </span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-sm md:text-lg text-gray-500 font-light max-w-xl mx-auto hidden md:block" // Hide subtitle on small mobile to save space? Or just make it smaller.
                    >
                        Your intelligent network for local food independence.
                    </motion.p>
                    <motion.p // Mobile subtitle
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-sm text-gray-500 font-light max-w-xs mx-auto md:hidden"
                    >
                        Your network for food independence.
                    </motion.p>
                </div>

                {/* Chat Interface Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="w-full bg-white rounded-3xl shadow-2xl shadow-green-900/5 ring-1 ring-gray-100 overflow-hidden p-1 md:p-2 shrink-0"
                >
                    <div className="flex flex-wrap gap-2 items-center justify-center pt-4 px-4">
                        {/* Scope Toggle */}
                        <div className="flex bg-gray-100 p-1 rounded-full text-[10px] font-bold uppercase tracking-tight">
                            <button
                                onClick={() => setSearchScope('local')}
                                className={`px-3 py-1 rounded-full transition ${searchScope === 'local' ? 'bg-white shadow-sm text-green-600' : 'text-gray-400'}`}
                            >
                                Local
                            </button>
                            <button
                                onClick={() => setSearchScope('global')}
                                className={`px-3 py-1 rounded-full transition ${searchScope === 'global' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
                            >
                                Global
                            </button>
                        </div>

                        {/* Location Selectors (Only if local) */}
                        {searchScope === 'local' ? (
                            <div className="flex gap-2">
                                {user && (
                                    <button
                                        onClick={() => setLocationType('home')}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border transition ${locationType === 'home' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-gray-200 text-gray-400'}`}
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                                        Home
                                    </button>
                                )}
                                <button
                                    onClick={() => setLocationType('live')}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border transition ${locationType === 'live' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-gray-200 text-gray-400'}`}
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    Live
                                </button>
                                <button
                                    onClick={() => setLocationType('custom')}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border transition ${locationType === 'custom' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-400'}`}
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    Custom
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9h18" /></svg>
                                Global Data Enabled
                            </div>
                        )}

                        {searchScope === 'local' && locationType === 'custom' && (
                            <input
                                type="text"
                                value={customLocation}
                                onChange={(e) => setCustomLocation(e.target.value)}
                                placeholder="Enter address..."
                                className="px-3 py-1 rounded-full text-[10px] font-medium border border-blue-200 outline-none focus:ring-1 focus:ring-blue-500 w-32 animate-in slide-in-from-left-2 duration-300"
                            />
                        )}
                    </div>

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
                    <div className="relative p-2">
                        <textarea
                            ref={textareaRef}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask me anything..."
                            className="w-full text-base md:text-lg text-gray-800 placeholder:text-gray-300 bg-transparent border-0 focus:ring-0 resize-none max-h-40 md:max-h-60 py-2 md:py-3 px-2 md:px-4 leading-relaxed"
                            rows={1}
                        />

                        {/* Action Bar */}
                        <div className="flex justify-between items-center px-2 md:px-4 pb-1 pt-1 md:pb-2 md:pt-2">
                            <div className="text-[10px] md:text-xs text-gray-400 font-medium hidden xs:block">
                                {prompt.length > 0 || selectedTags.length > 0 ? 'Press Enter' : ''}
                            </div>
                            <div className="flex-1" /> {/* Spacer */}
                            <button
                                onClick={() => handleSubmit()}
                                disabled={(prompt.length === 0 && selectedTags.length === 0) || isLoading}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white p-2 md:p-3 rounded-xl transition-all shadow-md disabled:shadow-none min-w-[3rem] flex items-center justify-center"
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

                {/* Prescription Tags (Quick Select) */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-wrap justify-center gap-2 md:gap-3 mb-2 md:mb-8 shrink-0"
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
                    className="w-full max-w-5xl shrink-0"
                >
                    <div className="text-center mb-1 md:mb-2 text-[10px] md:text-xs text-gray-300 font-medium uppercase tracking-widest">
                        Live Market
                    </div>
                    <MarketTicker onItemClick={handleTickerItemClick} />
                </motion.div>
            </main>

            {/* Simple Footer */}
            <footer className="w-full py-4 text-center text-xs text-gray-300 relative z-10">
                © 2025 PLYT Network. All rights reserved.
            </footer>
        </div>
    );
}
