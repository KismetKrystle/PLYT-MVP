import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import api from '../lib/api';

export default function AccessWall() {
    const { user, logout, login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const res = await api.post('/auth/gatekeeper-login', { username, password });
            login(res.data.token, res.data.user);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Invalid credentials');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center p-6 text-center text-white">
            <div className="max-w-md w-full space-y-8">
                {/* Logo or Brand */}
                <div className="flex justify-center mb-8">
                    <h1 className="text-4xl font-bold tracking-tighter bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                        PLYT
                    </h1>
                </div>

                <div className="space-y-4">
                    <h2 className="text-3xl font-semibold tracking-tight text-white mb-2">
                        Partner Access
                    </h2>

                    <p className="text-zinc-400 text-lg leading-relaxed">
                        Hi, thanks for your interest in PLYT.<br />
                        This environment is restricted to partners only.<br />
                        Enter your credentials to continue.
                    </p>

                    {user ? (
                        <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800 backdrop-blur-sm mt-8">
                            <div className="text-zinc-500 text-sm uppercase tracking-wider font-medium mb-1">Signed in as</div>
                            <div className="text-white font-mono text-base mb-6">{user.email}</div>

                            <div className="space-y-3">
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
                                    Access Denied. Please contact founder to gain access.
                                </div>
                                <button
                                    onClick={logout}
                                    className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-lg transition-colors border border-zinc-700"
                                >
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-8">
                            <form onSubmit={handleSubmit} className="space-y-4 text-left">
                                {error && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm mb-4">
                                        {error}
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-zinc-300 mb-1">Username</label>
                                    <input
                                        type="text"
                                        required
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-zinc-600"
                                        placeholder="Enter your username"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-300 mb-1">Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full px-4 py-3 pr-12 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-zinc-600"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                                            tabIndex={-1}
                                        >
                                            {showPassword ? (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full mt-4 py-3.5 px-6 bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white font-bold rounded-lg shadow-lg hover:shadow-cyan-500/20 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                >
                                    {isLoading ? 'Verifying...' : 'Enter'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                <div className="pt-12 text-zinc-600 text-sm">
                    &copy; 2026 PLYT Ecosystem. All rights reserved.
                </div>
            </div>
        </div>
    );
}
