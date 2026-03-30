'use client';

import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const hasClerkPublishableKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function LoginScreen() {
    const searchParams = useSearchParams();
    const redirectPath = searchParams.get('redirect') || '/';
    const completeUrl = `/auth/complete?redirect=${encodeURIComponent(redirectPath)}`;
    const signUpUrl = `/signup?redirect=${encodeURIComponent(redirectPath)}`;

    if (!hasClerkPublishableKey) {
        return (
            <div className="min-h-[calc(100vh-4rem)] bg-[#f5f3ed] px-4 py-10">
                <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-xl items-center justify-center">
                    <div className="w-full rounded-[32px] border border-amber-200 bg-white p-6 shadow-[0_30px_90px_rgba(53,62,33,0.12)] sm:p-8">
                        <h1 className="text-3xl font-semibold text-[#1f2b18]">Sign in unavailable</h1>
                        <p className="mt-3 text-sm leading-6 text-[#6b6d61]">
                            Clerk is not ready yet in this client session. Restart the client dev server so it picks up <code className="rounded bg-[#f5f3ed] px-1 py-0.5">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>, then try again.
                        </p>
                        <Link className="mt-6 inline-flex font-semibold text-[#234f2e] hover:underline" href="/">
                            Back to home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-[#f5f3ed] px-4 py-10">
            <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-xl items-center justify-center">
                <div className="w-full rounded-[32px] border border-[#d8d1c4] bg-white p-6 shadow-[0_30px_90px_rgba(53,62,33,0.12)] sm:p-8">
                    <div className="mb-6 text-center">
                        <h1 className="text-3xl font-semibold text-[#1f2b18]">Sign in</h1>
                        <p className="mt-2 text-sm text-[#6b6d61]">
                            Continue with Google or your email.
                        </p>
                    </div>

                    <SignIn
                        appearance={{
                            elements: {
                                card: 'shadow-none border border-[#e6e0d4] rounded-[28px]',
                                rootBox: 'w-full',
                            }
                        }}
                        fallbackRedirectUrl={completeUrl}
                        forceRedirectUrl={completeUrl}
                        path="/login"
                        routing="path"
                        signUpUrl={signUpUrl}
                    />
                </div>
            </div>
            <div className="mt-6 text-center text-sm text-[#6b6d61]">
                Need to create an account instead?{' '}
                <Link className="font-semibold text-[#234f2e] hover:underline" href={signUpUrl}>
                    Go to sign up
                </Link>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="flex min-h-[calc(100vh-4rem)] items-center justify-center text-sm text-[#6b6d61]">Loading sign in...</div>}>
            <LoginScreen />
        </Suspense>
    );
}
