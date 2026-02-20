'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from './api';
import { useRouter } from 'next/navigation';

interface User {
    id: number;
    email: string;
    role: 'consumer' | 'farmer' | 'distributor' | 'servicer';
    wallet_address?: string;
    full_name?: string;
    location_city?: string;
    location_address?: string;
    bio?: string;
    avatar_url?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User, redirectPath?: string) => void;
    logout: () => void;
    loading: boolean;
    isLoginModalOpen: boolean;
    openLoginModal: () => void;
    closeLoginModal: () => void;
    requireAuth: (callback: () => void) => void;
    isAccessWallEnabled: boolean;
    isUserDenied: boolean;

}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isAccessWallEnabled, setIsAccessWallEnabled] = useState(
        process.env.NEXT_PUBLIC_ACCESS_WALL_ENABLED === 'true'
    );
    const [isUserDenied, setIsUserDenied] = useState(false);
    const router = useRouter();

    const openLoginModal = () => setIsLoginModalOpen(true);
    const closeLoginModal = () => setIsLoginModalOpen(false);

    const login = (newToken: string, newUser: User, redirectPath?: string) => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        setIsLoginModalOpen(false); // Close modal

        if (redirectPath) {
            router.push(redirectPath);
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsUserDenied(false);
        router.push('/');
    };

    const requireAuth = (callback: () => void) => {
        if (user) {
            callback();
        } else {
            openLoginModal();
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            // 1. Check health/env first
            try {
                const healthRes = await api.get('/health'); // Use api instance to respect base URL
                if (healthRes.data?.env?.ACCESS_WALL_ENABLED) {
                    setIsAccessWallEnabled(true);
                }
            } catch (err) {
                console.warn('Health check failed', err);
            }

            const storedToken = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');

            if (storedToken && storedToken.startsWith('mock-jwt-token')) {
                console.warn('Mock token detected, clearing session.');
                logout();
                setLoading(false);
                return;
            }

            if (storedToken && storedUser) {
                try {
                    await api.get('/me');
                    setToken(storedToken);
                    setUser(JSON.parse(storedUser));
                } catch (error: any) {
                    console.warn('Session invalid or denied:', error);
                    if (error.response?.status === 403 && error.response?.data?.code === 'GATEKEEPER_DENIED') {
                        setIsUserDenied(true);
                        // Keep user logged in so we can show "Signed in as X" on the wall
                        setToken(storedToken);
                        setUser(JSON.parse(storedUser));
                    } else {
                        logout();
                    }
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading, isLoginModalOpen, openLoginModal, closeLoginModal, requireAuth, isAccessWallEnabled, isUserDenied }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
