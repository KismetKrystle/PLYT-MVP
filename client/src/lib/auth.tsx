'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from './api';
import { useRouter } from 'next/navigation';

interface User {
    id: number;
    email: string;
    role: 'consumer' | 'farmer';
    wallet_address?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User, redirectPath?: string) => void;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const login = (newToken: string, newUser: User, redirectPath: string = '/') => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));

        router.push(redirectPath);
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
    };

    useEffect(() => {
        const initAuth = async () => {
            const storedToken = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');

            if (storedToken && storedUser) {
                try {
                    // Verify session with server
                    // We manually attach header here to be safe, though api interceptor does it too if token is in localStorage
                    // But here token might not be in state yet, but it IS in localStorage.
                    await api.get('/me');

                    setToken(storedToken);
                    setUser(JSON.parse(storedUser));
                } catch (error) {
                    console.warn('Session invalid, logging out:', error);
                    logout();
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading }}>
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
