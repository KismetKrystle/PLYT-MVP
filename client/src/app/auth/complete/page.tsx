'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../lib/auth';

function AuthCompleteScreen() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading } = useAuth();
    const [timedOut, setTimedOut] = useState(false);

    const redirectPath = searchParams.get('redirect') || '/';
    const mode = searchParams.get('mode');
    const destination = useMemo(() => {
        if (mode === 'kyc') {
            return `/signup?mode=kyc&redirect=${encodeURIComponent(redirectPath)}`;
        }

        return redirectPath;
    }, [mode, redirectPath]);

    useEffect(() => {
        const timer = window.setTimeout(() => setTimedOut(true), 8000);
        return () => window.clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!loading && user) {
            router.replace(destination);
        }
    }, [destination, loading, router, user]);

    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#f5f3ed] px-4">
            <div className="w-full max-w-md rounded-[28px] border border-[#dfd7c9] bg-white p-8 text-center shadow-sm">
                <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-[#234f2e]/20 border-t-[#234f2e]" />
                <h1 className="text-2xl font-semibold text-[#1f2b18]">Finalizing your sign-in</h1>
                <p className="mt-3 text-sm leading-6 text-[#6b6d61]">
                    We are connecting your Clerk session to your PLYT account and loading your existing profile data.
                </p>
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
        </div>
    );
}

export default function AuthCompletePage() {
    return (
        <Suspense fallback={<div className="flex min-h-[calc(100vh-4rem)] items-center justify-center text-sm text-[#6b6d61]">Finishing sign in...</div>}>
            <AuthCompleteScreen />
        </Suspense>
    );
}
