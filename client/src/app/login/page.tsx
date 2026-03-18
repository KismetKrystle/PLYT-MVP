'use client';

import React, { useState, Suspense } from 'react';
import { useAuth } from '../../lib/auth';
import api from '../../lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { login, isAccessWallEnabled } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams(); // This causes the build error if not suspended
    const redirectPath = searchParams.get('redirect') || '/';
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Email Login
    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const res = await api.post('/auth/login', { email, password });
            if (res.data?.isNewUser) {
                login(res.data.token, res.data.user, undefined);
                router.push(`/signup?mode=kyc&redirect=${encodeURIComponent(redirectPath)}`);
            } else {
                login(res.data.token, res.data.user, redirectPath);
            }
        } catch (err: any) {
            console.error('Login failed:', err);
            setError(err.response?.data?.error || 'Login failed. Please check your connection.');
        } finally {
            setIsLoading(false);
        }
    };

    // Mock Wallet Login (XRPL)
    const handleWalletLogin = async () => {
        setError('');
        setIsLoading(true);
        try {
            // In a real app, we would use window.xrpl or Crossmark to sign a message
            // Here we simulate by asking for a public address
            const walletAddress = prompt("Enter your XRPL Wallet Address (Simulation):", "rEb8TK3gBgk5auZkwc6sHnwrGVJH8DuaLh");

            if (walletAddress) {
                const res = await api.post('/auth/wallet-login', { walletAddress });
                login(res.data.token, res.data.user, redirectPath);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Wallet login failed');
        } finally {
            setIsLoading(false);
        }
    };

    // Mock Google Login
    const handleGoogleLogin = async () => {
        setError('');
        setIsLoading(true);
        try {
            // In a real app, this would redirect to Google OAuth
            const mockEmail = prompt("Enter your Google Email (Simulation):", "user@gmail.com");
            const mockName = prompt("Enter your Google Name (Simulation):", "Google User");

            if (mockEmail) {
                const res = await api.post('/auth/google-login', { email: mockEmail, name: mockName || 'Google User' });
                if (res.data?.isNewUser) {
                    login(res.data.token, res.data.user, undefined);
                    router.push(`/signup?mode=kyc&redirect=${encodeURIComponent(redirectPath)}`);
                } else {
                    login(res.data.token, res.data.user, redirectPath);
                }
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Google login failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100"
        >
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
                <p className="text-gray-500">Sign in to manage your garden and orders.</p>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 text-center">
                    {error}
                </div>
            )}

            <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none transition"
                        placeholder="you@example.com"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 pr-16 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none transition"
                            placeholder="********"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500 hover:text-gray-700"
                        >
                            {showPassword ? 'Hide' : 'Show'}
                        </button>
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
                >
                    {isLoading ? 'Signing In...' : 'Sign In'}
                </button>
            </form>

            <div className="my-6 flex items-center">
                <div className="flex-1 border-t border-gray-200"></div>
                <span className="px-4 text-xs text-gray-400 font-medium uppercase tracking-wide">Or continue with</span>
                <div className="flex-1 border-t border-gray-200"></div>
            </div>

            <div className="space-y-3">
                <button
                    onClick={handleGoogleLogin}
                    className="w-full border border-gray-300 bg-white text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition flex items-center justify-center gap-2"
                >
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                    Continue with Google
                </button>
                <button
                    onClick={handleWalletLogin}
                    className="w-full bg-gray-900 text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 transition flex items-center justify-center gap-2"
                >
                    <span>⚡</span> Connect XRPL Wallet
                </button>
            </div>

            <div className="mt-8 text-center text-sm text-gray-600">
                <div className="mb-2">
                    {!isAccessWallEnabled && (
                        <>
                            Don't have an account?{' '}
                            <Link href={`/signup?redirect=${encodeURIComponent(redirectPath)}`} className="text-green-600 font-medium hover:underline">
                                Create one
                            </Link>
                        </>
                    )}
                </div>
                <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-400">
                        Trouble logging in? Use the demo account: <br />
                        <code className="bg-gray-100 px-1 rounded text-gray-600">demo@plyt.com</code> / <code className="bg-gray-100 px-1 rounded text-gray-600">PLYTdemo2024!</code>
                    </p>
                </div>
            </div>
        </motion.div>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 px-4">
            <Suspense fallback={<div className="text-gray-500">Loading form...</div>}>
                <LoginForm />
            </Suspense>
        </div>
    );
}
