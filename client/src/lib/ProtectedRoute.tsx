'use client';

import { useAuth } from './auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import AccessWall from '../components/AccessWall';

const PUBLIC_ROUTES = ['/', '/login', '/signup', '/auth/login', '/auth/wallet-login', '/auth/google-login'];

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading, isAccessWallEnabled, isUserDenied } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const isPublicRoute =
        PUBLIC_ROUTES.some((route) => pathname === route || pathname?.startsWith(`${route}/`)) ||
        pathname?.startsWith('/auth/');
    const requiresAuth = !isPublicRoute;

    useEffect(() => {
        if (!loading && !user && requiresAuth) {
            router.replace(`/login?redirect=${encodeURIComponent(pathname || '/')}`);
        }
    }, [loading, pathname, requiresAuth, router, user]);

    // GATEKEEPER LOGIC
    if (isAccessWallEnabled && requiresAuth) {
        if (!loading) {
            if (!user) {
                return <AccessWall />;
            }

            if (isUserDenied && user.role !== 'admin') {
                return <AccessWall />;
            }
        }
    }

    if (loading || (!user && requiresAuth)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
                <div className="text-green-600 font-medium">Checking Authorization...</div>
            </div>
        );
    }


    return <>{children}</>;
}
