'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '../lib/auth';
import { useLessons } from '../context/LessonContext';
import { useCart } from '../context/CartContext';
import Logo from './Logo';
import { useState } from 'react';
import RightSidebar from './RightSidebar';

import { formatCurrency, Currency } from '../lib/currency';
import AuthModal from './auth/AuthModal';
import OnboardingTour from './onboarding/OnboardingTour';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { logout, user, loading, openLoginModal } = useAuth();
    const { totalItems } = useCart();

    const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
    const [isDesktopOpen, setIsDesktopOpen] = useState(true);
    const [isLessonsOpen, setIsLessonsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [currency, setCurrency] = useState<Currency>('IDR');
    const { savedLessons, activeLesson, setActiveLesson } = useLessons();

    // 1. Auth & Loading Guard
    if (loading) return <div className="min-h-screen bg-white"></div>;

    // Only completely hide layout for specific "standalone" pages like Signup
    if (pathname === '/signup') return <>{children}</>;

    const NAV_ITEMS = [
        {
            name: 'Home', href: '/?tab=home', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            )
        },
        {
            name: 'Chats', href: '/?tab=learn', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            )
        },
        {
            name: 'Lessons', href: '#', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            )
        },
        {
            name: 'Your Systems', href: '/systems', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            )
        },
        {
            name: 'Impact Score', href: '/impact', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
            )
        },
        {
            name: 'Store', href: '/?tab=find_produce', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            )
        },
        {
            name: 'Orders', href: '/orders', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            )
        },
        {
            name: 'Wallet', href: '/wallet', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            )
        },
        {
            name: 'Guide', href: '/?tab=guide', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            )
        },
    ];

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden relative">

            {/* Mobile Overlay (Backdrop) */}
            {leftSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-20 md:hidden backdrop-blur-sm"
                    onClick={() => setLeftSidebarOpen(false)}
                />
            )}

            {/* LEFT SIDEBAR - Desktop & Mobile Drawer */}
            <aside className={`
                fixed inset-y-0 left-0 z-30 bg-white border-r border-gray-200 transform transition-all duration-300 ease-in-out flex flex-col shadow-xl md:shadow-none
                ${leftSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0 md:static
                ${isDesktopOpen ? 'md:w-64' : 'md:w-0 md:overflow-hidden'}
            `}>
                <div className={`p-6 flex justify-between items-center shrink-0 ${!isDesktopOpen && 'hidden md:flex'}`}>
                    <div className="min-w-[100px]">
                        <Link href="/?tab=landing">
                            <Logo variant="dark" width={100} />
                        </Link>
                    </div>
                    <button onClick={() => setLeftSidebarOpen(false)} className="md:hidden text-gray-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar w-64">
                    <nav className="px-4 space-y-2 mt-2">
                        {NAV_ITEMS.map((item) => {
                            const isActive = pathname === item.href;
                            const isLessons = item.name === 'Lessons';

                            if (isLessons) {
                                return (
                                    <div key={item.name} className="flex flex-col">
                                        <button
                                            onClick={() => setIsLessonsOpen(!isLessonsOpen)}
                                            className={`flex items-center justify-between w-full px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${isActive || isLessonsOpen
                                                ? 'bg-green-50 text-green-700 shadow-sm border border-green-100'
                                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                                                }`}
                                        >
                                            <div className="flex items-center">
                                                <div className={`mr-3 transition-colors ${isActive || isLessonsOpen ? 'text-green-600' : 'text-gray-400 group-hover:text-gray-500'}`}>
                                                    {item.icon}
                                                </div>
                                                {item.name}
                                            </div>
                                            <svg
                                                className={`w-4 h-4 transition-transform duration-200 ${isLessonsOpen ? 'rotate-180' : ''}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isLessonsOpen ? 'max-h-48 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                                            <div className="pl-11 pr-2 space-y-1">
                                                {savedLessons.map((lesson) => (
                                                    <div
                                                        key={lesson.id}
                                                        className={`px-3 py-2 text-xs font-medium rounded-lg hover:bg-gray-50 hover:text-green-600 cursor-pointer truncate transition-colors border border-transparent hover:border-gray-100 ${activeLesson?.id === lesson.id ? 'text-green-600 bg-green-50 shadow-sm' : 'text-gray-500'
                                                            }`}
                                                        onClick={() => {
                                                            setActiveLesson(lesson);
                                                            setLeftSidebarOpen(false);
                                                        }}
                                                    >
                                                        {lesson.title}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setLeftSidebarOpen(false)}
                                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${isActive
                                        ? 'bg-green-50 text-green-700 shadow-sm border border-green-100'
                                        : item.name === 'Guide'
                                            ? 'bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 shadow-sm'
                                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                                        }`}
                                >
                                    <div className={`mr-3 transition-colors ${isActive ? 'text-green-600' : item.name === 'Guide' ? 'text-yellow-600' : 'text-gray-400 group-hover:text-gray-500'}`}>
                                        {item.icon}
                                    </div>
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="mx-4 my-2 border-t border-gray-100"></div>
                    <RightSidebar />
                </div>

                <div className="p-4 border-t border-gray-100 shrink-0 bg-white z-10 w-64 text-center text-xs text-gray-300">
                    <p>PLYT v0.1.0 Beta</p>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col min-w-0 h-full relative transition-all duration-300">

                {/* Universal Top Header (Mobile & Desktop) */}
                <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-6 z-40 md:relative md:border-gray-200 md:shrink-0 transition-all">

                    {/* Mobile: Back Arrow & Logo */}
                    <div className="flex items-center gap-4 md:hidden w-full">
                        <Link href="/?tab=home" className="text-gray-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </Link>
                        <div className="flex-1 flex justify-center">
                            <Link href="/?tab=landing">
                                <Logo variant="dark" width={80} />
                            </Link>
                        </div>
                        <Link href="/cart" className="text-gray-600 relative">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                            {totalItems > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{totalItems}</span>
                            )}
                        </Link>
                    </div>

                    {/* Desktop: Sidebar Toggle & Search (Hidden on Mobile) */}
                    <div className="hidden md:flex items-center gap-4 w-full">
                        <button
                            onClick={() => setIsDesktopOpen(!isDesktopOpen)}
                            className="text-gray-500 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                            title={isDesktopOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                        >
                            {isDesktopOpen ? (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                            ) : (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                            )}
                        </button>

                        <div className="flex-1 max-w-md bg-gray-100 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-green-500/20 transition-all flex items-center">
                            <svg className="w-5 h-5 text-gray-400 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input
                                type="text"
                                placeholder="Search..."
                                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-gray-400 text-gray-700 min-w-[100px]"
                            />
                        </div>

                        <div className="flex items-center gap-4 ml-auto">
                            {user && (
                                <div className="hidden lg:flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-[10px] text-white font-bold">P</div>
                                    <div className="flex flex-col leading-none">
                                        <span className="text-xs font-bold text-gray-900">1,250 PLYT</span>
                                        <span className="text-[10px] text-green-600">≈ $12.50</span>
                                    </div>
                                </div>
                            )}

                            {/* --- DESKTOP SHOPPING CART ICON --- */}
                            <Link href="/cart" className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                                {totalItems > 0 && (
                                    <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold border-2 border-white">{totalItems}</span>
                                )}
                            </Link>
                            {/* ---------------------------------- */}
                        </div>

                        <div className="relative ml-2">
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-inner hover:ring-2 hover:ring-green-500/20 transition-all border border-green-100 ${user
                                    ? 'bg-gradient-to-br from-green-100 to-emerald-200 text-green-800'
                                    : 'bg-gray-100 text-gray-500'}`}
                            >
                                {user ? (user.email?.[0].toUpperCase() || 'U') : 'G'}
                            </button>

                            {isProfileOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-30"
                                        onClick={() => setIsProfileOpen(false)}
                                    />
                                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 divide-y divide-gray-100 z-40 overflow-hidden text-sm animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="px-5 py-4 bg-gray-50/50">
                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                {user ? 'Kismet' : 'Guest User'}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">
                                                {user ? user.email : 'Sign in to sync your data'}
                                            </p>
                                        </div>

                                        <div className="px-5 py-3 hover:bg-green-50 transition-colors group cursor-default">
                                            <div className="flex justify-between items-center mb-1">
                                                <Link
                                                    href={user ? "/wallet" : "#"}
                                                    onClick={user ? () => setIsProfileOpen(false) : () => { }}
                                                    className="text-xs font-semibold text-gray-500 uppercase tracking-wide group-hover:text-green-600 flex items-center gap-1"
                                                >
                                                    Wallet Balance
                                                    <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                                </Link>

                                                <div className="flex bg-gray-100 rounded-lg p-0.5 text-[10px] font-bold" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => setCurrency('IDR')}
                                                        className={`px-2 py-0.5 rounded-md transition-all ${currency === 'IDR' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                                    >
                                                        IDR
                                                    </button>
                                                    <button
                                                        onClick={() => setCurrency('USD')}
                                                        className={`px-2 py-0.5 rounded-md transition-all ${currency === 'USD' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                                    >
                                                        USD
                                                    </button>
                                                </div>
                                            </div>
                                            <Link href={user ? "/wallet" : "#"} onClick={user ? () => setIsProfileOpen(false) : () => { }}>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="font-bold text-gray-900 text-lg group-hover:text-green-700">
                                                        {user ? '1,250 PLYT' : '--- PLYT'}
                                                    </span>
                                                    <span className="text-gray-400 text-xs font-medium">
                                                        {user ? `≈ ${formatCurrency(12.50, currency)}` : 'Guest'}
                                                    </span>
                                                </div>
                                            </Link>
                                        </div>

                                        <div className="py-2">
                                            <Link
                                                href={user ? "/admin" : "#"}
                                                onClick={user ? () => setIsProfileOpen(false) : (e) => { e.preventDefault(); openLoginModal(); setIsProfileOpen(false); }}
                                                className="flex items-center gap-3 px-5 py-2.5 text-gray-700 hover:bg-gray-50 hover:text-green-600 transition-colors"
                                            >
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                {user ? 'Admin Dashboard' : 'Admin Login'}
                                            </Link>
                                            <a href="#" className="flex items-center gap-3 px-5 py-2.5 text-gray-700 hover:bg-gray-50 hover:text-green-600 transition-colors">
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                Settings
                                            </a>
                                        </div>
                                        <div className="py-2 bg-red-50/30">
                                            {user ? (
                                                <button
                                                    onClick={logout}
                                                    className="w-full text-left flex items-center gap-3 px-5 py-2.5 text-red-600 hover:bg-red-50 transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                                    Sign Out
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        openLoginModal();
                                                        setIsProfileOpen(false);
                                                    }}
                                                    className="w-full text-left flex items-center gap-3 px-5 py-2.5 text-green-600 hover:bg-green-50 transition-colors font-medium"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                                                    Sign In / Sign Up
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Scrollable Main Content Layout & Padding for Mobile Header/Footer */}
                <main className="flex-1 overflow-hidden relative flex flex-row pt-16 md:pt-0 pb-20 md:pb-0">
                    <div className="flex-1 overflow-y-auto bg-gray-50 relative">
                        {children}
                    </div>
                </main>

                {/* Mobile Navigation Footer (Fixed Bottom) */}
                <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 md:hidden z-50 flex items-center justify-around px-2">
                    <Link href="/systems" className={`flex flex-col items-center p-2 ${pathname === '/systems' ? 'text-green-600' : 'text-gray-400'}`}>
                        <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m8-10a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </Link>

                    <Link href="/?tab=learn" className={`flex flex-col items-center p-2 ${searchParams.get('tab') === 'learn' ? 'text-green-600' : 'text-gray-400'}`}>
                        <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    </Link>

                    <div className="relative -top-5">
                        <Link href="/?tab=home" className="w-14 h-14 bg-green-600 rounded-full flex items-center justify-center text-white shadow-lg border-4 border-gray-50">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                        </Link>
                    </div>

                    <Link href="/?tab=find_produce" className={`flex flex-col items-center p-2 ${searchParams.get('tab') === 'find_produce' ? 'text-green-600' : 'text-gray-400'}`}>
                        <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                    </Link>

                    <button onClick={() => setLeftSidebarOpen(true)} className="flex flex-col items-center p-2 text-gray-400">
                        <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>
                </div>
            </div>
            {/* Global Overlays */}
            <AuthModal />
            <OnboardingTour />
        </div>
    );
}
