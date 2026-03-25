'use client';

import { SignUp } from '@clerk/nextjs';
import Link from 'next/link';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import KYCForm from '../../../components/KYCForm';
import { useAuth } from '../../../lib/auth';

function SignupScreen() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, loading, isAccessWallEnabled } = useAuth();
    const mode = searchParams.get('mode');
    const redirectPath = searchParams.get('redirect') || '/';
    const loginUrl = `/login?redirect=${encodeURIComponent(redirectPath)}`;
    const completeUrl = `/auth/complete?mode=kyc&redirect=${encodeURIComponent(redirectPath)}`;
    const clerkKeyMissing = !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

    useEffect(() => {
        if (mode === 'kyc' || typeof window === 'undefined') {
            return;
        }

        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('clerk_user_id');
    }, [mode]);

    if (mode === 'kyc') {
        if (loading) {
            return (
                <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#f5f3ed] px-4">
                    <div className="rounded-[28px] border border-[#dfd7c9] bg-white px-6 py-8 text-center shadow-sm">
                        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[#234f2e]/20 border-t-[#234f2e]" />
                        <p className="text-sm text-[#6b6d61]">Finishing your secure sign-in...</p>
                    </div>
                </div>
            );
        }

        if (!user) {
            return (
                <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-auto mt-16 max-w-md rounded-[28px] border border-[#dfd7c9] bg-white p-8 text-center shadow-sm"
                    initial={{ opacity: 0, y: 16 }}
                >
                    <h1 className="text-2xl font-semibold text-[#1f2b18]">Sign in to continue onboarding</h1>
                    <p className="mt-3 text-sm leading-6 text-[#6b6d61]">
                        We need your secure session active before we can finish setting up your profile.
                    </p>
                    <Link
                        className="mt-6 inline-flex rounded-full bg-[#234f2e] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d4226]"
                        href={loginUrl}
                    >
                        Go to login
                    </Link>
                </motion.div>
            );
        }

        return <KYCForm onComplete={() => router.push(redirectPath)} />;
    }

    if (isAccessWallEnabled) {
        return (
            <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#f5f3ed] px-4">
                <div className="max-w-md rounded-[28px] border border-[#dfd7c9] bg-white p-8 text-center shadow-sm">
                    <h1 className="text-2xl font-semibold text-[#1f2b18]">Registration Unavailable</h1>
                    <p className="mt-3 text-sm leading-6 text-[#6b6d61]">
                        We are currently in a closed beta, so account creation is disabled right now.
                    </p>
                    <Link className="mt-6 inline-flex font-semibold text-[#234f2e] hover:underline" href="/login">
                        Back to login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-[#f5f3ed] px-4 py-10">
            <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-5xl items-center justify-center">
                <div className="grid w-full gap-8 overflow-hidden rounded-[32px] border border-[#d8d1c4] bg-white shadow-[0_30px_90px_rgba(53,62,33,0.12)] lg:grid-cols-[1fr_1fr]">
                    <div className="flex items-center justify-center px-4 py-8 sm:px-8 sm:py-10">
                        {clerkKeyMissing ? (
                            <div className="w-full max-w-md rounded-[28px] border border-amber-200 bg-amber-50 p-6 text-[#5c4617] shadow-sm">
                                <h2 className="text-2xl font-semibold">Clerk Needs Configuration</h2>
                                <p className="mt-3 text-sm leading-6">
                                    Add <code className="rounded bg-white px-1 py-0.5">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> to the client environment and <code className="rounded bg-white px-1 py-0.5">CLERK_SECRET_KEY</code> to the server environment before using secure sign-up.
                                </p>
                            </div>
                        ) : (
                            <SignUp
                                appearance={{
                                    elements: {
                                        card: 'shadow-none border border-[#e6e0d4] rounded-[28px]',
                                        rootBox: 'w-full',
                                    }
                                }}
                                fallbackRedirectUrl={completeUrl}
                                forceRedirectUrl={completeUrl}
                                path="/signup"
                                routing="path"
                                signInUrl={loginUrl}
                            />
                        )}
                    </div>

                    <div className="relative overflow-hidden bg-[#ece4d4] px-8 py-10 text-[#23351f] sm:px-10 sm:py-12">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(35,79,46,0.16),_transparent_40%),linear-gradient(160deg,_rgba(255,255,255,0.45),_transparent_60%)]" />
                        <div className="relative space-y-6">
                            <div className="inline-flex rounded-full border border-[#234f2e]/15 bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#5d684c]">
                                New Account
                            </div>
                            <div className="space-y-3">
                                <h1 className="max-w-md text-4xl font-semibold leading-tight sm:text-5xl">
                                    Create your secure PLYT account and finish profile setup in one flow.
                                </h1>
                                <p className="max-w-md text-sm leading-6 text-[#4d5a40] sm:text-base">
                                    Clerk handles the secure identity step first. Then we send new members directly into your existing onboarding and KYC setup.
                                </p>
                            </div>
                            <div className="grid gap-3 text-sm text-[#314226]">
                                <div className="rounded-2xl border border-[#234f2e]/10 bg-white/60 p-4">
                                    Email verification and Google sign-in are managed in Clerk.
                                </div>
                                <div className="rounded-2xl border border-[#234f2e]/10 bg-white/60 p-4">
                                    Your PLYT profile, role, and archive data still live in the app database.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={<div className="flex min-h-[calc(100vh-4rem)] items-center justify-center text-sm text-[#6b6d61]">Loading sign up...</div>}>
            <SignupScreen />
        </Suspense>
    );
}
