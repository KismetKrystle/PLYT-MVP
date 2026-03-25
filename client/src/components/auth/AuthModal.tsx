'use client';

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../lib/auth';

export default function AuthModal() {
    const { isLoginModalOpen, closeLoginModal, isAccessWallEnabled } = useAuth();

    if (!isLoginModalOpen) return null;

    return (
        <AnimatePresence>
            {isLoginModalOpen ? (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6">
                    <motion.div
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        exit={{ opacity: 0 }}
                        initial={{ opacity: 0 }}
                        onClick={closeLoginModal}
                    />

                    <motion.div
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white p-8 shadow-xl"
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    >
                        <button
                            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                            onClick={closeLoginModal}
                        >
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                            </svg>
                        </button>

                        <div className="mb-8 text-center">
                            <h2 className="mb-2 text-2xl font-bold text-gray-900">Secure Sign In</h2>
                            <p className="text-gray-500">
                                Use the new Clerk-powered sign-in flow to access your profile, archive, and saved progress.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <Link
                                className="flex w-full items-center justify-center rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-green-700"
                                href="/login"
                                onClick={closeLoginModal}
                            >
                                Go to sign in
                            </Link>
                            {!isAccessWallEnabled ? (
                                <Link
                                    className="flex w-full items-center justify-center rounded-lg border border-green-600/20 bg-white px-4 py-2.5 text-sm font-medium text-green-700 transition hover:bg-green-50"
                                    href="/signup"
                                    onClick={closeLoginModal}
                                >
                                    Create account
                                </Link>
                            ) : null}
                        </div>

                        <p className="mt-6 text-center text-sm text-gray-500">
                            Your existing PLYT data stays connected after sign-in.
                        </p>
                    </motion.div>
                </div>
            ) : null}
        </AnimatePresence>
    );
}
