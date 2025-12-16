'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProductPreviewPanel, { ProductDetail } from './ProductPreviewPanel';
import { useLessons } from '../context/LessonContext';

interface ProduceItem extends ProductDetail {
    quantity: number;
}

type Tab = 'home' | 'find_produce' | 'pick_system' | 'learn';

export default function AgriDashboard() {
    const [activeTab, setActiveTab] = useState<Tab>('home');
    const [prompt, setPrompt] = useState('');
    const [showPreview, setShowPreview] = useState(false);

    // Notes for Learn Mode
    const [notes, setNotes] = useState<string[]>([]);
    const { addLesson, activeLesson, setActiveLesson } = useLessons();

    // Find Produce Side Panel State
    const [produceItems, setProduceItems] = useState<ProduceItem[]>([]);

    // Pick System Side Panel State
    const [systemItems, setSystemItems] = useState<ProduceItem[]>([]);
    const [containerItems, setContainerItems] = useState<ProduceItem[]>([]);

    const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null);

    // Calculate Total Price (Produce + Systems + Containers)
    const produceTotal = produceItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const systemTotal = systemItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const containerTotal = containerItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const grandTotal = produceTotal + systemTotal + containerTotal;

    // Helper: Update Quantity or Remove
    const updateQuantity = (
        stateSetter: React.Dispatch<React.SetStateAction<ProduceItem[]>>,
        id: string,
        delta: number
    ) => {
        stateSetter(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, quantity: Math.max(0, item.quantity + delta) };
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    // Helper: Remove Item Directly
    const removeItem = (
        stateSetter: React.Dispatch<React.SetStateAction<ProduceItem[]>>,
        id: string
    ) => {
        stateSetter(prev => prev.filter(item => item.id !== id));
    };

    // Auto-switch to Learn tab when a lesson is selected
    useEffect(() => {
        if (activeLesson) {
            setActiveTab('learn');
        }
    }, [activeLesson]);

    // -- Copied Logic from MainChat (History Simulation) --
    // -- Chat History per Tab --
    const [chatHistory, setChatHistory] = useState<{
        [key in 'find_produce' | 'pick_system' | 'learn']: { role: 'user' | 'assistant'; content: string; tags?: string[] }[]
    }>({
        find_produce: [{ role: 'assistant', content: 'Welcome back! Looking for fresh produce?' }],
        pick_system: [{ role: 'assistant', content: 'Ready to find your perfect growing system?' }],
        learn: [{ role: 'assistant', content: 'What would you like to learn about growing today?' }]
    });
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Restore Guest Prompt Logic
    useEffect(() => {
        const stored = localStorage.getItem('pendingChatPrompt');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed.text) {
                    setChatHistory(prev => ({
                        ...prev,
                        find_produce: [...prev.find_produce, { role: 'user', content: parsed.text, tags: parsed.tags }]
                    }));
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
        // distinct dependency on history changes
    }, [chatHistory, activeTab, notes]);

    const handleSend = () => {
        if (!prompt.trim()) return;

        // Determine target tab (default to find_produce if on home)
        const targetTab: 'find_produce' | 'pick_system' | 'learn' = activeTab === 'home' ? 'find_produce' : activeTab as any;

        setChatHistory(prev => ({
            ...prev,
            [targetTab]: [...prev[targetTab], { role: 'user', content: prompt }]
        }));

        const currentPrompt = prompt; // capture for closure
        setPrompt('');

        // If in Home mode, switch to tab
        if (activeTab === 'home') {
            setActiveTab('find_produce');
        }

        setTimeout(() => {
            setChatHistory(prev => ({
                ...prev,
                [targetTab]: [...prev[targetTab], { role: 'assistant', content: 'Processing your request...' }]
            }));
            setShowPreview(true);

            // If in Find Produce, simulate finding an item
            if (targetTab === 'find_produce') {
                const MOCK_DB: Omit<ProduceItem, 'quantity'>[] = [
                    { id: '1', name: 'Organic Red Tomatoes', price: 25000, unit: 'kg', plyt: '25', image: '', description: 'Sweet, vine-ripened tomatoes grown in pesticide-free soil.', specs: ['Vitamin C Rich', 'Vine Ripened'], farm: 'Sunrise Farm', growMethod: 'Soil' },
                    { id: '2', name: 'Fresh Thai Basil', price: 15000, unit: 'bundle', plyt: '15', image: '', description: 'Aromatic basil perfect for cooking.', specs: ['Rich Aroma', 'Hydroponic'], farm: 'GreenTech', growMethod: 'Hydroponics' },
                    { id: '3', name: 'Curly Kale', price: 35000, unit: 'kg', plyt: '35', image: '', description: 'Crunchy, nutrient-dense kale leaves.', specs: ['Superfood', 'Organic'], farm: 'Ubud Organics', growMethod: 'Organic' },
                    { id: '4', name: 'Sweet Potatoes', price: 18000, unit: 'kg', plyt: '18', image: '', description: 'Purple sweet potatoes, high in antioxidants.', specs: ['High Fiber', 'Local'], farm: 'Bali Root', growMethod: 'Traditional' }
                ];

                // Pick random item or based on prompt (naive)
                const mockItem = MOCK_DB[Math.floor(Math.random() * MOCK_DB.length)];

                setProduceItems(prev => {
                    const existing = prev.find(p => p.id === mockItem.id);
                    if (existing) {
                        return prev.map(p => p.id === mockItem.id ? { ...p, quantity: p.quantity + 1 } : p);
                    }
                    return [...prev, { ...mockItem, quantity: 1 }];
                });
            }

            // If in Pick System, simulate adding System OR Container
            if (targetTab === 'pick_system') {
                // Randomly maintain variety or just add one of each for demo
                const isSystem = Math.random() > 0.5;

                if (isSystem) {
                    const MOCK_SYSTEMS: Omit<ProduceItem, 'quantity'>[] = [
                        { id: 's1', name: 'Hydro-Starter Kit', price: 1200000, unit: 'unit', plyt: '1200', image: '', description: 'Perfect for beginners. Includes 10 net pots.', specs: ['10 Pots', 'Air Pump'], farm: 'HydroBasics', growMethod: 'NFT' },
                        { id: 's2', name: 'Vertical Tower V2', price: 3500000, unit: 'unit', plyt: '3500', image: '', description: 'Space-saving vertical tower for leafy greens.', specs: ['36 Pots', 'Vertical'], farm: 'VertiGrow', growMethod: 'Aeroponics' },
                    ];
                    const item = MOCK_SYSTEMS[Math.floor(Math.random() * MOCK_SYSTEMS.length)];
                    setSystemItems(prev => {
                        const existing = prev.find(p => p.id === item.id);
                        if (existing) return prev; // Don't add duplicates for systems usually, or just inc qty
                        return [...prev, { ...item, quantity: 1 }];
                    });
                } else {
                    const MOCK_CONTAINERS: Omit<ProduceItem, 'quantity'>[] = [
                        { id: 'c1', name: 'Terracotta Pot (L)', price: 150000, unit: 'unit', plyt: '150', image: '', description: 'Handcrafted clay pot.', specs: ['Breathable', 'Natural'], farm: 'Bali Clay', artisan: 'Wayan Sudra', material: 'Red Clay', impactScore: 850, growMethod: 'Handmade' },
                        { id: 'c2', name: 'Recycled Planter', price: 75000, unit: 'unit', plyt: '75', image: '', description: 'Made from upcycled ocean plastic.', specs: ['Durable', 'Eco-friendly'], farm: 'OceanClean', artisan: 'EcoMakers', material: 'Recycled HDPE', impactScore: 920, growMethod: 'Upcycled' },
                    ];
                    const item = MOCK_CONTAINERS[Math.floor(Math.random() * MOCK_CONTAINERS.length)];
                    setContainerItems(prev => {
                        const existing = prev.find(p => p.id === item.id);
                        if (existing) return prev;
                        return [...prev, { ...item, quantity: 1 }];
                    });
                }
            }

            // If in Learn Mode, generate a note
            if (targetTab === 'learn') {
                const newNote = `Key Insight: ${currentPrompt.substring(0, 20)}... details about growing.`;
                setNotes(prev => [...prev, newNote]);
            }
        }, 800);
    };

    const handleSaveLesson = () => {
        if (notes.length === 0) return;
        const title = `Lesson ${new Date().toLocaleDateString()} (${notes.length} notes)`;
        const content = notes.join('\n\n');
        addLesson(title, content);
        alert(`Saved "${title}" to your sidebar!`);
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
                                {tab === 'learn' && 'Learn'}
                            </button>
                        ))}
                    </div>
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
                        activeLesson ? (
                            // --- VIEW LESSON MODE ---
                            <div className="flex-1 flex overflow-hidden w-full h-full p-6 md:p-10 bg-white">
                                <article className="prose max-w-4xl mx-auto w-full">
                                    <button
                                        onClick={() => setActiveLesson(null)}
                                        className="mb-6 flex items-center text-sm text-green-600 hover:text-green-700 font-medium"
                                    >
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                        Back to Chat
                                    </button>
                                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{activeLesson.title}</h1>
                                    <p className="text-gray-400 text-sm mb-6">Saved on {activeLesson.date}</p>

                                    <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-100/50 space-y-4 shadow-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                        {activeLesson.content}
                                    </div>
                                </article>
                            </div>
                        ) : (
                            // --- LEARN MODE (Chat + Notes Split Layout) ---
                            <div className="flex-1 flex overflow-hidden w-full h-full">
                                {/* Left: Chat Area */}
                                <div className="flex-1 flex flex-col relative border-r border-gray-100 bg-gray-50/30">
                                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                                        {chatHistory['learn'].map((msg, idx) => (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`flex w-full mb-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div className={`max-w-[90%] rounded-2xl px-4 py-3 shadow-sm ${msg.role === 'user'
                                                    ? 'bg-green-600 text-white rounded-br-none'
                                                    : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'
                                                    }`}>
                                                    <p className="leading-relaxed whitespace-pre-wrap text-sm">{msg.content}</p>
                                                </div>
                                            </motion.div>
                                        ))}
                                        <div ref={messagesEndRef} />
                                    </div>
                                    {/* Chat Input for Learn Mode */}
                                    <div className="p-4 bg-white border-t border-gray-100">
                                        <div className="relative shadow-sm bg-gray-50 border border-gray-200 rounded-2xl">
                                            <textarea
                                                value={prompt}
                                                onChange={(e) => setPrompt(e.target.value)}
                                                onKeyDown={handleKeyDown}
                                                placeholder="Ask about growing..."
                                                className="w-full pl-4 pr-12 py-3 rounded-2xl resize-none focus:outline-none focus:bg-white focus:ring-2 focus:ring-green-500/50 bg-transparent text-gray-700 placeholder:text-gray-400 text-sm"
                                                rows={1}
                                                style={{ minHeight: '48px' }}
                                            />
                                            <button
                                                onClick={handleSend}
                                                disabled={!prompt.trim()}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50 transition"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Notes Panel */}
                                <div className="w-80 bg-white border-l border-gray-100 flex flex-col shadow-[0_0_15px_rgba(0,0,0,0.03)] z-10">
                                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                        <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Start Notes</h3>
                                        <button
                                            onClick={handleSaveLesson}
                                            title="Save to Lessons"
                                            className="w-8 h-8 flex items-center justify-center bg-green-100 text-green-700 rounded-full hover:bg-green-600 hover:text-white transition-all shadow-sm"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                        {notes.length === 0 ? (
                                            <div className="text-center py-10 opacity-40">
                                                <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                <p className="text-sm text-gray-400">Highlights from your chat will appear here.</p>
                                            </div>
                                        ) : (
                                            notes.map((note, idx) => (
                                                <div key={idx} className="p-3 bg-yellow-50 rounded-xl border border-yellow-100 text-sm text-gray-700 shadow-sm relative group">
                                                    <div className="absolute -left-1 top-4 w-2 h-2 rounded-full bg-yellow-400"></div>
                                                    <p className="pl-2">{note}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    ) : activeTab === 'find_produce' ? (
                        // --- FIND PRODUCE MODE (Split with Side Panel) ---
                        <div className="flex-1 flex flex-col md:flex-row overflow-hidden w-full h-full">
                            {/* Chat Area (Left/Top) */}
                            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 w-full relative">
                                <div className="max-w-3xl mx-auto pb-4">
                                    {(chatHistory['find_produce'] || []).map((msg, idx) => (
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

                            {/* Produce Panel (Right/Bottom) */}
                            <div className="w-full md:w-96 shrink-0 border-t md:border-t-0 md:border-l border-gray-100 bg-gray-50/50 flex flex-col h-72 md:h-auto overflow-hidden relative">
                                <div className="p-4 border-b border-gray-100 bg-white/50 backdrop-blur-sm flex justify-between items-center">
                                    <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Selected Produce</h3>
                                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">{produceItems.length} Items</span>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
                                    {produceItems.length === 0 ? (
                                        <div className="text-center py-10 opacity-40">
                                            <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                                            <p className="text-xs text-gray-400">Suggesting locally available produce...</p>
                                        </div>
                                    ) : (
                                        produceItems.map((item) => (
                                            <motion.div
                                                key={item.id}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm flex gap-3 group hover:border-green-200 transition-colors"
                                            >
                                                {/* Image/Icon */}
                                                <div
                                                    className="w-16 h-16 rounded-lg bg-gray-100 shrink-0 overflow-hidden relative cursor-pointer"
                                                    onClick={() => setSelectedProduct(item)}
                                                >
                                                    {/* Real app would use item.image */}
                                                    <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                    </div>
                                                </div>

                                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                                    <div>
                                                        <h4
                                                            className="text-sm font-bold text-gray-800 cursor-pointer hover:text-green-600 truncate"
                                                            onClick={() => setSelectedProduct(item)}
                                                        >
                                                            {item.name}
                                                        </h4>
                                                        <p className="text-[10px] text-gray-400 truncate">{item.farm} • {item.growMethod}</p>
                                                    </div>

                                                    <div className="flex items-center justify-between mt-2">
                                                        <p className="text-xs font-semibold text-gray-600">Rp {item.price.toLocaleString()} <span className="text-[9px] font-normal text-gray-400">/{item.unit}</span></p>

                                                        {/* Qty Controls */}
                                                        <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 h-6">
                                                            <button
                                                                onClick={() => updateQuantity(setProduceItems, item.id, -1)}
                                                                className="px-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-l-lg transition h-full flex items-center"
                                                            >
                                                                -
                                                            </button>
                                                            <span className="text-xs font-bold text-gray-700 w-6 text-center">{item.quantity}</span>
                                                            <button
                                                                onClick={() => updateQuantity(setProduceItems, item.id, 1)}
                                                                className="px-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-r-lg transition h-full flex items-center"
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </div>

                                {/* Total Price Footer */}
                                {produceItems.length > 0 && (
                                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] z-10">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Estimated</span>
                                            <span className="text-lg font-bold text-gray-900">Rp {produceTotal.toLocaleString()}</span>
                                        </div>
                                        <button className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm shadow-sm transition active:scale-95">
                                            Connect with Farmers
                                        </button>
                                    </div>
                                )}

                                {/* Product Detail Popup Overlay */}
                                <AnimatePresence>
                                    {selectedProduct && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute inset-0 bg-black/20 backdrop-blur-[1px] z-50 flex justify-end"
                                            onClick={() => setSelectedProduct(null)}
                                        >
                                            <motion.div
                                                initial={{ x: '100%' }}
                                                animate={{ x: 0 }}
                                                exit={{ x: '100%' }}
                                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                                className="w-full h-full shadow-2xl"
                                                onClick={e => e.stopPropagation()}
                                            >
                                                <ProductPreviewPanel item={selectedProduct} onClose={() => setSelectedProduct(null)} />
                                            </motion.div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                    ) : activeTab === 'pick_system' ? (
                        // --- PICK SYSTEM MODE (Split with Dual Panel) ---
                        <div className="flex-1 flex flex-col md:flex-row overflow-hidden w-full h-full">
                            {/* Chat Area */}
                            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 w-full relative">
                                <div className="max-w-3xl mx-auto pb-4">
                                    {(chatHistory['pick_system'] || []).map((msg, idx) => (
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

                            {/* Dual Side Panel (Systems & Containers) */}
                            <div className="w-full md:w-96 shrink-0 border-t md:border-t-0 md:border-l border-gray-100 bg-gray-50/50 flex flex-col h-96 md:h-auto overflow-hidden relative">

                                {/* Section 1: Systems */}
                                <div className="flex-1 flex flex-col border-b border-gray-100 min-h-0">
                                    <div className="p-3 bg-white/50 backdrop-blur-sm border-b border-gray-100">
                                        <h3 className="font-bold text-gray-700 text-xs uppercase tracking-wide">Growing Systems</h3>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                        {systemItems.length === 0 ? (
                                            <div className="text-center py-6 opacity-40">
                                                <p className="text-[10px] text-gray-400">Suggesting suitable systems...</p>
                                            </div>
                                        ) : systemItems.map(item => (
                                            <motion.div
                                                key={item.id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm flex gap-2 group relative"
                                            >
                                                <button
                                                    onClick={() => removeItem(setSystemItems, item.id)}
                                                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    x
                                                </button>
                                                <div className="w-10 h-10 bg-blue-50 rounded-md shrink-0 flex items-center justify-center cursor-pointer" onClick={() => setSelectedProduct(item)}>
                                                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-xs font-bold text-gray-800 truncate cursor-pointer hover:text-blue-600" onClick={() => setSelectedProduct(item)}>{item.name}</h4>
                                                    <p className="text-[10px] text-gray-500">Rp {item.price.toLocaleString()}</p>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>

                                {/* Section 2: Containers */}
                                <div className="flex-1 flex flex-col min-h-0 pb-20">
                                    <div className="p-3 bg-white/50 backdrop-blur-sm border-b border-gray-100">
                                        <h3 className="font-bold text-gray-700 text-xs uppercase tracking-wide">Artisan Containers</h3>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                        {containerItems.length === 0 ? (
                                            <div className="text-center py-6 opacity-40">
                                                <p className="text-[10px] text-gray-400">Finding sustainable containers...</p>
                                            </div>
                                        ) : containerItems.map(item => (
                                            <motion.div
                                                key={item.id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm flex gap-2 group relative"
                                            >
                                                <button
                                                    onClick={() => removeItem(setContainerItems, item.id)}
                                                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    x
                                                </button>
                                                <div className="w-10 h-10 bg-amber-50 rounded-md shrink-0 flex items-center justify-center cursor-pointer" onClick={() => setSelectedProduct(item)}>
                                                    <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-xs font-bold text-gray-800 truncate cursor-pointer hover:text-amber-600" onClick={() => setSelectedProduct(item)}>{item.name}</h4>
                                                    <p className="text-[10px] text-gray-500">by {item.artisan} • Rp {item.price.toLocaleString()}</p>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>

                                {/* Total Price Footer */}
                                {(systemItems.length > 0 || containerItems.length > 0) && (
                                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] z-10">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Project Cost</span>
                                            <span className="text-lg font-bold text-gray-900">Rp {(systemTotal + containerTotal).toLocaleString()}</span>
                                        </div>
                                        <button className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm shadow-sm transition active:scale-95">
                                            Proceed to Design
                                        </button>
                                    </div>
                                )}

                                {/* Reusing the Popup Logic from Find Produce (Shared State) */}
                                <AnimatePresence>
                                    {selectedProduct && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute inset-0 bg-black/20 backdrop-blur-[1px] z-50 flex justify-end"
                                            onClick={() => setSelectedProduct(null)}
                                        >
                                            <motion.div
                                                initial={{ x: '100%' }}
                                                animate={{ x: 0 }}
                                                exit={{ x: '100%' }}
                                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                                className="w-full h-full shadow-2xl"
                                                onClick={e => e.stopPropagation()}
                                            >
                                                <ProductPreviewPanel item={selectedProduct} onClose={() => setSelectedProduct(null)} />
                                            </motion.div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    ) : (
                        // --- STANDARD CHAT MODE (Other Tabs - Just standard layout fallback if needed) ---
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 w-full">
                            <div className="max-w-3xl mx-auto pb-4">
                                {(chatHistory[activeTab as 'pick_system'] || []).map((msg, idx) => (
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
                                {/* Empty Div for Scrolling */}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Chat Input Area (Hidden in Learn Mode, Visible in Home/Find/Pick) */}
                {
                    activeTab !== 'learn' && (
                        <div className={`shrink-0 z-10 transition-all duration-500 ${(activeTab === 'home')
                            ? 'p-4 md:p-6 bg-gradient-to-t from-white via-white to-transparent'
                            : 'p-4 md:p-6 bg-white border-t border-gray-100'
                            }`}>
                            <div className={`mx-auto transition-all duration-500 relative shadow-xl bg-white border border-gray-200 rounded-3xl ${(activeTab === 'home') ? 'max-w-2xl' : 'max-w-3xl'
                                }`}>
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={(activeTab === 'home') ? "Ask a question..." : "Type your message..."}
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
                    )
                }

            </div >
        </div >
    );
}
