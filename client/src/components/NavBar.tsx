'use client';

import Link from 'next/link';
import { useAuth } from '../lib/auth';

export default function NavBar() {
    const { user, logout } = useAuth();

    return (
        <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-emerald-600">
                PLYT
            </Link>
            <div className="flex gap-6 text-sm font-medium text-gray-600">
                <Link href="/eat" className="hover:text-green-600 transition-colors">Eat</Link>
                <Link href="/grow" className="hover:text-green-600 transition-colors">Grow</Link>
                <Link href="/orders" className="hover:text-green-600 transition-colors">Orders</Link>
                <Link href="/wallet" className="hover:text-green-600 transition-colors">Wallet</Link>
            </div>
            <div className="flex items-center gap-3">
                {user ? (
                    <div className="flex items-center gap-3">
                        <div className="text-sm text-right hidden md:block">
                            <p className="font-medium text-gray-800">{user.email.split('@')[0]}</p>
                            <p className="text-xs text-green-600 capitalize">{user.role}</p>
                        </div>
                        <button
                            onClick={logout}
                            className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-200 transition"
                        >
                            Logout
                        </button>
                        <button
                            onClick={logout}
                            className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold border-2 border-green-100 hover:bg-green-700 transition"
                            title="Click to Logout"
                        >
                            {user.email[0].toUpperCase()}
                        </button>
                    </div>
                ) : (
                    <Link href="/login" className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition">
                        Sign In
                    </Link>
                )}
            </div>
        </nav >
    );
}
