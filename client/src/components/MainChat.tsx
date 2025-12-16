'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

export default function MainChat() {
    const [prompt, setPrompt] = useState('');
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string; tags?: string[] }[]>([
        { role: 'assistant', content: 'Welcome back! How can I help you with your garden or food today?' }
    ]);
    const [initLoad, setInitLoad] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Restore Guest Prompt
    useEffect(() => {
        const stored = localStorage.getItem('pendingChatPrompt');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Add the restored user message
                setMessages(prev => [
                    ...prev,
                    { role: 'user', content: parsed.text, tags: parsed.tags }
                ]);

                // Simulate immediate AI response after short delay
                setTimeout(() => {
                    setMessages(prev => [
                        ...prev,
                        { role: 'assistant', content: 'I see you\'re looking for ' + (parsed.tags.join(', ') || 'something specific') + '. Let me check the network for you...' }
                    ]);
                }, 800);

                // Clear it so it doesn't duplicate
                localStorage.removeItem('pendingChatPrompt');
            } catch (e) {
                console.error('Failed to parse pending prompt', e);
            }
        }
        setInitLoad(false);
    }, []);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = () => {
        if (!prompt.trim()) return;

        // Add User Message
        setMessages(prev => [...prev, { role: 'user', content: prompt }]);
        setPrompt('');

        // Simulate AI Response
        setTimeout(() => {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Searching the decentralized network for: ' + prompt }]);
        }, 1000);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full max-w-5xl mx-auto w-full">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6" ref={scrollRef}>
                {messages.map((msg, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-6 py-4 shadow-sm ${msg.role === 'user'
                                ? 'bg-green-600 text-white rounded-br-none'
                                : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'
                            }`}>
                            {/* Display Tags if present */}
                            {msg.tags && msg.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {msg.tags.map(tag => (
                                        <span key={tag} className={`text-xs font-bold px-2 py-0.5 rounded ${msg.role === 'user' ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'
                                            }`}>
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                            <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Input Area */}
            <div className="p-6 md:p-10 bg-white/80 backdrop-blur-sm sticky bottom-0 z-10">
                <div className="relative shadow-xl rounded-2xl bg-white border border-gray-100">
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask PLYT..."
                        className="w-full pl-6 pr-14 py-4 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-green-500/50 max-h-40 bg-transparent"
                        rows={1}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!prompt.trim()}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:hover:bg-green-600 transition"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                        </svg>
                    </button>
                </div>
                <div className="text-center text-xs text-gray-400 mt-3">
                    PLYT AI can make mistakes. Please verify critical farming info.
                </div>
            </div>
        </div>
    );
}
