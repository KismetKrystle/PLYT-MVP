'use client';

import { useAuth } from './auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

const PROTECTED_ROUTES = ['/wallet', '/orders', '/grow', '/eat', '/systems', '/impact', '/store', '/admin'];

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Skip check if pathname is missing or for login/signup pages
        if (!pathname || pathname === '/login' || pathname === '/signup') return;

        const isProtected = PROTECTED_ROUTES.some(route =>
            route === '/' ? pathname === '/' : pathname.startsWith(route)
        );

        if (!loading && !user && isProtected) {
            router.push('/login');
        }
    }, [user, loading, pathname, router]);

    // Don't render anything while checking auth on protected routes
    const isProtected = pathname && PROTECTED_ROUTES.some(route =>
        route === '/' ? pathname === '/' : pathname.startsWith(route)
    );

    if (loading || (!user && isProtected && pathname !== '/login' && pathname !== '/signup')) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
                <div className="text-green-600 font-medium">Checking Authorization...</div>
                <div className="mt-4 text-xs text-gray-400">
                    Status: {loading ? 'Loading...' : 'Checked'} <br />
                    User: {user ? 'Found' : 'Missing'}
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
