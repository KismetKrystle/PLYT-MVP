'use client';

import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function LoginScreen() {
    const searchParams = useSearchParams();
    const redirectPath = searchParams.get('redirect') || '/';
    const completeUrl = `/auth/complete?redirect=${encodeURIComponent(redirectPath)}`;
    const signUpUrl = `/signup?redirect=${encodeURIComponent(redirectPath)}`;
    const clerkKeyMissing = !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-[#f5f3ed] px-4 py-10">
            <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-5xl items-center justify-center">
                <div className="grid w-full gap-8 overflow-hidden rounded-[32px] border border-[#d8d1c4] bg-white shadow-[0_30px_90px_rgba(53,62,33,0.12)] lg:grid-cols-[1.05fr_0.95fr]">
                    <div className="relative overflow-hidden bg-[#23351f] px-8 py-10 text-[#f4efe3] sm:px-10 sm:py-12">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(207,181,59,0.24),_transparent_45%),linear-gradient(145deg,_rgba(255,255,255,0.03),_transparent_50%)]" />
                        <div className="relative space-y-6">
                            <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#d9cfb2]">
                                Secure Sign In
                            </div>
                            <div className="space-y-3">
                                <h1 className="max-w-md text-4xl font-semibold leading-tight sm:text-5xl">
                                    Sign in to keep building your personal health archive.
                                </h1>
                                <p className="max-w-md text-sm leading-6 text-[#d6dbc9] sm:text-base">
                                    Clerk now handles secure email and Google sign-in, while PLYT keeps using your existing app profile and saved data behind the scenes.
                                </p>
                            </div>
                            <div className="grid gap-3 text-sm text-[#f0ead7]">
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    Google sign-in is enabled through Clerk once you switch it on in the Clerk dashboard.
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    Wallet sign-in can be layered in next without replacing this flow.
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-center px-4 py-8 sm:px-8 sm:py-10">
                        {clerkKeyMissing ? (
                            <div className="w-full max-w-md rounded-[28px] border border-amber-200 bg-amber-50 p-6 text-[#5c4617] shadow-sm">
                                <h2 className="text-2xl font-semibold">Clerk Needs Configuration</h2>
                                <p className="mt-3 text-sm leading-6">
                                    Add <code className="rounded bg-white px-1 py-0.5">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> to the client environment and <code className="rounded bg-white px-1 py-0.5">CLERK_SECRET_KEY</code> to the server environment to enable secure sign-in.
                                </p>
                            </div>
                        ) : (
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
                        )}
                    </div>
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
