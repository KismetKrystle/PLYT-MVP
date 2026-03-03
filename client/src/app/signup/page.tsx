'use client';

import React, { useState, Suspense, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import api from '../../lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

import KYCForm from '../../components/KYCForm';

function SignupForm() {
    const [signupStep, setSignupStep] = useState<'creds' | 'kyc'>('creds');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { login, isAccessWallEnabled } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectPath = searchParams.get('redirect') || '/';
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Auto-logout on visit to ensure clean state
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    }, []);

    // Initial Signup
    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            // Attempt real signup
            await api.post('/auth/signup', { email, password });
            const res = await api.post('/auth/login', { email, password });
            login(res.data.token, res.data.user, undefined);
            setSignupStep('kyc');
        } catch (err: any) {
            console.error('Signup failed:', err);
            setError(err.response?.data?.error || 'Signup failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKYCComplete = () => {
        // Now redirect to home
        router.push(redirectPath);
    };

    if (signupStep === 'kyc') {
        return <KYCForm onComplete={handleKYCComplete} />;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100"
        >
            {isAccessWallEnabled ? (
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Registration Unavailable</h1>
                    <p className="text-gray-600 mb-6">
                        We are currently in a closed beta. Registration is disabled.
                    </p>
                    <Link href="/login" className="text-green-600 font-medium hover:underline">
                        Back to Login
                    </Link>
                </div>
            ) : (
                <>
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Join PLYT</h1>
                        <p className="text-gray-500">Start your journey to food independence.</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSignup} className="space-y-4">
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
                                    placeholder="Create a password"
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
                            {isLoading ? 'Creating Account...' : 'Sign Up'}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm text-gray-600">
                        Already have an account?{' '}
                        <Link href={`/login?redirect=${encodeURIComponent(redirectPath)}`} className="text-green-600 font-medium hover:underline">
                            Sign In
                        </Link>
                    </div>
                </>
            )}
        </motion.div>
    );
}

export default function SignupPage() {
    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 px-4">
            <Suspense fallback={<div className="text-gray-500">Loading form...</div>}>
                <SignupForm />
            </Suspense>
        </div>
    );
}
