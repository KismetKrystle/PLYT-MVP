'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '../../lib/ProtectedRoute';

export default function ChatPage() {
    const [promptData, setPromptData] = useState<{ text: string; tags: string[] } | null>(null);

    useEffect(() => {
        // Check for pending prompt from landing page
        const stored = localStorage.getItem('pendingChatPrompt');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setPromptData(parsed);
                // Optional: Clear it after reading, or keep it until successfully sent to API
                // localStorage.removeItem('pendingChatPrompt');
            } catch (e) {
                console.error('Failed to parse pending prompt', e);
            }
        }
    }, []);

    return (
        <ProtectedRoute>
            <div className="max-w-4xl mx-auto p-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Your Chat</h1>

                {promptData ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
                        <h2 className="text-sm font-bold text-green-800 uppercase tracking-wide mb-2">
                            Recovered Draft Prompt
                        </h2>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {promptData.tags.map((tag) => (
                                <span key={tag} className="px-2 py-1 bg-white text-green-700 text-xs font-semibold rounded-md border border-green-100">
                                    {tag}
                                </span>
                            ))}
                        </div>
                        <p className="text-lg text-gray-800">{promptData.text}</p>
                    </div>
                ) : (
                    <p className="text-gray-500 italic">No pending prompt found. Start a new conversation!</p>
                )}

                {/* Placeholder for actual chat UI */}
                <div className="h-96 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400">
                    Chat Interface Coming Soon...
                </div>
            </div>
        </ProtectedRoute>
    );
}
