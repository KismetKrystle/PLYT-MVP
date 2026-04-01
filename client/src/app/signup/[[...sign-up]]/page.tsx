'use client';

import { ClerkProvider, SignUp } from '@clerk/nextjs';
import Link from 'next/link';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import KYCForm from '../../../components/KYCForm';
import { useAuth } from '../../../lib/auth';

const hasClerkPublishableKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
const clerkAppearance = {
    elements: {
        rootBox: 'flex w-full max-w-md justify-center',
        cardBox: 'w-full',
        card: 'w-full border border-[#d8d1c4] rounded-[32px] bg-white shadow-[0_30px_90px_rgba(53,62,33,0.12)]',
        headerTitle: 'text-center',
        headerSubtitle: 'text-center',
        socialButtonsBlockButton: 'justify-center',
        formButtonPrimary: 'justify-center',
        footerAction: 'justify-center',
    }
};
const clerkLocalization = {
    signUp: {
        start: {
            title: 'Plyant',
            titleCombined: 'Plyant',
        },
    },
};

function SignupScreen() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, loading, isAccessWallEnabled } = useAuth();
    const mode = searchParams.get('mode');
    const redirectPath = searchParams.get('redirect') || '/';
    const loginUrl = `/login?redirect=${encodeURIComponent(redirectPath)}`;
    const completeUrl = `/auth/complete?mode=kyc&redirect=${encodeURIComponent(redirectPath)}`;

    if (!hasClerkPublishableKey && mode !== 'kyc') {
        return (
            <div className="flex min-h-screen items-center justify-center bg-white px-4 py-10">
                <div className="max-w-md rounded-[28px] border border-amber-200 bg-white p-8 text-center shadow-sm">
                    <h1 className="text-2xl font-semibold text-[#1f2b18]">Sign up unavailable</h1>
                        <p className="mt-3 text-sm leading-6 text-[#6b6d61]">
                            Clerk is not ready yet in this client session. Restart the client dev server so it picks up <code className="rounded bg-[#f4f4f4] px-1 py-0.5">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>, then try again.
                    </p>
                    <Link className="mt-6 inline-flex font-semibold text-[#234f2e] hover:underline" href="/">
                        Back to home
                    </Link>
                </div>
            </div>
        );
    }

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
                <div className="flex min-h-screen items-center justify-center bg-[#f5f3ed] px-4 py-10">
                    <div className="rounded-[28px] border border-[#dfd7c9] bg-white px-6 py-8 text-center shadow-sm">
                        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[#234f2e]/20 border-t-[#234f2e]" />
                        <p className="text-sm text-[#6b6d61]">Finishing your secure sign-in...</p>
                    </div>
                </div>
            );
        }

        if (!user) {
            return (
                <div className="flex min-h-screen items-center justify-center bg-[#f5f3ed] px-4 py-10">
                    <motion.div
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-md rounded-[28px] border border-[#dfd7c9] bg-white p-8 text-center shadow-sm"
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
                </div>
            );
        }

        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f5f3ed] px-4 py-10">
                <KYCForm onComplete={() => router.push(redirectPath)} />
            </div>
        );
    }

    if (isAccessWallEnabled) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f5f3ed] px-4 py-10">
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
        <div className="flex min-h-[100dvh] items-center justify-center bg-white px-4 py-6 sm:min-h-screen sm:py-10">
            <ClerkProvider localization={clerkLocalization}>
                <SignUp
                    appearance={clerkAppearance}
                    fallbackRedirectUrl={completeUrl}
                    forceRedirectUrl={completeUrl}
                    path="/signup"
                    routing="path"
                    signInUrl={loginUrl}
                />
            </ClerkProvider>
        </div>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-white text-sm text-[#6b6d61]">Loading sign up...</div>}>
            <SignupScreen />
        </Suspense>
    );
}
