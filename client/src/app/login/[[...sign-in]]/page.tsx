'use client';

import { ClerkProvider, SignIn } from '@clerk/nextjs';
import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AuthBrandShell from '../../../components/auth/AuthBrandShell';

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
    signIn: {
        start: {
            title: 'Plyant',
            titleCombined: 'Plyant',
        },
    },
};

function LoginScreen() {
    const searchParams = useSearchParams();
    const redirectPath = searchParams.get('redirect') || '/';
    const completeUrl = `/auth/complete?redirect=${encodeURIComponent(redirectPath)}`;
    const signUpUrl = `/signup?redirect=${encodeURIComponent(redirectPath)}`;

    if (!hasClerkPublishableKey) {
        return (
            <AuthBrandShell
                subtitle="Sign in to pick up your saved places, chats, and personalized food guidance."
                title="Welcome back to Plyant"
            >
                <div className="w-full rounded-[32px] border border-amber-200 bg-white p-6 shadow-[0_30px_90px_rgba(53,62,33,0.12)] sm:p-8">
                    <h1 className="text-3xl font-semibold text-[#1f2b18]">Sign in unavailable</h1>
                    <p className="mt-3 text-sm leading-6 text-[#6b6d61]">
                        Clerk is not ready yet in this client session. Restart the client dev server so it picks up <code className="rounded bg-[#f4f4f4] px-1 py-0.5">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>, then try again.
                    </p>
                    <Link className="mt-6 inline-flex font-semibold text-[#234f2e] hover:underline" href="/">
                        Back to home
                    </Link>
                </div>
            </AuthBrandShell>
        );
    }

    return (
        <AuthBrandShell
            subtitle="Sign in to reopen your saved chats, continue your profile journey, and get recommendations that remember your patterns."
            title="Sign in to your health-food space"
        >
            <ClerkProvider localization={clerkLocalization}>
                <SignIn
                    appearance={clerkAppearance}
                    fallbackRedirectUrl={completeUrl}
                    forceRedirectUrl={completeUrl}
                    path="/login"
                    routing="path"
                    signUpUrl={signUpUrl}
                />
            </ClerkProvider>
        </AuthBrandShell>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#f5f3ed] text-sm text-[#6b6d61]">Loading sign in...</div>}>
            <LoginScreen />
        </Suspense>
    );
}
