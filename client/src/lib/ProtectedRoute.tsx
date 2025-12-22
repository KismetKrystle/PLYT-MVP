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
        // Relaxed Protection: We no longer auto-redirect for most routes.
        // Users can browse /grow, /eat etc. as guests.
        // Auth is now enforced via modal when performing specific actions.

        // Strict protection for Admin or clearly private routes if needed:
        const STRICT_ROUTES = ['/orders', '/admin', '/wallet'];

        const isStrictlyProtected = STRICT_ROUTES.some(route =>
            pathname?.startsWith(route)
        );

        if (!loading && !user && isStrictlyProtected) {
            router.push('/login'); // Or open modal? For now, keep redirect for strict routes.
        }
    }, [user, loading, pathname, router]);

    // Simplified Strict Protection Check for Rendering
    const STRICT_ROUTES = ['/orders', '/admin', '/wallet'];
    const isStrictlyProtected = pathname && STRICT_ROUTES.some(route =>
        pathname.startsWith(route)
    );

    // Only block rendering if loading OR (strictly protected AND no user)
    // Relaxed routes (like /systems, /grow) should render for guests.
    if (loading || (!user && isStrictlyProtected)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
                <div className="text-green-600 font-medium">Checking Authorization...</div>
            </div>
        );
    }

    return <>{children}</>;
}
