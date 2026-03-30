'use client';

import { useAuth as useClerkAuth, useClerk, useUser } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import api from '../../lib/api';
import { useAuth } from '../../lib/auth';

export default function ClerkSessionBridge() {
    const { isLoaded, isSignedIn, getToken } = useClerkAuth();
    const { isLoaded: isClerkUserLoaded, user: clerkUser } = useUser();
    const { signOut } = useClerk();
    const { token, login, clearSession, clerkSignOutRequestId } = useAuth();
    const pathname = usePathname();
    const isSyncingRef = useRef(false);
    const handledSignOutRequestIdRef = useRef(0);
    const isProcessingSignOutRef = useRef(false);

    useEffect(() => {
        if (clerkSignOutRequestId <= handledSignOutRequestIdRef.current) {
            return;
        }

        handledSignOutRequestIdRef.current = clerkSignOutRequestId;
        isProcessingSignOutRef.current = true;

        void signOut()
            .catch((error) => {
                console.error('Clerk sign-out failed:', error);
            })
            .finally(() => {
                isProcessingSignOutRef.current = false;
            });
    }, [clerkSignOutRequestId, signOut]);

    useEffect(() => {
        if (!isLoaded) {
            return;
        }

        if (pathname?.startsWith('/auth/complete')) {
            return;
        }

        if (!isSignedIn) {
            isProcessingSignOutRef.current = false;

            if (typeof window !== 'undefined' && localStorage.getItem('clerk_user_id')) {
                clearSession();
            }
            return;
        }

        if (isProcessingSignOutRef.current || !isClerkUserLoaded || !clerkUser?.id) {
            return;
        }

        const syncedClerkUserId = typeof window !== 'undefined'
            ? localStorage.getItem('clerk_user_id')
            : null;

        if (token && syncedClerkUserId === clerkUser.id) {
            return;
        }

        if (isSyncingRef.current) {
            return;
        }

        isSyncingRef.current = true;

        void (async () => {
            try {
                const clerkToken = await getToken();
                if (!clerkToken) {
                    throw new Error('Clerk did not return a session token');
                }

                const response = await api.post('/auth/clerk-login', { clerkToken });
                login(response.data.token, response.data.user);

                if (typeof window !== 'undefined') {
                    localStorage.setItem('clerk_user_id', clerkUser.id);
                }
            } catch (error) {
                console.error('Clerk session bridge failed:', error);
            } finally {
                isSyncingRef.current = false;
            }
        })();
    }, [clearSession, clerkUser?.id, getToken, isClerkUserLoaded, isLoaded, isSignedIn, login, pathname, token]);

    return null;
}
