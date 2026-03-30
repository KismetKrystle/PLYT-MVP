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

    useEffect(() => {
        if (mode === 'kyc' || user || typeof window === 'undefined') {
            return;
        }

        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('clerk_user_id');
    }, [mode, user]);

    useEffect(() => {
        if (loading || !user || mode === 'kyc') {
            return;
        }

        router.replace(`/signup?mode=kyc&redirect=${encodeURIComponent(redirectPath)}`);
    }, [loading, mode, redirectPath, router, user]);

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
            <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-xl items-center justify-center">
                <div className="w-full rounded-[32px] border border-[#d8d1c4] bg-white p-6 shadow-[0_30px_90px_rgba(53,62,33,0.12)] sm:p-8">
                    <div className="mb-6 text-center">
                        <h1 className="text-3xl font-semibold text-[#1f2b18]">Join the network</h1>
                        <p className="mt-2 text-sm text-[#6b6d61]">
                            Sign up with Google or your email, then go straight into your health profile onboarding.
                        </p>
                    </div>

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
