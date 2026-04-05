'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../lib/auth';
import { useAuth as useClerkAuth, useUser } from '@clerk/nextjs';
import api from '../../../lib/api';
import AuthBrandShell from '../../../components/auth/AuthBrandShell';

const hasClerkPublishableKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function AuthCompleteScreen() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading, login } = useAuth();
    const { isLoaded: isClerkLoaded, isSignedIn, getToken } = useClerkAuth();
    const { isLoaded: isClerkUserLoaded, user: clerkUser } = useUser();
    const [timedOut, setTimedOut] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);
    const [retryTick, setRetryTick] = useState(0);
    const [retryCount, setRetryCount] = useState(0);
    const [resolvedDestination, setResolvedDestination] = useState<string | null>(null);
    const retryTimeoutRef = useRef<number | null>(null);
    const isSyncingRef = useRef(false);
    const maxRetryCount = 2;

    const redirectPath = searchParams.get('redirect') || '/';
    const mode = searchParams.get('mode');
    const defaultDestination = useMemo(() => {
        if (mode === 'kyc') {
            return `/signup?mode=kyc&redirect=${encodeURIComponent(redirectPath)}`;
        }

        return redirectPath;
    }, [mode, redirectPath]);

    useEffect(() => {
        setResolvedDestination(defaultDestination);
    }, [defaultDestination]);

    useEffect(() => {
        const timer = window.setTimeout(() => setTimedOut(true), 8000);
        return () => window.clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!loading && user && resolvedDestination) {
            router.replace(resolvedDestination);
        }
    }, [loading, resolvedDestination, router, user]);

    useEffect(() => {
        if (loading || user || !isClerkLoaded || !isClerkUserLoaded || !isSignedIn || !clerkUser?.id) {
            return;
        }

        if (isSyncingRef.current) {
            return;
        }

        let cancelled = false;
        isSyncingRef.current = true;
        setSyncError(null);

        void (async () => {
            try {
                const clerkToken = await getToken();
                if (!clerkToken) {
                    throw new Error('Clerk did not return a session token.');
                }

                const response = await api.post('/auth/clerk-login', { clerkToken });
                if (cancelled) return;

                const nextDestination = response.data?.requiresOnboarding
                    ? `/signup?mode=kyc&redirect=${encodeURIComponent(redirectPath)}`
                    : defaultDestination;

                setResolvedDestination(nextDestination);
                login(response.data.token, response.data.user);
                if (typeof window !== 'undefined') {
                    localStorage.setItem('clerk_user_id', clerkUser.id);
                }
            } catch (error: any) {
                if (cancelled) return;

                const message = String(
                    error?.response?.data?.error ||
                    error?.message ||
                    'We could not finish connecting your sign-in.'
                );
                setSyncError(message);

                if (retryCount < maxRetryCount) {
                    retryTimeoutRef.current = window.setTimeout(() => {
                        isSyncingRef.current = false;
                        retryTimeoutRef.current = null;
                        setSyncError(null);
                        setRetryCount((current) => current + 1);
                        setRetryTick((current) => current + 1);
                    }, 2000);
                }
            } finally {
                if (!cancelled && !retryTimeoutRef.current) {
                    isSyncingRef.current = false;
                }
            }
        })();

        return () => {
            cancelled = true;
            if (retryTimeoutRef.current) {
                window.clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = null;
            }
            isSyncingRef.current = false;
        };
    }, [clerkUser?.id, defaultDestination, getToken, isClerkLoaded, isClerkUserLoaded, isSignedIn, loading, login, redirectPath, retryCount, retryTick, user]);

    return (
        <AuthBrandShell
            subtitle="We are securely connecting your Clerk session to your Plyant account so your profile and history come through cleanly."
            title="Finalizing your secure sign-in"
        >
            <div className="w-full max-w-md rounded-[28px] border border-[#dfd7c9] bg-white p-8 text-center shadow-sm">
                <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-[#234f2e]/20 border-t-[#234f2e]" />
                <h1 className="text-2xl font-semibold text-[#1f2b18]">Finalizing your sign-in</h1>
                <p className="mt-3 text-sm leading-6 text-[#6b6d61]">
                    We are connecting your Clerk session to your PLYT account and loading your existing profile data.
                </p>
                {syncError ? (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-[#5c4617]">
                        <p>{syncError}</p>
                        <p className="mt-2 text-xs text-[#6b531f]">
                            {retryCount < maxRetryCount
                                ? 'Retrying automatically...'
                                : 'Please go back to login after checking your Clerk keys and redirect settings.'}
                        </p>
                    </div>
                ) : null}
                {timedOut && !user ? (
                    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-[#5c4617]">
                        <p>
                            This is taking longer than expected. If it keeps hanging, confirm that the client has <code className="rounded bg-white px-1 py-0.5">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and the server has <code className="rounded bg-white px-1 py-0.5">CLERK_SECRET_KEY</code>.
                        </p>
                        <Link className="mt-3 inline-flex font-semibold text-[#234f2e] hover:underline" href={`/login?redirect=${encodeURIComponent(redirectPath)}`}>
                            Back to login
                        </Link>
                    </div>
                ) : null}
            </div>
        </AuthBrandShell>
    );
}

export default function AuthCompletePage() {
    if (!hasClerkPublishableKey) {
        return (
            <AuthBrandShell
                subtitle="Your client session needs Clerk configured before Plyant can complete sign-in."
                title="Clerk is not configured"
            >
                <div className="w-full max-w-md rounded-[28px] border border-amber-200 bg-white p-8 text-center shadow-sm">
                    <h1 className="text-2xl font-semibold text-[#1f2b18]">Clerk is not configured</h1>
                    <p className="mt-3 text-sm leading-6 text-[#6b6d61]">
                        The client session does not currently have <code className="rounded bg-[#f5f3ed] px-1 py-0.5">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>. Restart the client dev server, then try signing in again.
                    </p>
                    <Link className="mt-6 inline-flex font-semibold text-[#234f2e] hover:underline" href="/login">
                        Back to login
                    </Link>
                </div>
            </AuthBrandShell>
        );
    }

    return (
        <Suspense fallback={<div className="flex min-h-[100dvh] items-center justify-center bg-[#f5f3ed] text-sm text-[#6b6d61]">Finishing sign in...</div>}>
            <AuthCompleteScreen />
        </Suspense>
    );
}
