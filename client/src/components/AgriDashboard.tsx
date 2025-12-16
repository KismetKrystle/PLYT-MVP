'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProductPreviewPanel from './ProductPreviewPanel';

type Tab = 'home' | 'find_produce' | 'pick_system' | 'learn';

export default function AgriDashboard() {
    const [activeTab, setActiveTab] = useState<Tab>('home');
    const [prompt, setPrompt] = useState('');
    const [showPreview, setShowPreview] = useState(false);

    // -- Copied Logic from MainChat (History Simulation) --
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string; tags?: string[] }[]>([
        { role: 'assistant', content: 'Welcome back! How can I help you today?' }
    ]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Restore Guest Prompt Logic
    useEffect(() => {
        const stored = localStorage.getItem('pendingChatPrompt');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed.text) {
                    setMessages(prev => [...prev, { role: 'user', content: parsed.text, tags: parsed.tags }]);
                    // If we have a prompt, maybe auto-switch to chat mode?
                    // Let's stay on Home but show it in the collapsed view as "Recent Activity" 
                    // OR switch to 'find_produce' if that was the intent.
                    // For now, let's auto-switch to 'find_produce' if there's a restored prompt to be helpful.
                    setActiveTab('find_produce');
                }
                localStorage.removeItem('pendingChatPrompt');
            } catch (e) { console.error(e); }
        }
    }, []);

    // Auto-scroll logic
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, activeTab]);

    const handleSend = () => {
        if (!prompt.trim()) return;
        setMessages(prev => [...prev, { role: 'user', content: prompt }]);
        setPrompt('');

        // If in Home mode, sending a message should probably expand to full chat?
        if (activeTab === 'home') {
            setActiveTab('find_produce'); // Default migration to chat
        }

        setTimeout(() => {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Processing your request...' }]);
            setShowPreview(true); // Simulate AI finding a product
        }, 800);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex w-full h-full">
            {/* Middle Column: Main Content (Dashboard OR Chat) */}
            <div className="flex-1 flex flex-col min-w-0 bg-white relative">

                {/* Tab Navigation */}
                <div className="border-b border-gray-100 flex items-center justify-center px-4 pt-2 shrink-0">
                    <div className="flex space-x-1 overflow-x-auto no-scrollbar w-full max-w-2xl justify-center">
                        {['find_produce', 'pick_system', 'learn'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as Tab)}
                                className={`px-4 md:px-6 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === tab
                                    ? 'border-green-600 text-green-700'
                                    : 'border-transparent text-gray-500 hover:text-gray-800'
                                    }`}
                            >
                                {tab === 'find_produce' && 'Find Produce'}
                                {tab === 'pick_system' && 'Pick a System'}
                                {tab === 'learn' && 'Lessons'}
                            </button>
                        ))}
                    </div>
                    {activeTab !== 'home' && (
                        <button
                            onClick={() => setActiveTab('home')}
                            className="absolute right-4 top-4 text-xs text-gray-400 hover:text-gray-600 underline hidden md:block"
                        >
                            Back to Dashboard
                        </button>
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto relative bg-gray-50/50 flex flex-col">
                    {activeTab === 'home' ? (
                        // --- HOME / DASHBOARD MODE ---
                        <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto space-y-8 pb-32 w-full">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Stat Card 1 */}
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Impact Score</h3>
                                    <p className="text-3xl font-bold text-gray-900">850</p>
                                    <span className="text-green-600 text-xs font-medium">Top 5% in Bali</span>
                                </div>
                                {/* Stat Card 2 */}
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Active Systems</h3>
                                    <p className="text-3xl font-bold text-gray-900">2</p>
                                    <span className="text-gray-400 text-xs">All systems healthy</span>
                                </div>
                                {/* Stat Card 3 */}
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Open Orders</h3>
                                    <p className="text-3xl font-bold text-gray-900">0</p>
                                    <span className="text-gray-400 text-xs">Ready to order?</span>
                                </div>
                            </div>

                            {/* Quick Access / Recent */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h2 className="text-lg font-bold text-gray-800 mb-4">Your Garden Overview</h2>
                                <div className="h-40 bg-green-50 rounded-xl flex items-center justify-center border-2 border-dashed border-green-100 text-green-700/50">
                                    Garden Visualization Placeholder
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'learn' ? (
                        // --- LESSON MODE (Master-Detail) ---
                        <div className="flex-1 flex overflow-hidden w-full">
                            {/* Left List Panel */}
                            <div className="w-full md:w-1/3 min-w-[200px] border-r border-gray-200 bg-white overflow-y-auto hidden md:block">
                                <div className="p-4 border-b border-gray-100 font-bold text-gray-700">Saved Lessons</div>
                                <div className="p-2 space-y-1">
                                    {['Nutrient Balancing', 'Hydro Basics', 'Pest Control', 'Harvest Timing'].map(l => (
                                        <div key={l} className="p-3 rounded-lg hover:bg-gray-50 cursor-pointer text-sm text-gray-600 bg-white border border-transparent hover:border-gray-100">{l}</div>
                                    ))}
                                </div>
                            </div>
                            {/* Main Detail Panel */}
                            <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-white w-full">
                                <article className="prose max-w-3xl mx-auto">
                                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Nutrient Balancing 101</h1>
                                    <p className="text-gray-600 leading-relaxed mb-4">
                                        Understanding the N-P-K ratio is critical for hydroponic success. Nitrogen (N) promotes leaf growth, Phosphorus (P) aids root and flower development, and Potassium (K) improves overall plant health.
                                    </p>
                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 my-6">
                                        <h3 className="font-bold text-blue-800 mb-2">Key Takeaway</h3>
                                        <p className="text-blue-700 text-sm">Always check pH levels after adding nutrients, as they can significantly alter the acidity of your solution.</p>
                                    </div>
                                    <p className="text-gray-600 leading-relaxed">
                                        In this lesson, we will cover how to measure EC (Electrical Conductivity) and adjust your solution strength according to the growth stage of your plants.
                                    </p>
                                </article>
                            </div>
                        </div>
                    ) : (
                        // --- CHAT MODE (Full Height) ---
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 w-full">
                            <div className="max-w-3xl mx-auto pb-4">
                                {messages.map((msg, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`flex w-full mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[90%] md:max-w-[85%] rounded-2xl px-5 py-3 shadow-sm ${msg.role === 'user'
                                            ? 'bg-green-600 text-white rounded-br-none'
                                            : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'
                                            }`}>
                                            {msg.tags && <div className="text-xs opacity-70 mb-1">{msg.tags.join(', ')}</div>}
                                            <p className="leading-relaxed whitespace-pre-wrap text-sm md:text-base">{msg.content}</p>
                                        </div>
                                    </motion.div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Chat Input Area (Sticky Bottom) */}
                <div className={`shrink-0 z-10 transition-all duration-500 ${(activeTab === 'home' || activeTab === 'learn')
                        ? 'p-4 md:p-6 bg-gradient-to-t from-white via-white to-transparent'
                        : 'p-4 md:p-6 bg-white border-t border-gray-100'
                    }`}>
                    <div className={`mx-auto transition-all duration-500 relative shadow-xl bg-white border border-gray-200 rounded-3xl ${(activeTab === 'home' || activeTab === 'learn') ? 'max-w-2xl' : 'max-w-3xl'
                        }`}>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={(activeTab === 'home' || activeTab === 'learn') ? "Ask a question..." : "Type your message..."}
                            className="w-full pl-6 pr-14 py-4 rounded-3xl resize-none focus:outline-none focus:ring-2 focus:ring-green-500/50 bg-transparent text-gray-700 placeholder:text-gray-400"
                            rows={1}
                            style={{ minHeight: '60px' }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!prompt.trim()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50 transition shadow-md"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                            </svg>
                        </button>
                    </div>
                    {activeTab === 'home' && (
                        <p className="text-center text-xs text-gray-400 mt-2">
                            Start a chat to Find Produce, Pick a System, or Learn.
                        </p>
                    )}
                </div>

            </div>
        </div>
    );
}
